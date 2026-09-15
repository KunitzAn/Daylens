import { DEFAULT_MOOD_SET_ID } from './db'
import { MOOD_LEVELS } from './mood'

export interface MoodSet {
  id: string
  name: string
  /** 7 путей к картинкам, индекс 0 = уровень 1. Нет картинок — рендерим эмодзи. */
  images?: string[]
}

function teletubbiesImages(): string[] {
  return MOOD_LEVELS.map((level) => `/mood-sets/teletubbies/${level.value}.jpg`)
}

// Системные наборы, идущие в комплекте с приложением. Свои и публичные
// наборы пользователей — после MVP, см. README.
export const MOOD_SETS: MoodSet[] = [
  { id: DEFAULT_MOOD_SET_ID, name: 'Эмодзи (по умолчанию)' },
  { id: 'teletubbies', name: 'Телепузики', images: teletubbiesImages() },
]

export function resolveMoodSet(id: string): MoodSet {
  return MOOD_SETS.find((set) => set.id === id) ?? MOOD_SETS[0]
}
