import styled from 'styled-components'
import { useEnsName } from 'wagmi'
import { Link, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faPlus } from '@fortawesome/free-solid-svg-icons'
import type { VoterDetail } from '@/api/types'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { ProposalBar } from '@/components/shared/ProposalBar'
import { useWalletState } from '@/features/wallet/useWalletState'
import { truncateAddress } from '@/utils/format'
import { tokens } from '@/styles'

interface VoterCardProps {
  voter: VoterDetail
  isSelected?: boolean
  onToggleCompare?: () => void
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
  cursor: pointer;
  transition:
    border-color ${tokens.transition.base},
    background-image ${tokens.transition.base},
    box-shadow ${tokens.transition.base};
  overflow: hidden;

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
  }

  @media (min-width: 768px) {
    &:hover {
      border-color: ${tokens.color.blue};
      background-image: linear-gradient(
        209deg,
        rgba(56, 137, 255, 0.04) 4%,
        rgba(255, 255, 255, 0.2) 47%
      );
    }
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
  position: relative;
  z-index: 1;
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
  gap: ${tokens.spacing.md};
`

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
`

const StatValue = styled.span`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  font-variant-numeric: tabular-nums;
  line-height: 20px;
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
  gap: ${tokens.spacing.sm};
  width: 100%;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: ${tokens.spacing.lg};
    background: ${tokens.color.surface};
    transform: translateY(100%);
    opacity: 0;
    pointer-events: none;
    transition:
      transform ${tokens.transition.base},
      opacity ${tokens.transition.base};

    ${StyledCard}:hover & {
      transform: translateY(0);
      opacity: 1;
      pointer-events: auto;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }
`

const DelegateAction = styled.button`
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${tokens.spacing.sm};
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: ${tokens.color.blue};
  color: ${tokens.color.white};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  cursor: pointer;
  transition: all ${tokens.transition.fast};

  @media (min-width: 768px) {
    flex: 1;
    width: auto;
  }

  &:hover {
    background: ${tokens.color.accent};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.accent};
    outline-offset: 2px;
  }
`

const FreeTag = styled.span.attrs({ 'aria-hidden': true })`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 6px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.25);
  font-size: 11px;
  font-weight: ${tokens.font.weight.bold};
  line-height: 14px;
  color: ${tokens.color.white};
`

const ProfileLink = styled(Link)`
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 16px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.blue};
  text-decoration: none;
  line-height: 20px;
  transition: gap ${tokens.transition.fast};

  @media (min-width: 768px) {
    flex: 1;
    width: auto;
  }

  &:hover {
    text-decoration: none;
    gap: 8px;
  }
`

const ProfileArrow = styled.span`
  transition: transform ${tokens.transition.fast};
`

const CompareChip = styled.button<{ $selected: boolean }>`
  position: absolute;
  top: ${tokens.spacing.md};
  right: ${tokens.spacing.md};
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px ${tokens.spacing.sm};
  border-radius: ${tokens.radius.pill};
  border: 1px solid
    ${({ $selected }) =>
      $selected ? tokens.color.blue : tokens.color.borderLight};
  background: ${({ $selected }) =>
    $selected ? tokens.color.lightBlue : tokens.color.surface};
  color: ${({ $selected }) =>
    $selected ? tokens.color.darkBlue : tokens.color.darkGray};
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.semibold};
  cursor: pointer;
  transition:
    background ${tokens.transition.fast},
    border-color ${tokens.transition.fast},
    color ${tokens.transition.fast};

  &:hover {
    border-color: ${tokens.color.blue};
    color: ${tokens.color.darkBlue};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.accent};
    outline-offset: 2px;
  }
`

const CompareIcon = styled.span`
  font-size: 10px;
  display: inline-flex;
`

export function VoterCard({ voter, isSelected = false, onToggleCompare }: VoterCardProps) {
  const navigate = useNavigate()
  const walletState = useWalletState()
  const isDelegated =
    walletState.status === 'delegated' &&
    walletState.delegatedTo.toLowerCase() === voter.address.toLowerCase()

  const { data: resolvedEnsName } = useEnsName({
    address: voter.address as `0x${string}`,
  })
  const ensName = voter.ensName ?? resolvedEnsName ?? null
  const displayName = ensName ?? truncateAddress(voter.address)
  const profileUrl = `/voters/${ensName ?? voter.address}`

  const handleDelegate = () => {
    // TODO: call relayer for gasless delegation
  }

  const handleCardClick = () => {
    navigate(profileUrl)
  }

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      navigate(profileUrl)
    }
  }

  return (
    <StyledCard
      role="link"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      aria-label={`View ${displayName}'s profile`}
    >
      {onToggleCompare && (
        <CompareChip
          type="button"
          $selected={isSelected}
          onClick={(e) => {
            e.stopPropagation()
            onToggleCompare()
          }}
          aria-pressed={isSelected}
          aria-label={isSelected ? 'Remove from compare' : 'Add to compare'}
        >
          <CompareIcon aria-hidden>
            <FontAwesomeIcon icon={isSelected ? faCheck : faPlus} />
          </CompareIcon>
          {isSelected ? 'Selected' : 'Compare'}
        </CompareChip>
      )}

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
        <DelegateAction
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleDelegate()
          }}
        >
          Delegate <FreeTag>Free</FreeTag>
        </DelegateAction>
        <ProfileLink to={profileUrl} onClick={(e) => e.stopPropagation()}>
          View profile <ProfileArrow aria-hidden>→</ProfileArrow>
        </ProfileLink>
      </ActionsBlock>
    </StyledCard>
  )
}
