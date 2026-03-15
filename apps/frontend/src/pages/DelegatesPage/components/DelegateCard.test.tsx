import { screen } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { DelegateCard } from './DelegateCard'
import type { DelegateDetail } from '@/api/types'

const fullDelegate: DelegateDetail = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  ensName: 'alice.eth',
  votingPower: '42000000000000000000000',
  delegatorCount: 128,
  activeSince: '2024-01-15T00:00:00Z',
  last10ProposalsVoted: [true, true, true, true, true, true, true, true, true, false],
}

const nullDelegate: DelegateDetail = {
  address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  ensName: null,
  votingPower: null,
  delegatorCount: null,
  activeSince: null,
  last10ProposalsVoted: null,
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

  it('renders voting power formatted as VP', () => {
    renderApp(<DelegateCard delegate={fullDelegate} />)
    expect(screen.getByText('42K VP')).toBeInTheDocument()
  })

  it('renders proposal score', () => {
    renderApp(<DelegateCard delegate={fullDelegate} />)
    expect(screen.getByText('9/10')).toBeInTheDocument()
  })

  it('renders Delegate button when not delegated', () => {
    renderApp(<DelegateCard delegate={fullDelegate} />)
    expect(screen.getByRole('button', { name: 'Delegate' })).toBeInTheDocument()
  })

  it('renders address-only card when metadata is null', () => {
    renderApp(<DelegateCard delegate={nullDelegate} />)
    expect(screen.getByText('0xabcd…abcd')).toBeInTheDocument()
    expect(screen.queryByText('VP')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delegate' })).toBeInTheDocument()
  })
})
