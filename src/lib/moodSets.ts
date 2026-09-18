import { DEFAULT_MOOD_SET_ID, type MoodEmojiSet } from './db'
import { MOOD_LEVELS } from './mood'

export interface MoodSet {
  id: string
  name: string
  /** 7 путей к картинкам, индекс 0 = уровень 1. Приоритетнее emojis. */
  images?: string[]
  /** 7 эмодзи, индекс 0 = уровень 1. Нет ни картинок, ни этого — берём эмодзи по умолчанию из MOOD_LEVELS. */
  emojis?: string[]
}

function teletubbiesImages(): string[] {
  return MOOD_LEVELS.map((level) => `/mood-sets/teletubbies/${level.value}.jpg`)
}

// Системные наборы, идущие в комплекте с приложением.
export const MOOD_SETS: MoodSet[] = [
  { id: DEFAULT_MOOD_SET_ID, name: 'Эмодзи (по умолчанию)' },
  { id: 'teletubbies', name: 'Телепузики', images: teletubbiesImages() },
]

/**
 * Разрешает id в набор — системный или свой. Своих наборов не знает заранее
 * (они в IndexedDB), поэтому их список передаётся параметром, как у палитр
 * (см. paletteColors в moodPalettes.ts). Не найден нигде — молча падаем на
 * дефолтный, чтобы удалённый активный набор не оставил экран без картинок.
 */
export function resolveMoodSet(id: string, customSets: MoodEmojiSet[] = []): MoodSet {
  const system = MOOD_SETS.find((set) => set.id === id)
  if (system) return system
  const custom = customSets.find((set) => set.id === id)
  if (custom) return { id: custom.id, name: custom.name, emojis: custom.emojis }
  return MOOD_SETS[0]!
}

/** Что реально показать в плитке уровня: картинка, кастомный эмодзи или эмодзи по умолчанию. */
export function moodSetEmoji(set: MoodSet, level: number): string {
  return set.emojis?.[level - 1] ?? MOOD_LEVELS[level - 1]?.emoji ?? '🙂'
}
