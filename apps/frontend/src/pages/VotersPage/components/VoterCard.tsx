import styled from 'styled-components'
import { useEnsName, useEnsText } from 'wagmi'
import { Link } from 'react-router-dom'
import type { VoterDetail } from '@/api/types'
import { AddressIdentity } from '@/components/shared/AddressIdentity'
import { ProposalBar } from '@/components/shared/ProposalBar'
import { useWalletState } from '@/features/wallet/useWalletState'
import { tokens } from '@/styles'

interface VoterCardProps {
  voter: VoterDetail
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

const StyledCard = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
  padding: ${tokens.spacing.xl};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.md};
  box-shadow: ${tokens.shadow.soft};
  transition:
    border-color ${tokens.transition.fast},
    box-shadow ${tokens.transition.base},
    transform ${tokens.transition.base};
  overflow: hidden;

  &:hover {
    border-color: ${tokens.color.blue};
    box-shadow: ${tokens.shadow.md};
    transform: translateY(-2px);
  }

  /* Subtle corner accent on hover */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 80px;
    height: 80px;
    background: radial-gradient(circle at top right, ${tokens.color.lightBlueOpacity}, transparent 70%);
    opacity: 0;
    transition: opacity ${tokens.transition.base};
    pointer-events: none;
  }

  &:hover::before {
    opacity: 1;
  }
`

const IdentityRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
  position: relative;
  z-index: 1;
`

const BioRow = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.sm};
  line-height: 1.5;
  color: ${tokens.color.darkGray};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const ProposalSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const ProposalLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
`

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${tokens.spacing.md};
  padding-top: ${tokens.spacing.md};
  border-top: 1px solid ${tokens.color.borderLight};
`

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const StatValue = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
`

const StatLabel = styled.span`
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.darkGray};
  letter-spacing: 0.04em;
  font-weight: ${tokens.font.weight.semibold};
`

const ActionsBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  margin-top: auto;
`

const DelegateAction = styled.button`
  width: 100%;
  padding: ${tokens.spacing.sm} ${tokens.spacing.lg};
  border-radius: ${tokens.radius.sm};
  border: 1px solid ${tokens.color.blue};
  background: ${tokens.color.blue};
  color: ${tokens.color.white};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  cursor: pointer;
  transition: all ${tokens.transition.fast};
  text-align: center;

  &:hover {
    background: ${tokens.color.accent};
    border-color: ${tokens.color.accent};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.accent};
    outline-offset: 2px;
  }
`

const DelegatedStatus = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: ${tokens.spacing.sm} ${tokens.spacing.lg};
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.status.success.bg};
  border: 1px solid ${tokens.color.status.success.border};
  color: ${tokens.color.status.success.fg};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
`

const DelegatedCheck = styled.span`
  font-size: ${tokens.font.size.sm};
`

const FreeTag = styled.span.attrs({ 'aria-hidden': true })`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: ${tokens.radius.pill};
  background: rgba(255, 255, 255, 0.25);
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  letter-spacing: 0;
  margin-left: ${tokens.spacing.xs};
`

const ProfileLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.blue};
  text-decoration: none;
  padding: ${tokens.spacing.xs} 0;
  transition: gap ${tokens.transition.fast};

  &:hover {
    text-decoration: underline;
    gap: 8px;
  }
`

const ProfileArrow = styled.span`
  transition: transform ${tokens.transition.fast};
`

function useEnsTextOrEmpty(name: string | null, key: string): string | undefined {
  const { data } = useEnsText({
    name: name ?? undefined,
    key,
    query: { enabled: Boolean(name) },
  })
  return typeof data === 'string' && data.trim().length > 0 ? data : undefined
}

export function VoterCard({ voter }: VoterCardProps) {
  const walletState = useWalletState()
  const isDelegated =
    walletState.status === 'delegated' &&
    walletState.delegatedTo.toLowerCase() === voter.address.toLowerCase()

  const { data: resolvedEnsName } = useEnsName({
    address: voter.address as `0x${string}`,
  })
  const ensName = voter.ensName ?? resolvedEnsName ?? null

  const bio = useEnsTextOrEmpty(ensName, 'description')

  const handleDelegate = () => {
    // TODO: call relayer for gasless delegation
  }

  const votedCount = voter.last10ProposalsVoted.filter(Boolean).length

  return (
    <StyledCard>
      <IdentityRow>
        <AddressIdentity
          address={voter.address}
          ensName={ensName}
          avatarUrl={voter.avatarUrl}
          showAvatar
          avatarSize={44}
          layout="stack"
          size="md"
        />
      </IdentityRow>

      {bio && <BioRow>{bio}</BioRow>}

      <ProposalSection>
        <ProposalLabel>Last 10 proposals</ProposalLabel>
        <ProposalBar votes={voter.last10ProposalsVoted} />
      </ProposalSection>

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
          <StatValue>{Math.round((votedCount / 10) * 100)}%</StatValue>
          <StatLabel>Participation</StatLabel>
        </Stat>
      </StatsRow>

      <ActionsBlock>
        {isDelegated ? (
          <DelegatedStatus>
            <DelegatedCheck aria-hidden>✓</DelegatedCheck>
            Delegated
          </DelegatedStatus>
        ) : (
          <DelegateAction type="button" onClick={handleDelegate}>
            Delegate <FreeTag>Free</FreeTag>
          </DelegateAction>
        )}
        <ProfileLink to={`/voters/${ensName ?? voter.address}`}>
          View profile <ProfileArrow aria-hidden>→</ProfileArrow>
        </ProfileLink>
      </ActionsBlock>
    </StyledCard>
  )
}
