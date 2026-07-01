import type { TierProgressionResponse, RoundInfoResponse } from '@/api/types'
import { HeroSection } from '../sections/HeroSection'
import { RoundStatusBar } from '../sections/RoundStatusBar'
import { TierTableSection } from '../sections/TierTableSection'
import { HowItWorksSection } from '../sections/HowItWorksSection'
import { FaqSection } from '../sections/FaqSection'
import { CtaSection } from '../sections/CtaSection'

interface ConnectedLandingProps {
  tierData: TierProgressionResponse
  roundData: RoundInfoResponse
}

export function ConnectedLanding({ tierData, roundData }: ConnectedLandingProps) {
  return (
    <>
      <HeroSection />
      <RoundStatusBar
        currentGrowthPct={roundData.vpGrowthPct}
        currentTierIndex={roundData.tierIndex}
        poolSizeEns={roundData.poolSizeEns}
        roundNumber={roundData.roundNumber}
        roundEndDate={roundData.endDate}
      />
      <TierTableSection tiers={tierData.tiers} />
      <HowItWorksSection />
      <FaqSection />
      <CtaSection />
    </>
  )
}
