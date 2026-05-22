import { useCallback, useMemo, useState } from 'react'
import { env } from '@/config/env'
import { MOCK_ENS_TO_ADDRESS } from '@/api/mock'
import type { VoterDetail } from '@/api/types'

export interface VoterEnsNamesController {
  /** Address-keyed map of resolved ENS names (null = no name found). */
  map: Map<string, string | null>
  /** Called by VoterCard children when wagmi resolves a name for an address. */
  report: (lowercasedAddress: string, name: string | null) => void
}

export function useVoterEnsNames(
  voters: VoterDetail[] | null,
): VoterEnsNamesController {
  const [reports, setReports] = useState<Map<string, string | null>>(() => new Map())

  const report = useCallback((addr: string, name: string | null) => {
    setReports((prev) => {
      if (prev.has(addr) && prev.get(addr) === name) return prev
      const next = new Map(prev)
      next.set(addr, name)
      return next
    })
  }, [])

  const map = useMemo<Map<string, string | null>>(() => {
    if (env.useMockApi) {
      const reverse = new Map<string, string>()
      for (const [name, addr] of Object.entries(MOCK_ENS_TO_ADDRESS)) {
        reverse.set(addr.toLowerCase(), name)
      }
      const out = new Map<string, string | null>()
      for (const v of voters ?? []) {
        if (v.ensName) continue
        const lower = v.address.toLowerCase()
        out.set(lower, reverse.get(lower) ?? null)
      }
      return out
    }
    return reports
  }, [voters, reports])

  return { map, report }
}
