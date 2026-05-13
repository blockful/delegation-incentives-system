import { Navigate } from 'react-router-dom'
import styled from 'styled-components'
import { DashboardPageSkeleton } from '@/components/shared/PageSkeletons'
import { useWalletState } from '@/features/wallet/useWalletState'
import { tokens, fadeInUp, ErrorMessage } from '@/styles'
import { StatCard } from '@/components/shared/StatCard'
import { useDashboardData } from './useDashboardData'
import { EarningsStrip } from './sections/EarningsStrip'
import { RoundProgressCard } from './sections/RoundTimeline'
import { RewardTiers } from './sections/RewardTiers'
import { LotteryCard } from './sections/LotteryBanner'
import { formatShortDate } from '@/utils/dashboard'

const Page = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
  animation: ${fadeInUp} 0.4s ease both;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['5xl']} ${tokens.spacing['4xl']};
  }
`

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing['3xl']};

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
`

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xl};
`

const SectionLabel = styled.span`
  display: block;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0;
  color: ${tokens.color.darkGray};
  margin-bottom: ${tokens.spacing.md};
`

const RoundDetailsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${tokens.spacing.md};
`


export function DashboardPage() {
  const wallet = useWalletState()
  if (wallet.status === 'disconnected') return <Navigate to="/" replace />
  return <DashboardContent address={wallet.address} />
}

function DashboardContent({ address }: { address: `0x${string}` }) {
  const { data, loading, error } = useDashboardData(address)

  if (loading) {
    return <DashboardPageSkeleton />
  }
  if (error) {
    return <Page><ErrorMessage>Failed to load dashboard: {error}</ErrorMessage></Page>
  }
  if (!data) return null

  const { apy, tiers, round } = data
  const currentTierIndex = tiers.currentTierIndex
  const delegatedTo = (apy.delegatedTo ?? address) as `0x${string}`

  const balanceLabel = `${parseFloat(apy.currentBalanceEns).toFixed(2)} ENS`
  const timeLeft = `${round.daysRemaining}d`
  const roundEndFormatted = formatShortDate(round.endDate)
  const poolLabel = `${Math.round(Number(tiers.tiers[currentTierIndex]?.poolSizeEns ?? 0) / 1000)}K ENS`

  return (
    <Page>
      <MainGrid>
        <Column>
          <div>
            <SectionLabel>Your Rewards</SectionLabel>
            <EarningsStrip
              earnedEns={apy.estimatedMonthlyRewardEns}
              apyPct={apy.estimatedApyPct}
              tierIndex={currentTierIndex}
              delegatedTo={delegatedTo}
              delegateEnsName={apy.delegatedToEnsName ?? undefined}
              delegateAvatarUrl={apy.delegatedToAvatarUrl ?? undefined}
              balanceEns={apy.currentBalanceEns}
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
            <RoundDetailsGrid>
              <StatCard label="Balance" value={balanceLabel} sub="180-day avg" />
              <StatCard label="Round Ends" value={timeLeft} sub={roundEndFormatted} />
              <StatCard label="Pool" value={poolLabel} sub="reward pool" />
            </RoundDetailsGrid>
          </div>

          <div>
            <SectionLabel>Share Your Rewards</SectionLabel>
            <Column>
              <RoundProgressCard
                roundNumber={round.roundNumber}
                percentComplete={round.percentComplete}
              />
              {apy.qualifiesForLottery && (
                <LotteryCard expectedPayout={apy.estimatedMonthlyRewardEns} />
              )}
            </Column>
          </div>
        </Column>
      </MainGrid>

      <RewardTiers
        tiers={tiers.tiers}
        currentTierIndex={currentTierIndex}
        userEstimatedReward={apy.estimatedMonthlyRewardEns}
      />
    </Page>
  )
}
