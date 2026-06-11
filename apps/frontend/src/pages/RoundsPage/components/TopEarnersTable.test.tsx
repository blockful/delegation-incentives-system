import { screen } from '@testing-library/react'
import { renderApp, userEvent } from '@/test/utils'
import type { RewardRank } from '@/api/types'
import { TopEarnersTable } from './TopEarnersTable'

function makeRow(
  rank: number,
  role: 'voter' | 'token_holder',
  overrides: Partial<RewardRank> = {},
): RewardRank {
  const addressSeed = role === 'voter' ? rank : 1000 + rank
  return {
    rank,
    address: `0x${String(addressSeed).padStart(40, '0')}`,
    ensName: `${role === 'voter' ? 'delegate' : 'holder'}-${rank}.eth`,
    role,
    reward: '0',
    rewardEns: '12.3456',
    source: 'direct',
    votingPower: role === 'voter' ? '1200000000000000000000000' : null,
    tokenHolderBalance: role === 'voter' ? null : '9800000000000000000000',
    delegationCount: null,
    ...overrides,
  }
}

const voterRows = Array.from({ length: 25 }, (_, i) => makeRow(i + 1, 'voter'))
const holderRows = Array.from({ length: 12 }, (_, i) => makeRow(i + 1, 'token_holder'))

function renderTable(
  props: Partial<Parameters<typeof TopEarnersTable>[0]> = {},
  initialPath = '/rounds/2',
) {
  return renderApp(
    <TopEarnersTable
      voterRows={voterRows}
      holderRows={holderRows}
      highlightAddress=""
      {...props}
    />,
    { initialPath },
  )
}

const originalMatchMedia = window.matchMedia

function mockViewport(isMobile: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: isMobile && query.includes('max-width: 767px'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: originalMatchMedia,
  })
})

describe('TopEarnersTable', () => {
  it('renders the merged card with group tabs and the first page of delegates', () => {
    renderTable()

    expect(screen.getByRole('heading', { name: 'Top earners' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Delegates' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Holders' })).toBeInTheDocument()

    expect(screen.getByText('delegate-1.eth')).toBeInTheDocument()
    expect(screen.getByText('delegate-10.eth')).toBeInTheDocument()
    expect(screen.queryByText('delegate-11.eth')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 1–10 of 25')).toBeInTheDocument()
  })

  it('paginates with numbered page buttons', async () => {
    renderTable()

    await userEvent.click(screen.getByRole('button', { name: 'Page 2' }))

    expect(screen.getByText('delegate-11.eth')).toBeInTheDocument()
    expect(screen.getByText('delegate-20.eth')).toBeInTheDocument()
    expect(screen.queryByText('delegate-1.eth')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 11–20 of 25')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('disables prev on the first page and next on the last page', async () => {
    renderTable()

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Page 3' }))

    expect(screen.getByText('delegate-25.eth')).toBeInTheDocument()
    expect(screen.getByText('Showing 21–25 of 25')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('switches to holders and resets pagination', async () => {
    renderTable()

    await userEvent.click(screen.getByRole('button', { name: 'Page 2' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Holders' }))

    expect(screen.getByText('holder-1.eth')).toBeInTheDocument()
    expect(screen.getByText('Holder')).toBeInTheDocument()
    // Head cell on desktop plus one hidden mobile label per row.
    expect(screen.getAllByText('Delegated amount').length).toBeGreaterThan(0)
    expect(screen.getByText('Showing 1–10 of 12')).toBeInTheDocument()
    expect(screen.queryByText('delegate-1.eth')).not.toBeInTheDocument()
  })

  it('reads tab and page from the URL', () => {
    renderTable({}, '/rounds/2?tab=holders&page=2')

    expect(screen.getByText('holder-11.eth')).toBeInTheDocument()
    expect(screen.getByText('holder-12.eth')).toBeInTheDocument()
    expect(screen.getByText('Showing 11–12 of 12')).toBeInTheDocument()
  })

  it('shows rewards with exactly two decimals and no payout-type tag', () => {
    const rows = [
      makeRow(1, 'voter', { rewardEns: '48.2' }),
      makeRow(2, 'voter', { rewardEns: '0.625', source: 'lottery' }),
      makeRow(3, 'voter', { rewardEns: '0' }),
    ]
    renderTable({ voterRows: rows })

    expect(screen.getByText('48.20 ENS')).toBeInTheDocument()
    expect(screen.getByText('0.63 ENS')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('Direct')).not.toBeInTheDocument()
    expect(screen.queryByText('Lottery')).not.toBeInTheDocument()
    expect(screen.queryByText('Combined')).not.toBeInTheDocument()
  })

  it('highlights the connected wallet row', () => {
    renderTable({ highlightAddress: voterRows[2].address.toUpperCase() })

    const highlighted = screen.getByRole('link', {
      name: `View ${voterRows[2].ensName} on Anticapture`,
    })
    expect(highlighted).toHaveAttribute('aria-current', 'true')

    const other = screen.getByRole('link', {
      name: `View ${voterRows[0].ensName} on Anticapture`,
    })
    expect(other).not.toHaveAttribute('aria-current')
  })

  it('renders an empty state when the active group has no rows', () => {
    renderTable({ voterRows: [], holderRows: [] })

    expect(screen.getByText('No recipients in this round')).toBeInTheDocument()
    expect(screen.queryByText('Showing 1–10 of 25')).not.toBeInTheDocument()
  })

  it('previews five rows on mobile and expands with "Show all"', async () => {
    mockViewport(true)
    renderTable()

    expect(screen.getByText('delegate-5.eth')).toBeInTheDocument()
    expect(screen.queryByText('delegate-6.eth')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Previous page' }),
    ).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Show all 25/ }))

    expect(screen.getByText('delegate-25.eth')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Show all 25/ })).not.toBeInTheDocument()
  })
})
