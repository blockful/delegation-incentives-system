import type { TierProgressionResponse } from '@/api/types'
import { HeroSection } from '../sections/HeroSection'
import { RoundStatusBar } from '../sections/RoundStatusBar'
import { TierTableSection } from '../sections/TierTableSection'
import { HowItWorksSection } from '../sections/HowItWorksSection'
import { CtaSection } from '../sections/CtaSection'

interface DisconnectedLandingProps {
  tierData: TierProgressionResponse
}

export function DisconnectedLanding({ tierData }: DisconnectedLandingProps) {
  const currentTier = tierData.tiers[tierData.currentTierIndex]
  const currentApyPct = tierData.maxDelegatorApyPct
  const poolSizeEns = currentTier?.poolSizeEns ?? '0'

  return (
    <>
      <HeroSection currentApyPct={currentApyPct} />
      <RoundStatusBar
        currentGrowthPct={tierData.currentGrowthPct}
        currentTierIndex={tierData.currentTierIndex}
        poolSizeEns={poolSizeEns}
      />
      <TierTableSection tiers={tierData.tiers} />
      <HowItWorksSection />
      <CtaSection />
    </>
  )
}
