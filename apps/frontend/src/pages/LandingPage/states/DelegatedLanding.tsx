import type { TierProgressionResponse } from '@/api/types'
import { HeroSection } from '../sections/HeroSection'
import { RoundStatusBar } from '../sections/RoundStatusBar'
import { TierTableSection } from '../sections/TierTableSection'
import { HowItWorksSection } from '../sections/HowItWorksSection'
import { CtaSection } from '../sections/CtaSection'

interface DelegatedLandingProps {
  tierData: TierProgressionResponse
}

/**
 * DEFERRED: DelegatedLanding will eventually show delegation-specific UI
 * (e.g. current delegate info, reward estimates). For now it renders the
 * same layout as the disconnected/connected states.
 */
export function DelegatedLanding({ tierData }: DelegatedLandingProps) {
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
