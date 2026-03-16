import { Navigate } from 'react-router-dom'
import styled from 'styled-components'
import { Spinner } from '@ensdomains/thorin'
import { useWalletState } from '@/features/wallet/useWalletState'
import { tokens, fadeInUp, LoadingWrapper, ErrorMessage } from '@/styles'
import { useDashboardData } from './useDashboardData'
import { EarningsStrip } from './sections/EarningsStrip'
import { RoundTimeline } from './sections/RoundTimeline'
import { RewardTiers } from './sections/RewardTiers'
import { LotteryBanner } from './sections/LotteryBanner'

const Page = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: ${tokens.spacing['2xl']} ${tokens.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
  animation: ${fadeInUp} 0.4s ease both;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl};
    gap: ${tokens.spacing.xl};
  }
`

export function DashboardPage() {
  const wallet = useWalletState()
  if (wallet.status === 'disconnected') return <Navigate to="/" replace />
  return <DashboardContent address={wallet.address} />
}

function DashboardContent({ address }: { address: `0x${string}` }) {
  const { data, loading, error } = useDashboardData(address)

  if (loading) {
    return <Page><LoadingWrapper><Spinner /></LoadingWrapper></Page>
  }
  if (error) {
    return <Page><ErrorMessage>Failed to load dashboard: {error}</ErrorMessage></Page>
  }
  if (!data) return null

  const { apy, tiers, round } = data
  const currentTierIndex = tiers.currentTierIndex
  const delegatedTo = (apy.delegatedTo ?? address) as `0x${string}`

  return (
    <Page>
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
      />
      <RoundTimeline
        roundNumber={round.roundNumber}
        startDate={round.startDate}
        endDate={round.endDate}
        daysRemaining={round.daysRemaining}
        percentComplete={round.percentComplete}
        expectedPayout={apy.estimatedMonthlyRewardEns}
      />
      <RewardTiers
        tiers={tiers.tiers}
        currentTierIndex={currentTierIndex}
        userEstimatedReward={apy.estimatedMonthlyRewardEns}
      />
      {apy.qualifiesForLottery && (
        <LotteryBanner expectedPayout={apy.estimatedMonthlyRewardEns} />
      )}
    </Page>
  )
}
