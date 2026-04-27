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
