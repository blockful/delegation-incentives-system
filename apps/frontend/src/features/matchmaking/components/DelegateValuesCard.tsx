import { useState } from 'react'
import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { scoreSelection } from '@ens-dis/domain'
import { tokens } from '@/styles'
import { useWalletState } from '@/features/wallet/useWalletState'
import { openWalletModal } from '@/features/wallet/openWalletModal'
import { useWordPool } from '../useWordPool'
import { useMySelection } from '../useMySelection'
import { useDelegateSelection } from '../useDelegateSelection'
import { useViewerRole } from '../useViewerRole'
import { SelectionFlow } from './SelectionFlow'
import { EditSelectionModal } from './EditSelectionModal'
import { UnlockMatchmakingBanner } from './UnlockMatchmakingBanner'

export interface DelegateValuesCardProps {
  delegateAddress: string
}

/**
 * The delegate-profile "Values" card across all 7 viewer × delegate states.
 * Comparison is computed client-side; word labels come from the pool.
 *
 * The Figma "dumbbell" comparison (5 fixed categories on a 1–5 scale, two dots
 * per row joined by a line) assumes ORDERED, RANKED values. We use a word POOL:
 * an unordered set of 5 picks with no per-value magnitude. So we keep the
 * design's SHELL — secondary header strip, legend (delegate dot / you dot), and
 * the prominent blue "% match" pill — but swap the dumbbell rows for a
 * "shared-in-the-middle / unique-on-the-ends" word layout that carries the same
 * spirit (the two ends of the dumbbell = each side's unique words; the joint in
 * the middle = the words you agree on).
 */
export function DelegateValuesCard({ delegateAddress }: DelegateValuesCardProps) {
  const wallet = useWalletState()
  const viewerAddress = wallet.status === 'disconnected' ? undefined : wallet.address
  const isOwnProfile =
    !!viewerAddress && viewerAddress.toLowerCase() === delegateAddress.toLowerCase()

  const { pool } = useWordPool()
  const { words: viewerWords, hasSelected: viewerSelected } = useMySelection()
  const { words: delegateWords, hasSelected: delegateSelected } =
    useDelegateSelection(delegateAddress)
  const { role } = useViewerRole()

  const [editOpen, setEditOpen] = useState(false)
  const [flowOpen, setFlowOpen] = useState(false)

  const labelOf = (id: string) => pool?.find((w) => w.id === id)?.label ?? id

  // ── Own profile ──────────────────────────────────────────────────────────
  if (isOwnProfile) {
    if (delegateSelected && delegateWords) {
      return (
        <>
          <Card>
            <Header>
              <CardTitle>Your values</CardTitle>
              <EditLink type="button" onClick={() => setEditOpen(true)}>
                Edit values →
              </EditLink>
            </Header>
            <Chips words={delegateWords} labelOf={labelOf} />
          </Card>
          <EditSelectionModal open={editOpen} onClose={() => setEditOpen(false)} />
        </>
      )
    }
    return (
      <>
        <Card>
          <CardTitle>Your profile is missing values</CardTitle>
          <Muted>Pick the values you stand for so holders can match with you.</Muted>
          <Button colorStyle="bluePrimary" onClick={() => setFlowOpen(true)}>
            Complete profile
          </Button>
        </Card>
        {flowOpen && role && (
          <SelectionFlow open role={role} onClose={() => setFlowOpen(false)} />
        )}
      </>
    )
  }

  // ── Logged out ───────────────────────────────────────────────────────────
  if (!viewerAddress) {
    return (
      <Card>
        <CardTitle>Values</CardTitle>
        <Muted>Connect your wallet to see how this delegate matches your priorities.</Muted>
        <Button colorStyle="bluePrimary" onClick={() => void openWalletModal()}>
          Connect wallet
        </Button>
      </Card>
    )
  }

  // ── Visited profile, viewer NOT selected ─────────────────────────────────
  if (!viewerSelected) {
    if (!delegateSelected) return null // nothing to show
    return (
      <>
        <Card>
          <CardTitle>This delegate&apos;s values</CardTitle>
          <Chips words={delegateWords ?? []} labelOf={labelOf} />
        </Card>
        <UnlockMatchmakingBanner
          onSelect={() => setFlowOpen(true)}
          message="Select your values to see how well you match."
        />
        {flowOpen && role && (
          <SelectionFlow open role={role} onClose={() => setFlowOpen(false)} />
        )}
      </>
    )
  }

  // ── Visited profile, viewer selected ─────────────────────────────────────
  if (!delegateSelected || !delegateWords) {
    return (
      <Card>
        <CardTitle>Values</CardTitle>
        <Muted>This delegate hasn&apos;t selected their priorities.</Muted>
      </Card>
    )
  }

  // Both selected → shared / unique comparison + match pill.
  const score = scoreSelection(viewerWords ?? [], delegateWords)
  return (
    <ComparisonCard>
      <HeaderStrip>
        <TitleAndLegend>
          <CardTitle>Values comparison</CardTitle>
          <Legend>
            <LegendItem>
              <LegendDot $variant="delegate" aria-hidden="true" />
              This delegate
            </LegendItem>
            <LegendItem>
              <LegendDot $variant="you" aria-hidden="true" />
              You
            </LegendItem>
          </Legend>
        </TitleAndLegend>
        <MatchPill $strong={score.strongMatch}>
          <span aria-hidden="true">⭐</span> {score.percent}% match with your priorities
        </MatchPill>
      </HeaderStrip>

      <Divider />

      <CompareGrid>
        <Column>
          <ColumnHead>
            <LegendDot $variant="you" aria-hidden="true" />
            <ColumnLabel>Only you</ColumnLabel>
          </ColumnHead>
          <Chips words={score.aUnique} labelOf={labelOf} />
        </Column>

        <SharedColumn>
          <ColumnHead>
            <ColumnLabel>Shared</ColumnLabel>
          </ColumnHead>
          {score.sharedWords.length > 0 ? (
            <Chips words={score.sharedWords} labelOf={labelOf} highlight center />
          ) : (
            <Muted>No words in common.</Muted>
          )}
        </SharedColumn>

        <Column $alignEnd>
          <ColumnHead $alignEnd>
            <ColumnLabel>Only this delegate</ColumnLabel>
            <LegendDot $variant="delegate" aria-hidden="true" />
          </ColumnHead>
          <Chips words={score.bUnique} labelOf={labelOf} alignEnd />
        </Column>
      </CompareGrid>
    </ComparisonCard>
  )
}

function Chips({
  words,
  labelOf,
  highlight = false,
  center = false,
  alignEnd = false,
}: {
  words: string[]
  labelOf: (id: string) => string
  highlight?: boolean
  center?: boolean
  alignEnd?: boolean
}) {
  if (words.length === 0) return <Muted>—</Muted>
  return (
    <ChipRow $center={center} $alignEnd={alignEnd}>
      {words.map((id) => (
        <Chip key={id} $highlight={highlight}>
          {labelOf(id)}
        </Chip>
      ))}
    </ChipRow>
  )
}

const Card = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.lg};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.md};
`

// Comparison variant: framed shell with a secondary header strip + divider,
// mirroring the Figma "Values card" chrome.
const ComparisonCard = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.md};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.sm};
`

const HeaderStrip = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
  flex-wrap: wrap;
  padding: ${tokens.spacing.md} ${tokens.spacing.lg};
  background: ${tokens.color.surfaceAlt};
`

const TitleAndLegend = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const CardTitle = styled.h3`
  margin: 0;
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

const Legend = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
`

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  white-space: nowrap;
`

// Solid dot = delegate, hollow ring = you (matches the Figma legend dots).
const LegendDot = styled.span<{ $variant: 'delegate' | 'you' }>`
  width: 10px;
  height: 10px;
  border-radius: ${tokens.radius.pill};
  flex-shrink: 0;
  ${({ $variant }) =>
    $variant === 'delegate'
      ? `background: ${tokens.color.blue};`
      : `background: ${tokens.color.surface}; border: 2px solid ${tokens.color.blue};`}
`

const Muted = styled.p`
  margin: 0;
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.base};
  line-height: 1.5;
`

const MatchPill = styled.span<{ $strong: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  background: ${({ $strong }) =>
    $strong ? tokens.color.status.success.bg : tokens.color.lightBlue};
  color: ${({ $strong }) =>
    $strong ? tokens.color.positiveEmphasis : tokens.color.blue};
  border: 1px solid
    ${({ $strong }) => ($strong ? tokens.color.status.success.border : tokens.color.lightBlue)};
  padding: ${tokens.spacing.xs} ${tokens.spacing.md};
  border-radius: ${tokens.radius.pill};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  white-space: nowrap;
`

const Divider = styled.div`
  height: 1px;
  width: 100%;
  background: ${tokens.color.borderLight};
`

// The "dumbbell" reimagined: unique ends on the sides, shared joint centered.
// Collapses to a single column on narrow viewports.
const CompareGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: start;
  gap: ${tokens.spacing.lg};
  padding: ${tokens.spacing.lg};

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    gap: ${tokens.spacing.md};
  }
`

const Column = styled.div<{ $alignEnd?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  min-width: 0;
  align-items: ${({ $alignEnd }) => ($alignEnd ? 'flex-end' : 'flex-start')};

  @media (max-width: 720px) {
    align-items: flex-start;
  }
`

// Centered "joint" of the dumbbell — the words both sides picked.
const SharedColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  align-items: center;
  min-width: 0;
  padding: 0 ${tokens.spacing.md};
  border-left: 1px solid ${tokens.color.borderLight};
  border-right: 1px solid ${tokens.color.borderLight};

  @media (max-width: 720px) {
    align-items: flex-start;
    padding: ${tokens.spacing.md} 0 0;
    border-left: none;
    border-right: none;
    border-top: 1px solid ${tokens.color.borderLight};
  }
`

const ColumnHead = styled.div<{ $alignEnd?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  ${({ $alignEnd }) => $alignEnd && 'flex-direction: row;'}
`

const ColumnLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.textSecondary};
`

const ChipRow = styled.div<{ $center?: boolean; $alignEnd?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.spacing.sm};
  justify-content: ${({ $center, $alignEnd }) =>
    $center ? 'center' : $alignEnd ? 'flex-end' : 'flex-start'};

  @media (max-width: 720px) {
    justify-content: flex-start;
  }
`

const Chip = styled.span<{ $highlight: boolean }>`
  padding: ${tokens.spacing.xs} ${tokens.spacing.md};
  border-radius: ${tokens.radius.pill};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  border: 1px solid
    ${({ $highlight }) => ($highlight ? tokens.color.status.success.fg : tokens.color.border)};
  background: ${({ $highlight }) =>
    $highlight ? tokens.color.status.success.bg : tokens.color.surfaceAlt};
  color: ${({ $highlight }) =>
    $highlight ? tokens.color.status.success.fg : tokens.color.darkBlue};
`

const EditLink = styled.button`
  background: none;
  border: none;
  color: ${tokens.color.blue};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  cursor: pointer;

  &:hover {
    opacity: 0.85;
  }
`
