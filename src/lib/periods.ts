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

// --- Календарные окна для экрана статистики по настроению ---
//
// В отличие от buildBuckets («последние N периодов», листать нельзя),
// это окна с явной навигацией назад/вперёд — «какой у меня был август»,
// а не «что происходит в последнее время». Две разные модели для двух
// разных вопросов, см. README.

export type StatsScale = 'month' | 'year' | 'all'

export interface StatsUnit {
  key: string
  /** Дни этой единицы полоски частоты — один день (месяц-окно) либо месяц (год/всё время). */
  dates: string[]
}

export interface StatsWindow {
  key: string
  title: string
  /** Даты окна, не длиннее сегодняшнего дня. */
  dates: string[]
  units: StatsUnit[]
  /** Можно ли перелистнуть на следующее окно — false на текущем месяце/годе. */
  canGoNext: boolean
}

export interface MonthAnchor {
  year: number
  month: number // 1–12
}

export function currentMonthAnchor(today = todayLocalDate()): MonthAnchor {
  const d = parse(today)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function shiftMonthAnchor(anchor: MonthAnchor, delta: number): MonthAnchor {
  const zeroBased = anchor.month - 1 + delta
  return {
    year: anchor.year + Math.floor(zeroBased / 12),
    month: ((zeroBased % 12) + 12) % 12 + 1,
  }
}

export function buildMonthWindow(anchor: MonthAnchor, today = todayLocalDate()): StatsWindow {
  const start = new Date(anchor.year, anchor.month - 1, 1)
  const end = new Date(anchor.year, anchor.month, 0)
  const dates = daysBetween(start, end, today)
  const current = currentMonthAnchor(today)
  return {
    key: `${anchor.year}-${pad(anchor.month)}`,
    title: `${MONTHS_FULL[anchor.month - 1]} ${anchor.year}`,
    dates,
    // Юнит полоски частоты на масштабе «месяц» — один день.
    units: dates.map((date) => ({ key: date, dates: [date] })),
    canGoNext: anchor.year < current.year || (anchor.year === current.year && anchor.month < current.month),
  }
}

export function buildYearWindow(year: number, today = todayLocalDate()): StatsWindow {
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  const dates = daysBetween(start, end, today)

  const units: StatsUnit[] = []
  for (let m = 0; m < 12; m++) {
    const monthDates = daysBetween(new Date(year, m, 1), new Date(year, m + 1, 0), today)
    if (monthDates.length === 0) break // будущий месяц ещё не наступил
    units.push({ key: `${year}-${pad(m + 1)}`, dates: monthDates })
  }

  const currentYear = Number(today.slice(0, 4))
  return {
    key: String(year),
    title: `${year} год`,
    dates,
    units,
    canGoNext: year < currentYear,
  }
}

/**
 * Окно «Всё время» — от первой записи пользователя до сегодня. В отличие от
 * месяца/года это не календарная сетка, а диапазон, зависящий от данных,
 * поэтому строится не от якоря, а от списка дат всех записей. Юниты —
 * помесячные, тем же способом, что и в годовом окне (иначе на годах данных
 * полоска частоты была бы из тысяч дневных точек).
 */
export function buildAllTimeWindow(entryDates: string[], today = todayLocalDate()): StatsWindow {
  if (entryDates.length === 0) {
    return { key: 'all', title: 'Всё время', dates: [], units: [], canGoNext: false }
  }
  const earliest = entryDates.reduce((min, d) => (d < min ? d : min))
  const start = parse(earliest)
  const end = parse(today)
  const dates = daysBetween(start, end, today)

  const units: StatsUnit[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const endCursor = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cursor <= endCursor) {
    const monthDates = daysBetween(cursor, new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), today)
    units.push({ key: toKey(cursor), dates: monthDates })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return { key: 'all', title: 'Всё время', dates, units, canGoNext: false }
}
