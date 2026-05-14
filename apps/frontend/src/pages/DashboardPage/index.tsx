import { useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import styled from 'styled-components'
import { useEnsName } from 'wagmi'
import { api } from '@/api'
import { DashboardPageSkeleton } from '@/components/shared/PageSkeletons'
import { useWalletState } from '@/features/wallet/useWalletState'
import { useAsync } from '@/hooks/useAsync'
import { tokens, fadeInUp, ErrorMessage } from '@/styles'
import { StatCard } from '@/components/shared/StatCard'
import { StatStrip } from '@/components/shared/StatStrip'
import { ToneCallout } from '@/components/shared/ToneCallout'
import { useDashboardData } from './useDashboardData'
import { EarningsStrip } from './sections/EarningsStrip'
import { RoundProgressCard } from './sections/RoundTimeline'
import { RewardTiers } from './sections/RewardTiers'
import { PastRoundsStrip } from './sections/PastRoundsStrip'
import { formatShortDate } from '@/utils/dashboard'
import { formatEnsAmount, truncateAddress } from '@/utils/format'

const Page = styled.div`
  background: ${tokens.color.surfaceMat};
  min-height: calc(100vh - 80px);
`

const Inner = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  padding: ${tokens.spacing.xl} ${tokens.spacing.xl} ${tokens.spacing['6xl']};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};
  animation: ${fadeInUp} 0.4s ease both;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['3xl']} ${tokens.spacing['2xl']} ${tokens.spacing['7xl']};
    gap: ${tokens.spacing['3xl']};
  }
`

/* ─── Greeting strip ─── */

const GreetingRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${tokens.spacing.sm};
  font-size: ${tokens.font.size.sm};
`

const Greeting = styled.span`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkBlue};

  strong {
    font-weight: ${tokens.font.weight.bold};
  }
`

const RoundMeta = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
  font-variant-numeric: tabular-nums;
`

/* ─── Layout ─── */

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing['2xl']};

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
    align-items: start;
    gap: ${tokens.spacing['3xl']};
  }
`

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xl};
`

const SectionLabel = styled.span`
  display: block;
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${tokens.color.darkGray};
  margin-bottom: ${tokens.spacing.md};
`

function timeOfDayGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'GN'
  if (h < 12) return 'GM'
  if (h < 18) return 'GA'
  return 'GE'
}

export function DashboardPage() {
  const wallet = useWalletState()
  if (wallet.status === 'disconnected') return <Navigate to="/" replace />
  return <DashboardContent address={wallet.address} />
}

function DashboardContent({ address }: { address: `0x${string}` }) {
  const { data, loading, error } = useDashboardData(address)

  const fetchDistributions = useCallback(
    () => api.distributionsForAddress(address),
    [address]
  )
  const distributions = useAsync(fetchDistributions)

  const { data: resolvedEnsName } = useEnsName({
    address,
    query: { enabled: !!address },
  })

  if (loading) {
    return <DashboardPageSkeleton />
  }
  if (error) {
    return <Page><Inner><ErrorMessage>Failed to load dashboard: {error}</ErrorMessage></Inner></Page>
  }
  if (!data) return null

  const { apr, tiers, round } = data
  const currentTierIndex = tiers.currentTierIndex
  const delegatedTo = (apr.delegatedTo ?? address) as `0x${string}`

  const balanceLabel = `${parseFloat(apr.currentBalanceEns).toFixed(2)} ENS`
  const timeLeft = `${round.daysRemaining}d`
  const roundEndFormatted = formatShortDate(round.endDate)
  const poolLabel = `${Math.round(Number(tiers.tiers[currentTierIndex]?.poolSizeEns ?? 0) / 1000)}K ENS`

  const greetingName = resolvedEnsName ?? truncateAddress(address)
  const timeLeftHuman = round.daysRemaining == null
    ? 'In progress'
    : round.daysRemaining === 1
      ? '1 day left'
      : `${round.daysRemaining} days left`

  return (
    <Page>
      <Inner>
        <GreetingRow>
          <Greeting>
            {timeOfDayGreeting()}, <strong>{greetingName}</strong>
          </Greeting>
          <RoundMeta>Round {round.roundNumber} · {timeLeftHuman}</RoundMeta>
        </GreetingRow>

        <MainGrid>
          <Column>
            <div>
              <SectionLabel>Your Rewards</SectionLabel>
              <EarningsStrip
                earnedEns={apr.estimatedMonthlyRewardEns}
                aprPct={apr.estimatedAprPct}
                tierIndex={currentTierIndex}
                delegatedTo={delegatedTo}
                delegateEnsName={apr.delegatedToEnsName ?? undefined}
                delegateAvatarUrl={apr.delegatedToAvatarUrl ?? undefined}
                balanceEns={apr.currentBalanceEns}
                roundStartDate={round.startDate}
                roundEndDate={round.endDate}
                roundNumber={round.roundNumber}
                daysRemaining={round.daysRemaining}
              />
            </div>
          </Column>

          <Column>
            <div>
              <SectionLabel>Round Details</SectionLabel>
              <StatStrip columns={3} gap="md">
                <StatCard label="Balance" value={balanceLabel} sub="180-day avg" />
                <StatCard label="Round Ends" value={timeLeft} sub={roundEndFormatted} />
                <StatCard label="Pool" value={poolLabel} sub="reward pool" />
              </StatStrip>
            </div>

            <div>
              <SectionLabel>This Round</SectionLabel>
              <Column>
                <RoundProgressCard
                  roundNumber={round.roundNumber}
                  percentComplete={round.percentComplete}
                />
                {apr.qualifiesForLottery ? (
                  <ToneCallout
                    tone="neutral"
                    title="You're in the lottery pool"
                    body={`Your projected ${formatEnsAmount(apr.estimatedMonthlyRewardEns, { maximumFractionDigits: 4 })} ENS payout pools with other sub-1 ENS rewards into a ~10 ENS bucket. RANDAO picks one winner per bucket at round close.`}
                    action={{ to: `/lottery?round=${round.roundNumber}`, label: 'See your bucket on Lottery' }}
                    compact
                  />
                ) : (
                  <ToneCallout
                    tone="neutral"
                    title="Direct payout — no lottery"
                    body="Your projected payout is above the 1 ENS threshold, so it goes straight to your wallet at round close."
                    action={{ to: `/rounds/${round.roundNumber}`, label: 'See round details' }}
                    compact
                  />
                )}
              </Column>
            </div>
          </Column>
        </MainGrid>

        {distributions.data && distributions.data.rounds && (
          <PastRoundsStrip rounds={distributions.data.rounds} address={address} />
        )}

        <RewardTiers
          tiers={tiers.tiers}
          currentTierIndex={currentTierIndex}
          userEstimatedReward={apr.estimatedMonthlyRewardEns}
        />
      </Inner>
    </Page>
  )
}
