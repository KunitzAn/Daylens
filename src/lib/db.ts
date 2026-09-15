import Dexie, { type EntityTable } from 'dexie'

export interface Category {
  id: string
  name: string
  color: string // hex, все иконки тегов этой категории красятся в него
  sortOrder: number
  archivedAt: string | null
  updatedAt: string
}

export interface Tag {
  id: string
  categoryId: string
  name: string
  icon: string // имя компонента из @lucide/vue, напр. "Moon"
  sortOrder: number
  archivedAt: string | null
  updatedAt: string
}

export interface Entry {
  id: string
  date: string // YYYY-MM-DD, локальная дата — уникальна на юзера
  mood: number // 1–7
  note: string
  tagIds: string[]
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  dirty: boolean // не синхронизировано с сервером
}

export const db = new Dexie('daylens') as Dexie & {
  categories: EntityTable<Category, 'id'>
  tags: EntityTable<Tag, 'id'>
  entries: EntityTable<Entry, 'id'>
}

db.version(1).stores({
  categories: 'id, sortOrder, archivedAt',
  tags: 'id, categoryId, sortOrder, archivedAt',
  // &date — уникальный индекс, даёт правило «одна запись в день» на уровне IndexedDB
  // *tagIds — multi-entry индекс, позволяет искать записи по отдельному тегу
  entries: 'id, &date, dirty, deletedAt, *tagIds',
})

interface DefaultTag {
  name: string
  icon: string
}

interface DefaultCategory {
  name: string
  color: string
  tags: DefaultTag[]
}

const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    name: 'Сон',
    color: '#818cf8',
    tags: [
      { name: 'Выспался', icon: 'Moon' },
      { name: 'Лёг рано', icon: 'BedDouble' },
      { name: 'Мало спал', icon: 'AlarmClock' },
      { name: 'Дневной сон', icon: 'Sun' },
    ],
  },
  {
    name: 'Работа',
    color: '#fbbf24',
    tags: [
      { name: 'Продуктивный день', icon: 'Briefcase' },
      { name: 'Удалёнка', icon: 'Laptop' },
      { name: 'Встречи', icon: 'Presentation' },
      { name: 'Завал в почте', icon: 'Mail' },
    ],
  },
  {
    name: 'Спорт',
    color: '#34d399',
    tags: [
      { name: 'Тренировка', icon: 'Dumbbell' },
      { name: 'Прогулка', icon: 'Footprints' },
      { name: 'Велосипед', icon: 'Bike' },
      { name: 'Растяжка', icon: 'PersonStanding' },
    ],
  },
  {
    name: 'Люди',
    color: '#38bdf8',
    tags: [
      { name: 'Друзья', icon: 'Users' },
      { name: 'Свидание', icon: 'Heart' },
      { name: 'Созвон', icon: 'PhoneCall' },
      { name: 'Переписка', icon: 'MessageCircle' },
    ],
  },
  {
    name: 'Учёба',
    color: '#fb7185',
    tags: [
      { name: 'Читал', icon: 'BookOpen' },
      { name: 'Курс', icon: 'GraduationCap' },
      { name: 'Писал', icon: 'PenLine' },
      { name: 'Учил новое', icon: 'Brain' },
    ],
  },
  {
    name: 'Отдых',
    color: '#2dd4bf',
    tags: [
      { name: 'Природа', icon: 'Leaf' },
      { name: 'Игры', icon: 'Gamepad2' },
      { name: 'Кино/сериал', icon: 'Film' },
      { name: 'Творчество', icon: 'Palette' },
    ],
  },
]

export async function ensureDefaultCategoriesSeeded(): Promise<void> {
  const count = await db.categories.count()
  if (count > 0) return

  const now = new Date().toISOString()

  await db.transaction('rw', db.categories, db.tags, async () => {
    for (const [categoryIndex, category] of DEFAULT_CATEGORIES.entries()) {
      const categoryId = crypto.randomUUID()
      await db.categories.add({
        id: categoryId,
        name: category.name,
        color: category.color,
        sortOrder: categoryIndex,
        archivedAt: null,
        updatedAt: now,
      })
      await db.tags.bulkAdd(
        category.tags.map((tag, tagIndex) => ({
          id: crypto.randomUUID(),
          categoryId,
          name: tag.name,
          icon: tag.icon,
          sortOrder: tagIndex,
          archivedAt: null,
          updatedAt: now,
        })),
      )
    }
  })
}
