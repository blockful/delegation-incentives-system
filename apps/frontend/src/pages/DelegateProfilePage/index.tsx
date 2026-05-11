import { useParams, Link } from 'react-router-dom'
import styled from 'styled-components'
import { Spinner } from '@ensdomains/thorin'
import { useEnsName, useEnsAddress } from 'wagmi'
import { useDelegate } from '@/features/delegates/useDelegate'
import { useWalletState } from '@/features/wallet/useWalletState'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { ProposalBar } from '@/components/shared/ProposalBar'
import { truncateAddress } from '@/utils/format'
import { tokens, fadeInUp, LoadingWrapper, ErrorMessage } from '@/styles'

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
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

const Page = styled.div`
  max-width: ${tokens.maxWidth.lg};
  margin: 0 auto;
  padding: ${tokens.spacing['3xl']} ${tokens.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
  animation: ${fadeInUp} 0.4s ease both;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['5xl']} ${tokens.spacing['2xl']};
  }
`

const BackLink = styled(Link)`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkGray};
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  transition: color ${tokens.transition.fast};

  &:hover {
    color: ${tokens.color.blue};
  }
`

const ProfileHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing.lg};
  text-align: center;
`

const Name = styled.h1`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.darkBlue};
  margin: 0;
  word-break: break-all;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['4xl']};
  }
`

const Address = styled.span`
  font-size: ${tokens.font.size.lg};
  color: ${tokens.color.darkGray};
  font-family: ${tokens.font.mono};
`

const DelegateButton = styled.button<{ $delegated: boolean }>`
  width: 100%;
  max-width: 400px;
  padding: ${tokens.spacing.lg} ${tokens.spacing['2xl']};
  border-radius: ${tokens.radius.sm};
  border: 1px solid ${({ $delegated }) =>
    $delegated ? tokens.color.positiveEmphasis : tokens.color.blue};
  background: ${({ $delegated }) =>
    $delegated ? tokens.color.tierHighlight : tokens.color.blue};
  color: ${({ $delegated }) =>
    $delegated ? tokens.color.positiveEmphasis : '#fff'};
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  cursor: ${({ $delegated }) => ($delegated ? 'default' : 'pointer')};
  transition: all ${tokens.transition.fast};

  &:hover:not(:disabled) {
    opacity: 0.85;
  }
`

const Card = styled.div`
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.gray};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.spacing.xl};
  box-shadow: ${tokens.shadow.sm};
`

const CardTitle = styled.h2`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${tokens.color.darkGray};
  margin: 0 0 ${tokens.spacing.lg};
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${tokens.spacing.xl};

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const StatValue = styled.span`
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

const StatLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
`

const ExternalLink = styled.a`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.blue};
  text-decoration: none;
  text-align: center;
  display: block;
  transition: color ${tokens.transition.fast};

  &:hover {
    text-decoration: underline;
  }
`

function isAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value)
}

export function DelegateProfilePage() {
  const { address: param } = useParams<{ address: string }>()
  const rawParam = param ?? ''
  const isEnsParam = !isAddress(rawParam)

  const { data: resolvedAddress, isLoading: ensLoading } = useEnsAddress({
    name: rawParam,
    query: { enabled: isEnsParam },
  })

  const resolvedAddr = isEnsParam ? (resolvedAddress ?? '') : rawParam
  const { delegate, loading, error } = useDelegate(resolvedAddr)
  const walletState = useWalletState()

  const { data: resolvedEnsName } = useEnsName({
    address: resolvedAddr as `0x${string}`,
    query: { enabled: !!resolvedAddr && !isEnsParam },
  })

  if (loading || ensLoading) {
    return (
      <Page>
        <LoadingWrapper><Spinner /></LoadingWrapper>
      </Page>
    )
  }

  if (error || !delegate) {
    return (
      <Page>
        <BackLink to="/delegates">← All delegates</BackLink>
        <ErrorMessage>
          {error ?? 'Delegate not found. They may not be an active delegate in the incentives program.'}
        </ErrorMessage>
      </Page>
    )
  }

  const ensName = delegate.ensName ?? (isEnsParam ? rawParam : resolvedEnsName) ?? null
  const isDelegated =
    walletState.status === 'delegated' &&
    walletState.delegatedTo.toLowerCase() === delegate.address.toLowerCase()

  const votingPercentage = delegate.last10ProposalsVoted.length > 0
    ? Math.round(
        (delegate.last10ProposalsVoted.filter(Boolean).length /
          delegate.last10ProposalsVoted.length) *
          100
      )
    : 0

  return (
    <Page>
      <BackLink to="/delegates">← All delegates</BackLink>

      <ProfileHeader>
        <EnsAvatar
          address={delegate.address}
          name={ensName ?? undefined}
          avatarUrl={delegate.avatarUrl}
          size={96}
        />
        {ensName ? (
          <>
            <Name>{ensName}</Name>
            <Address>{truncateAddress(delegate.address)}</Address>
          </>
        ) : (
          <Name>{truncateAddress(delegate.address)}</Name>
        )}
        <DelegateButton $delegated={isDelegated} disabled={isDelegated}>
          {isDelegated ? 'Delegated ✓' : 'Delegate'}
        </DelegateButton>
      </ProfileHeader>

      <Card>
        <CardTitle>Stats</CardTitle>
        <StatsGrid>
          <Stat>
            <StatValue>{formatVotingPower(delegate.votingPower)} ENS</StatValue>
            <StatLabel>Voting Power</StatLabel>
          </Stat>
          <Stat>
            <StatValue>{delegate.delegatorCount}</StatValue>
            <StatLabel>Delegators</StatLabel>
          </Stat>
          <Stat>
            <StatValue>{votingPercentage}%</StatValue>
            <StatLabel>Participation</StatLabel>
          </Stat>
          {delegate.activeSince && (
            <Stat>
              <StatValue>{formatActiveSince(delegate.activeSince)}</StatValue>
              <StatLabel>Active since</StatLabel>
            </Stat>
          )}
        </StatsGrid>
      </Card>

      <Card>
        <CardTitle>Voting Record (last 10 proposals)</CardTitle>
        <ProposalBar votes={delegate.last10ProposalsVoted} />
      </Card>

      <ExternalLink
        href={`https://anticapture.com/ens/holders-and-delegates?tab=delegates&drawerAddress=${delegate.address}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        View full governance profile on Anticapture ↗
      </ExternalLink>
    </Page>
  )
}
