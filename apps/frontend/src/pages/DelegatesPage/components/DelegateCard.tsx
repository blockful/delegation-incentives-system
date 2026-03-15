import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import type { DelegateDetail } from '@/api/types'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { ProposalBar } from '@/components/shared/ProposalBar'
import { useWalletState } from '@/features/wallet/useWalletState'
import { truncateAddress } from '@/utils/format'

interface DelegateCardProps {
  delegate: DelegateDetail
}

function formatVotingPower(vp: string): string {
  const num = Number(vp)
  if (num >= 1_000_000) return `${Math.round(num / 1_000_000)}M VP`
  if (num >= 1_000) return `${Math.round(num / 1_000)}K VP`
  return `${num} VP`
}

function formatActiveSince(iso: string): string {
  const date = new Date(iso)
  const month = date.toLocaleString('en-US', { month: 'short' })
  const year = String(date.getFullYear()).slice(2)
  return `${month} '${year}`
}

const Card = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: ${({ theme }) => theme.colors.background};
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
  font-size: 11px;
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

  return (
    <Card>
      <IdentityRow>
        <EnsAvatar
          address={delegate.address}
          name={delegate.ensName ?? undefined}
          size={40}
        />
        <IdentityInfo>
          {delegate.ensName && <Name>{delegate.ensName}</Name>}
          <Address>{truncateAddress(delegate.address)}</Address>
        </IdentityInfo>
      </IdentityRow>

      {delegate.last10ProposalsVoted && (
        <ProposalBar votes={delegate.last10ProposalsVoted} />
      )}

      {(delegate.votingPower || delegate.delegatorCount != null || delegate.activeSince) && (
        <StatsRow>
          {delegate.votingPower && (
            <Stat>
              <StatLabel>Voting Power</StatLabel>
              <StatValue>{formatVotingPower(delegate.votingPower)}</StatValue>
            </Stat>
          )}
          {delegate.delegatorCount != null && (
            <Stat>
              <StatLabel>Delegators</StatLabel>
              <StatValue>{delegate.delegatorCount}</StatValue>
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
          href={`https://app.ens.domains/${delegate.ensName ?? delegate.address}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Full profile ↗
        </ProfileLink>
      </Actions>
    </Card>
  )
}
