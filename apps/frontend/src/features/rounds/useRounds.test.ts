import { renderHook, waitFor } from '@testing-library/react'
import { useRounds } from './useRounds'

describe('useRounds', () => {
  it('fetches tier progression data — currentTierIndex should be 1', async () => {
    const { result } = renderHook(() => useRounds())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.data?.currentTierIndex).toBe(1)
  })

  it('returns 6 tiers', async () => {
    const { result } = renderHook(() => useRounds())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data?.tiers).toHaveLength(6)
  })

  it("returns currentGrowthPct '12.40'", async () => {
    const { result } = renderHook(() => useRounds())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data?.currentGrowthPct).toBe('12.40')
  })
})
