export interface MoodLevel {
  value: number
  emoji: string
  label: string
}

// 1 — худший день, 7 — лучший
export const MOOD_LEVELS: MoodLevel[] = [
  { value: 1, emoji: '😭', label: 'Ужасно' },
  { value: 2, emoji: '😢', label: 'Плохо' },
  { value: 3, emoji: '🙁', label: 'Так себе' },
  { value: 4, emoji: '😐', label: 'Нормально' },
  { value: 5, emoji: '🙂', label: 'Хорошо' },
  { value: 6, emoji: '😄', label: 'Отлично' },
  { value: 7, emoji: '🤩', label: 'Прекрасно' },
]
