import { todayLocalDate } from './date'

export type Granularity = 'day' | 'week' | 'month'

export interface Bucket {
  key: string
  /** Короткая подпись под столбиком. */
  label: string
  /** Полное название — для строки выбранного периода. */
  title: string
  /** Даты внутри периода. Будущее отрезано: иначе текущая неделя и текущий
   *  месяц всегда выглядели бы полупустыми не по вине пользователя. */
  dates: string[]
}

/** Период плюс посчитанное по нему значение — то, что рисует MoodBarChart. */
export interface ChartBar {
  key: string
  label: string
  title: string
  /** Среднее настроение за период; null — записей нет. */
  value: number | null
  color: string | undefined
  /** Доля дней бакета с выбранным действием (0–1). null — фильтр по действию не активен
   *  или в бакете нет записей вовсе. Используется только для точек-маркеров под графиком. */
  markerShare?: number | null
}

export const GRANULARITIES: { value: Granularity; label: string; chartTitle: string }[] = [
  { value: 'day', label: 'Дни', chartTitle: 'Настроение по дням' },
  { value: 'week', label: 'Недели', chartTitle: 'Настроение по неделям' },
  { value: 'month', label: 'Месяцы', chartTitle: 'Настроение по месяцам' },
]

/** Сколько периодов показываем — столько, сколько читаемо помещается в ряд. */
export const BUCKET_COUNT: Record<Granularity, number> = { day: 14, week: 12, month: 12 }

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const MONTHS_FULL = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]
const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parse(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

/** Дни от from до to включительно, но не позже сегодняшнего. */
function daysBetween(from: Date, to: Date, today: string): string[] {
  const out: string[] = []
  const cursor = new Date(from)
  while (cursor <= to) {
    const key = toKey(cursor)
    if (key > today) break
    out.push(key)
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

function dayBuckets(count: number, today: string): Bucket[] {
  const out: Bucket[] = []
  const cursor = parse(today)
  cursor.setDate(cursor.getDate() - (count - 1))
  for (let i = 0; i < count; i++) {
    const key = toKey(cursor)
    out.push({
      key,
      label: `${pad(cursor.getDate())}.${pad(cursor.getMonth() + 1)}`,
      title: `${cursor.getDate()} ${MONTHS_GENITIVE[cursor.getMonth()]}`,
      dates: [key],
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

function weekBuckets(count: number, today: string): Bucket[] {
  // Неделя начинается с понедельника — как в календаре приложения.
  const monday = parse(today)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  monday.setDate(monday.getDate() - (count - 1) * 7)

  const out: Bucket[] = []
  for (let i = 0; i < count; i++) {
    const start = new Date(monday)
    const end = new Date(monday)
    end.setDate(end.getDate() + 6)

    const sameMonth = start.getMonth() === end.getMonth()
    out.push({
      key: toKey(start),
      label: `${pad(start.getDate())}.${pad(start.getMonth() + 1)}`,
      title: sameMonth
        ? `${start.getDate()}–${end.getDate()} ${MONTHS_GENITIVE[start.getMonth()]}`
        : `${start.getDate()} ${MONTHS_GENITIVE[start.getMonth()]} – ${end.getDate()} ${MONTHS_GENITIVE[end.getMonth()]}`,
      dates: daysBetween(start, end, today),
    })
    monday.setDate(monday.getDate() + 7)
  }
  return out
}

function monthBuckets(count: number, today: string): Bucket[] {
  const cursor = parse(today)
  cursor.setDate(1)
  cursor.setMonth(cursor.getMonth() - (count - 1))

  const out: Bucket[] = []
  for (let i = 0; i < count; i++) {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    out.push({
      key: `${start.getFullYear()}-${pad(start.getMonth() + 1)}`,
      label: MONTHS_SHORT[start.getMonth()]!,
      title: `${MONTHS_FULL[start.getMonth()]} ${start.getFullYear()}`,
      dates: daysBetween(start, end, today),
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return out
}

export function buildBuckets(granularity: Granularity, today = todayLocalDate()): Bucket[] {
  const count = BUCKET_COUNT[granularity]
  if (granularity === 'day') return dayBuckets(count, today)
  if (granularity === 'week') return weekBuckets(count, today)
  return monthBuckets(count, today)
}
