import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

const PARAM = 'compare'
const MAX = 4

function parse(raw: string | null): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(',')) {
    const addr = part.trim().toLowerCase()
    if (!addr) continue
    if (seen.has(addr)) continue
    seen.add(addr)
    out.push(addr)
    if (out.length >= MAX) break
  }
  return out
}

/**
 * URL-driven state for the Compare drawer: `?compare=0x...,0x...` (comma-separated,
 * lowercased, capped at 4 addresses). When the cap is hit and a new address is
 * toggled in, the oldest entry is dropped (FIFO) so users can keep exploring.
 */
export function useCompare(): {
  selected: string[]
  isSelected: (addr: string) => boolean
  toggle: (addr: string) => void
  clear: () => void
  count: number
} {
  const [params, setParams] = useSearchParams()

  const selected = useMemo(() => parse(params.get(PARAM)), [params])

  const isSelected = useCallback(
    (addr: string) => selected.includes(addr.toLowerCase()),
    [selected],
  )

  const toggle = useCallback(
    (addr: string) => {
      const lower = addr.toLowerCase()
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const current = parse(next.get(PARAM))
          let updated: string[]
          if (current.includes(lower)) {
            updated = current.filter((a) => a !== lower)
          } else if (current.length >= MAX) {
            // Replace oldest (FIFO) so users above the cap can keep adding.
            updated = [...current.slice(1), lower]
          } else {
            updated = [...current, lower]
          }
          if (updated.length === 0) {
            next.delete(PARAM)
          } else {
            next.set(PARAM, updated.join(','))
          }
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const clear = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete(PARAM)
        return next
      },
      { replace: true },
    )
  }, [setParams])

  return {
    selected,
    isSelected,
    toggle,
    clear,
    count: selected.length,
  }
}
