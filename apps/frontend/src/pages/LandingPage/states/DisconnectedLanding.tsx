import type { TierProgressionResponse, RoundInfoResponse } from '@/api/types'
import { HeroSection } from '../sections/HeroSection'
import { RoundStatusBar } from '../sections/RoundStatusBar'
import { TierTableSection } from '../sections/TierTableSection'
import { HowItWorksSection } from '../sections/HowItWorksSection'
import { CtaSection } from '../sections/CtaSection'

interface DisconnectedLandingProps {
  tierData: TierProgressionResponse
  roundData: RoundInfoResponse
}

export function DisconnectedLanding({ tierData, roundData }: DisconnectedLandingProps) {
  const currentAprPct = tierData.maxTokenHolderAprPct

  return (
    <>
      <HeroSection currentAprPct={currentAprPct} />
      <RoundStatusBar
        currentGrowthPct={roundData.vpGrowthPct}
        currentTierIndex={roundData.tierIndex}
        poolSizeEns={roundData.poolSizeEns}
        roundNumber={roundData.roundNumber}
        roundEndDate={roundData.endDate}
      />
      <TierTableSection tiers={tierData.tiers} />
      <HowItWorksSection currentAprPct={currentAprPct} />
      <CtaSection />
    </>
  )
}
