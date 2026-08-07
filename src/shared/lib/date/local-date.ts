export function parseLocalDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(year, month - 1, day)

  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) return null

  return parsed
}

export function toLocalDateString(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dateOnlyTimestamp(value: unknown): number | null {
  return parseLocalDate(value)?.getTime() ?? null
}

export function toExclusiveEndDate(value: string): string | null {
  const parsed = parseLocalDate(value)
  if (!parsed) return null
  parsed.setDate(parsed.getDate() + 1)
  return toLocalDateString(parsed)
}

export function toInclusiveEndDate(value: Date): string {
  const parsed = new Date(value)
  parsed.setDate(parsed.getDate() - 1)
  return toLocalDateString(parsed)
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateOnly(value: unknown): string {
  const parsed = parseLocalDate(value)
  return parsed
    ? `${String(parsed.getDate()).padStart(2, '0')}.${String(parsed.getMonth() + 1).padStart(2, '0')}.${parsed.getFullYear()}`
    : '-'
}
