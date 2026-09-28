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

/** Ключ в localStorage — см. applyAccent, нужен только для первого кадра. */
export const ACCENT_PAINT_CACHE_KEY = 'daylens:accent-hex'

/**
 * Ставит выбранный цвет в `--accent` на корне документа. Производные
 * (`--accent-ink` под белый текст, `--accent-soft` для подложек, `--app-bg`
 * для фона всех экранов) считаются в CSS, поэтому здесь достаточно одного
 * значения.
 */
export function applyAccent(id: string): void {
  const { hex } = resolveAccent(id)
  document.documentElement.style.setProperty('--accent', hex)

  // Дубль в localStorage — не второй источник правды, а кэш для первого
  // кадра: настоящий выбор лежит в Dexie, но IndexedDB асинхронный и до
  // первой отрисовки не успевает. Раньше это было незаметно (фон и так
  // почти белый), а с пастельным фоном каждый холодный старт мигал бы
  // нейтральным экраном. localStorage синхронный — инлайновый скрипт в
  // index.html читает его ещё до отрисовки.
  try {
    localStorage.setItem(ACCENT_PAINT_CACHE_KEY, hex)
  } catch {
    // Приватный режим/заблокированное хранилище — не повод падать,
    // худшее последствие тут вспышка нейтрального фона на старте.
  }

  syncThemeColor()
}

/**
 * Цвет полосы браузера под цвет фона — иначе в Safari и Chrome по верху
 * экрана идёт шов между бежевой полосой и пастельным фоном страницы.
 * Значение не пересчитываем в JS, а спрашиваем у браузера — формула
 * пастели остаётся в одном месте, в CSS. Спрашиваем именно посчитанный
 * `background-color` элемента, а не саму переменную `--app-bg`: у
 * кастомных свойств getPropertyValue отдаёт исходный текст, и в мету
 * уезжала строка `oklch(from #8b5cf6 .955 min(c, .05) h)`, которую
 * парсер меты не понимает. У background-color тот же цвет уже сведён к
 * конкретному значению — и для oklch-ветки, и для color-mix-фоллбэка.
 */
function syncThemeColor(): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta || !document.body) return
  const bg = getComputedStyle(document.body).backgroundColor
  if (bg) meta.content = bg
}

export async function getActiveAccentId(): Promise<string> {
  const row = await db.settings.get(ACTIVE_ACCENT_KEY)
  return row?.value ?? DEFAULT_ACCENT_ID
}

export async function setActiveAccentId(id: string): Promise<void> {
  await db.settings.put({ key: ACTIVE_ACCENT_KEY, value: id })
  applyAccent(id)
}
