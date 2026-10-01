import type { TierProgressionResponse, RoundInfoResponse } from '@/api/types'
import type { PilotSummary } from '@/features/rounds/programStatus'
import { HeroSection } from '../sections/HeroSection'
import { RoundStatusBar } from '../sections/RoundStatusBar'
import { TierTableSection } from '../sections/TierTableSection'
import { HowItWorksSection } from '../sections/HowItWorksSection'
import { FaqSection } from '../sections/FaqSection'
import { CtaSection } from '../sections/CtaSection'

interface DisconnectedLandingProps {
  tierData: TierProgressionResponse
  roundData: RoundInfoResponse
  /** Settled pilot summary once the program has ended; null while live. */
  pilot: PilotSummary | null
}

export function DisconnectedLanding({ tierData, roundData, pilot }: DisconnectedLandingProps) {
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
