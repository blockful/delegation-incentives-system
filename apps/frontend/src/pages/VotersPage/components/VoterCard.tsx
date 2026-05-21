import { useState } from 'react'
import styled from 'styled-components'
import { useEnsName } from 'wagmi'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faPlus } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@ensdomains/thorin'
import type { VoterDetail } from '@/api/types'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { ProposalBar } from '@/components/shared/ProposalBar'
import { DelegationModal } from '@/features/delegate/components/DelegationModal'
import { useRelayerBalance } from '@/features/delegate/hooks/useGaslessRelayer'
import { useWalletState } from '@/features/wallet/useWalletState'
import { truncateAddress } from '@/utils/format'
import { contracts } from '@/config/contracts'
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
  const walletState = useWalletState()
  const [modalOpen, setModalOpen] = useState(false)
  const isDelegated =
    walletState.status === 'delegated' &&
    walletState.delegatedTo.toLowerCase() === voter.address.toLowerCase()

  const { data: resolvedEnsName } = useEnsName({
    address: voter.address as `0x${string}`,
  })
  const { hasEnoughBalance: relayerHasGas } = useRelayerBalance()
  const ensName = voter.ensName ?? resolvedEnsName ?? null
  const displayName = ensName ?? truncateAddress(voter.address)
  const profileUrl = `/voters/${ensName ?? voter.address}`

  const handleDelegate = () => {
    if (walletState.status === 'disconnected') return
    setModalOpen(true)
  }

  return (
    <>
      <StyledCard>
        {onToggleCompare && (
          <CompareChip
            type="button"
            $selected={isSelected}
            onClick={onToggleCompare}
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
          <Button
            colorStyle="bluePrimary"
            size="small"
            onClick={handleDelegate}
          >
            Delegate{relayerHasGas === true && <FreeBadge>Free</FreeBadge>}
          </Button>
          <ProfileLink to={profileUrl}>
            View profile <ProfileArrow aria-hidden>→</ProfileArrow>
          </ProfileLink>
        </ActionsBlock>
      </StyledCard>
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
