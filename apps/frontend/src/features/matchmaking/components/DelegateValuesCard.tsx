import { useState } from 'react'
import styled from 'styled-components'
import { Button, WalletSVG, LockSVG } from '@ensdomains/thorin'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHeart, faHourglass, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { faStar } from '@fortawesome/free-regular-svg-icons'
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
import { matchLevel, resolveCardState, type MatchTier } from './delegateValuesState'

export interface DelegateValuesCardProps {
  delegateAddress: string
  /**
   * The delegate's display name (ENS name, e.g. nick.eth) for the copy. Falls
   * back to a generic "this delegate" when the profile is address-only.
   */
  delegateName?: string
}

/**
 * The delegate-profile "Values" card across all 7 viewer × delegate states.
 *
 * Both-picked shows a circular match-% ring AND a graduated match pill
 * (Strong ★ / Partial / Weak / None), with a per-level layout of the words you
 * share vs differ on. Every other state is a focused prompt (connect, pick your
 * values, the delegate hasn't picked, …). A holder who hasn't picked never sees
 * the delegate's words — they get the locked "pick yours first" prompt.
 *
 * Comparison is computed client-side; word labels come from the pool. The match
 * model is a word POOL (an unordered set of 5 picks, matched by overlap) — not a
 * ranked dumbbell — so the layout carries that spirit: shared words plus each
 * side's unique words, never a per-value magnitude.
 */
export function DelegateValuesCard({ delegateAddress, delegateName }: DelegateValuesCardProps) {
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
  const who = delegateName?.trim() || 'this delegate'

  const stateKey = resolveCardState({
    isOwnProfile,
    viewerAddress,
    viewerSelected,
    delegateSelected,
  })

  const openFlow = () => setFlowOpen(true)
  const flowPortal =
    flowOpen && role ? (
      <SelectionFlow open role={role} onClose={() => setFlowOpen(false)} />
    ) : null

  switch (stateKey) {
    // 1 ── Own profile, values set ───────────────────────────────────────────
    case 'own-selected':
      return (
        <>
          <Card>
            <Header>
              <CardTitle>Your values</CardTitle>
              <EditLink type="button" onClick={() => setEditOpen(true)}>
                Edit values →
              </EditLink>
            </Header>
            <Chips words={delegateWords ?? []} labelOf={labelOf} />
          </Card>
          <EditSelectionModal open={editOpen} onClose={() => setEditOpen(false)} />
        </>
      )

    // 2 ── Own profile, no values ────────────────────────────────────────────
    case 'own-unselected':
      return (
        <>
          <PromptCard
            icon={<FontAwesomeIcon icon={faEyeSlash} />}
            title="Your profile is missing values"
            body="Holders can't see what you stand for. Pick 5 values in 30 seconds."
            cta={
              <Button colorStyle="bluePrimary" width="fit" onClick={openFlow}>
                Complete profile
              </Button>
            }
          />
          {flowPortal}
        </>
      )

    // 3 ── Logged out ────────────────────────────────────────────────────────
    case 'logged-out':
      return (
        <PromptCard
          icon={<WalletSVG />}
          title="Connect to see your match"
          body="Connect your wallet to see how this delegate matches your priorities."
          cta={
            <Button colorStyle="bluePrimary" width="fit" onClick={() => void openWalletModal()}>
              Connect wallet
            </Button>
          }
        />
      )

    // 4 ── Neither picked (NEW — previously returned null) ────────────────────
    case 'neither-picked':
      return (
        <>
          <PromptCard
            icon={<FontAwesomeIcon icon={faHeart} />}
            title="Start matching"
            body="Pick your 5 values to see how you match delegates."
            cta={
              <Button colorStyle="bluePrimary" width="fit" onClick={openFlow}>
                Pick your values
              </Button>
            }
          />
          {flowPortal}
        </>
      )

    // 5 ── Viewer not picked, delegate picked → LOCKED (no chip reveal) ───────
    case 'viewer-unselected':
      return (
        <>
          <PromptCard
            icon={<LockSVG />}
            title={`See how you match ${who}`}
            body={`Pick your 5 values to unlock your match, with ${who} and every delegate.`}
            cta={
              <Button colorStyle="bluePrimary" width="fit" onClick={openFlow}>
                Pick your values
              </Button>
            }
          />
          {flowPortal}
        </>
      )

    // 6 ── Viewer picked, delegate not picked (no CTA) ───────────────────────
    case 'delegate-unselected':
      return (
        <PromptCard
          icon={<FontAwesomeIcon icon={faHourglass} />}
          title={`${who} hasn't set their values yet`}
          body="We'll show how well you match here as soon as they complete their profile."
        />
      )

    // 7 ── Both picked → ring + graduated pill + shared/differ layout ─────────
    case 'both-picked':
      return (
        <BothPicked
          viewerWords={viewerWords ?? []}
          delegateWords={delegateWords ?? []}
          who={who}
          labelOf={labelOf}
        />
      )
  }
}

/** Both-picked body: ring + graduated pill + per-level shared/differ layout. */
function BothPicked({
  viewerWords,
  delegateWords,
  who,
  labelOf,
}: {
  viewerWords: string[]
  delegateWords: string[]
  who: string
  labelOf: (id: string) => string
}) {
  const score = scoreSelection(viewerWords, delegateWords)
  const level = matchLevel(score.sharedWords.length)

  return (
    <ComparisonCard>
      {/* Header strip: "{name}'s values" (left) + the graduated match pill (right). */}
      <HeaderStrip>
        <CardTitle>{`${who}'s values`}</CardTitle>
        <MatchPill $tier={level.tier}>
          {level.showStar ? (
            <FontAwesomeIcon icon={faStar} aria-hidden="true" />
          ) : null}
          {level.pillLabel}
        </MatchPill>
      </HeaderStrip>

      <Divider />

      {/* Body: the match ring (left) beside the shared/differ words (right). */}
      <Body>
        <BodyRow>
          <MatchRing $percent={level.ringPercent} $color={level.ringColor}>
            <RingInner>
              <RingPercent>{level.ringPercent}%</RingPercent>
              <RingLabel>match</RingLabel>
            </RingInner>
          </MatchRing>
          <RightColumn>
            {/* Shared values — always shown when there's any overlap. */}
            {score.sharedWords.length > 0 && (
              <Section>
                <SectionHead>
                  <SectionLabel $accent>You both value</SectionLabel>
                </SectionHead>
                <Chips words={score.sharedWords} labelOf={labelOf} highlight />
              </Section>
            )}

            {renderDiffer(level.differLayout, score, who, labelOf, delegateWords)}
          </RightColumn>
        </BodyRow>
      </Body>
    </ComparisonCard>
  )
}

/** The non-shared region, laid out per the level's `differLayout`. */
function renderDiffer(
  layout: ReturnType<typeof matchLevel>['differLayout'],
  score: ReturnType<typeof scoreSelection>,
  who: string,
  labelOf: (id: string) => string,
  delegateWords: string[],
) {
  switch (layout) {
    // 5/5 — nothing differs.
    case 'none':
      return null

    // 4/5, 3/5, 2/5 — two columns under "You differ on".
    case 'side-by-side':
      return (
        <Section>
          <SectionLabel>You differ on</SectionLabel>
          <DifferGrid>
            <DifferColumn>
              <ColumnLabel>{who}</ColumnLabel>
              <Chips words={score.bUnique} labelOf={labelOf} />
            </DifferColumn>
            <DifferColumn>
              <ColumnLabel>You</ColumnLabel>
              <Chips words={score.aUnique} labelOf={labelOf} />
            </DifferColumn>
          </DifferGrid>
        </Section>
      )

    // 1/5 — stacked ("the other 4").
    case 'stacked':
      return (
        <Section>
          <SectionLabel>You differ on the other 4</SectionLabel>
          <Stack>
            <DifferColumn>
              <ColumnLabel>{who} also values</ColumnLabel>
              <Chips words={score.bUnique} labelOf={labelOf} />
            </DifferColumn>
            <DifferColumn>
              <ColumnLabel>you also value</ColumnLabel>
              <Chips words={score.aUnique} labelOf={labelOf} />
            </DifferColumn>
          </Stack>
        </Section>
      )

    // 0/5 — no overlap; state it plainly, then show what the delegate stands for.
    case 'delegate-only':
      return (
        <Section>
          <SectionLabel>No values in common</SectionLabel>
          <Muted>Here&apos;s what {who} stands for:</Muted>
          <Chips words={delegateWords} labelOf={labelOf} />
        </Section>
      )
  }
}

function PromptCard({
  icon,
  title,
  body,
  cta,
}: {
  icon: React.ReactNode
  title: string
  body: string
  cta?: React.ReactNode
}) {
  return (
    <PromptBanner>
      <PromptIcon aria-hidden="true">{icon}</PromptIcon>
      <PromptText>
        <CardTitle>{title}</CardTitle>
        <Muted>{body}</Muted>
      </PromptText>
      {cta}
    </PromptBanner>
  )
}

function Chips({
  words,
  labelOf,
  highlight = false,
}: {
  words: string[]
  labelOf: (id: string) => string
  highlight?: boolean
}) {
  if (words.length === 0) return <Muted>—</Muted>
  return (
    <ChipRow>
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

// Comparison variant: framed shell with a header strip + divider.
const ComparisonCard = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
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
  gap: ${tokens.spacing.lg};
  padding: ${tokens.spacing.lg};
  background: ${tokens.color.surfaceAlt};
`

const CardTitle = styled.h3`
  margin: 0;
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

const Muted = styled.p`
  margin: 0;
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.base};
  line-height: 1.5;
`

// Horizontal light-blue banner for the single-message states (Figma 5900-5557).
const PromptBanner = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.md} ${tokens.spacing.lg};
  background: ${tokens.color.lightBlue};
  border: 1px solid ${tokens.color.blue};
  border-radius: ${tokens.radius.md};

  @media (max-width: 767px) {
    flex-direction: column;
    align-items: flex-start;
    gap: ${tokens.spacing.sm};
  }
`

// Icon badge for the single-message prompt states (matches the dashboard nudge).
const PromptIcon = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${tokens.radius.pill};
  /* Figma blue/light (#d1e4ff) — one shade above the banner's lightBlue; no token */
  background: #d1e4ff;
  color: ${tokens.color.blue};

  /* height-locked, width auto so non-square glyphs (eye-slash) keep their ratio */
  svg {
    width: auto;
    height: 20px;
  }
`

const PromptText = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

// ── Match ring ─────────────────────────────────────────────────────────────
// A conic-gradient ring filled to $percent; the unfilled arc is a faint track.
// Both-picked body: ring (left) beside the shared/differ words (right).
const BodyRow = styled.div`
  display: flex;
  /* Center the match ring against the words column. */
  align-items: center;
  gap: ${tokens.spacing.lg};

  @media (max-width: 520px) {
    flex-direction: column;
    /* Keep the words column full-width once stacked. */
    align-items: stretch;
  }
`

const RightColumn = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
`

const MatchRing = styled.div<{ $percent: number; $color: string }>`
  position: relative;
  flex-shrink: 0;
  width: 132px;
  height: 132px;
  border-radius: ${tokens.radius.pill};
  background: conic-gradient(
    ${({ $color }) => $color} ${({ $percent }) => $percent * 3.6}deg,
    ${tokens.color.border} 0deg
  );
  display: flex;
  align-items: center;
  justify-content: center;
`

const RingInner = styled.div`
  width: 108px;
  height: 108px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.surface};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
`

const RingPercent = styled.span`
  /* No 22px token (2xl=20 / 3xl=32), so raw. */
  font-size: 22px;
  line-height: 30px;
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

const RingLabel = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
`

/**
 * Pill colours per match tier (background / text / border). One row each, and
 * `Record<MatchTier, …>` makes it exhaustive — a new tier won't compile until it
 * has a row (the old switch had no `default` to catch a missing one).
 */
const PILL_STYLE: Record<MatchTier, { bg: string; fg: string; border: string }> = {
  strong: { bg: tokens.color.blue, fg: tokens.color.white, border: tokens.color.blue },
  partial: { bg: tokens.color.lightBlue, fg: tokens.color.blue, border: tokens.color.lightBlue },
  weak: { bg: tokens.color.surfaceAlt, fg: tokens.color.darkGray, border: tokens.color.border },
  none: { bg: tokens.color.surfaceAlt, fg: tokens.color.textSecondary, border: tokens.color.border },
}

// Graduated pill — colour follows the tier (see PILL_STYLE). Strong leads with a ★.
const MatchPill = styled.span<{ $tier: MatchTier }>`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  padding: ${tokens.spacing.xs} ${tokens.spacing.md};
  border-radius: ${tokens.radius.pill};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  white-space: nowrap;

  ${({ $tier }) => {
    const s = PILL_STYLE[$tier]
    return `
      background: ${s.bg};
      color: ${s.fg};
      border: 1px solid ${s.border};
    `
  }}
`

const Divider = styled.div`
  height: 1px;
  width: 100%;
  background: ${tokens.color.borderLight};
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
  padding: ${tokens.spacing.lg};
`

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  min-width: 0;
`

const SectionHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.xs};

  svg {
    width: 14px;
    height: 14px;
  }
`

const SectionLabel = styled.span<{ $accent?: boolean }>`
  font-size: ${tokens.font.size.base};
  font-weight: ${({ $accent }) =>
    $accent ? tokens.font.weight.bold : tokens.font.weight.semibold};
  color: ${({ $accent }) =>
    $accent ? tokens.color.green : tokens.color.textSecondary};
`

// Side-by-side differ columns (4/5, 3/5, 2/5). Collapses on narrow viewports.
const DifferGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${tokens.spacing.lg};

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
    gap: ${tokens.spacing.md};
  }
`

// Stacked differ columns (1/5).
const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
`

const DifferColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
  min-width: 0;
`

const ColumnLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
`

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.spacing.sm};
`

const Chip = styled.span<{ $highlight: boolean }>`
  padding: ${tokens.spacing.xs} ${tokens.spacing.md};
  border-radius: ${tokens.radius.pill};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  border: ${({ $highlight }) =>
    $highlight ? 'none' : `1px solid ${tokens.color.border}`};
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
