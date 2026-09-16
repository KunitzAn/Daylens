export interface MoodLevel {
  value: number
  emoji: string
  label: string
  /** Яркий цвет уровня: карточка в ленте, клетка календаря, столбик графика. */
  color: string
}

// 1 — худший день, 7 — лучший. Шкала красный → нейтральный → зелёный:
// середина намеренно серая, чтобы «нормально» не читалось ни как плохо,
// ни как хорошо.
export const MOOD_LEVELS: MoodLevel[] = [
  { value: 1, emoji: '😭', label: 'Ужасно', color: '#ef4444' },
  { value: 2, emoji: '😢', label: 'Плохо', color: '#f97316' },
  { value: 3, emoji: '🙁', label: 'Так себе', color: '#f59e0b' },
  { value: 4, emoji: '😐', label: 'Нормально', color: '#a8a29e' },
  { value: 5, emoji: '🙂', label: 'Хорошо', color: '#a3e635' },
  { value: 6, emoji: '😄', label: 'Отлично', color: '#34d399' },
  { value: 7, emoji: '🤩', label: 'Прекрасно', color: '#10b981' },
]

export function moodLevel(value: number): MoodLevel | undefined {
  return MOOD_LEVELS.find((level) => level.value === value)
}
