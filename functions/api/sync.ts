import { and, eq, gt, inArray, isNull, sql } from 'drizzle-orm'
import { categories, entries, entryTags, tags } from '../../db/schema'
import type { AuthedData } from '../_lib/context'
import { getDb, type Db } from '../_lib/db'
import type { Env } from '../_lib/env'
import { error, json, readJson, sameOrigin } from '../_lib/http'

interface WireCategory {
  id: string
  name: string
  color: string
  sortOrder: number
  archivedAt: string | null
  updatedAt: string
}

interface WireTag {
  id: string
  categoryId: string
  name: string
  icon: string
  sortOrder: number
  archivedAt: string | null
  updatedAt: string
}

interface WireEntry {
  id: string
  date: string
  mood: number
  note: string
  tagIds: string[]
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

// GET /api/sync?since=<ISO8601> — отдаёт всё изменённое после `since`
// (пустой/отсутствующий since — первая синхронизация, отдаём всё).
export const onRequestGet: PagesFunction<Env, string, AuthedData> = async (ctx) => {
  const db = getDb(ctx.env)
  const userId = ctx.data.userId
  const since = new URL(ctx.request.url).searchParams.get('since')
  const sinceDate = since ? new Date(since) : null

  const categoryRows = await db
    .select()
    .from(categories)
    .where(
      sinceDate
        ? and(eq(categories.userId, userId), gt(categories.updatedAt, sinceDate))
        : eq(categories.userId, userId),
    )

  const tagRows = await db
    .select()
    .from(tags)
    .where(sinceDate ? and(eq(tags.userId, userId), gt(tags.updatedAt, sinceDate)) : eq(tags.userId, userId))

  const entryRows = await db
    .select()
    .from(entries)
    .where(
      sinceDate ? and(eq(entries.userId, userId), gt(entries.updatedAt, sinceDate)) : eq(entries.userId, userId),
    )

  const entryIds = entryRows.map((e) => e.id)
  const entryTagRows = entryIds.length
    ? await db.select().from(entryTags).where(inArray(entryTags.entryId, entryIds))
    : []
  const tagIdsByEntry = new Map<string, string[]>()
  for (const row of entryTagRows) {
    const list = tagIdsByEntry.get(row.entryId) ?? []
    list.push(row.tagId)
    tagIdsByEntry.set(row.entryId, list)
  }

  return json({
    serverTime: new Date().toISOString(),
    categories: categoryRows.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      sortOrder: c.sortOrder,
      archivedAt: c.archivedAt?.toISOString() ?? null,
      updatedAt: c.updatedAt.toISOString(),
    })),
    tags: tagRows.map((t) => ({
      id: t.id,
      categoryId: t.categoryId,
      name: t.name,
      icon: t.icon,
      sortOrder: t.sortOrder,
      archivedAt: t.archivedAt?.toISOString() ?? null,
      updatedAt: t.updatedAt.toISOString(),
    })),
    entries: entryRows.map((e) => ({
      id: e.id,
      date: e.date,
      mood: e.mood,
      note: e.note,
      tagIds: tagIdsByEntry.get(e.id) ?? [],
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      deletedAt: e.deletedAt?.toISOString() ?? null,
    })),
  })
}

// POST /api/sync — принимает всё, что клиент пометил dirty, и апсертит.
// Last-write-wins по updatedAt (осознанное решение, см. README).
export const onRequestPost: PagesFunction<Env, string, AuthedData> = async (ctx) => {
  if (!sameOrigin(ctx.request, ctx.env.APP_URL)) return error(403, 'forbidden')

  const db = getDb(ctx.env)
  const userId = ctx.data.userId
  const body = await readJson<{
    categories?: WireCategory[]
    tags?: WireTag[]
    entries?: WireEntry[]
  }>(ctx.request)
  if (!body) return error(400, 'invalid_body')

  const acceptedCategories = await upsertCategories(db, userId, body.categories ?? [])
  const acceptedTags = await upsertTags(db, userId, body.tags ?? [])

  const acceptedEntries: string[] = []
  for (const e of body.entries ?? []) {
    if (await upsertEntry(db, userId, e)) acceptedEntries.push(e.id)
  }

  return json({
    serverTime: new Date().toISOString(),
    accepted: { categories: acceptedCategories, tags: acceptedTags, entries: acceptedEntries },
  })
}

/**
 * Раньше апсертили по одной строке — select, потом insert/update, на
 * категорию или тег. У Neon HTTP-драйвера это две сети на строку, а
 * Cloudflare Workers режет запрос на 50-м сабзапросе: 11 разделов + 42 тега
 * (совсем не экстремальный объём для полугода дневника) уже перешагивали
 * порог, и `POST /api/sync` падал с "Worker threw exception" ПОСЛЕ того,
 * как разделы успевали записаться, но до того, как доходило до тегов и тем
 * более до entries — новые записи с телефона поэтому не доезжали вовсе,
 * не только новые действия. Разбирались по факту жалобы, воспроизвели
 * ровно на границе 50/51 строки.
 *
 * Чинится массовым upsert: один INSERT ... ON CONFLICT ... RETURNING на всю
 * пачку сразу — один сабзапрос вместо 2×N. `excluded.<col>` — это
 * предложенная (INSERT-нутая) версия строки, стандартный способ Postgres
 * сослаться на неё внутри ON CONFLICT DO UPDATE. `setWhere` воспроизводит
 * прежнюю логику поштучно: чужую строку (по user_id) не трогаем, более
 * старую (по updatedAt) не трогаем — если апдейт не применился, строка не
 * попадёт в RETURNING, и она не попадёт в `accepted`.
 */
async function upsertCategories(db: Db, userId: number, rows: WireCategory[]): Promise<string[]> {
  if (rows.length === 0) return []
  const accepted = await db
    .insert(categories)
    .values(
      rows.map((c) => ({
        id: c.id,
        userId,
        name: c.name,
        color: c.color,
        sortOrder: c.sortOrder,
        archivedAt: c.archivedAt ? new Date(c.archivedAt) : null,
        updatedAt: new Date(c.updatedAt),
      })),
    )
    .onConflictDoUpdate({
      target: categories.id,
      set: {
        name: sql`excluded.name`,
        color: sql`excluded.color`,
        sortOrder: sql`excluded.sort_order`,
        archivedAt: sql`excluded.archived_at`,
        updatedAt: sql`excluded.updated_at`,
      },
      setWhere: sql`${categories.userId} = ${userId} and excluded.updated_at > ${categories.updatedAt}`,
    })
    .returning({ id: categories.id })
  return accepted.map((r) => r.id)
}

async function upsertTags(db: Db, userId: number, rows: WireTag[]): Promise<string[]> {
  if (rows.length === 0) return []
  const accepted = await db
    .insert(tags)
    .values(
      rows.map((t) => ({
        id: t.id,
        userId,
        categoryId: t.categoryId,
        name: t.name,
        icon: t.icon,
        sortOrder: t.sortOrder,
        archivedAt: t.archivedAt ? new Date(t.archivedAt) : null,
        updatedAt: new Date(t.updatedAt),
      })),
    )
    .onConflictDoUpdate({
      target: tags.id,
      set: {
        categoryId: sql`excluded.category_id`,
        name: sql`excluded.name`,
        icon: sql`excluded.icon`,
        sortOrder: sql`excluded.sort_order`,
        archivedAt: sql`excluded.archived_at`,
        updatedAt: sql`excluded.updated_at`,
      },
      setWhere: sql`${tags.userId} = ${userId} and excluded.updated_at > ${tags.updatedAt}`,
    })
    .returning({ id: tags.id })
  return accepted.map((r) => r.id)
}

async function upsertEntry(db: Db, userId: number, e: WireEntry): Promise<boolean> {
  const [existing] = await db.select().from(entries).where(eq(entries.id, e.id)).limit(1)
  const updatedAt = new Date(e.updatedAt)

  if (existing) {
    if (existing.userId !== userId) return false
    if (updatedAt <= existing.updatedAt) return false
    await db
      .update(entries)
      .set({
        date: e.date,
        mood: e.mood,
        note: e.note,
        updatedAt,
        deletedAt: e.deletedAt ? new Date(e.deletedAt) : null,
      })
      .where(eq(entries.id, e.id))
  } else {
    // День уже может быть занят строкой с другим id — тот же день, заведённый
    // на двух устройствах независимо. На (user_id, date) висит частичный
    // уникальный индекс, и голый insert свалил бы весь POST в 500. Разводим
    // тем же last-write-wins: проигравшую строку гасим мягко, чтобы удаление
    // доехало до устройства, которое её создало, и дубль там тоже исчез.
    if (!e.deletedAt) {
      const [occupant] = await db
        .select()
        .from(entries)
        .where(and(eq(entries.userId, userId), eq(entries.date, e.date), isNull(entries.deletedAt)))
        .limit(1)

      if (occupant) {
        if (occupant.updatedAt >= updatedAt) return false
        await db
          .update(entries)
          .set({ deletedAt: updatedAt, updatedAt })
          .where(eq(entries.id, occupant.id))
      }
    }

    await db.insert(entries).values({
      id: e.id,
      userId,
      date: e.date,
      mood: e.mood,
      note: e.note,
      createdAt: new Date(e.createdAt),
      updatedAt,
      deletedAt: e.deletedAt ? new Date(e.deletedAt) : null,
    })
  }

  // Полная замена связей тега — проще и надёжнее частичного diff,
  // клиент всегда шлёт полный актуальный набор tagIds.
  await db.delete(entryTags).where(eq(entryTags.entryId, e.id))
  if (e.tagIds.length > 0) {
    await db.insert(entryTags).values(e.tagIds.map((tagId) => ({ entryId: e.id, tagId })))
  }

  return true
}
