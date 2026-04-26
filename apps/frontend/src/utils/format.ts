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
