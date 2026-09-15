export function todayLocalDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDateHuman(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(parsed)
}
