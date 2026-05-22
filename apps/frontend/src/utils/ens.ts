export function looksLikeEnsName(input: string): boolean {
  const trimmed = input.trim()
  if (trimmed.length === 0) return false
  if (/\s/.test(trimmed)) return false
  if (/^0x/i.test(trimmed)) return false
  const dot = trimmed.lastIndexOf('.')
  if (dot <= 0 || dot === trimmed.length - 1) return false
  return true
}
