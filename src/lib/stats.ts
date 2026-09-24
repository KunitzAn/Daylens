import type { Entry } from './db'

export interface MoodAverage {
  average: number | null
  days: number
}

/** Доля заполненных дней бакета, где встречается тег. null — в бакете вообще нет записей. */
export function bucketTagShare(entryByDate: Map<string, Entry>, dates: string[], tagId: string): number | null {
  let filled = 0
  let withTag = 0
  for (const date of dates) {
    const entry = entryByDate.get(date)
    if (!entry) continue
    filled++
    if (entry.tagIds.includes(tagId)) withTag++
  }
  return filled ? withTag / filled : null
}

export interface TagMoodComparison {
  withTag: MoodAverage
  withoutTag: MoodAverage
}

/** Среднее настроение в дни с выбранным действием и в дни без него, за один и тот же диапазон дат. */
export function tagMoodComparison(
  entryByDate: Map<string, Entry>,
  dates: string[],
  tagId: string,
): TagMoodComparison {
  let withSum = 0
  let withCount = 0
  let withoutSum = 0
  let withoutCount = 0
  for (const date of dates) {
    const entry = entryByDate.get(date)
    if (!entry) continue
    if (entry.tagIds.includes(tagId)) {
      withSum += entry.mood
      withCount++
    } else {
      withoutSum += entry.mood
      withoutCount++
    }
  }
  return {
    withTag: { average: withCount ? withSum / withCount : null, days: withCount },
    withoutTag: { average: withoutCount ? withoutSum / withoutCount : null, days: withoutCount },
  }
}

/** Сколько дней диапазона заполнены записью именно с этим уровнем настроения. */
export function countMoodDays(entryByDate: Map<string, Entry>, dates: string[], level: number): number {
  let count = 0
  for (const date of dates) {
    if (entryByDate.get(date)?.mood === level) count++
  }
  return count
}

export interface MoodRun {
  days: number
  startDate: string | null
  endDate: string | null
}

/**
 * Самая длинная серия дней подряд с этим настроением и отдельно — без него.
 * Дата без записи рвёт обе серии: считать пропуск за «настроения не было»
 * было бы враньём (мы не знаем, какой был день), а тянуть серию сквозь
 * пропуск — тем более. `dates` обязаны быть календарными днями подряд, по
 * возрастанию — то, что уже отдаёт StatsWindow.
 */
export function longestMoodRuns(
  entryByDate: Map<string, Entry>,
  dates: string[],
  level: number,
): { withLevel: MoodRun; withoutLevel: MoodRun } {
  let withStart: string | null = null
  let withLen = 0
  let bestWith: MoodRun = { days: 0, startDate: null, endDate: null }

  let withoutStart: string | null = null
  let withoutLen = 0
  let bestWithout: MoodRun = { days: 0, startDate: null, endDate: null }

  let lastDate: string | null = null

  const flushWith = () => {
    if (withLen > bestWith.days) bestWith = { days: withLen, startDate: withStart, endDate: lastDate }
    withLen = 0
    withStart = null
  }
  const flushWithout = () => {
    if (withoutLen > bestWithout.days) bestWithout = { days: withoutLen, startDate: withoutStart, endDate: lastDate }
    withoutLen = 0
    withoutStart = null
  }

  for (const date of dates) {
    const entry = entryByDate.get(date)
    if (!entry) {
      flushWith()
      flushWithout()
      lastDate = null
      continue
    }
    if (entry.mood === level) {
      if (withLen === 0) withStart = date
      withLen++
      flushWithout()
    } else {
      if (withoutLen === 0) withoutStart = date
      withoutLen++
      flushWith()
    }
    lastDate = date
  }
  flushWith()
  flushWithout()

  return { withLevel: bestWith, withoutLevel: bestWithout }
}

export interface TagMoodAffinity {
  tagId: string
  /** Дней с этим тегом среди дней с нужным настроением. */
  matchingDays: number
  /** Всего дней с нужным настроением в диапазоне (знаменатель для matchingDays). */
  matchingTotal: number
  /** Дней с этим тегом среди ВСЕХ заполненных дней диапазона — обычная частота тега. */
  baselineDays: number
  /** Всего заполненных дней диапазона (знаменатель для baselineDays). */
  baselineTotal: number
}

/**
 * Насколько каждое действие характерно для дней с этим настроением — не
 * просто «встречалось в 80% таких дней», а «настолько чаще, чем обычно»:
 * без базовой частоты «прогулка в 80% грустных дней» ничего не говорит,
 * если прогулка вообще в 80% всех дней. Отдаёт только теги, которые хотя
 * бы раз встретились в день с нужным настроением — обогащение до Tag
 * (иконка/цвет/имя) и сортировка остаются на вызывающей стороне, как и
 * для tagCounts на главном экране статистики.
 */
export function tagMoodAffinity(entryByDate: Map<string, Entry>, dates: string[], level: number): TagMoodAffinity[] {
  const matchingCounts = new Map<string, number>()
  const baselineCounts = new Map<string, number>()
  let matchingTotal = 0
  let baselineTotal = 0

  for (const date of dates) {
    const entry = entryByDate.get(date)
    if (!entry) continue
    baselineTotal++
    for (const tagId of entry.tagIds) baselineCounts.set(tagId, (baselineCounts.get(tagId) ?? 0) + 1)
    if (entry.mood === level) {
      matchingTotal++
      for (const tagId of entry.tagIds) matchingCounts.set(tagId, (matchingCounts.get(tagId) ?? 0) + 1)
    }
  }

  return [...matchingCounts.entries()].map(([tagId, matchingDays]) => ({
    tagId,
    matchingDays,
    matchingTotal,
    baselineDays: baselineCounts.get(tagId) ?? 0,
    baselineTotal,
  }))
}

/** Даты диапазона с этим настроением, по убыванию (свежие сверху). */
export function moodDays(entryByDate: Map<string, Entry>, dates: string[], level: number): string[] {
  return dates.filter((date) => entryByDate.get(date)?.mood === level).reverse()
}
