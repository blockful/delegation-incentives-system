import { renderHook, waitFor } from '@testing-library/react'
import { TestQueryProvider } from '@/test/utils'
import { useVoters } from './useVoters'

describe('useVoters', () => {
  it('sets loading to true initially', () => {
    const { result } = renderHook(() => useVoters(), { wrapper: TestQueryProvider })
    expect(result.current.loading).toBe(true)
  })

  it('fetches voters and returns VoterDetail array', async () => {
    const { result } = renderHook(() => useVoters(), { wrapper: TestQueryProvider })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.count).toBe(3)
    expect(result.current.data).toHaveLength(3)

    const first = result.current.data![0]
    expect(first.address).toBe('0x1234567890abcdef1234567890abcdef12345678')
    expect(first.votingPower).toBe('500000000000000000000')
    expect(first.tokenHolderCount).toBe(12)
    expect(first.last10ProposalsVoted).toHaveLength(10)
  })
})
