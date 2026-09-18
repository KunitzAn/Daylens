import { ACTIVE_ACCENT_KEY, db, DEFAULT_ACCENT_ID } from './db'

export interface Accent {
  id: string
  name: string
  /** Неоновый тон. В заливку под белым текстом он не идёт — см. applyAccent. */
  hex: string
}

export const ACCENTS: Accent[] = [
  { id: 'violet', name: 'Фиолетовый', hex: '#8b5cf6' },
  { id: 'pink', name: 'Розовый', hex: '#ff4d9d' },
  { id: 'cyan', name: 'Голубой', hex: '#22d3ee' },
  { id: 'magenta', name: 'Маджента', hex: '#e040fb' },
  { id: 'mint', name: 'Мятный', hex: '#00e5a0' },
  { id: 'coral', name: 'Коралловый', hex: '#ff5c38' },
  { id: 'lime', name: 'Лаймовый', hex: '#b8f000' },
]

export function resolveAccent(id: string): Accent {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0]!
}

/**
 * Ставит выбранный цвет в `--accent` на корне документа. Производные
 * (`--accent-ink` под белый текст, `--accent-soft` для подложек) считаются
 * в CSS через color-mix, поэтому здесь достаточно одного значения.
 */
export function applyAccent(id: string): void {
  document.documentElement.style.setProperty('--accent', resolveAccent(id).hex)
}

export async function getActiveAccentId(): Promise<string> {
  const row = await db.settings.get(ACTIVE_ACCENT_KEY)
  return row?.value ?? DEFAULT_ACCENT_ID
}

export async function setActiveAccentId(id: string): Promise<void> {
  await db.settings.put({ key: ACTIVE_ACCENT_KEY, value: id })
  applyAccent(id)
}
