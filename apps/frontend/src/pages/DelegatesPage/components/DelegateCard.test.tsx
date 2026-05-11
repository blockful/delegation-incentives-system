import { screen } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { DelegateCard } from './DelegateCard'
import type { DelegateDetail } from '@/api/types'

const fullDelegate: DelegateDetail = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  ensName: 'alice.eth',
  avatarUrl: null,
  votingPower: '42000000000000000000000',
  votesInLast10: 9,
  delegatorCount: 128,
  activeSince: '2024-01-15T00:00:00Z',
  last10ProposalsVoted: [true, true, true, true, true, true, true, true, true, false],
}

const minimalDelegate: DelegateDetail = {
  address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  ensName: null,
  avatarUrl: null,
  votingPower: '0',
  votesInLast10: 7,
  delegatorCount: 0,
  activeSince: null,
  last10ProposalsVoted: [true, true, true, true, true, true, true, false, false, false],
}

describe('DelegateCard', () => {
  it('renders ENS name', () => {
    renderApp(<DelegateCard delegate={fullDelegate} />)
    expect(screen.getByText('alice.eth')).toBeInTheDocument()
  })

  it('renders truncated address', () => {
    renderApp(<DelegateCard delegate={fullDelegate} />)
    expect(screen.getByText('0x1234…5678')).toBeInTheDocument()
  })

  it('renders voting power formatted compactly', () => {
    renderApp(<DelegateCard delegate={fullDelegate} />)
    expect(screen.getByText('42K')).toBeInTheDocument()
    expect(screen.getByText('Voting Power')).toBeInTheDocument()
  })

  it('renders proposal score', () => {
    renderApp(<DelegateCard delegate={fullDelegate} />)
    expect(screen.getByText('9/10')).toBeInTheDocument()
  })

  it('renders Delegate button when not delegated', () => {
    renderApp(<DelegateCard delegate={fullDelegate} />)
    expect(screen.getByRole('button', { name: 'Delegate' })).toBeInTheDocument()
  })

  it('omits Active since when activeSince is null', () => {
    renderApp(<DelegateCard delegate={minimalDelegate} />)
    expect(screen.queryByText('Active since')).not.toBeInTheDocument()
    expect(screen.getByText('Voting Power')).toBeInTheDocument()
    expect(screen.getByText('Delegators')).toBeInTheDocument()
  })
})
