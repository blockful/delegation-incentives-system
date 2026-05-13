import { useParams, Link } from 'react-router-dom'
import styled from 'styled-components'
import { useEnsName, useEnsAddress } from 'wagmi'
import { DelegateProfileSkeleton } from '@/components/shared/PageSkeletons'
import { useDelegate } from '@/features/delegates/useDelegate'
import { useWalletState } from '@/features/wallet/useWalletState'
import { AddressIdentity } from '@/components/shared/AddressIdentity'
import { ProposalBar } from '@/components/shared/ProposalBar'
import { tokens, fadeInUp, ErrorMessage } from '@/styles'
import { getAnticaptureDelegateUrl } from '@/utils/delegation'
import { formatEnsAmount } from '@/utils/format'

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
  return formatEnsAmount(ens)
}

function formatActiveSince(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

const Page = styled.div`
  max-width: ${tokens.maxWidth.lg};
  margin: 0 auto;
  padding: ${tokens.spacing['2xl']} ${tokens.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};
  animation: ${fadeInUp} 0.4s ease both;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['4xl']} ${tokens.spacing['2xl']};
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

const HeroCard = styled.div`
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.gray};
  border-radius: ${tokens.radius.lg};
  box-shadow: ${tokens.shadow.sm};
  padding: ${tokens.spacing['3xl']} ${tokens.spacing.xl};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing.lg};
  text-align: center;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['4xl']} ${tokens.spacing['3xl']};
  }
`

const Identity = styled(AddressIdentity)`
  && {
    align-items: center;
  }

  justify-content: center;
  text-align: center;
`

const CtaWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing.xs};
  width: 100%;
  max-width: 400px;
  margin-top: ${tokens.spacing.sm};
`

const DelegateAction = styled.button`
  width: 100%;
  padding: ${tokens.spacing.lg} ${tokens.spacing['2xl']};
  border-radius: ${tokens.radius.md};
  border: none;
  background: ${tokens.color.blue};
  color: ${tokens.color.white};
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  cursor: pointer;
  transition:
    background ${tokens.transition.base},
    box-shadow ${tokens.transition.base};
  box-shadow: 0 4px 12px rgba(82, 152, 255, 0.3);
  text-align: center;

  &:hover {
    color: ${tokens.color.white};
    background: ${tokens.color.accent};
    box-shadow: 0 6px 20px rgba(82, 152, 255, 0.4);
  }
`

const DelegatedStatus = styled.span`
  width: 100%;
  padding: ${tokens.spacing.lg} ${tokens.spacing['2xl']};
  border-radius: ${tokens.radius.md};
  background: ${tokens.color.tierHighlight};
  color: ${tokens.color.positiveEmphasis};
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
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

const CtaHint = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textSubtle};
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${tokens.spacing.md};

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`

const StatCard = styled.div`
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.gray};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.spacing.lg};
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

const VotingCard = styled.div`
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
  letter-spacing: 0;
  color: ${tokens.color.darkGray};
  margin: 0 0 ${tokens.spacing.lg};
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
    return <DelegateProfileSkeleton />
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
  const delegateUrl = getAnticaptureDelegateUrl(delegate.address)

  const handleDelegate = () => {
    // TODO: call relayer for gasless delegation
  }

  return (
    <Page>
      <BackLink to="/delegates">← All delegates</BackLink>

      <HeroCard>
        <Identity
          address={delegate.address}
          ensName={ensName}
          avatarUrl={delegate.avatarUrl}
          showAvatar
          avatarSize={96}
          layout="stack"
          size="xl"
        />
        <CtaWrapper>
          {isDelegated ? (
            <DelegatedStatus>Delegated</DelegatedStatus>
          ) : (
            <DelegateAction type="button" onClick={handleDelegate}>
              Delegate <FreeTag>Free</FreeTag>
            </DelegateAction>
          )}
          {!isDelegated && <CtaHint>Gas sponsored by the incentives program</CtaHint>}
        </CtaWrapper>
      </HeroCard>

      <StatsGrid>
        <StatCard>
          <StatValue>{formatVotingPower(delegate.votingPower)} ENS</StatValue>
          <StatLabel>Voting Power</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{delegate.delegatorCount}</StatValue>
          <StatLabel>Delegators</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{votingPercentage}%</StatValue>
          <StatLabel>Participation</StatLabel>
        </StatCard>
        {delegate.activeSince && (
          <StatCard>
            <StatValue>{formatActiveSince(delegate.activeSince)}</StatValue>
            <StatLabel>Active since</StatLabel>
          </StatCard>
        )}
      </StatsGrid>

      <VotingCard>
        <CardTitle>Voting Record (last 10 proposals)</CardTitle>
        <ProposalBar votes={delegate.last10ProposalsVoted} />
      </VotingCard>

      <ExternalLink
        href={delegateUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        View full governance profile on Anticapture ↗
      </ExternalLink>
    </Page>
  )
}
