import styled from 'styled-components'
import { Button, Card } from '@ensdomains/thorin'
import { useEnsName } from 'wagmi'
import type { DelegateDetail } from '@/api/types'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { ProposalBar } from '@/components/shared/ProposalBar'
import { useWalletState } from '@/features/wallet/useWalletState'
import { truncateAddress } from '@/utils/format'

interface DelegateCardProps {
  delegate: DelegateDetail
}

function formatVotingPower(vpWei: string): string {
  const ens = Number(vpWei) / 1e18
  if (ens >= 1_000_000) {
    const m = ens / 1_000_000
    const rounded = Math.round(m * 10) / 10
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}M VP`
  }
  if (ens >= 1_000) {
    const k = ens / 1_000
    const rounded = Math.round(k * 10) / 10
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}K VP`
  }
  return `${Math.round(ens)} VP`
}

function formatActiveSince(iso: string): string {
  const date = new Date(iso)
  const month = date.toLocaleString('en-US', { month: 'short' })
  const year = String(date.getFullYear()).slice(2)
  return `${month} '${year}`
}

const StyledCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const IdentityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const IdentityInfo = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const Name = styled.span`
  font-weight: 700;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Address = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const StatsRow = styled.div`
  display: flex;
  gap: 16px;
`

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const StatLabel = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textTertiary};
  text-transform: uppercase;
`

const StatValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const ProfileLink = styled.a`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.blue};
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
`

export function DelegateCard({ delegate }: DelegateCardProps) {
  const walletState = useWalletState()
  const isDelegated =
    walletState.status === 'delegated' &&
    walletState.delegatedTo.toLowerCase() === delegate.address.toLowerCase()

  const { data: resolvedEnsName } = useEnsName({
    address: delegate.address as `0x${string}`,
  })
  const ensName = delegate.ensName ?? resolvedEnsName ?? null

  return (
    <StyledCard>
      <IdentityRow>
        <EnsAvatar
          address={delegate.address}
          name={ensName ?? undefined}
          size={40}
        />
        <IdentityInfo>
          {ensName && <Name>{ensName}</Name>}
          <Address>{truncateAddress(delegate.address)}</Address>
        </IdentityInfo>
      </IdentityRow>

      {delegate.last10ProposalsVoted && (
        <ProposalBar votes={delegate.last10ProposalsVoted} />
      )}

      {(delegate.votingPower || delegate.activeSince) && (
        <StatsRow>
          {delegate.votingPower && (
            <Stat>
              <StatLabel>Voting Power</StatLabel>
              <StatValue>{formatVotingPower(delegate.votingPower)}</StatValue>
            </Stat>
          )}
          {delegate.activeSince && (
            <Stat>
              <StatLabel>Active since</StatLabel>
              <StatValue>{formatActiveSince(delegate.activeSince)}</StatValue>
            </Stat>
          )}
        </StatsRow>
      )}

      <Actions>
        {isDelegated ? (
          <Button colorStyle="greenPrimary" size="small" disabled>
            Delegated ✓
          </Button>
        ) : (
          <Button colorStyle="bluePrimary" size="small">
            Delegate
          </Button>
        )}
        <ProfileLink
          href={`https://anticapture.com/ens/holders-and-delegates?tab=delegates&drawerAddress=${delegate.address}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Full profile ↗
        </ProfileLink>
      </Actions>
    </StyledCard>
  )
}
