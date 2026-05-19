import styled from 'styled-components'
import { fadeInUp, tokens } from '@/styles'
import {
  SkeletonBlock,
  SkeletonCard,
  SkeletonCircle,
  SkeletonGrid,
  SkeletonInline,
  SkeletonRegion,
  SkeletonStack,
  SkeletonText,
} from './Skeleton'

const SectionLabelSkeleton = styled(SkeletonBlock)``

const FluidSkeletonBlock = styled(SkeletonBlock)`
  flex: 1;
`

const SpaceBetweenInline = styled(SkeletonInline)`
  justify-content: space-between;
`

const TableCellSkeleton = styled(SkeletonBlock)`
  margin: ${tokens.spacing.md};
`

const TableBodyRow = styled(SkeletonGrid)`
  border-top: 1px solid ${tokens.color.borderLight};
`

const FullWidthCenteredStack = styled(SkeletonStack)`
  width: 100%;
  align-items: center;
`

const AlignedStack = styled(SkeletonStack)<{ $align: 'flex-start' | 'center' | 'flex-end' }>`
  align-items: ${({ $align }) => $align};
`

function AddressFormSkeleton() {
  return (
    <SkeletonCard $padding={tokens.spacing.lg} $radius={tokens.radius.sm}>
      <SkeletonInline $gap={tokens.spacing.md}>
        <FluidSkeletonBlock $height="42px" />
        <SkeletonBlock $height="42px" $width="118px" />
      </SkeletonInline>
      <SkeletonBlock $height="12px" $width="42%" />
    </SkeletonCard>
  )
}

function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <SkeletonCard $padding="0" $gap="0" $radius={tokens.radius.sm}>
      <SkeletonGrid $columns={`repeat(${columns}, minmax(0, 1fr))`} $gap="0">
        {Array.from({ length: columns }, (_, index) => (
          <TableCellSkeleton
            key={`head-${index}`}
            $height="14px"
            $width="64%"
          />
        ))}
      </SkeletonGrid>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <TableBodyRow
          key={rowIndex}
          $columns={`repeat(${columns}, minmax(0, 1fr))`}
          $gap="0"
        >
          {Array.from({ length: columns }, (_, columnIndex) => (
            <TableCellSkeleton
              key={columnIndex}
              $height="14px"
              $width={columnIndex === 0 ? '46%' : columnIndex === columns - 1 ? '58%' : '74%'}
            />
          ))}
        </TableBodyRow>
      ))}
    </SkeletonCard>
  )
}

function TierRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <SkeletonCard $padding={tokens.spacing.md} $gap={tokens.spacing.sm} $radius={tokens.radius.card}>
      {Array.from({ length: rows }, (_, index) => (
        <SpaceBetweenInline key={index}>
          <SkeletonBlock $height="18px" $width="72px" />
          <SkeletonInline $gap={tokens.spacing.sm}>
            {Array.from({ length: 5 }, (_, dotIndex) => (
              <SkeletonCircle key={dotIndex} $size="12px" />
            ))}
            <SkeletonBlock $height="18px" $width="78px" />
          </SkeletonInline>
        </SpaceBetweenInline>
      ))}
    </SkeletonCard>
  )
}

const LandingRoot = styled(SkeletonRegion)`
  width: 100%;
  animation: ${fadeInUp} 0.35s ease both;
`

const LandingHero = styled.section`
  padding: ${tokens.spacing['5xl']} ${tokens.spacing.xl};
  text-align: center;
  background:
    linear-gradient(180deg, rgba(56, 137, 255, 0.2) 0%, rgba(255, 255, 255, 0.2) 60%),
    ${tokens.color.white};
  border-bottom: 1px solid ${tokens.color.borderLight};

  @media (min-width: 768px) {
    padding: 100px ${tokens.spacing['4xl']} ${tokens.spacing['9xl']};
  }
`

const LandingHeroInner = styled(SkeletonStack)`
  align-items: center;
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
`

const LandingActions = styled(SkeletonInline)`
  justify-content: center;
  flex-wrap: wrap;
  margin-top: ${tokens.spacing.lg};
`

const LandingStatusWrap = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 0 ${tokens.spacing.xl};
  transform: translateY(-50%);
`

const LandingStatusCard = styled(SkeletonCard)`
  align-items: center;
  border-color: ${tokens.color.middleGray};
`

const LandingStatusRow = styled(SkeletonGrid)`
  width: 100%;
  padding: 10px 16px;
  border: 1px solid ${tokens.color.middleGray};
  border-radius: ${tokens.radius.card};
  background: ${tokens.color.bgSubtle};
`

const LandingTierSection = styled.section`
  padding: ${tokens.spacing['2xl']} ${tokens.spacing.xl} ${tokens.spacing['5xl']};
  border-bottom: 1px solid ${tokens.color.borderLight};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['5xl']} ${tokens.spacing['4xl']} ${tokens.spacing['7xl']};
  }
`

const LandingTierInner = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing['3xl']};
`

const LandingTierHeader = styled(SkeletonStack)`
  align-items: center;
  text-align: center;
  max-width: 720px;
`

const LandingHowItWorksSection = styled.section`
  padding: ${tokens.spacing['3xl']} ${tokens.spacing.xl} ${tokens.spacing['2xl']};
  background: ${tokens.color.surfaceAlt};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['6xl']} ${tokens.spacing['4xl']} ${tokens.spacing['4xl']};
  }
`

const LandingHowItWorksInner = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
`

const LandingStepsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing.md};

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
    gap: ${tokens.spacing.xl};
  }
`

const LandingStepCard = styled(SkeletonStack)`
  padding: ${tokens.spacing.xl};
  background: ${tokens.color.white};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.md};

  @media (min-width: 768px) {
    background: transparent;
    border: none;
    padding: 0;
  }
`

const LandingCtaSection = styled.section`
  padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl};
  background: ${tokens.color.surfaceAlt};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['7xl']} ${tokens.spacing['4xl']};
  }
`

const LandingCtaCard = styled(SkeletonStack)`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  padding: ${tokens.spacing['5xl']} ${tokens.spacing.xl} ${tokens.spacing['4xl']};
  background: ${tokens.color.blue};
  border-radius: 24px;
  align-items: center;
  text-align: center;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['7xl']} ${tokens.spacing['4xl']} ${tokens.spacing['5xl']};
  }
`

const LandingMarqueeRow = styled(SkeletonInline)`
  width: 100%;
  justify-content: center;
  flex-wrap: nowrap;
  overflow: hidden;
  opacity: 0.4;
`

const LandingPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 16px 4px 4px;
  background: ${tokens.color.white};
  border-radius: 9999px;
  flex-shrink: 0;
`

export function LandingPageSkeleton() {
  return (
    <LandingRoot label="Loading landing page">
      <LandingHero>
        <LandingHeroInner $gap={tokens.spacing.lg}>
          {/* Eyebrow: LiveDot + "Round N · ends in M days" inline */}
          <SkeletonInline $gap={tokens.spacing.sm}>
            <SkeletonCircle $size="8px" />
            <SkeletonBlock $height="14px" $width="220px" $maxWidth="80%" />
          </SkeletonInline>
          {/* Headline: 2 lines, "Earn X% APR on your ENS,\nautomatically." */}
          <FullWidthCenteredStack $gap={tokens.spacing.md} $maxWidth="720px">
            <SkeletonBlock $height="54px" $width="92%" />
            <SkeletonBlock $height="54px" $width="48%" />
          </FullWidthCenteredStack>
          {/* Subtitle: single line now */}
          <SkeletonText
            lines={1}
            lineHeight="22px"
            maxWidth="440px"
            widths={['88%']}
          />
          <LandingActions $gap={tokens.spacing.md}>
            <SkeletonBlock $height="44px" $width="160px" />
            <SkeletonBlock $height="44px" $width="160px" />
          </LandingActions>
        </LandingHeroInner>
      </LandingHero>
      <LandingStatusWrap>
        <LandingStatusCard $padding={tokens.spacing['2xl']}>
          <SkeletonBlock $height="14px" $width="320px" $maxWidth="100%" />
          <LandingStatusRow $columns="repeat(3, minmax(0, 1fr))">
            {Array.from({ length: 3 }, (_, index) => (
              <AlignedStack
                key={index}
                $gap={tokens.spacing.xs}
                $align={index === 0 ? 'flex-start' : index === 1 ? 'center' : 'flex-end'}
              >
                <SkeletonBlock $height="18px" $width={index === 1 ? '72px' : '86px'} />
                <SkeletonBlock $height="12px" $width="68px" />
              </AlignedStack>
            ))}
          </LandingStatusRow>
        </LandingStatusCard>
      </LandingStatusWrap>
      <LandingTierSection>
        <LandingTierInner>
          <LandingTierHeader $gap={tokens.spacing.md}>
            <SkeletonBlock $height="24px" $width="140px" $radius={tokens.radius.pill} />
            <SkeletonText lines={2} lineHeight="36px" widths={['72%', '52%']} maxWidth="640px" />
            <SkeletonText lines={2} lineHeight="20px" widths={['96%', '74%']} maxWidth="640px" />
          </LandingTierHeader>
          <TierRowsSkeleton rows={5} />
          <SkeletonBlock $height="44px" $width="220px" $radius={tokens.radius.sm} />
        </LandingTierInner>
      </LandingTierSection>
      <LandingHowItWorksSection>
        <LandingHowItWorksInner>
          <SkeletonStack $gap={tokens.spacing.md}>
            <SkeletonBlock $height="24px" $width="140px" $radius={tokens.radius.pill} />
            <SkeletonText lines={2} lineHeight="36px" widths={['68%', '52%']} maxWidth="560px" />
            <SkeletonText lines={2} lineHeight="20px" widths={['76%', '62%']} maxWidth="560px" />
          </SkeletonStack>
          <LandingStepsGrid>
            {Array.from({ length: 4 }, (_, index) => (
              <LandingStepCard key={index} $gap={tokens.spacing.md}>
                <SkeletonBlock $height="28px" $width="28px" $radius={tokens.radius.sm} />
                <SkeletonBlock $height="20px" $width="80%" />
                <SkeletonText lines={3} lineHeight="14px" widths={['100%', '94%', '70%']} />
                <SkeletonBlock $height="22px" $width="140px" $radius={tokens.radius.pill} />
              </LandingStepCard>
            ))}
          </LandingStepsGrid>
        </LandingHowItWorksInner>
      </LandingHowItWorksSection>
      <LandingCtaSection>
        <LandingCtaCard $gap={tokens.spacing['2xl']}>
          <FullWidthCenteredStack $gap={tokens.spacing.md} $maxWidth="720px">
            <SkeletonBlock $height="44px" $width="86%" />
            <SkeletonBlock $height="44px" $width="68%" />
          </FullWidthCenteredStack>
          <SkeletonText
            lines={1}
            lineHeight="22px"
            maxWidth="440px"
            widths={['88%']}
          />
          <SkeletonInline $gap={tokens.spacing.md}>
            <SkeletonBlock $height="44px" $width="220px" $radius={tokens.radius.sm} />
            <SkeletonBlock $height="44px" $width="160px" $radius={tokens.radius.sm} />
          </SkeletonInline>
          <LandingMarqueeRow $gap={tokens.spacing.sm}>
            {Array.from({ length: 6 }, (_, index) => (
              <LandingPill key={index}>
                <SkeletonCircle $size="40px" />
                <SkeletonBlock $height="14px" $width="90px" />
              </LandingPill>
            ))}
          </LandingMarqueeRow>
        </LandingCtaCard>
      </LandingCtaSection>
    </LandingRoot>
  )
}

const DashboardShell = styled(SkeletonRegion)`
  width: 100%;
  max-width: 1120px;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
  animation: ${fadeInUp} 0.4s ease both;
`

const DashHeroCard = styled.div`
  display: flex;
  flex-direction: column-reverse;
  gap: ${tokens.spacing['2xl']};
  padding: ${tokens.spacing['2xl']};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);

  @media (min-width: 768px) {
    display: grid;
    grid-template-columns: 1fr auto;
    column-gap: ${tokens.spacing['4xl']};
    row-gap: ${tokens.spacing['2xl']};
    align-items: stretch;
  }
`

const DashHeroText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};
  min-width: 0;
`

const DashRewardsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const DashChipsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const DashChipSkeleton = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 14px;
  height: 24px;
`

const DashAvatarColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${tokens.spacing.sm};
  flex-shrink: 0;
`

const DashAvatarRingSkeleton = styled.div`
  width: 200px;
  height: 200px;
  border-radius: 9999px;
  padding: 24px;
  border: 12px solid ${tokens.color.borderLight};
  display: flex;
  align-items: center;
  justify-content: center;
`

const DashPayoutsCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: ${tokens.spacing.xl};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
`

const DashPayoutsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.sm};
`

const DashPayoutsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

const DashPayoutCardSkeleton = styled.div`
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: ${tokens.spacing.lg};
  background: ${tokens.color.bgSubtle};
  border-radius: 8px;
`

const DashPayoutInner = styled(SkeletonStack)`
  flex: 1;
  min-width: 0;
  gap: 6px;
`

const CHIP_WIDTHS = ['148px', '108px', '64px', '56px']

export function DashboardPageSkeleton(_props: { compact?: boolean } = {}) {
  return (
    <DashboardShell label="Loading dashboard">
      {/* Hero card */}
      <DashHeroCard>
        <DashHeroText>
          <DashRewardsStack>
            {/* RewardsLabel */}
            <SkeletonBlock $height="20px" $width="220px" $maxWidth="100%" />
            {/* RewardsNumber — large, drops on mobile */}
            <SkeletonBlock
              $height="68px"
              $width="320px"
              $maxWidth="100%"
              $radius="8px"
            />
            {/* AprLine */}
            <SkeletonBlock $height="20px" $width="180px" $maxWidth="100%" />
          </DashRewardsStack>

          {/* Info chips */}
          <DashChipsRow>
            {CHIP_WIDTHS.map((w, i) => (
              <DashChipSkeleton key={i}>
                <SkeletonCircle $size="14px" />
                <SkeletonBlock $height="14px" $width={w} />
              </DashChipSkeleton>
            ))}
          </DashChipsRow>

          {/* Primary CTA (Share / Pick a delegate) */}
          <SkeletonBlock
            $height="40px"
            $width="240px"
            $maxWidth="100%"
            $radius="8px"
          />
        </DashHeroText>

        <DashAvatarColumn>
          <DashAvatarRingSkeleton>
            <SkeletonCircle $size="140px" />
          </DashAvatarRingSkeleton>
          <SkeletonBlock $height="24px" $width="128px" $radius="14px" />
        </DashAvatarColumn>
      </DashHeroCard>

      {/* Recent payouts card */}
      <DashPayoutsCard>
        <DashPayoutsHeader>
          <SkeletonBlock $height="20px" $width="120px" />
          <SkeletonBlock $height="20px" $width="124px" />
        </DashPayoutsHeader>
        <DashPayoutsRow>
          {Array.from({ length: 3 }, (_, i) => (
            <DashPayoutCardSkeleton key={i}>
              <DashPayoutInner>
                <SkeletonBlock $height="20px" $width="72px" />
                <SkeletonBlock $height="32px" $width="148px" $radius="6px" />
                <SkeletonBlock $height="20px" $width="104px" />
              </DashPayoutInner>
              <SkeletonBlock
                $height="14px"
                $width="14px"
                $radius="4px"
              />
            </DashPayoutCardSkeleton>
          ))}
        </DashPayoutsRow>
      </DashPayoutsCard>
    </DashboardShell>
  )
}

const StatsBar = styled(SkeletonGrid)`
  grid-template-columns: repeat(3, 1fr);
  gap: ${tokens.spacing.md};
  width: 100%;
`

const StatsCell = styled(SkeletonStack)`
  align-items: stretch;
  gap: ${tokens.spacing.xs};
  padding: ${tokens.spacing.xl};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
`

const StatsCellTopRow = styled(SkeletonInline)`
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
`

export function StatsBarSkeleton() {
  return (
    <SkeletonRegion label="Loading delegate stats">
      <StatsBar>
        {Array.from({ length: 3 }, (_, index) => (
          <StatsCell key={index}>
            <StatsCellTopRow>
              <SkeletonBlock $height="32px" $width="72px" $radius="6px" />
              <SkeletonBlock $height="24px" $width="24px" $radius="4px" />
            </StatsCellTopRow>
            <SkeletonBlock $height="14px" $width={index === 1 ? '160px' : '108px'} />
          </StatsCell>
        ))}
      </StatsBar>
    </SkeletonRegion>
  )
}

const VoterGrid = styled(SkeletonRegion)`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing.lg};
  width: 100%;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

const VoterSkeletonCard = styled(SkeletonCard)`
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.md};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
`

const FluidSegment = styled(SkeletonBlock)`
  flex: 1;
  min-width: 0;
`

const NameStackSkeleton = styled(SkeletonStack)`
  flex: 1;
  min-width: 0;
  gap: 2px;
`

const NameRowSkeleton = styled(SkeletonInline)`
  justify-content: space-between;
  align-items: center;
  width: 100%;
`

function VoterCardSkeleton() {
  return (
    <VoterSkeletonCard $padding={tokens.spacing.lg} $gap={tokens.spacing.xl}>
      {/* Header: avatar + name stack + proposals */}
      <SkeletonStack $gap={tokens.spacing.lg}>
        <SkeletonInline $gap={tokens.spacing.md}>
          <SkeletonCircle $size="48px" />
          <NameStackSkeleton>
            <NameRowSkeleton>
              <SkeletonBlock $height="20px" $width="118px" $radius="4px" />
              <SkeletonBlock $height="24px" $width="88px" $radius="14px" />
            </NameRowSkeleton>
            <SkeletonBlock $height="20px" $width="92px" />
          </NameStackSkeleton>
        </SkeletonInline>

        {/* Proposal section: label + count, then 10 segment pills */}
        <SkeletonStack $gap={tokens.spacing.xs}>
          <SpaceBetweenInline>
            <SkeletonBlock $height="20px" $width="120px" />
            <SkeletonBlock $height="20px" $width="44px" $radius="4px" />
          </SpaceBetweenInline>
          <SkeletonInline $gap="4px">
            {Array.from({ length: 10 }, (_, index) => (
              <FluidSegment key={index} $height="12px" $radius="9999px" />
            ))}
          </SkeletonInline>
        </SkeletonStack>
      </SkeletonStack>

      {/* Stats row: 3 stats (value + label) */}
      <SkeletonGrid $columns="repeat(3, minmax(0, 1fr))" $gap={tokens.spacing.md}>
        {Array.from({ length: 3 }, (_, index) => (
          <SkeletonStack key={index} $gap="2px">
            <SkeletonBlock $height="20px" $width={index === 2 ? '60px' : '48px'} />
            <SkeletonBlock $height="20px" $width={index === 0 ? '78px' : index === 1 ? '60px' : '76px'} />
          </SkeletonStack>
        ))}
      </SkeletonGrid>
    </VoterSkeletonCard>
  )
}

export function VoterCardsSkeleton() {
  return (
    <VoterGrid label="Loading voters">
      {Array.from({ length: 6 }, (_, index) => (
        <VoterCardSkeleton key={index} />
      ))}
    </VoterGrid>
  )
}

/* ─── Full-page Voters skeleton (Suspense fallback) ──── */

const VotersPageShell = styled(SkeletonRegion)`
  width: 100%;
  max-width: 1120px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${tokens.spacing['2xl']};

  @media (min-width: 768px) {
    gap: 64px;
  }
`

const VotersTopSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing['4xl']};
  width: 100%;
`

const VotersHeaderBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
`

const VotersFilterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.lg};
  width: 100%;
  flex-wrap: wrap;
`

const VotersSortPills = styled.div`
  display: flex;
  gap: ${tokens.spacing.sm};
  align-items: center;
`

const CardsAndFiltersShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};
  width: 100%;
`

export function VotersPageSkeleton() {
  return (
    <VotersPageShell label="Loading voters page">
      <VotersTopSection>
        <VotersHeaderBlock>
          {/* Eyebrow pill */}
          <SkeletonBlock $height="28px" $width="180px" $radius="14px" />
          {/* Title — two lines at 68px */}
          <SkeletonStack $gap="8px" $maxWidth="720px">
            <SkeletonBlock $height="68px" $width="640px" $maxWidth="100%" $radius="8px" />
            <SkeletonBlock $height="68px" $width="420px" $maxWidth="100%" $radius="8px" />
          </SkeletonStack>
          {/* Description — two lines */}
          <SkeletonStack $gap="4px" $maxWidth="564px">
            <SkeletonBlock $height="20px" $width="100%" />
            <SkeletonBlock $height="20px" $width="78%" />
          </SkeletonStack>
        </VotersHeaderBlock>

        {/* Stats row — reuses the same skeleton as the live component */}
        <StatsBarSkeleton />
      </VotersTopSection>

      <CardsAndFiltersShell>
        <VotersFilterRow>
          {/* Search */}
          <SkeletonBlock $height="44px" $width="400px" $maxWidth="100%" $radius="9999px" />
          {/* Sort label + 4 pills */}
          <VotersSortPills>
            <SkeletonBlock $height="20px" $width="52px" />
            <SkeletonBlock $height="32px" $width="124px" $radius="9999px" />
            <SkeletonBlock $height="32px" $width="74px" $radius="9999px" />
            <SkeletonBlock $height="32px" $width="92px" $radius="9999px" />
            <SkeletonBlock $height="32px" $width="74px" $radius="9999px" />
          </VotersSortPills>
        </VotersFilterRow>

        <VoterCardsSkeleton />
      </CardsAndFiltersShell>
    </VotersPageShell>
  )
}

/* ─── Voter Profile skeleton (new design) ─── */

const ProfileShell = styled(SkeletonRegion)`
  width: 100%;
  max-width: 1120px;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
`

const ProfileHeaderCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};
  padding: ${tokens.spacing['2xl']};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: stretch;
    gap: ${tokens.spacing['4xl']};
  }
`

const ProfileHeaderText = styled(SkeletonStack)`
  flex: 1;
  min-width: 0;
  gap: ${tokens.spacing['2xl']};
`

const ProfileTitleBlock = styled(SkeletonStack)`
  gap: ${tokens.spacing.md};
`

const ProfileNameRow = styled(SkeletonInline)`
  gap: ${tokens.spacing.md};
  flex-wrap: wrap;
  align-items: baseline;
`

const ProfileSocialRow = styled(SkeletonInline)`
  flex-wrap: wrap;
  gap: 4px;
`

const ProfileAvatarColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${tokens.spacing.sm};
  flex-shrink: 0;
`

const ProfileStatsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing.md};
  width: 100%;

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`

const ProfileStatCard = styled(SkeletonStack)`
  padding: ${tokens.spacing.xl};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
  gap: ${tokens.spacing.xs};
`

const ProfileStatTopRow = styled(SkeletonInline)`
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
`

const ProfileTableCard = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
  overflow: hidden;
  background: ${tokens.color.surface};
`

const ProfileTableHead = styled.div`
  display: flex;
  background: ${tokens.color.bgSubtle};
  border-bottom: 1px solid ${tokens.color.borderLight};
`

const ProfileTableHeadCell = styled.div<{ $width?: string }>`
  padding: 12px;
  ${({ $width }) => ($width ? `width: ${$width}; flex-shrink: 0;` : `flex: 1; min-width: 0;`)}
`

const ProfileTableRow = styled.div`
  display: flex;

  &:not(:last-child) {
    border-bottom: 1px solid ${tokens.color.borderLight};
  }
`

const ProfileTableCell = styled.div<{ $width?: string }>`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  padding: 12px;
  ${({ $width }) => ($width ? `width: ${$width}; flex-shrink: 0;` : `flex: 1; min-width: 0;`)}
`

export function DelegateProfileSkeleton() {
  return (
    <ProfileShell label="Loading delegate profile">
      <ProfileHeaderCard>
        <ProfileHeaderText>
          <ProfileTitleBlock>
            {/* Back link */}
            <SkeletonBlock $height="20px" $width="148px" />
            {/* Name + address tag */}
            <ProfileNameRow>
              <SkeletonBlock $height="68px" $width="280px" $radius="8px" />
              <SkeletonBlock $height="24px" $width="120px" $radius="14px" />
            </ProfileNameRow>
            {/* Description — two lines */}
            <SkeletonStack $gap="4px" $maxWidth="720px">
              <SkeletonBlock $height="20px" $width="92%" />
              <SkeletonBlock $height="20px" $width="68%" />
            </SkeletonStack>
          </ProfileTitleBlock>

          {/* Social chip placeholders — Twitter / ENS profile / Anticapture */}
          <ProfileSocialRow>
            <SkeletonBlock $height="24px" $width="124px" $radius="14px" />
            <SkeletonBlock $height="24px" $width="108px" $radius="14px" />
            <SkeletonBlock $height="24px" $width="112px" $radius="14px" />
          </ProfileSocialRow>

          {/* Delegate CTA */}
          <SkeletonBlock $height="40px" $width="180px" $radius="8px" />
        </ProfileHeaderText>

        {/* Right column: 200×200 avatar circle + participation tag */}
        <ProfileAvatarColumn>
          <SkeletonCircle $size="200px" />
          <SkeletonBlock $height="24px" $width="148px" $radius="14px" />
        </ProfileAvatarColumn>
      </ProfileHeaderCard>

      {/* 4-stat row */}
      <ProfileStatsRow>
        {Array.from({ length: 4 }, (_, index) => (
          <ProfileStatCard key={index}>
            <ProfileStatTopRow>
              <SkeletonBlock $height="36px" $width="84px" $radius="6px" />
              <SkeletonBlock $height="24px" $width="24px" $radius="4px" />
            </ProfileStatTopRow>
            <SkeletonBlock $height="20px" $width={index === 2 ? '180px' : '120px'} />
          </ProfileStatCard>
        ))}
      </ProfileStatsRow>

      {/* Voting record table */}
      <ProfileTableCard>
        <ProfileTableHead>
          <ProfileTableHeadCell>
            <SkeletonBlock $height="20px" $width="124px" />
          </ProfileTableHeadCell>
          <ProfileTableHeadCell $width="200px">
            <SkeletonBlock $height="20px" $width="104px" />
          </ProfileTableHeadCell>
          <ProfileTableHeadCell $width="200px">
            <SkeletonBlock $height="20px" $width="54px" />
          </ProfileTableHeadCell>
        </ProfileTableHead>
        {Array.from({ length: 10 }, (_, index) => (
          <ProfileTableRow key={index}>
            <ProfileTableCell>
              <SkeletonBlock $height="20px" $width="68%" $maxWidth="360px" />
            </ProfileTableCell>
            <ProfileTableCell $width="200px">
              <SkeletonCircle $size="16px" />
              <SkeletonBlock $height="20px" $width="40px" />
            </ProfileTableCell>
            <ProfileTableCell $width="200px">
              <SkeletonCircle $size="16px" />
              <SkeletonBlock $height="20px" $width="40px" />
            </ProfileTableCell>
          </ProfileTableRow>
        ))}
      </ProfileTableCard>
    </ProfileShell>
  )
}

const RoundsShell = styled(SkeletonRegion)`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
  animation: ${fadeInUp} 0.35s ease both;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['4xl']} ${tokens.spacing['2xl']};
  }
`

const RoundDetailHeaderActions = styled(SkeletonInline)`
  justify-content: space-between;
  flex-wrap: wrap;
`

const RoundDetailSummaryGrid = styled(SkeletonGrid)`
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (min-width: 760px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

function RoundDetailSectionSkeleton({
  columns = 4,
  rows = 4,
  titleWidth = '160px',
}: {
  columns?: number
  rows?: number
  titleWidth?: string
}) {
  return (
    <SkeletonStack $gap={tokens.spacing.lg}>
      <SpaceBetweenInline>
        <SectionLabelSkeleton $height="12px" $width={titleWidth} />
        <SkeletonBlock $height="12px" $width="88px" />
      </SpaceBetweenInline>
      <TableSkeleton rows={rows} columns={columns} />
    </SkeletonStack>
  )
}

export function RoundDetailPageSkeleton() {
  return (
    <RoundsShell label="Loading round detail">
      <SkeletonStack $gap={tokens.spacing.lg}>
        <RoundDetailHeaderActions>
          <SkeletonBlock $height="18px" $width="112px" />
          <SkeletonInline $gap={tokens.spacing.sm}>
            <SkeletonBlock $height="36px" $width="124px" />
            <SkeletonBlock $height="36px" $width="102px" />
          </SkeletonInline>
        </RoundDetailHeaderActions>
        <RoundDetailHeaderActions>
          <SkeletonStack>
            <SectionLabelSkeleton $height="12px" $width="116px" />
            <SkeletonBlock $height="42px" $width="170px" />
          </SkeletonStack>
          <SkeletonBlock $height="28px" $width="72px" $radius={tokens.radius.pill} />
        </RoundDetailHeaderActions>
        <AddressFormSkeleton />
      </SkeletonStack>
      <RoundDetailSummaryGrid>
        {Array.from({ length: 14 }, (_, index) => (
          <SkeletonStack key={index} $gap="5px">
            <SkeletonBlock $height="11px" $width={index % 3 === 0 ? '72%' : '58%'} />
            <SkeletonBlock $height="18px" $width={index % 4 === 0 ? '84%' : '64%'} />
          </SkeletonStack>
        ))}
      </RoundDetailSummaryGrid>
      <RoundDetailSectionSkeleton titleWidth="132px" rows={2} columns={3} />
      <RoundDetailSectionSkeleton titleWidth="112px" rows={5} columns={5} />
      <RoundDetailSectionSkeleton titleWidth="118px" rows={5} columns={4} />
      <RoundDetailSectionSkeleton titleWidth="126px" rows={4} columns={4} />
    </RoundsShell>
  )
}

/* ─── Transparency full-page skeleton (matches new design) ─── */

const TransparencyShell = styled(SkeletonRegion)`
  width: 100%;
  max-width: 1120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
`

const TransparencyHeader = styled(SkeletonStack)`
  align-items: center;
  width: 100%;
  gap: 16px;
`

const TransparencyCard = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
  padding: 20px;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
`

const SectionHeaderStack = styled(SkeletonStack)`
  gap: 12px;
`

const StaircaseRowSkeleton = styled.div`
  display: flex;
  align-items: stretch;
  gap: 16px;
  width: 100%;

  @media (max-width: 767px) {
    flex-direction: column;
  }
`

const StaircaseColumnSkeleton = styled.div<{ $offset: number }>`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: ${({ $offset }) => $offset}px;

  @media (max-width: 767px) {
    padding-top: 0;
  }
`

const StaircaseBodySkeleton = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 8px;
  background: ${tokens.color.bgSubtle};
`

const GuardrailsRowSkeleton = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
`

const DividerSkeleton = styled.div`
  height: 1px;
  background: ${tokens.color.borderLight};
  width: 100%;
`

const VerifyBlockSkeleton = styled(SkeletonStack)`
  gap: 12px;
`

const VerifyRowSkeleton = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;

  @media (max-width: 767px) {
    flex-direction: column;
  }
`

const VerifyCardSkeleton = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px 12px 12px;
  background: ${tokens.color.bgSubtle};
  border-radius: 8px;
`

const ConditionGridSkeleton = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  width: 100%;
`

const ConditionChipSkeleton = styled(SkeletonStack)`
  flex: 1;
  min-width: 220px;
  padding: 12px 14px;
  border-radius: 8px;
  background: ${tokens.color.bgSubtle};
  gap: 4px;
`

const RoundsBlockSkeleton = styled(SkeletonStack)`
  gap: 8px;
`

const RoundsTableSkeleton = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
  overflow: hidden;
  background: ${tokens.color.surface};
`

const RoundsHeadRowSkeleton = styled.div`
  display: flex;
  background: ${tokens.color.bgSubtle};
  border-bottom: 1px solid ${tokens.color.borderLight};

  @media (max-width: 767px) {
    display: none;
  }
`

const RoundsHeadCellSkeleton = styled.div<{ $width?: string }>`
  padding: 12px;
  ${({ $width }) => ($width ? `width: ${$width}; flex-shrink: 0;` : `flex: 1; min-width: 0;`)}
`

const RoundsRowSkeleton = styled.div`
  display: flex;

  &:not(:last-child) {
    border-bottom: 1px solid ${tokens.color.borderLight};
  }

  @media (max-width: 767px) {
    flex-direction: column;
  }
`

const RoundsCellSkeleton = styled.div<{ $width?: string }>`
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  ${({ $width }) => ($width ? `width: ${$width}; flex-shrink: 0;` : `flex: 1; min-width: 0;`)}

  @media (max-width: 767px) {
    width: 100%;
    flex: none;
  }
`

const STAIR_OFFSETS = [120, 80, 40, 0]

export function TransparencyPageSkeleton() {
  return (
    <TransparencyShell label="Loading transparency page">
      {/* Hero */}
      <TransparencyHeader>
        <SkeletonBlock $height="28px" $width="220px" $radius="14px" />
        <SkeletonStack $gap="8px" $maxWidth="720px">
          <SkeletonBlock $height="68px" $width="640px" $maxWidth="100%" $radius="8px" />
          <SkeletonBlock $height="68px" $width="420px" $maxWidth="100%" $radius="8px" />
        </SkeletonStack>
        <SkeletonStack $gap="4px" $maxWidth="646px">
          <SkeletonBlock $height="20px" $width="100%" />
          <SkeletonBlock $height="20px" $width="84%" />
        </SkeletonStack>
      </TransparencyHeader>

      {/* Methodology card */}
      <TransparencyCard>
        <SectionHeaderStack>
          <SkeletonBlock $height="20px" $width="112px" />
          <SkeletonBlock $height="34px" $width="380px" $radius="6px" />
          <SkeletonStack $gap="4px" $maxWidth="720px">
            <SkeletonBlock $height="20px" $width="100%" />
            <SkeletonBlock $height="20px" $width="72%" />
          </SkeletonStack>
        </SectionHeaderStack>

        <StaircaseRowSkeleton>
          {STAIR_OFFSETS.map((offset, i) => (
            <StaircaseColumnSkeleton key={i} $offset={offset}>
              <SkeletonBlock $height="4px" $width="100%" $radius="9999px" />
              <StaircaseBodySkeleton>
                <SkeletonBlock $height="20px" $width="80%" />
                <SkeletonBlock $height="14px" $width="100%" />
                <SkeletonBlock $height="14px" $width="92%" />
                <SkeletonBlock $height="14px" $width="74%" />
              </StaircaseBodySkeleton>
            </StaircaseColumnSkeleton>
          ))}
        </StaircaseRowSkeleton>

        <GuardrailsRowSkeleton>
          <SkeletonBlock $height="20px" $width="140px" />
          <SkeletonBlock $height="32px" $width="148px" $radius="9999px" />
          <SkeletonBlock $height="32px" $width="138px" $radius="9999px" />
          <SkeletonBlock $height="32px" $width="156px" $radius="9999px" />
          <SkeletonBlock $height="32px" $width="158px" $radius="9999px" />
        </GuardrailsRowSkeleton>

        <DividerSkeleton />

        <VerifyBlockSkeleton>
          <SkeletonBlock $height="20px" $width="172px" />
          <VerifyRowSkeleton>
            {Array.from({ length: 2 }, (_, i) => (
              <VerifyCardSkeleton key={i}>
                <SkeletonBlock $height="40px" $width="40px" $radius="8px" />
                <SkeletonStack $gap="2px" $maxWidth="160px">
                  <SkeletonBlock $height="20px" $width="120px" />
                  <SkeletonBlock $height="20px" $width="180px" />
                </SkeletonStack>
              </VerifyCardSkeleton>
            ))}
          </VerifyRowSkeleton>
        </VerifyBlockSkeleton>
      </TransparencyCard>

      {/* Eligibility card */}
      <TransparencyCard>
        <SectionHeaderStack>
          <SkeletonBlock $height="20px" $width="92px" />
          <SkeletonBlock $height="34px" $width="320px" $radius="6px" />
        </SectionHeaderStack>
        <ConditionGridSkeleton>
          {Array.from({ length: 3 }, (_, i) => (
            <ConditionChipSkeleton key={i}>
              <SkeletonBlock $height="20px" $width={i === 1 ? '180px' : '128px'} />
              <SkeletonBlock $height="20px" $width="100%" />
            </ConditionChipSkeleton>
          ))}
        </ConditionGridSkeleton>
      </TransparencyCard>

      {/* Round data card */}
      <TransparencyCard>
        <SectionHeaderStack>
          <SkeletonBlock $height="20px" $width="96px" />
          <SkeletonBlock $height="34px" $width="320px" $radius="6px" />
          <SkeletonStack $gap="4px" $maxWidth="720px">
            <SkeletonBlock $height="20px" $width="100%" />
            <SkeletonBlock $height="20px" $width="92%" />
            <SkeletonBlock $height="20px" $width="64%" />
          </SkeletonStack>
        </SectionHeaderStack>

        <RoundsBlockSkeleton>
          <RoundsTableSkeleton>
            <RoundsHeadRowSkeleton>
              <RoundsHeadCellSkeleton><SkeletonBlock $height="20px" $width="64px" /></RoundsHeadCellSkeleton>
              <RoundsHeadCellSkeleton $width="200px"><SkeletonBlock $height="20px" $width="64px" /></RoundsHeadCellSkeleton>
              <RoundsHeadCellSkeleton $width="140px"><SkeletonBlock $height="20px" $width="60px" /></RoundsHeadCellSkeleton>
              <RoundsHeadCellSkeleton $width="200px"><SkeletonBlock $height="20px" $width="86px" /></RoundsHeadCellSkeleton>
            </RoundsHeadRowSkeleton>
            {Array.from({ length: 5 }, (_, i) => (
              <RoundsRowSkeleton key={i}>
                <RoundsCellSkeleton><SkeletonBlock $height="20px" $width="76px" /></RoundsCellSkeleton>
                <RoundsCellSkeleton $width="200px"><SkeletonBlock $height="20px" $width="120px" /></RoundsCellSkeleton>
                <RoundsCellSkeleton $width="140px"><SkeletonBlock $height="20px" $width="56px" $radius="9999px" /></RoundsCellSkeleton>
                <RoundsCellSkeleton $width="200px">
                  <SkeletonBlock $height="24px" $width="64px" $radius="9999px" />
                  <SkeletonBlock $height="24px" $width="64px" $radius="9999px" />
                </RoundsCellSkeleton>
              </RoundsRowSkeleton>
            ))}
          </RoundsTableSkeleton>
          <SkeletonBlock $height="18px" $width="68%" $maxWidth="540px" />
        </RoundsBlockSkeleton>
      </TransparencyCard>
    </TransparencyShell>
  )
}

/* ─── Rounds full-page skeleton (matches new design) ─── */

const RoundsPageShell = styled(SkeletonRegion)`
  width: 100%;
  max-width: 1120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
`

const RoundsHeaderStack = styled(SkeletonStack)`
  align-items: center;
  width: 100%;
  gap: 16px;
`

const RoundsTitleRow = styled(SkeletonInline)`
  align-items: center;
  justify-content: center;
  gap: 24px;
`

const RoundsProgressBlock = styled(SkeletonStack)`
  gap: 8px;
  width: 100%;
`

const RoundsBarLabels = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`

const RoundsTierCard = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
`

const RoundsTierHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`

const RoundsTierLadder = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  width: 100%;

  @media (min-width: 600px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  @media (min-width: 960px) {
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 6px;
  }
`

const RoundsTierPip = styled(SkeletonStack)`
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  background: ${tokens.color.bgSubtle};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 10px;
`

const RoundsTierShareRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
  border-top: 1px solid ${tokens.color.borderLight};
  padding-top: 20px;

  @media (min-width: 720px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`

const RoundsInspectCard = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
`

const RoundsInspectHeader = styled(SkeletonStack)`
  gap: 12px;
`

const RoundsSearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;

  @media (max-width: 767px) {
    flex-wrap: wrap;
  }
`

const RoundsTableCard = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
  overflow: hidden;
  background: ${tokens.color.surface};
`

const RoundsTableHeadRow = styled.div`
  display: flex;
  background: ${tokens.color.bgSubtle};
  border-bottom: 1px solid ${tokens.color.borderLight};

  @media (max-width: 767px) {
    display: none;
  }
`

const RoundsTableHeadCellSkeleton = styled.div<{ $weight?: number }>`
  flex: ${({ $weight }) => $weight ?? 1};
  min-width: 0;
  display: flex;
  align-items: center;
  padding: 12px;
`

const RoundsTableRowSkeleton = styled.div`
  display: flex;
  width: 100%;

  &:not(:last-child) {
    border-bottom: 1px solid ${tokens.color.borderLight};
  }

  @media (max-width: 767px) {
    flex-direction: column;
    padding: 4px 0;
  }
`

const RoundsTableCellSkeleton = styled.div<{ $weight?: number }>`
  flex: ${({ $weight }) => $weight ?? 1};
  min-width: 0;
  display: flex;
  align-items: center;
  padding: 14px 12px;

  @media (max-width: 767px) {
    width: 100%;
    flex: none;
    justify-content: space-between;
    padding: 10px 16px;
  }
`

const COL_WEIGHTS = [0.9, 1, 1, 1.4, 1.4, 0.7, 0.25]

export function RoundsPageSkeleton() {
  return (
    <RoundsPageShell label="Loading rounds page">
      {/* Hero */}
      <RoundsHeaderStack>
        <SkeletonBlock $height="28px" $width="92px" $radius="14px" />
        <RoundsTitleRow>
          <SkeletonBlock $height="68px" $width="420px" $maxWidth="100%" $radius="8px" />
          <SkeletonCircle $size="20px" />
        </RoundsTitleRow>
        <SkeletonStack $gap="4px" $maxWidth="646px">
          <SkeletonBlock $height="20px" $width="100%" />
          <SkeletonBlock $height="20px" $width="78%" />
        </SkeletonStack>
      </RoundsHeaderStack>

      {/* Round progress bar */}
      <RoundsProgressBlock>
        <SkeletonBlock $height="12px" $width="100%" $radius="9999px" />
        <RoundsBarLabels>
          <SkeletonBlock $height="20px" $width="160px" />
          <SkeletonBlock $height="20px" $width="220px" />
        </RoundsBarLabels>
      </RoundsProgressBlock>

      {/* Current tier card */}
      <RoundsTierCard>
        <RoundsTierHeader>
          <SkeletonStack $gap="4px">
            <SkeletonBlock $height="24px" $width="180px" />
          </SkeletonStack>
          <SkeletonBlock $height="32px" $width="120px" $radius="9999px" />
        </RoundsTierHeader>

        <RoundsTierLadder>
          {Array.from({ length: 7 }, (_, i) => (
            <RoundsTierPip key={i}>
              <SkeletonCircle $size="24px" />
              <SkeletonBlock $height="18px" $width="48px" />
              <SkeletonBlock $height="16px" $width="68px" />
              <SkeletonBlock $height="4px" $width="100%" $radius="9999px" />
            </RoundsTierPip>
          ))}
        </RoundsTierLadder>

        <RoundsTierShareRow>
          <SkeletonBlock $height="20px" $width="60%" $maxWidth="420px" />
          <SkeletonBlock $height="40px" $width="200px" $radius="8px" />
        </RoundsTierShareRow>
      </RoundsTierCard>

      {/* Inspect card */}
      <RoundsInspectCard>
        <RoundsInspectHeader>
          <SkeletonBlock $height="20px" $width="124px" />
          <RoundsSearchRow>
            <SkeletonBlock $height="44px" $width="100%" $radius="9999px" />
            <SkeletonBlock $height="40px" $width="112px" $radius="8px" />
            <SkeletonBlock $height="40px" $width="80px" $radius="8px" />
          </RoundsSearchRow>
        </RoundsInspectHeader>

        <RoundsTableCard>
          <RoundsTableHeadRow>
            {COL_WEIGHTS.map((w, i) => (
              <RoundsTableHeadCellSkeleton key={i} $weight={w}>
                {w > 0.3 && <SkeletonBlock $height="20px" $width={i === 2 ? '88px' : i === 3 ? '60px' : '64px'} />}
              </RoundsTableHeadCellSkeleton>
            ))}
          </RoundsTableHeadRow>
          {Array.from({ length: 5 }, (_, rowIdx) => (
            <RoundsTableRowSkeleton key={rowIdx}>
              <RoundsTableCellSkeleton $weight={COL_WEIGHTS[0]}>
                <SkeletonBlock $height="20px" $width="76px" />
              </RoundsTableCellSkeleton>
              <RoundsTableCellSkeleton $weight={COL_WEIGHTS[1]}>
                <SkeletonBlock $height="20px" $width="68px" />
              </RoundsTableCellSkeleton>
              <RoundsTableCellSkeleton $weight={COL_WEIGHTS[2]}>
                <SkeletonBlock $height="20px" $width="56px" />
              </RoundsTableCellSkeleton>
              <RoundsTableCellSkeleton $weight={COL_WEIGHTS[3]}>
                <SkeletonBlock $height="20px" $width="92px" />
              </RoundsTableCellSkeleton>
              <RoundsTableCellSkeleton $weight={COL_WEIGHTS[4]}>
                <SkeletonBlock $height="20px" $width="104px" />
              </RoundsTableCellSkeleton>
              <RoundsTableCellSkeleton $weight={COL_WEIGHTS[5]}>
                <SkeletonBlock $height="24px" $width="64px" $radius="9999px" />
              </RoundsTableCellSkeleton>
              <RoundsTableCellSkeleton $weight={COL_WEIGHTS[6]}>
                <SkeletonBlock $height="14px" $width="14px" $radius="4px" />
              </RoundsTableCellSkeleton>
            </RoundsTableRowSkeleton>
          ))}
        </RoundsTableCard>
      </RoundsInspectCard>
    </RoundsPageShell>
  )
}
