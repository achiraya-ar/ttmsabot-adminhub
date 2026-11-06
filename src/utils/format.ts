export function formatThaiDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatThaiDateShort(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getDayName(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('th-TH', { weekday: 'long' })
}

export function todayISO(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().split('T')[0]
}

export function getYear(dateString: string): number {
  return Number(dateString.slice(0, 4))
}

export function isUpcoming(dateString: string, today = todayISO()): boolean {
  return dateString >= today
}

export function formatNumber(value: number): string {
  return value.toLocaleString('th-TH')
}
