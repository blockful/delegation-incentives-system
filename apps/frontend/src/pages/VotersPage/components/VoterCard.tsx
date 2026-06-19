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

interface VoterCardProps {
  voter: VoterDetail
  /** Reverse-resolved ENS name supplied by the parent page (preferred when v.ensName is null). */
  resolvedEnsName?: string | null
  /** Called when this card's own useEnsName settles, so the page can use it in filters. */
  onEnsResolved?: (lowercasedAddress: string, name: string | null) => void
  /** Match vs the viewer's selection (null when either side hasn't selected). Computed client-side. */
  match?: MatchScore | null
  /** Whether the connected viewer has selected. Gates the match line; the unselected viewer state is FE-4's. */
  viewerHasSelected?: boolean
  /** Degraded /voters: viewer connected, dismissed the prompt, not selected — show a "?" placeholder. */
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

function formatActiveSince(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const year = String(date.getFullYear()).slice(-2)
  return `${month} ‘${year}`
}

const StyledCard = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xl};
  padding: ${tokens.spacing.lg};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.md};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: border-color ${tokens.transition.base};

  &:hover {
    border-color: ${tokens.color.blue};
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

const AddressLine = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
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
  degraded = false,
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
      <StyledCard>
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
              <AddressLine>{truncateAddress(voter.address)}</AddressLine>
            </NameStack>
          </IdentityRow>

          {viewerHasSelected && <MatchStatus match={match} />}
          {!viewerHasSelected && degraded && (
            <DegradedMatchStatus delegateHasSelected={voter.words != null} />
          )}

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
            <StatValue>{formatVotingPower(voter.votingPower)}</StatValue>
            <StatLabel>Voting Power</StatLabel>
          </Stat>
          <Stat>
            <StatValue>{voter.tokenHolderCount}</StatValue>
            <StatLabel>Delegators</StatLabel>
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
            Delegate now{relayerHasGas === true && <FreeBadge>Free</FreeBadge>}
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

/**
 * Match status line, shown only once the viewer has selected. With both sides
 * selected it shows the strong/partial variant + percent; if the delegate
 * hasn't selected (`match` null), the neutral "didn't pick" state. The
 * unselected-viewer state is owned by FE-4. ⚠️ Copy is placeholder (copy-pass).
 */
function MatchStatus({ match }: { match: MatchScore | null | undefined }) {
  if (!match) {
    return (
      <MatchRow $variant="none">
        <MatchText>Delegate didn&apos;t pick priorities</MatchText>
        <MatchValue>– Match</MatchValue>
      </MatchRow>
    )
  }
  if (match.strongMatch) {
    return (
      <MatchRow $variant="strong">
        <MatchText>⭐ Strong match with your values</MatchText>
        <MatchValue>{match.percent}% Match</MatchValue>
      </MatchRow>
    )
  }
  return (
    <MatchRow $variant="partial">
      <MatchText>
        Shares {match.sharedWords.length} of your word
        {match.sharedWords.length === 1 ? '' : 's'}
      </MatchText>
      <MatchValue>{match.percent}% Match</MatchValue>
    </MatchRow>
  )
}

/**
 * Degraded /voters placeholder: the viewer is connected but hasn't selected (and
 * dismissed the prompt). Shows "?" with a nudge, or the delegate's own
 * unselected state. ⚠️ Copy is placeholder.
 */
function DegradedMatchStatus({ delegateHasSelected }: { delegateHasSelected: boolean }) {
  return (
    <MatchRow $variant="none">
      <MatchText>
        {delegateHasSelected ? 'Select to see your match' : "Delegate didn't pick priorities"}
      </MatchText>
      <MatchValue>?</MatchValue>
    </MatchRow>
  )
}

const MatchRow = styled.div<{ $variant: 'strong' | 'partial' | 'none' }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.sm};
  padding: ${tokens.spacing.sm} ${tokens.spacing.md};
  border-radius: ${tokens.radius.sm};
  background: ${({ $variant }) =>
    $variant === 'strong' ? tokens.color.status.success.bg : tokens.color.surfaceAlt};
  color: ${({ $variant }) => {
    if ($variant === 'strong') return tokens.color.status.success.fg
    if ($variant === 'partial') return tokens.color.darkBlue
    return tokens.color.textSecondary
  }};
`

const MatchText = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  line-height: 20px;
`

const MatchValue = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  white-space: nowrap;
  line-height: 20px;
`
