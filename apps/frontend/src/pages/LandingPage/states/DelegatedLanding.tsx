import type { TierProgressionResponse, RoundInfoResponse } from '@/api/types'
import type { PilotSummary } from '@/features/rounds/programStatus'
import { HeroSection } from '../sections/HeroSection'
import { RoundStatusBar } from '../sections/RoundStatusBar'
import { TierTableSection } from '../sections/TierTableSection'
import { HowItWorksSection } from '../sections/HowItWorksSection'
import { FaqSection } from '../sections/FaqSection'
import { CtaSection } from '../sections/CtaSection'

interface DelegatedLandingProps {
  tierData: TierProgressionResponse
  roundData: RoundInfoResponse
  /** Settled pilot summary once the program has ended; null while live. */
  pilot: PilotSummary | null
}

export function DelegatedLanding({ tierData, roundData, pilot }: DelegatedLandingProps) {
  return (
    <>
      <HeroSection programEnded={!!pilot} />
      <RoundStatusBar
        currentGrowthPct={roundData.vpGrowthPct}
        currentTierIndex={roundData.tierIndex}
        poolSizeEns={roundData.poolSizeEns}
        roundNumber={roundData.roundNumber}
        roundEndDate={roundData.endDate}
        degraded={tierData.degraded}
        pilot={pilot}
      />
      <TierTableSection tiers={tierData.tiers} pilot={pilot} />
      <HowItWorksSection programEnded={!!pilot} />
      <FaqSection />
      <CtaSection programEnded={!!pilot} />
    </>
  )
}
