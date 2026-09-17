import { ref } from 'vue'
import { checkSession, me } from './auth'
import { db, ensureDefaultCategoriesSeeded, type Category, type Entry, type Tag } from './db'
import { api } from './api'

const LAST_SYNCED_AT_KEY = 'lastSyncedAt'
const SYNCED_USER_ID_KEY = 'syncedUserId'

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

async function getSyncedUserId(): Promise<number | null> {
  const row = await db.settings.get(SYNCED_USER_ID_KEY)
  return row ? Number(row.value) : null
}

/**
 * На устройстве сменился аккаунт. Дневник прежнего владельца стираем:
 * держать его локально — это и чужие записи в чьей-то ленте, и сломанный
 * курсор (`since` от прошлого аккаунта заставляет сервер отдавать только
 * то, что новее чужой синхронизации, то есть почти ничего).
 */
async function resetLocalDiary(): Promise<void> {
  await db.transaction('rw', db.categories, db.tags, db.entries, db.settings, async () => {
    await db.categories.clear()
    await db.tags.clear()
    await db.entries.clear()
    await db.settings.delete(LAST_SYNCED_AT_KEY)
  })
}

async function mergePulled(res: SyncResponse, isFirstSyncOnDevice: boolean): Promise<void> {
  await db.transaction('rw', db.categories, db.tags, db.entries, async () => {
    if (isFirstSyncOnDevice && (res.categories.length > 0 || res.tags.length > 0)) {
      // Первый синк на этом устройстве: локальные разделы/теги — это ещё
      // не тронутые дефолты (сид срабатывает до входа, до того как
      // известно, есть ли аккаунт — main.ts просто не может это знать
      // заранее). У сервера уже есть настоящий набор пользователя —
      // берём его целиком вместо мёржа по id, иначе дефолты и серверные
      // раздвоятся (ровно то, что случилось при первом тесте этого флоу).
      // Записи (entries) сюда не входят — это не дефолты, а реальные
      // данные, если пользователь успел что-то занести офлайн до входа.
      await db.categories.clear()
      await db.tags.clear()
    }
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
      // Один день — одна запись: `date` в Dexie уникален. Если день уже занят
      // строкой с другим id (дневник прежнего аккаунта; день, заведённый
      // офлайн до входа), то put() упал бы на индексе и оборвал транзакцию
      // целиком — устройство перестало бы синхронизироваться вообще, молча.
      // Разводим по тому же last-write-wins, но так, чтобы на дату всегда
      // оставалась ровно одна строка.
      const occupant = await db.entries.where('date').equals(e.date).first()
      if (occupant && occupant.id !== e.id) {
        if (new Date(occupant.updatedAt) >= new Date(e.updatedAt)) continue
        await db.entries.delete(occupant.id)
      }

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

    const previousUserId = await getSyncedUserId()
    const switchedAccount = previousUserId !== null && previousUserId !== session.userId
    if (switchedAccount) await resetLocalDiary()

    // Курсор есть, а владельца мы не записывали — устройство синхронизировалось
    // версией до появления syncedUserId. Чей это дневник, проверить нечем, а
    // курсор мог остаться от другого аккаунта и прятать всё чужое как «не
    // новее». Сбрасываем только курсор: pull с нуля заменит разделы и теги
    // серверными (см. mergePulled), а локальные записи не трогаем — среди них
    // могут быть неотправленные, и терять их ради разовой миграции нельзя.
    if (!switchedAccount && previousUserId === null && (await getLastSyncedAt()) !== null) {
      await db.settings.delete(LAST_SYNCED_AT_KEY)
    }

    const since = await getLastSyncedAt()
    const pulled = await api.get<SyncResponse>(`/api/sync${since ? `?since=${encodeURIComponent(since)}` : ''}`)
    await mergePulled(pulled, since === null)

    // После смены аккаунта разделов может не быть вообще (новый пользователь),
    // а сид из main.ts отрабатывает только на старте приложения. Сеем здесь,
    // до пуша, чтобы дефолты сразу уехали на сервер.
    if (switchedAccount) await ensureDefaultCategoriesSeeded()

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
    await db.settings.put({ key: SYNCED_USER_ID_KEY, value: String(session.userId) })
  } catch (err) {
    lastSyncError.value = err instanceof Error ? err.message : 'sync_failed'
  } finally {
    await updatePendingCount()
    syncing.value = false
  }
}

let triggersInstalled = false

/**
 * Триггеры ретрая: online, visibilitychange — см. README. Начальный синк
 * сюда не входит: его нужно дождаться *до* сидинга дефолтных разделов
 * (см. main.ts) — иначе на новом устройстве локальный сид гонится с
 * пуллом чужих (точнее, уже существующих на сервере) разделов и даёт
 * дубли.
 */
export function installSyncTriggers(): void {
  if (triggersInstalled) return
  triggersInstalled = true

  void updatePendingCount()

  window.addEventListener('online', () => void runSync())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void runSync()
  })
}
