import { useState } from 'react'
import styled from 'styled-components'
import { Button, WalletSVG, LockSVG, CheckSVG } from '@ensdomains/thorin'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHeart, faHourglass, faStar, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
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
import { matchLevel, resolveCardState } from './delegateValuesState'

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
              <Button colorStyle="bluePrimary" onClick={openFlow}>
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
            <Button colorStyle="bluePrimary" onClick={() => void openWalletModal()}>
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
              <Button colorStyle="bluePrimary" onClick={openFlow}>
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
              <Button colorStyle="bluePrimary" onClick={openFlow}>
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
      <HeaderStrip>
        <RingAndPill>
          <MatchRing $percent={level.ringPercent} $color={level.ringColor}>
            <RingInner>
              <RingPercent>{level.ringPercent}%</RingPercent>
              <RingLabel>match</RingLabel>
            </RingInner>
          </MatchRing>
          <MatchPill $tier={level.tier}>
            {level.showStar ? (
              <FontAwesomeIcon icon={faStar} aria-hidden="true" />
            ) : null}
            {level.pillLabel}
          </MatchPill>
        </RingAndPill>
      </HeaderStrip>

      <Divider />

      <Body>
        {/* Shared values — always shown when there's any overlap. */}
        {score.sharedWords.length > 0 && (
          <Section>
            <SectionHead>
              <CheckSVG style={{ color: tokens.color.green }} aria-hidden="true" />
              <SectionLabel>You both value</SectionLabel>
            </SectionHead>
            <Chips words={score.sharedWords} labelOf={labelOf} highlight />
          </Section>
        )}

        {renderDiffer(level.differLayout, score, who, labelOf, delegateWords)}
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

    // 0/5 — no overlap; show what the delegate stands for.
    case 'delegate-only':
      return (
        <Section>
          <SectionLabel>Here&apos;s what they stand for</SectionLabel>
          <Chips words={delegateWords} labelOf={labelOf} />
        </Section>
      )
  }
}

/** Shared shell for the single-message states (icon + title + body + optional CTA). */
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
    <Card>
      <PromptIcon aria-hidden="true">{icon}</PromptIcon>
      <PromptText>
        <CardTitle>{title}</CardTitle>
        <Muted>{body}</Muted>
      </PromptText>
      {cta}
    </Card>
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

// Icon medallion for the single-message prompt states.
const PromptIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.lightBlue};
  color: ${tokens.color.blue};
  font-size: 18px;

  svg {
    width: 20px;
    height: 20px;
  }
`

const PromptText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

// ── Match ring ─────────────────────────────────────────────────────────────
// A conic-gradient ring filled to $percent; the unfilled arc is a faint track.
const RingAndPill = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.lg};
  flex-wrap: wrap;
`

const MatchRing = styled.div<{ $percent: number; $color: string }>`
  position: relative;
  flex-shrink: 0;
  width: 72px;
  height: 72px;
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
  width: 56px;
  height: 56px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.surface};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
`

const RingPercent = styled.span`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

const RingLabel = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.textSecondary};
`

// Graduated pill — colour follows the bucket (Strong/Partial = blue/green-ish,
// Weak = muted, None = grey). Strong leads with a ★.
const MatchPill = styled.span<{ $tier: 'strong' | 'partial' | 'weak' | 'none' }>`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  padding: ${tokens.spacing.xs} ${tokens.spacing.md};
  border-radius: ${tokens.radius.pill};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  white-space: nowrap;

  ${({ $tier }) => {
    switch ($tier) {
      case 'strong':
        return `
          background: ${tokens.color.status.success.bg};
          color: ${tokens.color.positiveEmphasis};
          border: 1px solid ${tokens.color.status.success.border};
        `
      case 'partial':
        return `
          background: ${tokens.color.lightBlue};
          color: ${tokens.color.blue};
          border: 1px solid ${tokens.color.lightBlue};
        `
      case 'weak':
        return `
          background: ${tokens.color.surfaceAlt};
          color: ${tokens.color.darkGray};
          border: 1px solid ${tokens.color.border};
        `
      case 'none':
        return `
          background: ${tokens.color.surfaceAlt};
          color: ${tokens.color.textSecondary};
          border: 1px solid ${tokens.color.border};
        `
    }
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

const SectionLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.textSecondary};
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
