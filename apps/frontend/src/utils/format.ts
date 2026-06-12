export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function formatEnsWhole(value: string | number | bigint): string {
  const whole = String(value).split('.')[0] || '0'

  try {
    return BigInt(whole).toLocaleString('en-US')
  } catch {
    return whole
  }
}

interface FormatEnsAmountOptions {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  signDisplay?: 'never' | 'exceptZero'
}

export function formatEnsAmount(
  value: string | number,
  options: FormatEnsAmountOptions = {},
): string {
  const { minimumFractionDigits, maximumFractionDigits = 4, signDisplay = 'never' } = options
  const numericValue = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(numericValue)) return '0'

  const rounded = new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(Math.abs(numericValue))

  if (signDisplay === 'exceptZero' && numericValue > 0) return `+${rounded}`
  if (numericValue < 0) return `-${rounded}`
  return rounded
}

export function formatEnsCompact(value: string): string {
  const whole = Number(value.split('.')[0] || '0')
  if (whole >= 1_000_000) {
    const m = whole / 1_000_000
    const rounded = Math.round(m * 10) / 10
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}M`
  }
  if (whole >= 1_000) {
    const k = whole / 1_000
    const rounded = Math.round(k * 10) / 10
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}K`
  }
  return `${whole}`
}

export function formatUtcDate(
  iso: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    ...options,
  })
}

function getUtcDateParts(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
  }
}

export function formatUtcMonthRange(startIso: string, endIso: string): string {
  const start = getUtcDateParts(startIso)
  const end = getUtcDateParts(endIso)
  if (!start || !end) return ''

  const startMonth = formatUtcDate(startIso, { month: 'short' }).split(' ')[0]
  const endMonth = formatUtcDate(endIso, { month: 'short' }).split(' ')[0]

  if (start.year === end.year && start.month === end.month) {
    return `${startMonth} ${start.day}–${end.day}, ${start.year}`
  }

  if (start.year === end.year) {
    return `${startMonth} ${start.day} – ${endMonth} ${end.day}, ${start.year}`
  }

  return `${startMonth} ${start.day}, ${start.year} – ${endMonth} ${end.day}, ${end.year}`
}

export function getUtcMonthRange(startIso: string, offsetMonths = 0) {
  const start = getUtcDateParts(startIso)
  if (!start) return null

  const firstDay = new Date(Date.UTC(start.year, start.month + offsetMonths, 1))
  const year = firstDay.getUTCFullYear()
  const month = firstDay.getUTCMonth()
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const lastMoment = new Date(Date.UTC(year, month, lastDay, 23, 59, 59, 999))

  return {
    startDate: firstDay.toISOString(),
    endDate: lastMoment.toISOString(),
  }
}

export function formatTimeLeft(endDate: string, now = new Date()): string {
  const endMs = Date.parse(endDate)
  if (Number.isNaN(endMs)) return ''

  const diffMs = endMs - now.getTime()
  if (diffMs <= 0) return 'Ended'

  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24

  if (days > 0 && hours > 0) return `${days}d ${hours}h left`
  if (days > 0) return `${days}d left`
  return `${hours}h left`
}
