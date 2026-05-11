import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { useLottery } from './useLottery'

describe('useLottery', () => {
  it('fetches the latest paid round with lottery buckets', async () => {
    const { result } = renderHook(() => useLottery())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBeDefined()
    expect(result.current.data!.round.roundNumber).toBe(2)
    expect(result.current.data!.round.lottery?.buckets).toHaveLength(1)
    expect(result.current.data!.round.lottery?.totalPrizeEns).toBe('10.000000000000000000')
    expect(result.current.error).toBeNull()
  })

  it('returns null data (not an error) when no rounds are configured yet', async () => {
    server.use(
      http.get('/api/rounds', () => HttpResponse.json({
        currentRoundNumber: null,
        rounds: [],
      })),
    )

    const { result } = renderHook(() => useLottery())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })
})
