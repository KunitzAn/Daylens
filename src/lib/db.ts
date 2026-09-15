import Dexie, { type EntityTable } from 'dexie'

export interface Sphere {
  id: string
  name: string
  emoji: string
  sortOrder: number
  archivedAt: string | null
  updatedAt: string
}

export interface Entry {
  id: string
  date: string // YYYY-MM-DD, локальная дата — уникальна на юзера
  mood: number // 1–7
  note: string
  sphereIds: string[]
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  dirty: boolean // не синхронизировано с сервером
}

export const db = new Dexie('daylens') as Dexie & {
  spheres: EntityTable<Sphere, 'id'>
  entries: EntityTable<Entry, 'id'>
}

db.version(1).stores({
  // &date — уникальный индекс, даёт правило «одна запись в день» на уровне IndexedDB
  // *sphereIds — multi-entry индекс, позволяет искать записи по отдельной сфере
  entries: 'id, &date, dirty, deletedAt, *sphereIds',
  spheres: 'id, sortOrder, archivedAt',
})

const DEFAULT_SPHERES: Array<Pick<Sphere, 'name' | 'emoji'>> = [
  { name: 'Сон', emoji: '😴' },
  { name: 'Работа', emoji: '💼' },
  { name: 'Спорт', emoji: '🏃' },
  { name: 'Люди', emoji: '👥' },
  { name: 'Учёба', emoji: '📚' },
  { name: 'Отдых', emoji: '🌿' },
]

export async function ensureDefaultSpheresSeeded(): Promise<void> {
  const count = await db.spheres.count()
  if (count > 0) return

  const now = new Date().toISOString()
  await db.spheres.bulkAdd(
    DEFAULT_SPHERES.map((sphere, index) => ({
      id: crypto.randomUUID(),
      name: sphere.name,
      emoji: sphere.emoji,
      sortOrder: index,
      archivedAt: null,
      updatedAt: now,
    })),
  )
}
