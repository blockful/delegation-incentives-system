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
    // A non-null `match` already implies both sides ranked; `words` mirrors that
    // so the card's delegateHasRanked derivation stays consistent.
    words: ['a', 'b', 'c', 'd', 'e'],
    match: null,
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
const weak: MatchScore = {
  percent: 20,
  strongMatch: false,
  sharedWords: ['a'],
  aUnique: ['b', 'c', 'd', 'e'],
  bUnique: ['public_goods_funding', 'ens_adoption'],
}

describe('VoterCard match variants', () => {
  it('renders the strong-match subtitle + percent in the Match stat', () => {
    renderApp(<VoterCard voter={voter()} match={strong} viewerHasSelected />)
    expect(screen.getByText(/strong match/i)).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('Match')).toBeInTheDocument()
  })

  it('renders the partial-match subtitle (replacing the shared-word count)', () => {
    renderApp(<VoterCard voter={voter()} match={partial} viewerHasSelected />)
    expect(screen.getByText('Partial match')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.queryByText(/shares 3 of your words/i)).not.toBeInTheDocument()
  })

  it('renders the weak-match subtitle but no diverging-word chips', () => {
    renderApp(<VoterCard voter={voter()} match={weak} viewerHasSelected />)
    expect(screen.getByText('Weak match')).toBeInTheDocument()
    expect(screen.getByText('20%')).toBeInTheDocument()
    // Weak matches no longer surface the delegate's diverging picks.
    expect(screen.queryByText('Public Goods Funding')).not.toBeInTheDocument()
    expect(screen.queryByText('ENS Adoption')).not.toBeInTheDocument()
  })

  it('shows the "delegate didn\'t rank" state when the delegate is unranked', () => {
    renderApp(
      <VoterCard voter={voter({ words: null })} match={null} viewerHasSelected />,
    )
    expect(screen.getByText(/delegate didn.t rank priorities/i)).toBeInTheDocument()
    // The Match stat shows the em dash placeholder.
    expect(screen.getByText('–')).toBeInTheDocument()
  })

  it('prompts the holder to rank when the viewer has not selected', () => {
    renderApp(
      <VoterCard voter={voter()} match={null} viewerHasSelected={false} />,
    )
    expect(screen.getByText(/rank to see your match/i)).toBeInTheDocument()
    // The Match stat shows the "?" placeholder.
    expect(screen.getByText('?')).toBeInTheDocument()
  })
})
