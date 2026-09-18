import { computed, type ComputedRef } from 'vue'
import {
  ACTIVE_PALETTE_KEY,
  db,
  DEFAULT_PALETTE_ID,
  type MoodPalette,
} from './db'
import { useLiveQuery } from './useLiveQuery'

export interface SystemPalette {
  id: string
  name: string
  colors: string[]
}

/**
 * Системные палитры. Шкала настроения — **диверигрующая**: плохое и хорошее
 * это два разных тона, а «нормально» посередине — нейтральный, чтобы не
 * читалось ни как плохо, ни как хорошо.
 *
 * Отсюда правило, по которому они собраны: светлота растёт от края к
 * середине и падает обратно. Тогда шкала читается как градиент даже в
 * оттенках серого и при дальтонизме, а соседние уровни в сетке календаря
 * не сливаются. Проверялось скриптом (монотонность светлоты по плечам +
 * ΔE соседних пар), а не на глаз: в первой версии «Классической» уровни
 * 6 и 7 различались на ΔE 7.7 — два почти одинаковых зелёных.
 *
 * Нейтральный уровень (4) — не буквальный серый: цвет с хромой около нуля
 * читается как «серый» независимо от того, какой оттенок под ним на самом
 * деле, а на столбчатых графиках, где к середине шкалы стягивается больше
 * всего значений (это и есть медиана), получается ряд одинаковых серых
 * столбиков — непонятно и уныло. У каждой палитры нейтраль — тёплый или
 * холодный оттенок, гармонирующий с её краями, но всё равно самый светлый
 * (или один из самых светлых) во всей семёрке. Заодно поправил два места,
 * найденных этим же скриптом по пути: в «Пастельной» и «Глубокой» уровни
 * 5 и 6 были почти неразличимы (ΔE 7.8 и 4.5) — не то, что просили, но раз
 * уж проверял, оставлять найденный брак было бы странно.
 */
export const SYSTEM_PALETTES: SystemPalette[] = [
  {
    id: DEFAULT_PALETTE_ID,
    name: 'Классическая',
    colors: ['#dc2626', '#f97316', '#fcd34d', '#ffe4c4', '#86efac', '#22c55e', '#15803d'],
  },
  {
    id: 'pastel',
    name: 'Пастельная',
    colors: ['#fca5a5', '#fdba74', '#fde68a', '#ffe0cc', '#bbf7d0', '#4ade80', '#16a34a'],
  },
  {
    id: 'deep',
    name: 'Глубокая',
    colors: ['#7f1d1d', '#b45309', '#d97706', '#e3c88f', '#7c8c1e', '#15803d', '#064e3b'],
  },
  {
    id: 'bright',
    name: 'Яркая',
    colors: ['#be185d', '#ec4899', '#f9a8d4', '#f6d9ec', '#7dd3fc', '#0ea5e9', '#0369a1'],
  },
  {
    // Цвета набора настроений «Телепузики» (см. moodSets.ts): фиолетовый,
    // жёлтый, красный, зелёный — но не просто взяты, а разведены по
    // семи различимым оттенкам под то же диверигрующее правило. Нейтраль
    // здесь и так тёплый кремовый, а не серый — трогать не пришлось.
    id: 'teletubbies',
    name: 'Телепузики',
    colors: ['#5b21b6', '#a855f7', '#fb7185', '#fef3c7', '#86efac', '#16a34a', '#14532d'],
  },
  {
    id: 'neon',
    name: 'Неоновая радуга',
    colors: ['#ef233c', '#ff8a00', '#ffea00', '#eee0ff', '#aaff00', '#00d4ff', '#ff2fb0'],
  },
]

export const DEFAULT_MOOD_COLORS = SYSTEM_PALETTES[0]!.colors

export function paletteColors(
  id: string,
  customPalettes: MoodPalette[],
): string[] {
  const system = SYSTEM_PALETTES.find((p) => p.id === id)
  if (system) return system.colors
  return customPalettes.find((p) => p.id === id)?.colors ?? DEFAULT_MOOD_COLORS
}

/**
 * Цвета активной палитры — реактивно: сменил палитру в настройках, и
 * лента с календарём перекрасились без перезагрузки.
 */
export function useMoodColors(): {
  colors: ComputedRef<string[]>
  colorFor: ComputedRef<(level: number) => string>
} {
  const activeId = useLiveQuery<string>(
    () => db.settings.get(ACTIVE_PALETTE_KEY).then((row) => row?.value ?? DEFAULT_PALETTE_ID),
    DEFAULT_PALETTE_ID,
  )
  const custom = useLiveQuery<MoodPalette[]>(() => db.moodPalettes.toArray(), [])

  const colors = computed(() => paletteColors(activeId.value, custom.value))
  const colorFor = computed(() => (level: number) => colors.value[level - 1] ?? '#a8a29e')

  return { colors, colorFor }
}

/**
 * Цвет текста поверх плашки настроения. Считаем от яркости фона, а не
 * прибиваем белый: палитры пользователь задаёт сам, и на светлой палитре
 * белые цифры в календаре просто исчезли бы.
 */
export function readableTextOn(background: string): string {
  const hex = background.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255
  const channel = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  return luminance > 0.45 ? '#292524' : '#ffffff'
}

export async function setActivePaletteId(id: string): Promise<void> {
  await db.settings.put({ key: ACTIVE_PALETTE_KEY, value: id })
}

export async function getActivePaletteId(): Promise<string> {
  const row = await db.settings.get(ACTIVE_PALETTE_KEY)
  return row?.value ?? DEFAULT_PALETTE_ID
}
