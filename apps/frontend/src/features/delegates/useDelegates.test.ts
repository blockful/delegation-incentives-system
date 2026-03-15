import { renderHook, waitFor } from '@testing-library/react'
import { useDelegates } from './useDelegates'

describe('useDelegates', () => {
  it('sets loading to true initially', () => {
    const { result } = renderHook(() => useDelegates())
    expect(result.current.loading).toBe(true)
  })

  it('fetches delegates and returns DelegateDetail array', async () => {
    const { result } = renderHook(() => useDelegates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.count).toBe(3)
    expect(result.current.data).toHaveLength(3)

    const first = result.current.data![0]
    expect(first.address).toBe('0x1234567890abcdef1234567890abcdef12345678')
    expect(first.votingPower).toBe('500000000000000000000')
    expect(first.delegatorCount).toBe(12)
    expect(first.last10ProposalsVoted).toHaveLength(10)
  })
})
