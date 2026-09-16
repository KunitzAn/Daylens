import { ref } from 'vue'
import { checkSession, me } from './auth'
import { db, type Category, type Entry, type Tag } from './db'
import { api } from './api'

const LAST_SYNCED_AT_KEY = 'lastSyncedAt'

export const syncing = ref(false)
export const lastSyncError = ref<string | null>(null)
export const pendingCount = ref(0)

interface SyncResponse {
  serverTime: string
  categories: Category[]
  tags: Tag[]
  entries: Omit<Entry, 'dirty'>[]
}

interface PushResponse {
  serverTime: string
  accepted: { categories: string[]; tags: string[]; entries: string[] }
}

async function getLastSyncedAt(): Promise<string | null> {
  const row = await db.settings.get(LAST_SYNCED_AT_KEY)
  return row?.value ?? null
}

async function setLastSyncedAt(value: string): Promise<void> {
  await db.settings.put({ key: LAST_SYNCED_AT_KEY, value })
}

async function mergePulled(res: SyncResponse): Promise<void> {
  await db.transaction('rw', db.categories, db.tags, db.entries, async () => {
    for (const c of res.categories) {
      const local = await db.categories.get(c.id)
      if (!local || new Date(local.updatedAt) < new Date(c.updatedAt)) {
        await db.categories.put(c)
      }
    }
    for (const t of res.tags) {
      const local = await db.tags.get(t.id)
      if (!local || new Date(local.updatedAt) < new Date(t.updatedAt)) {
        await db.tags.put(t)
      }
    }
    for (const e of res.entries) {
      const local = await db.entries.get(e.id)
      if (!local || new Date(local.updatedAt) < new Date(e.updatedAt)) {
        await db.entries.put({ ...e, dirty: false })
      }
    }
  })
}

async function updatePendingCount(): Promise<void> {
  const all = await db.entries.toArray()
  pendingCount.value = all.filter((e) => e.dirty).length
}

/**
 * Пуляет и подтягивает изменения. Не блокирует запись, если не вышло —
 * это фоновая операция, вызывающий код её не ждёт как условие для UI.
 */
export async function runSync(): Promise<void> {
  if (syncing.value) return
  syncing.value = true
  lastSyncError.value = null

  try {
    const session = me.value ?? (await checkSession())
    if (!session) return // не вошли — синк просто не выполняется, это ок

    const since = await getLastSyncedAt()
    const pulled = await api.get<SyncResponse>(`/api/sync${since ? `?since=${encodeURIComponent(since)}` : ''}`)
    await mergePulled(pulled)

    const dirtyEntries = (await db.entries.toArray()).filter((e) => e.dirty)
    const allCategories = await db.categories.toArray()
    const allTags = await db.tags.toArray()

    if (dirtyEntries.length || allCategories.length || allTags.length) {
      const pushed = await api.post<PushResponse>('/api/sync', {
        categories: allCategories,
        tags: allTags,
        entries: dirtyEntries,
      })
      const acceptedIds = new Set(pushed.accepted.entries)
      await db.entries
        .where('id')
        .anyOf(dirtyEntries.map((e) => e.id))
        .filter((e) => acceptedIds.has(e.id))
        .modify({ dirty: false })
    }

    await setLastSyncedAt(pulled.serverTime)
  } catch (err) {
    lastSyncError.value = err instanceof Error ? err.message : 'sync_failed'
  } finally {
    await updatePendingCount()
    syncing.value = false
  }
}

let triggersInstalled = false

/** Триггеры ретрая: старт, online, visibilitychange — см. README. */
export function installSyncTriggers(): void {
  if (triggersInstalled) return
  triggersInstalled = true

  void runSync()
  updatePendingCount()

  window.addEventListener('online', () => void runSync())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void runSync()
  })
}
