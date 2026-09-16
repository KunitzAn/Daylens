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
 * Системные палитры. Во всех шкала одна и та же: плохое — тёплое, хорошее —
 * зелёное, середина нарочно серая, чтобы «нормально» не читалось ни как
 * плохо, ни как хорошо. Отличаются насыщенностью, а не смыслом.
 */
export const SYSTEM_PALETTES: SystemPalette[] = [
  {
    id: DEFAULT_PALETTE_ID,
    name: 'Классическая',
    colors: ['#ef4444', '#f97316', '#f59e0b', '#a8a29e', '#a3e635', '#34d399', '#10b981'],
  },
  {
    id: 'pastel',
    name: 'Пастельная',
    colors: ['#fca5a5', '#fdba74', '#fcd34d', '#d6d3d1', '#bef264', '#6ee7b7', '#5eead4'],
  },
  {
    id: 'deep',
    name: 'Глубокая',
    colors: ['#b91c1c', '#c2410c', '#b45309', '#57534e', '#4d7c0f', '#047857', '#065f46'],
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

export async function setActivePaletteId(id: string): Promise<void> {
  await db.settings.put({ key: ACTIVE_PALETTE_KEY, value: id })
}

export async function getActivePaletteId(): Promise<string> {
  const row = await db.settings.get(ACTIVE_PALETTE_KEY)
  return row?.value ?? DEFAULT_PALETTE_ID
}
