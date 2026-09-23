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
