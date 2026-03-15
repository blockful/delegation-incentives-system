import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useLottery } from './useLottery'

describe('useLottery', () => {
  it('fetches distribution and returns lottery pools', async () => {
    const { result } = renderHook(() => useLottery())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBeDefined()
    expect(result.current.data!.lotteryPools).toHaveLength(1)
    expect(result.current.data!.lotteryPools[0].totalPrizeEns).toBe('8.00')
    expect(result.current.error).toBeNull()
  })
})
