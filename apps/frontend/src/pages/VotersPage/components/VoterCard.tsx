import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { useEnsName } from 'wagmi'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@ensdomains/thorin'
import type { MatchScore } from '@ens-dis/domain'
import type { VoterDetail } from '@/api/types'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { ProposalBar } from '@/components/shared/ProposalBar'
import {
  DelegationEligibilityModal,
  type DelegationEligibilityReason,
} from '@/features/delegate/components/DelegationEligibilityModal'
import { DelegationModal } from '@/features/delegate/components/DelegationModal'
import {
  useGasSponsorshipBalanceStatus,
  useRelayerBalance,
} from '@/features/delegate/hooks/useGaslessRelayer'
import { openWalletModal } from '@/features/wallet/openWalletModal'
import { useWalletState } from '@/features/wallet/useWalletState'
import { truncateAddress } from '@/utils/format'
import { contracts } from '@/config/contracts'
import { tokens } from '@/styles'
import {
  voterCardMatchDisplay,
  type MatchVariant,
} from './voterCardMatch'

interface VoterCardProps {
  voter: VoterDetail
  /** Reverse-resolved ENS name supplied by the parent page (preferred when v.ensName is null). */
  resolvedEnsName?: string | null
  /** Called when this card's own useEnsName settles, so the page can use it in filters. */
  onEnsResolved?: (lowercasedAddress: string, name: string | null) => void
  /** Match vs the viewer's selection (null when either side hasn't selected). Computed client-side. */
  match?: MatchScore | null
  /** Whether the connected viewer has selected. Drives the match subtitle + first stat. */
  viewerHasSelected?: boolean
  /**
   * Degraded /voters: viewer connected, dismissed the prompt, not selected.
   * Retained for the page's call site; the "?" placeholder is now driven purely
   * by `viewerHasSelected`, so this no longer changes copy.
   */
  degraded?: boolean
}

function formatVotingPower(vpWei: string): string {
  const ens = Number(vpWei) / 1e18
  if (ens >= 1_000_000) {
    const m = ens / 1_000_000
    const rounded = Math.round(m * 10) / 10
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}M`
  }
  if (ens >= 1_000) {
    const k = ens / 1_000
    const rounded = Math.round(k * 10) / 10
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}K`
  }
  return `${Math.round(ens)}`
}

/**
 * Humanize a word id for the compact weak-match chips (e.g.
 * `public_goods_funding` → `Public goods funding`). The list card doesn't
 * subscribe to the word pool — keeping these 12 cards free of an extra async
 * dependency — so we derive a readable label from the id itself.
 */
function humanizeWordId(id: string): string {
  const spaced = id.replace(/[_-]+/g, ' ').trim()
  if (!spaced) return id
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function formatActiveSince(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const year = String(date.getFullYear()).slice(-2)
  return `${month} ‘${year}`
}

const StyledCard = styled.div<{ $highlight: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xl};
  padding: ${tokens.spacing.lg};
  background: ${({ $highlight }) =>
    $highlight ? tokens.color.status.success.bg : tokens.color.surface};
  border: 1px solid
    ${({ $highlight }) =>
      $highlight ? tokens.color.status.success.border : tokens.color.borderLight};
  border-radius: ${tokens.radius.md};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: border-color ${tokens.transition.base},
    background ${tokens.transition.base};

  &:hover {
    border-color: ${({ $highlight }) =>
      $highlight ? tokens.color.status.success.fg : tokens.color.blue};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const CardHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
`

const IdentityRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
`

const AvatarWrap = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 9999px;
  border: 1px solid ${tokens.color.borderLight};
  overflow: hidden;
  flex-shrink: 0;
`

const NameStack = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.sm};
  width: 100%;
`

const NameText = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

/** Colour the match subtitle per variant (strong green, partial blue, rest muted). */
function subtitleColor(variant: MatchVariant): string {
  switch (variant) {
    case 'strong':
      return tokens.color.status.success.fg
    case 'partial':
      return tokens.color.blue
    default:
      // weak / none / unranked / unpicked all read as muted secondary text.
      return tokens.color.textSecondary
  }
}

const MatchSubtitle = styled.p<{ $variant: MatchVariant }>`
  margin: 0;
  font-size: ${tokens.font.size.base};
  font-weight: ${({ $variant }) =>
    $variant === 'strong' ? tokens.font.weight.bold : tokens.font.weight.medium};
  color: ${({ $variant }) => subtitleColor($variant)};
  line-height: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

/**
 * Weak-match "differ list": the words only this delegate picked, shown as small
 * wrapped chips so the holder sees *where* they diverge. Stacked under the
 * subtitle; only rendered for the weak variant (per the Figma set).
 */
const DifferList = styled.ul`
  list-style: none;
  margin: ${tokens.spacing.xs} 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.spacing.xs};
`

const DifferChip = styled.li`
  padding: 1px ${tokens.spacing.sm};
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.borderLight};
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 16px;
  white-space: nowrap;
`

const DelegatedTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 14px;
  background: ${tokens.color.status.success.bg};
  color: ${tokens.color.status.success.fg};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  white-space: nowrap;
  flex-shrink: 0;
`

const ProposalSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const ProposalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
`

const ProposalLabel = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const ProposalCount = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
`

const StatsRow = styled.div`
  display: flex;
  flex-direction: row;
  gap: ${tokens.spacing.sm};

  @media (min-width: 480px) {
    gap: ${tokens.spacing.md};
  }
`

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  flex: 1;
  min-width: 0;
`

const StatValue = styled.span`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  font-variant-numeric: tabular-nums;
  line-height: 20px;
  white-space: nowrap;
`

const StatLabel = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.textSecondary};
  line-height: 20px;
`

const ActionsBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  width: 100%;
  position: relative;
  z-index: 2;
`

/**
 * Faint "Free" pill that sits INSIDE the blue Delegate button (Figma node
 * 5899-6899; present on every voter-card variant). It signals gas-free /
 * sponsored delegation.
 *
 * Styling: a translucent white-on-primary pill. The design system only exposes
 * solid semantic colours, so there's no token for "white at low opacity over
 * the primary button" — these literal rgba values are deliberate and match the
 * Figma. Reuse, don't re-invent, if a token is ever added.
 *
 * Decorative (`aria-hidden`): the button's accessible name stays a clean
 * "Delegate". Per-viewer free-gas eligibility is conveyed at click time via the
 * DelegationEligibilityModal, so hiding the pill from the a11y tree loses no
 * actionable information.
 */
const FreeBadge = styled.span.attrs({ 'aria-hidden': true })`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(246, 248, 250, 0.2);
  border: 1px solid rgba(208, 215, 222, 0.2);
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
  color: white;
  margin-left: ${tokens.spacing.sm};
  vertical-align: middle;
`


const CardLink = styled(Link)`
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: ${tokens.radius.md};

  &:focus-visible {
    outline: 2px solid ${tokens.color.accent};
    outline-offset: 2px;
  }
`

/**
 * Visible profile link. The whole card is already clickable via the CardLink
 * overlay, but that affordance is invisible — this gives users an explicit
 * way to reach the delegate profile. Lives inside ActionsBlock (z-index: 2)
 * so it sits above the overlay.
 */
const ProfileLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  align-self: center;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.blue};
  line-height: 20px;
  text-decoration: none;
  transition: gap ${tokens.transition.fast}, opacity ${tokens.transition.fast};

  svg {
    width: 12px;
    height: 12px;
  }

  &:hover {
    gap: 10px;
    opacity: 0.85;
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.accent};
    outline-offset: 2px;
    border-radius: 4px;
  }
`

export function VoterCard({
  voter,
  resolvedEnsName,
  onEnsResolved,
  match,
  viewerHasSelected = false,
}: VoterCardProps) {
  const walletState = useWalletState()
  const [modalOpen, setModalOpen] = useState(false)
  const [eligibilityModalOpen, setEligibilityModalOpen] = useState(false)
  const isDelegated =
    walletState.status === 'delegated' &&
    walletState.delegatedTo.toLowerCase() === voter.address.toLowerCase()

  const { data: localResolved } = useEnsName({
    address: voter.address as `0x${string}`,
    query: { enabled: !voter.ensName },
  })

  useEffect(() => {
    if (!onEnsResolved) return
    onEnsResolved(voter.address.toLowerCase(), localResolved ?? null)
  }, [voter.address, localResolved, onEnsResolved])

  const { hasEnoughBalance: relayerHasGas } = useRelayerBalance()
  const connectedAddress =
    walletState.status !== 'disconnected' ? walletState.address : undefined
  const { status: sponsorshipStatus } =
    useGasSponsorshipBalanceStatus(connectedAddress)
  const ensName = voter.ensName ?? resolvedEnsName ?? localResolved ?? null
  const displayName = ensName ?? truncateAddress(voter.address)
  const profileUrl = `/voters/${ensName ?? voter.address}`

  // Match display (subtitle label + colour + first-stat value + card highlight).
  // The qualitative label now lives in the subtitle; the percentage is the
  // first stat. `degraded` no longer changes copy — an unpicked viewer always
  // sees "Rank to see your match" ("?"), which also reads fine under the blur.
  const matchDisplay = voterCardMatchDisplay({
    match,
    viewerHasSelected,
    delegateHasRanked: voter.words != null,
  })
  // The weak variant shows the delegate's diverging picks as small chips.
  const differWords =
    matchDisplay.variant === 'weak' ? (match?.bUnique ?? []) : []

  // Relayer paused is global — it beats the balance-gated states because a
  // bigger balance wouldn't unlock sponsored gas while the relayer is down.
  const eligibilityReason: DelegationEligibilityReason | null =
    relayerHasGas === false
      ? 'relayer-paused'
      : sponsorshipStatus === 'no-ens'
        ? 'no-ens'
        : sponsorshipStatus === 'below-minimum'
          ? 'below-minimum'
          : null

  const handleDelegate = () => {
    if (walletState.status === 'disconnected') {
      void openWalletModal()
      return
    }
    if (eligibilityReason) {
      setEligibilityModalOpen(true)
      return
    }
    setModalOpen(true)
  }

  return (
    <>
      <StyledCard $highlight={matchDisplay.highlight}>
        <CardLink to={profileUrl} aria-label={`View profile for ${displayName}`} />

        <CardHeader>
          <IdentityRow>
            <AvatarWrap>
              <EnsAvatar
                address={voter.address}
                name={ensName ?? undefined}
                avatarUrl={voter.avatarUrl}
                size={48}
              />
            </AvatarWrap>
            <NameStack>
              <TitleRow>
                <NameText>{displayName}</NameText>
                {isDelegated && <DelegatedTag>Delegated</DelegatedTag>}
              </TitleRow>
              <MatchSubtitle $variant={matchDisplay.variant}>
                {matchDisplay.subtitle}
              </MatchSubtitle>
              {differWords.length > 0 && (
                <DifferList aria-label="Words this delegate prioritises">
                  {differWords.map((id) => (
                    <DifferChip key={id}>{humanizeWordId(id)}</DifferChip>
                  ))}
                </DifferList>
              )}
            </NameStack>
          </IdentityRow>

          <ProposalSection>
            <ProposalHeader>
              <ProposalLabel>Last 10 proposals</ProposalLabel>
              <ProposalCount>
                {voter.last10ProposalsVoted.filter(Boolean).length}/{voter.last10ProposalsVoted.length}
              </ProposalCount>
            </ProposalHeader>
            <ProposalBar votes={voter.last10ProposalsVoted} showCount={false} />
          </ProposalSection>
        </CardHeader>

        <StatsRow>
          <Stat>
            <StatValue>{matchDisplay.statValue}</StatValue>
            <StatLabel>Match</StatLabel>
          </Stat>
          <Stat>
            <StatValue>{formatVotingPower(voter.votingPower)}</StatValue>
            <StatLabel>Voting Power</StatLabel>
          </Stat>
          <Stat>
            <StatValue>{formatActiveSince(voter.activeSince)}</StatValue>
            <StatLabel>Active Since</StatLabel>
          </Stat>
        </StatsRow>

        <ActionsBlock>
          <Button
            colorStyle="bluePrimary"
            size="small"
            onClick={handleDelegate}
          >
            Delegate{relayerHasGas === true && <FreeBadge>Free</FreeBadge>}
          </Button>
          <ProfileLink to={profileUrl}>
            View profile <FontAwesomeIcon icon={faArrowRight} aria-hidden />
          </ProfileLink>
        </ActionsBlock>
      </StyledCard>
      {eligibilityModalOpen && eligibilityReason && (
        <DelegationEligibilityModal
          open
          reason={eligibilityReason}
          onClose={() => setEligibilityModalOpen(false)}
          onDelegateAnyway={() => {
            setEligibilityModalOpen(false)
            setModalOpen(true)
          }}
        />
      )}
      {modalOpen && (
        <DelegationModal
          open
          onClose={() => setModalOpen(false)}
          delegateAddress={voter.address as `0x${string}`}
          delegateEnsName={ensName}
          delegateAvatarUrl={voter.avatarUrl}
          tokenAddress={contracts.ensToken}
        />
      )}
    </>
  )
}
