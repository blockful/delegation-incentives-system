import styled from 'styled-components'
import { useEnsName } from 'wagmi'
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

function formatActiveSince(iso: string): string {
  const date = new Date(iso)
  const month = date.toLocaleString('en-US', { month: 'short' })
  const year = String(date.getFullYear()).slice(2)
  return `${month} '${year}`
}

const StyledCard = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
  padding: ${tokens.spacing.xl};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.gray};
  border-radius: ${tokens.radius.md};
  box-shadow: ${tokens.shadow.sm};
  transition:
    border-color ${tokens.transition.fast},
    box-shadow ${tokens.transition.base};

  &:hover {
    border-color: ${tokens.color.blue};
    box-shadow: ${tokens.shadow.md};
  }

  &:focus-within {
    border-color: ${tokens.color.blue};
    box-shadow: ${tokens.shadow.md};
  }
`

const CardLink = styled(Link)`
  position: absolute;
  inset: 0;
  border-radius: inherit;
  z-index: 1;
  text-indent: -9999px;
  overflow: hidden;

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
  }
`

const IdentityRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
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
`

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const StatValue = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

const StatLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
`

const ActionsBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  margin-top: auto;
`

const DelegateAction = styled.button`
  position: relative;
  z-index: 2;
  width: 100%;
  padding: ${tokens.spacing.sm} ${tokens.spacing.lg};
  border-radius: ${tokens.radius.sm};
  border: 1px solid ${tokens.color.blue};
  background: ${tokens.color.blue};
  color: ${tokens.color.white};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  cursor: pointer;
  transition:
    background ${tokens.transition.fast},
    border-color ${tokens.transition.fast};
  text-align: center;

  &:hover {
    background: ${tokens.color.accent};
    border-color: ${tokens.color.accent};
    color: ${tokens.color.white};
  }
`

const DelegatedStatus = styled.span`
  width: 100%;
  padding: ${tokens.spacing.sm} ${tokens.spacing.lg};
  border-radius: ${tokens.radius.sm};
  border: 1px solid ${tokens.color.positiveEmphasis};
  background: ${tokens.color.tierHighlight};
  color: ${tokens.color.positiveEmphasis};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  text-align: center;
`

const FreeTag = styled.span.attrs({ 'aria-hidden': true })`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: ${tokens.radius.pill};
  background: rgba(255, 255, 255, 0.25);
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0;
  margin-left: ${tokens.spacing.xs};
`

export function VoterCard({ voter }: VoterCardProps) {
  const walletState = useWalletState()
  const isDelegated =
    walletState.status === 'delegated' &&
    walletState.delegatedTo.toLowerCase() === voter.address.toLowerCase()

  const { data: resolvedEnsName } = useEnsName({
    address: voter.address as `0x${string}`,
  })
  const ensName = voter.ensName ?? resolvedEnsName ?? null
  const profileHref = `/voters/${ensName ?? voter.address}`
  const profileLabel = `View profile for ${ensName ?? voter.address}`

  const handleDelegate = () => {
    // TODO: call relayer for gasless delegation
  }

  return (
    <StyledCard>
      <CardLink to={profileHref} aria-label={profileLabel}>
        {profileLabel}
      </CardLink>

      <IdentityRow>
        <AddressIdentity
          address={voter.address}
          ensName={ensName}
          avatarUrl={voter.avatarUrl}
          showAvatar
          avatarSize={40}
          layout="stack"
          size="md"
        />
      </IdentityRow>

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
          <StatLabel>Token holders</StatLabel>
        </Stat>
        {voter.activeSince && (
          <Stat>
            <StatValue>{formatActiveSince(voter.activeSince)}</StatValue>
            <StatLabel>Active since</StatLabel>
          </Stat>
        )}
      </StatsRow>

      <ActionsBlock>
        {isDelegated ? (
          <DelegatedStatus>Delegated</DelegatedStatus>
        ) : (
          <DelegateAction type="button" onClick={handleDelegate}>
            Delegate <FreeTag>Free</FreeTag>
          </DelegateAction>
        )}
      </ActionsBlock>
    </StyledCard>
  )
}
