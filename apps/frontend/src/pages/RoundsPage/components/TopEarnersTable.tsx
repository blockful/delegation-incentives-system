import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import { isAddress } from 'viem'
import { useEnsName } from 'wagmi'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowDown,
  faChevronLeft,
  faChevronRight,
  faUserSlash,
} from '@fortawesome/free-solid-svg-icons'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { Tabs, type TabDescriptor } from '@/components/shared/Tabs'
import { getAnticaptureDelegateUrl } from '@/utils/delegation'
import type { RewardRank } from '@/api/types'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { tokens } from '@/styles'
import { formatEnsAmount, truncateAddress } from '@/utils/format'

/**
 * DEV-768 — merged "Top earners" table.
 *
 * Replaces the two stacked Top delegates / Top holders tables on the round
 * detail page with a single card carrying a Delegates / Holders tab toggle.
 *
 * Desktop: client-side pagination over the already-fetched top rewards
 * (PAGE_SIZE rows per page). Mobile: rows reflow to stacked cards, showing
 * the first MOBILE_PREVIEW_COUNT with a "Show all N" expander (per Figma
 * mobile node 5621:325).
 *
 * Tab + page live in the URL (`?tab=holders&page=2`) following the page's
 * existing search-params pattern, so table state is shareable.
 */

const PAGE_SIZE = 10
const MOBILE_PREVIEW_COUNT = 5

const TAB_PARAM = 'tab'
const PAGE_PARAM = 'page'

type EarnerGroup = 'delegates' | 'holders'

const TAB_DESCRIPTORS: TabDescriptor[] = [
  { id: 'top-earners-delegates', label: 'Delegates' },
  { id: 'top-earners-holders', label: 'Holders' },
]

function tabIdForGroup(group: EarnerGroup): string {
  return group === 'holders' ? 'top-earners-holders' : 'top-earners-delegates'
}

function groupForTabId(tabId: string): EarnerGroup {
  return tabId === 'top-earners-holders' ? 'holders' : 'delegates'
}

/* ─── Card shell ─── */

const TableCard = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
  overflow: hidden;
  background: ${tokens.color.surface};

  @media (max-width: 767px) {
    border: none;
    background: transparent;
    border-radius: 0;
    overflow: visible;
    gap: 12px;
  }
`

const TableCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.lg};
  background: ${tokens.color.surface};
  border-bottom: 1px solid ${tokens.color.borderLight};
  flex-wrap: wrap;

  @media (max-width: 767px) {
    flex-direction: column;
    align-items: stretch;
    padding: 0 4px 8px;
    background: transparent;
    border-bottom: none;
  }
`

const SectionLabelGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const SectionLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkGray};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

const SectionTitle = styled.h2`
  margin: 0;
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.25;
`

// The shared Tabs pills stay inline on desktop; on mobile the design
// (Figma 5621:329) stretches both segments across the full width.
const GroupTabs = styled(Tabs)`
  @media (max-width: 767px) {
    display: flex;
    width: 100%;
    flex-wrap: nowrap;

    & > button {
      flex: 1;
      min-height: 36px;
    }
  }
`

const TabPanel = styled.div`
  display: flex;
  flex-direction: column;

  @media (max-width: 767px) {
    gap: 12px;
  }
`

/* ─── Desktop table head ─── */

const TableHeadRow = styled.div`
  display: flex;
  background: ${tokens.color.bgSubtle};
  border-bottom: 1px solid ${tokens.color.borderLight};

  @media (max-width: 767px) {
    display: none;
  }
`

const TableHeadCell = styled.div<{ $weight?: number; $align?: 'start' | 'end' }>`
  flex: ${({ $weight }) => $weight ?? 1};
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: ${({ $align }) => ($align === 'end' ? 'flex-end' : 'flex-start')};
  padding: 12px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

/* ─── Rows ─── */

const TableRow = styled.a<{ $highlighted?: boolean }>`
  display: flex;
  width: 100%;
  background: ${({ $highlighted }) =>
    $highlighted ? tokens.color.lightBlueOpacity : tokens.color.surface};
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: background ${tokens.transition.fast};

  &:not(:last-child) {
    border-bottom: 1px solid ${tokens.color.borderLight};
  }

  &:hover {
    text-decoration: none;
    background: ${tokens.color.bgSubtle};
  }

  @media (max-width: 767px) {
    flex-wrap: wrap;
    align-items: center;
    padding: 14px;
    border: 1px solid
      ${({ $highlighted }) =>
        $highlighted ? tokens.color.blue : tokens.color.borderLight};
    border-radius: 12px;
    background: ${({ $highlighted }) =>
      $highlighted ? tokens.color.lightBlueOpacity : tokens.color.surface};
    box-shadow: ${tokens.shadow.sm};

    &:not(:last-child) {
      border-bottom: 1px solid
        ${({ $highlighted }) =>
          $highlighted ? tokens.color.blue : tokens.color.borderLight};
    }
  }
`

const RankCell = styled.div`
  flex: 0.6;
  min-width: 0;
  display: flex;
  align-items: center;
  padding: 14px 12px;

  @media (max-width: 767px) {
    order: 2;
    flex: none;
    padding: 0;
  }
`

const IdentityCell = styled.div`
  flex: 2;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  padding: 14px 12px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;

  @media (max-width: 767px) {
    order: 1;
    flex: 1;
    padding: 0;
    gap: 10px;
  }
`

const ValueCell = styled.div<{ $weight?: number; $first?: boolean }>`
  flex: ${({ $weight }) => $weight ?? 1.2};
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${tokens.spacing.sm};
  padding: 14px 12px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 767px) {
    order: 3;
    width: 100%;
    flex: none;
    justify-content: space-between;
    padding: 6px 0 0;
    white-space: normal;
    overflow: visible;
    ${({ $first }) =>
      $first
        ? `
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid ${tokens.color.borderLight};
        `
        : ''}
  }
`

const MobileLabel = styled.span`
  display: none;

  @media (max-width: 767px) {
    display: inline-block;
    color: ${tokens.color.darkGray};
    font-weight: ${tokens.font.weight.medium};
    font-size: ${tokens.font.size.sm};
  }
`

const RankPill = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 22px;
  padding: 0 8px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.bgSubtle};
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  font-variant-numeric: tabular-nums;
`

const AddressText = styled.span`
  font-variant-numeric: tabular-nums;
  color: ${tokens.color.darkBlue};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const VotingPowerText = styled.span`
  color: ${tokens.color.darkBlue};
  font-variant-numeric: tabular-nums;
`

const RewardValueText = styled.span`
  color: ${tokens.color.positiveEmphasis};
  font-weight: ${tokens.font.weight.bold};
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`

/* ─── Empty state ─── */

const EmptyTableBody = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: ${tokens.spacing['3xl']} ${tokens.spacing.xl};
  text-align: center;
  background: ${tokens.color.bgSubtle};
  border-radius: 12px;
`

const EmptyTableTextStack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`

const EmptyTableIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.borderLight};
  color: ${tokens.color.darkGray};

  svg {
    width: 16px;
    height: 16px;
  }
`

const EmptyTableTitle = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
`

const EmptyTableBodyText = styled.span`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkGray};
  line-height: 1.5;
  max-width: 320px;
`

/* ─── Desktop pagination footer ─── */

const PaginationFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.sm} ${tokens.spacing.lg};
  border-top: 1px solid ${tokens.color.borderLight};
  background: ${tokens.color.surface};

  @media (max-width: 767px) {
    display: none;
  }
`

const PaginationSummary = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textSubtle};
  font-variant-numeric: tabular-nums;
`

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
`

const PageButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 ${tokens.spacing.sm};
  border-radius: ${tokens.radius.pill};
  border: 1px solid
    ${({ $active }) => ($active ? tokens.color.lightBlue : tokens.color.borderLight)};
  background: ${({ $active }) => ($active ? tokens.color.lightBlue : tokens.color.surface)};
  color: ${({ $active }) => ($active ? tokens.color.darkBlue : tokens.color.darkGray)};
  font-family: inherit;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    border-color ${tokens.transition.fast},
    background ${tokens.transition.fast},
    color ${tokens.transition.fast};

  svg {
    width: 10px;
    height: 10px;
  }

  &:hover:not(:disabled) {
    border-color: ${tokens.color.blue};
    color: ${tokens.color.darkBlue};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
  }

  &:disabled {
    color: ${tokens.color.textSubtle};
    cursor: not-allowed;
    opacity: 0.6;
  }
`

/* ─── Mobile "Show all" expander ─── */

// Only mounted on mobile (JS-gated via useMediaQuery), so no display gating.
const ShowAllButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 12px 16px;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
  background: ${tokens.color.surface};
  color: ${tokens.color.blue};
  font-family: inherit;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  cursor: pointer;

  svg {
    width: 12px;
    height: 12px;
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
  }
`

/* ─── Formatting helpers ─── */

function formatVotingPower(vpWei: string | null): string {
  if (!vpWei) return '—'
  const ens = Number(vpWei) / 1e18
  if (!Number.isFinite(ens)) return '—'
  if (ens >= 1_000_000) {
    const m = ens / 1_000_000
    const rounded = Math.round(m * 10) / 10
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}M ENS`
  }
  if (ens >= 1_000) {
    const k = ens / 1_000
    const rounded = Math.round(k * 10) / 10
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}K ENS`
  }
  return `${formatEnsAmount(ens.toString())} ENS`
}

/** "48.20 ENS" — always two decimals (DEV-768). Null for zero/missing rewards. */
function formatRewardEns(value: string | null | undefined): string | null {
  if (!value) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return `${formatEnsAmount(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ENS`
}

function clampPage(rawPage: string | null, totalPages: number): number {
  const parsed = Number(rawPage)
  if (!Number.isInteger(parsed) || parsed < 1) return 1
  return Math.min(parsed, totalPages)
}

/* ─── Component ─── */

interface TopEarnersTableProps {
  voterRows: RewardRank[]
  holderRows: RewardRank[]
  /** Address whose row gets the "you" highlight (connected wallet / searched). */
  highlightAddress: string
}

export function TopEarnersTable({
  voterRows,
  holderRows,
  highlightAddress,
}: TopEarnersTableProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [mobileExpanded, setMobileExpanded] = useState(false)

  const activeGroup: EarnerGroup =
    searchParams.get(TAB_PARAM) === 'holders' ? 'holders' : 'delegates'
  const activeTabId = tabIdForGroup(activeGroup)

  const rows = activeGroup === 'holders' ? holderRows : voterRows
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = clampPage(searchParams.get(PAGE_PARAM), totalPages)

  const pageStart = (currentPage - 1) * PAGE_SIZE
  const visibleRows = isMobile
    ? mobileExpanded
      ? rows
      : rows.slice(0, MOBILE_PREVIEW_COUNT)
    : rows.slice(pageStart, pageStart + PAGE_SIZE)

  const highlightLower = highlightAddress.toLowerCase()
  const identityLabel = activeGroup === 'holders' ? 'Holder' : 'Delegate'
  const amountLabel = activeGroup === 'holders' ? 'Delegated amount' : 'Voting power'

  function handleTabChange(tabId: string) {
    const nextGroup = groupForTabId(tabId)
    setMobileExpanded(false)
    setSearchParams(
      (params) => {
        if (nextGroup === 'holders') {
          params.set(TAB_PARAM, 'holders')
        } else {
          params.delete(TAB_PARAM)
        }
        params.delete(PAGE_PARAM)
        return params
      },
      { replace: true },
    )
  }

  function handlePageChange(page: number) {
    const next = Math.min(Math.max(page, 1), totalPages)
    if (next === currentPage) return
    setSearchParams(
      (params) => {
        if (next === 1) {
          params.delete(PAGE_PARAM)
        } else {
          params.set(PAGE_PARAM, String(next))
        }
        return params
      },
      { replace: true },
    )
  }

  const showPagination = !isMobile && rows.length > PAGE_SIZE
  const showMobileExpander =
    isMobile && !mobileExpanded && rows.length > MOBILE_PREVIEW_COUNT

  return (
    <TableCard>
      <TableCardHeader>
        <SectionLabelGroup>
          <SectionLabel>This round</SectionLabel>
          <SectionTitle>Top earners</SectionTitle>
        </SectionLabelGroup>
        <GroupTabs
          tabs={TAB_DESCRIPTORS}
          activeId={activeTabId}
          onChange={handleTabChange}
          aria-label="Top earners group"
        />
      </TableCardHeader>
      <TabPanel role="tabpanel" id={`${activeTabId}-panel`} aria-labelledby={activeTabId}>
        {rows.length === 0 ? (
          <EmptyTableBody>
            <EmptyTableIcon aria-hidden>
              <FontAwesomeIcon icon={faUserSlash} />
            </EmptyTableIcon>
            <EmptyTableTextStack>
              <EmptyTableTitle>No recipients in this round</EmptyTableTitle>
              <EmptyTableBodyText>
                Nothing got paid out here yet.<br />Check back once the round closes.
              </EmptyTableBodyText>
            </EmptyTableTextStack>
          </EmptyTableBody>
        ) : (
          <>
            <TableHeadRow>
              <TableHeadCell $weight={0.6}>Rank</TableHeadCell>
              <TableHeadCell $weight={2}>{identityLabel}</TableHeadCell>
              <TableHeadCell $weight={1.2} $align="end">
                {amountLabel}
              </TableHeadCell>
              <TableHeadCell $weight={1.4} $align="end">Reward</TableHeadCell>
            </TableHeadRow>
            {visibleRows.map((row) => (
              <TopEarnersTableRow
                key={`${row.role}-${row.rank}-${row.address}`}
                row={row}
                isHighlighted={
                  highlightLower !== '' && row.address.toLowerCase() === highlightLower
                }
                amountLabel={amountLabel}
                amountValue={
                  activeGroup === 'holders' ? row.tokenHolderBalance : row.votingPower
                }
              />
            ))}
          </>
        )}
      </TabPanel>
      {showPagination && (
        <PaginationFooter>
          <PaginationSummary>
            Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, rows.length)} of{' '}
            {rows.length}
          </PaginationSummary>
          <PaginationControls>
            <PageButton
              type="button"
              aria-label="Previous page"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </PageButton>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <PageButton
                key={page}
                type="button"
                aria-label={`Page ${page}`}
                aria-current={page === currentPage ? 'page' : undefined}
                $active={page === currentPage}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </PageButton>
            ))}
            <PageButton
              type="button"
              aria-label="Next page"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </PageButton>
          </PaginationControls>
        </PaginationFooter>
      )}
      {showMobileExpander && (
        <ShowAllButton type="button" onClick={() => setMobileExpanded(true)}>
          Show all {rows.length}
          <FontAwesomeIcon icon={faArrowDown} />
        </ShowAllButton>
      )}
    </TableCard>
  )
}

interface TopEarnersTableRowProps {
  row: RewardRank
  isHighlighted: boolean
  amountLabel: string
  amountValue: string | null
}

function TopEarnersTableRow({
  row,
  isHighlighted,
  amountLabel,
  amountValue,
}: TopEarnersTableRowProps) {
  const { data: resolvedName } = useEnsName({
    address: row.address as `0x${string}`,
    query: { enabled: !row.ensName && isAddress(row.address) },
  })
  const ensName = row.ensName ?? resolvedName ?? null
  const displayName = ensName ?? truncateAddress(row.address)

  return (
    <TableRow
      href={getAnticaptureDelegateUrl(row.address)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View ${displayName} on Anticapture`}
      $highlighted={isHighlighted}
      aria-current={isHighlighted ? 'true' : undefined}
    >
      <RankCell>
        <RankPill>#{row.rank}</RankPill>
      </RankCell>
      <IdentityCell>
        <EnsAvatar address={row.address} name={ensName ?? undefined} size={28} />
        <AddressText>{displayName}</AddressText>
      </IdentityCell>
      <ValueCell $weight={1.2} $first>
        <MobileLabel>{amountLabel}</MobileLabel>
        <VotingPowerText>{formatVotingPower(amountValue)}</VotingPowerText>
      </ValueCell>
      <ValueCell $weight={1.4}>
        <MobileLabel>Reward</MobileLabel>
        <RewardValueText>{formatRewardEns(row.rewardEns) ?? '—'}</RewardValueText>
      </ValueCell>
    </TableRow>
  )
}
