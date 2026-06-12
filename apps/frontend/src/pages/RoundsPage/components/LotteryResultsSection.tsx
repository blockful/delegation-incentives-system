import { useState, type UIEvent } from 'react'
import styled from 'styled-components'
import { isAddress } from 'viem'
import { useEnsName } from 'wagmi'
import { LockSVG } from '@ensdomains/thorin'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowDown, faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import type { LotteryBucketDetail, LotteryDetail } from '@/api/types'
import { tokens } from '@/styles'
import { formatEnsAmount, truncateAddress } from '@/utils/format'

/* ─── Layout ─── */

const SectionCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xl};
  width: 100%;
  padding: ${tokens.spacing['2xl']};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 16px;

  @media (max-width: 767px) {
    padding: ${tokens.spacing.lg};
  }
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.xl};
  width: 100%;

  @media (max-width: 767px) {
    flex-direction: column;
    align-items: stretch;
    gap: ${tokens.spacing.md};
  }
`

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
`

const HeaderTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const HeaderEyebrow = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.textSubtle};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 16px;
`

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 26px;
`

const HeaderBody = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

/* ─── Overview stat chips ─── */

const StatChips = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  flex-shrink: 0;
  flex-wrap: wrap;
`

const StatChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  padding: 4px 8px;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 4px;
  font-size: ${tokens.font.size.base};
  line-height: 20px;
  white-space: nowrap;
`

const StatChipValue = styled.span`
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  font-variant-numeric: tabular-nums;
`

const StatChipLabel = styled.span`
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
`

/* ─── RANDAO note ─── */

const RandaoNote = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: ${tokens.spacing.md} ${tokens.spacing.lg};
  background: ${tokens.color.surfaceAlt};
  border-radius: 12px;

  @media (max-width: 767px) {
    flex-wrap: wrap;
  }
`

const RandaoIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: ${tokens.color.textSubtle};

  svg {
    width: 100%;
    height: 100%;
  }
`

const RandaoText = styled.p`
  margin: 0;
  flex: 1;
  min-width: 200px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
`

const VerifyLink = styled.a`
  flex-shrink: 0;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.blue};
  line-height: 20px;
  white-space: nowrap;
  text-decoration: none;
  transition: opacity ${tokens.transition.fast};

  &:hover {
    text-decoration: none;
    opacity: 0.8;
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
    border-radius: 4px;
  }
`

/* ─── Pools list ─── */

const PoolsList = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
  overflow: hidden;
`

const PoolItem = styled.div`
  display: flex;
  flex-direction: column;
  background: ${tokens.color.surface};

  &:not(:last-child) {
    border-bottom: 1px solid ${tokens.color.borderLight};
  }
`

// The light-blue tint marks the viewer's pool (their address holds one of the
// pool's entries) — membership, not expansion, drives it, so it shows even
// while the pool is collapsed. Expanded pools only gain the neutral separator.
const PoolHeaderButton = styled.button<{ $expanded: boolean; $mine: boolean }>`
  display: grid;
  align-items: center;
  gap: ${tokens.spacing.sm};
  width: 100%;
  padding: ${tokens.spacing.md};
  border: none;
  background: ${({ $mine }) =>
    $mine ? tokens.color.lightBlue : tokens.color.surface};
  border-bottom: 1px solid
    ${({ $expanded }) => ($expanded ? tokens.color.borderLight : 'transparent')};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background ${tokens.transition.fast};
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas:
    'pill    entries chevron'
    'winner  winner  winner'
    'prize   prize   prize';

  &:hover {
    background: ${({ $mine }) =>
      $mine ? tokens.color.lightBlue : tokens.color.bgSubtle};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: -2px;
  }

  @media (min-width: 768px) {
    grid-template-columns: 96px minmax(0, 1fr) 120px 100px 16px;
    grid-template-areas: 'pill winner prize entries chevron';
  }
`

const PoolPillCell = styled.span`
  grid-area: pill;
  display: flex;
  align-items: center;
`

const PoolPill = styled.span<{ $expanded: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: ${tokens.radius.pill};
  background: ${({ $expanded }) =>
    $expanded ? 'rgba(56, 137, 255, 0.18)' : tokens.color.lightBlueOpacity};
  color: ${tokens.color.blue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
  white-space: nowrap;
`

const PoolWinnerCell = styled.span`
  grid-area: winner;
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  min-width: 0;
`

const PoolWinnerName = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const PoolPrizeCell = styled.span`
  grid-area: prize;
  display: flex;
  align-items: center;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.positiveEmphasis};
  line-height: 20px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;

  @media (min-width: 768px) {
    justify-content: flex-end;
  }
`

const PoolEntriesCell = styled.span`
  grid-area: entries;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`

const PoolChevron = styled.span<{ $expanded: boolean }>`
  grid-area: chevron;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: ${({ $expanded }) =>
    $expanded ? tokens.color.blue : tokens.color.textSubtle};
  transform: rotate(${({ $expanded }) => ($expanded ? '180deg' : '0deg')});
  transition: transform ${tokens.transition.fast};

  svg {
    width: 12px;
    height: 12px;
  }
`

/* ─── Expanded pool body ─── */

// Same internal-scroll idiom as the Top earners table: at most ~5 participant
// rows are visible, the rest scroll inside a fixed-height viewport. A row is
// 48px tall (2 × 11px padding + 26px avatar) plus its 1px separator, so five
// rows fill 5 × 49 = 245px and entry #6 starts past the fold.
const PARTICIPANT_VISIBLE_ROWS = 5
const PARTICIPANT_VIEWPORT_MAX_HEIGHT = 245

const PoolBody = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${tokens.spacing.lg};
  background: ${tokens.color.surface};
`

const ParticipantTable = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 10px;
  overflow: hidden;
`

const ParticipantHeadRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  padding: 10px 14px;
  background: ${tokens.color.surfaceAlt};
  border-bottom: 1px solid ${tokens.color.borderLight};
`

const ParticipantHeadCell = styled.span<{ $width?: number; $align?: 'start' | 'end' }>`
  flex: ${({ $width }) => ($width ? `0 0 ${$width}px` : 1)};
  min-width: 0;
  display: flex;
  justify-content: ${({ $align }) => ($align === 'end' ? 'flex-end' : 'flex-start')};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 16px;
  white-space: nowrap;

  @media (max-width: 479px) {
    flex-basis: ${({ $width }) => ($width ? '72px' : 'auto')};
  }
`

// Positioning context so the bottom fade can float above the scrolling rows.
const ParticipantsScrollArea = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
`

const ParticipantsViewport = styled.div`
  display: flex;
  flex-direction: column;
  max-height: ${PARTICIPANT_VIEWPORT_MAX_HEIGHT}px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: ${tokens.color.textFaint} transparent;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${tokens.color.textFaint};
    border-radius: 2px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
`

// Bottom fade hinting that more rows sit below the fold; hidden once the
// user reaches the end of the list.
const ParticipantsScrollFade = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 48px;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0),
    ${tokens.color.surface}
  );
  pointer-events: none;
`

// Only mounted when the pool has more entries than fit the viewport.
const ParticipantsScrollFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.sm};
  padding: 10px 14px;
  border-top: 1px solid ${tokens.color.borderLight};
  background: ${tokens.color.bgSubtle};
`

const ScrollFooterSummary = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.textSubtle};
  font-variant-numeric: tabular-nums;
`

const ScrollFooterHint = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.blue};

  svg {
    width: 10px;
    height: 10px;
  }
`

const ParticipantRowEl = styled.div<{ $winner: boolean; $highlighted: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  background: ${({ $winner, $highlighted }) =>
    $winner
      ? tokens.color.status.success.bg
      : $highlighted
        ? tokens.color.lightBlueOpacity
        : tokens.color.surface};

  &:not(:last-child) {
    border-bottom: 1px solid ${tokens.color.borderLight};
  }
`

const ParticipantIdentity = styled.span`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
`

const ParticipantName = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const WinnerPill = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.lightGreen};
  color: ${tokens.color.status.success.fg};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
  white-space: nowrap;
`

const ParticipantValueCell = styled.span<{ $width?: number; $muted?: boolean }>`
  flex: ${({ $width }) => ($width ? `0 0 ${$width}px` : 1)};
  min-width: 0;
  display: flex;
  justify-content: flex-end;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${({ $muted }) => ($muted ? tokens.color.darkGray : tokens.color.darkBlue)};
  line-height: 20px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;

  @media (max-width: 479px) {
    flex-basis: ${({ $width }) => ($width ? '72px' : 'auto')};
  }
`

/* ─── Helpers ─── */

function sameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  return a.toLowerCase() === b.toLowerCase()
}

/** "24996367" → "24,996,367". Falls back to the raw string for non-numeric input. */
function formatBlockNumber(blockNumber: string): string {
  const n = Number(blockNumber)
  return Number.isFinite(n) ? n.toLocaleString('en-US') : blockNumber
}

/** 0-1 decimal string → "9.9%". */
function formatOdds(probability: string | null): string {
  if (!probability) return '—'
  const n = Number(probability)
  if (!Number.isFinite(n)) return '—'
  return `${(n * 100).toFixed(1)}%`
}

/** Always two decimals — "10.00", "0.62" — matching the design. */
function formatEnsFixed(value: string): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0.00'
  return n.toFixed(2)
}

function formatEntryCount(count: number): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? 'entry' : 'entries'}`
}

/* ─── Pool row ─── */

interface PoolRowProps {
  bucket: LotteryBucketDetail
  highlightAddress: string
}

function PoolRow({ bucket, highlightAddress }: PoolRowProps) {
  // Every pool starts collapsed — the viewer opens the ones they care about.
  const [expanded, setExpanded] = useState(false)
  const [scrolledToEnd, setScrolledToEnd] = useState(false)
  const { data: resolvedWinnerName } = useEnsName({
    address: bucket.winner as `0x${string}`,
    query: { enabled: !bucket.winnerEnsName && isAddress(bucket.winner) },
  })
  const winnerName = bucket.winnerEnsName ?? resolvedWinnerName ?? null
  const winnerDisplayName = winnerName ?? truncateAddress(bucket.winner)
  const poolLabel = `Pool #${bucket.bucketIndex + 1}`
  const bodyId = `lottery-pool-${bucket.bucketIndex}-body`
  // The viewer's pool: their address holds one of this pool's entries.
  const isMine = bucket.entries.some((entry) =>
    sameAddress(entry.address, highlightAddress),
  )
  // Design orders participants by entry size, biggest first (draw order as tie-break).
  const sortedEntries = [...bucket.entries].sort(
    (a, b) => Number(b.amountEns) - Number(a.amountEns) || a.entryIndex - b.entryIndex,
  )
  const hasOverflow = sortedEntries.length > PARTICIPANT_VISIBLE_ROWS

  function handleViewportScroll(event: UIEvent<HTMLDivElement>) {
    const el = event.currentTarget
    setScrolledToEnd(el.scrollHeight - el.scrollTop - el.clientHeight <= 1)
  }

  return (
    <PoolItem>
      <PoolHeaderButton
        type="button"
        $expanded={expanded}
        $mine={isMine}
        aria-expanded={expanded}
        aria-controls={bodyId}
        aria-current={isMine ? 'true' : undefined}
        onClick={() => {
          setExpanded((prev) => !prev)
          // The viewport unmounts on collapse and remounts scrolled to top,
          // so the affordances must come back for the next expansion.
          setScrolledToEnd(false)
        }}
      >
        <PoolPillCell>
          <PoolPill $expanded={expanded}>{poolLabel}</PoolPill>
        </PoolPillCell>
        <PoolWinnerCell>
          <EnsAvatar
            address={bucket.winner}
            name={winnerName ?? undefined}
            size={26}
          />
          <PoolWinnerName>{winnerDisplayName}</PoolWinnerName>
        </PoolWinnerCell>
        <PoolPrizeCell>{formatEnsFixed(bucket.prizeEns)} ENS prize</PoolPrizeCell>
        <PoolEntriesCell>{formatEntryCount(bucket.entryCount)}</PoolEntriesCell>
        <PoolChevron $expanded={expanded} aria-hidden>
          <FontAwesomeIcon icon={faChevronDown} />
        </PoolChevron>
      </PoolHeaderButton>
      {expanded && (
        <PoolBody id={bodyId}>
          <ParticipantTable data-testid={`lottery-pool-participants-${bucket.bucketIndex}`}>
            <ParticipantHeadRow>
              <ParticipantHeadCell>Participants</ParticipantHeadCell>
              <ParticipantHeadCell $width={100} $align="end">
                Odds
              </ParticipantHeadCell>
              <ParticipantHeadCell $width={108} $align="end">
                Entry
              </ParticipantHeadCell>
            </ParticipantHeadRow>
            <ParticipantsScrollArea>
              <ParticipantsViewport
                onScroll={handleViewportScroll}
                data-testid={`lottery-pool-viewport-${bucket.bucketIndex}`}
              >
                {sortedEntries.map((entry) => {
                  const isWinner = sameAddress(entry.address, bucket.winner)
                  return (
                    <ParticipantRowEl
                      key={`${entry.bucketIndex}-${entry.entryIndex}`}
                      $winner={isWinner}
                      $highlighted={sameAddress(entry.address, highlightAddress)}
                    >
                      <ParticipantIdentity>
                        <EnsAvatar
                          address={entry.address}
                          name={entry.ensName ?? undefined}
                          size={26}
                          resolveName={false}
                        />
                        <ParticipantName>
                          {entry.ensName ?? truncateAddress(entry.address)}
                        </ParticipantName>
                        {isWinner && <WinnerPill>Winner</WinnerPill>}
                      </ParticipantIdentity>
                      <ParticipantValueCell $width={100} $muted>
                        {formatOdds(entry.probability)}
                      </ParticipantValueCell>
                      <ParticipantValueCell $width={108}>
                        {formatEnsFixed(entry.amountEns)} ENS
                      </ParticipantValueCell>
                    </ParticipantRowEl>
                  )
                })}
              </ParticipantsViewport>
              {hasOverflow && !scrolledToEnd && <ParticipantsScrollFade aria-hidden />}
            </ParticipantsScrollArea>
            {hasOverflow && (
              <ParticipantsScrollFooter>
                <ScrollFooterSummary>
                  {sortedEntries.length.toLocaleString('en-US')} total entries
                </ScrollFooterSummary>
                {!scrolledToEnd && (
                  <ScrollFooterHint>
                    Scroll for more
                    <FontAwesomeIcon icon={faArrowDown} />
                  </ScrollFooterHint>
                )}
              </ParticipantsScrollFooter>
            )}
          </ParticipantTable>
        </PoolBody>
      )}
    </PoolItem>
  )
}

/* ─── Section ─── */

interface LotteryResultsSectionProps {
  lottery: LotteryDetail | null
  /**
   * Active wallet / searched address — tints the pool holding one of its
   * entries and highlights its participant rows inside expanded pools.
   */
  highlightAddress?: string
}

/**
 * Lottery results for a closed round: overview stats, the RANDAO provability
 * note, and one expandable row per prize pool. Renders nothing while a round
 * has no lottery data yet (live / pending rounds).
 */
export function LotteryResultsSection({
  lottery,
  highlightAddress = '',
}: LotteryResultsSectionProps) {
  if (!lottery || lottery.buckets.length === 0) return null

  const poolTargetEns = formatEnsAmount(lottery.bucketTargetEns, {
    maximumFractionDigits: 0,
  })
  const blockNumber = lottery.seed.blockNumber

  return (
    <SectionCard aria-label="Lottery results">
      <HeaderRow>
        <HeaderText>
          <HeaderTitleGroup>
            <HeaderEyebrow>Lottery results</HeaderEyebrow>
            <HeaderTitle>Pool prizes for small rewards</HeaderTitle>
          </HeaderTitleGroup>
          <HeaderBody>
            Rewards under 1 ENS go into shared pools of about {poolTargetEns} ENS.
            Each pool draws one winner.
          </HeaderBody>
        </HeaderText>
        <StatChips>
          <StatChip data-testid="lottery-stat-pools">
            <StatChipValue>{lottery.bucketCount.toLocaleString('en-US')}</StatChipValue>
            <StatChipLabel>Pools drawn</StatChipLabel>
          </StatChip>
          <StatChip data-testid="lottery-stat-participants">
            <StatChipValue>
              {lottery.participantCount.toLocaleString('en-US')}
            </StatChipValue>
            <StatChipLabel>participants</StatChipLabel>
          </StatChip>
        </StatChips>
      </HeaderRow>

      <RandaoNote>
        <RandaoIcon aria-hidden>
          <LockSVG />
        </RandaoIcon>
        <RandaoText>
          Winners were drawn from Ethereum block #{formatBlockNumber(blockNumber)}{' '}
          using on-chain randomness (RANDAO). The result could not be predicted or
          changed.
        </RandaoText>
        <VerifyLink
          href="https://github.com/blockful/delegation-incentives-system"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Verify the draw algorithm on GitHub"
        >
          Verify ↗
        </VerifyLink>
      </RandaoNote>

      <PoolsList>
        {lottery.buckets.map((bucket) => (
          <PoolRow
            key={bucket.bucketIndex}
            bucket={bucket}
            highlightAddress={highlightAddress}
          />
        ))}
      </PoolsList>
    </SectionCard>
  )
}
