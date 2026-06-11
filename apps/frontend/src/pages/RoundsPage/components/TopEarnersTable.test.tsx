import { fireEvent, screen, within } from '@testing-library/react'
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
  it('renders the merged card with group tabs and every delegate row in the scroll viewport', () => {
    renderTable()

    expect(screen.getByRole('heading', { name: 'Top earners' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Delegates' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Holders' })).toBeInTheDocument()

    // No paging: all 25 rows render inside the internal-scroll viewport.
    const viewport = screen.getByTestId('top-earners-viewport')
    expect(within(viewport).getAllByRole('link')).toHaveLength(25)
    expect(screen.getByText('delegate-1.eth')).toBeInTheDocument()
    expect(screen.getByText('delegate-25.eth')).toBeInTheDocument()
  })

  it('shows the scroll footer instead of page controls for long lists', () => {
    renderTable()

    expect(screen.getByText('Showing top 25')).toBeInTheDocument()
    expect(screen.getByText('Scroll for more')).toBeInTheDocument()

    expect(
      screen.queryByRole('button', { name: 'Previous page' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Showing 1–10/)).not.toBeInTheDocument()
  })

  it('hides the scroll hint and fade once the list is scrolled to the end', () => {
    renderTable()

    expect(screen.getByText('Scroll for more')).toBeInTheDocument()

    // jsdom reports zero scroll dimensions, which reads as "at the end".
    fireEvent.scroll(screen.getByTestId('top-earners-viewport'))

    expect(screen.queryByText('Scroll for more')).not.toBeInTheDocument()
    expect(screen.getByText('Showing top 25')).toBeInTheDocument()
  })

  it('hides the scroll footer when every row fits the viewport', () => {
    renderTable({ voterRows: voterRows.slice(0, 5) })

    expect(screen.getByText('delegate-5.eth')).toBeInTheDocument()
    expect(screen.queryByText(/Showing top/)).not.toBeInTheDocument()
    expect(screen.queryByText('Scroll for more')).not.toBeInTheDocument()
  })

  it('switches to holders with the full holder list', async () => {
    renderTable()

    await userEvent.click(screen.getByRole('tab', { name: 'Holders' }))

    expect(screen.getByText('holder-1.eth')).toBeInTheDocument()
    expect(screen.getByText('holder-12.eth')).toBeInTheDocument()
    expect(screen.getByText('Holder')).toBeInTheDocument()
    // Head cell on desktop plus one hidden mobile label per row.
    expect(screen.getAllByText('Delegated amount').length).toBeGreaterThan(0)
    expect(screen.getByText('Showing top 12')).toBeInTheDocument()
    expect(screen.queryByText('delegate-1.eth')).not.toBeInTheDocument()
  })

  it('reads the tab from the URL and ignores legacy page params', () => {
    renderTable({}, '/rounds/2?tab=holders&page=2')

    const viewport = screen.getByTestId('top-earners-viewport')
    expect(within(viewport).getAllByRole('link')).toHaveLength(12)
    expect(screen.getByText('holder-1.eth')).toBeInTheDocument()
    expect(screen.getByText('holder-12.eth')).toBeInTheDocument()
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
    expect(screen.queryByText(/Showing top/)).not.toBeInTheDocument()
  })

  it('previews five rows on mobile and expands with "Show all"', async () => {
    mockViewport(true)
    renderTable()

    expect(screen.getByText('delegate-5.eth')).toBeInTheDocument()
    expect(screen.queryByText('delegate-6.eth')).not.toBeInTheDocument()
    // The desktop scroll footer never renders on mobile.
    expect(screen.queryByText('Scroll for more')).not.toBeInTheDocument()
    expect(screen.queryByText(/Showing top/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Show all 25/ }))

    expect(screen.getByText('delegate-25.eth')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Show all 25/ })).not.toBeInTheDocument()
  })
})
