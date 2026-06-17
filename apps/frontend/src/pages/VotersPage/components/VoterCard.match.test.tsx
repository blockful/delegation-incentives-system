import { screen } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import type { MatchScore } from '@ens-dis/domain'
import type { VoterDetail } from '@/api/types'
import { VoterCard } from './VoterCard'

function voter(overrides: Partial<VoterDetail> = {}): VoterDetail {
  return {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    ensName: 'alice.eth',
    avatarUrl: null,
    votingPower: '1000000000000000000000',
    votesInLast10: 8,
    last10ProposalsVoted: [true, true, true, true, true, true, true, true, false, false],
    last10Proposals: [],
    tokenHolderCount: 10,
    activeSince: null,
    words: null,
    ...overrides,
  }
}

const strong: MatchScore = {
  percent: 80,
  strongMatch: true,
  sharedWords: ['a', 'b', 'c', 'd'],
  aUnique: ['e'],
  bUnique: ['f'],
}
const partial: MatchScore = {
  percent: 60,
  strongMatch: false,
  sharedWords: ['a', 'b', 'c'],
  aUnique: ['d', 'e'],
  bUnique: ['f', 'g'],
}

describe('VoterCard match variants', () => {
  it('renders the strong-match line + percent', () => {
    renderApp(<VoterCard voter={voter()} match={strong} viewerHasSelected />)
    expect(screen.getByText(/strong match with your values/i)).toBeInTheDocument()
    expect(screen.getByText('80% Match')).toBeInTheDocument()
  })

  it('renders the partial-match shared-word count', () => {
    renderApp(<VoterCard voter={voter()} match={partial} viewerHasSelected />)
    expect(screen.getByText(/shares 3 of your words/i)).toBeInTheDocument()
    expect(screen.getByText('60% Match')).toBeInTheDocument()
  })

  it('renders the "delegate didn\'t pick" state when the delegate is unselected', () => {
    renderApp(<VoterCard voter={voter()} match={null} viewerHasSelected />)
    expect(screen.getByText(/delegate didn.t pick priorities/i)).toBeInTheDocument()
    expect(screen.getByText('– Match')).toBeInTheDocument()
  })

  it('shows no match line when the viewer has not selected', () => {
    renderApp(<VoterCard voter={voter()} match={null} viewerHasSelected={false} />)
    expect(screen.queryByText(/Match/)).not.toBeInTheDocument()
  })
})
