export function todayLocalDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year!, month! - 1, day!)
}

export function formatDateHuman(date: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(
    parseLocalDate(date),
  )
}

/** «суббота, 29 авг.» — заголовок карточки в ленте. */
export function formatDateWithWeekday(date: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(parseLocalDate(date))
}

/** Время записи — из createdAt, не из даты дня. */
export function formatTime(isoTimestamp: string): string {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(isoTimestamp),
  )
}

export function isFutureDate(date: string): boolean {
  return date > todayLocalDate()
}
