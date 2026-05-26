import { screen } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { VoterCard } from './VoterCard'
import type { VoterDetail } from '@/api/types'

const fullVoter: VoterDetail = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  ensName: 'alice.eth',
  avatarUrl: null,
  votingPower: '42000000000000000000000',
  votesInLast10: 9,
  tokenHolderCount: 128,
  activeSince: '2024-01-15T00:00:00Z',
  last10ProposalsVoted: [true, true, true, true, true, true, true, true, true, false],
  last10Proposals: [],
}

const minimalVoter: VoterDetail = {
  address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  ensName: null,
  avatarUrl: null,
  votingPower: '0',
  votesInLast10: 7,
  tokenHolderCount: 0,
  activeSince: null,
  last10ProposalsVoted: [true, true, true, true, true, true, true, false, false, false],
  last10Proposals: [],
}

describe('VoterCard', () => {
  it('renders ENS name', () => {
    renderApp(<VoterCard voter={fullVoter} />)
    expect(screen.getByText('alice.eth')).toBeInTheDocument()
  })

  it('renders truncated address', () => {
    renderApp(<VoterCard voter={fullVoter} />)
    expect(screen.getByText('0x1234…5678')).toBeInTheDocument()
  })

  it('renders voting power formatted compactly', () => {
    renderApp(<VoterCard voter={fullVoter} />)
    expect(screen.getByText('42K')).toBeInTheDocument()
    expect(screen.getByText('Voting Power')).toBeInTheDocument()
  })

  it('renders proposal score', () => {
    renderApp(<VoterCard voter={fullVoter} />)
    expect(screen.getByText('9/10')).toBeInTheDocument()
  })

  it('renders delegate button when not delegated', () => {
    renderApp(<VoterCard voter={fullVoter} />)
    expect(screen.getByRole('button', { name: 'Delegate' })).toBeInTheDocument()
  })

  it('omits Active since when activeSince is null', () => {
    renderApp(<VoterCard voter={minimalVoter} />)
    expect(screen.queryByText('Active since')).not.toBeInTheDocument()
    expect(screen.getByText('Voting Power')).toBeInTheDocument()
    expect(screen.getByText('Delegators')).toBeInTheDocument()
  })
})
