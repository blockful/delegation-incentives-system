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

const SectionLabelSkeleton = styled(SkeletonBlock)`
  text-transform: uppercase;
`

const FluidSkeletonBlock = styled(SkeletonBlock)`
  flex: 1;
`

const CenteredSkeletonBlock = styled(SkeletonBlock)`
  align-self: center;
`

const SpaceBetweenInline = styled(SkeletonInline)`
  justify-content: space-between;
`

const SectionLabelWithMargin = styled(SectionLabelSkeleton)`
  margin-bottom: ${tokens.spacing.md};
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

function MiniStatSkeleton() {
  return (
    <SkeletonCard $gap={tokens.spacing.xs}>
      <SkeletonBlock $height="10px" $width="58%" />
      <SkeletonBlock $height="22px" $width="74%" />
      <SkeletonBlock $height="10px" $width="48%" />
    </SkeletonCard>
  )
}

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
  background: linear-gradient(to bottom, ${tokens.color.lightBlue}, ${tokens.color.white});
  border-bottom: 1px solid ${tokens.color.middleGray};

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
  display: grid;
  gap: ${tokens.spacing['4xl']};

  @media (min-width: 768px) {
    grid-template-columns: minmax(280px, 0.9fr) minmax(0, 1.1fr);
    align-items: center;
  }
`

export function LandingPageSkeleton() {
  return (
    <LandingRoot label="Loading landing page">
      <LandingHero>
        <LandingHeroInner $gap={tokens.spacing.lg}>
          <SkeletonBlock $height="14px" $width="260px" $maxWidth="80%" />
          <FullWidthCenteredStack $gap={tokens.spacing.md} $maxWidth="680px">
            <SkeletonBlock $height="54px" $width="88%" />
            <SkeletonBlock $height="54px" $width="56%" />
          </FullWidthCenteredStack>
          <SkeletonText
            lines={2}
            lineHeight="18px"
            maxWidth="520px"
            widths={['100%', '72%']}
          />
          <LandingActions $gap={tokens.spacing.md}>
            <SkeletonBlock $height="44px" $width="160px" />
            <SkeletonBlock $height="44px" $width="132px" />
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
          <SkeletonStack $gap={tokens.spacing.lg}>
            <SkeletonBlock $height="12px" $width="140px" />
            <SkeletonText lines={2} lineHeight="36px" widths={['86%', '64%']} />
            <SkeletonText lines={3} lineHeight="16px" widths={['100%', '92%', '70%']} />
            <SkeletonBlock $height="40px" $width="138px" />
          </SkeletonStack>
          <TierRowsSkeleton rows={5} />
        </LandingTierInner>
      </LandingTierSection>
    </LandingRoot>
  )
}

const DashboardShell = styled(SkeletonRegion)<{ $compact?: boolean }>`
  max-width: ${({ $compact }) => ($compact ? '720px' : tokens.maxWidth.section)};
  margin: 0 auto;
  padding: ${({ $compact }) =>
    $compact
      ? `${tokens.spacing.xl} ${tokens.spacing.lg}`
      : `${tokens.spacing['4xl']} ${tokens.spacing.xl}`};
  display: flex;
  flex-direction: column;
  gap: ${({ $compact }) => ($compact ? tokens.spacing.md : tokens.spacing['3xl'])};
  animation: ${fadeInUp} 0.35s ease both;

  @media (min-width: 768px) {
    padding: ${({ $compact }) =>
      $compact
        ? `${tokens.spacing['2xl']} ${tokens.spacing.xl}`
        : `${tokens.spacing['5xl']} ${tokens.spacing['4xl']}`};
    gap: ${({ $compact }) => ($compact ? tokens.spacing.lg : tokens.spacing['3xl'])};
  }
`

const DashboardMainGrid = styled.div`
  display: grid;
  gap: ${tokens.spacing['3xl']};

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
`

const DashboardColumn = styled(SkeletonStack)`
  gap: ${tokens.spacing.xl};
`

const DashboardRoundGrid = styled(SkeletonGrid)`
  grid-template-columns: repeat(3, minmax(0, 1fr));
`

function DashboardWideSkeleton() {
  return (
    <>
      <DashboardMainGrid>
        <DashboardColumn>
          <SectionLabelSkeleton $height="12px" $width="112px" />
          <SkeletonCard $padding={tokens.spacing['2xl']} $gap={tokens.spacing.lg}>
            <SkeletonBlock $height="48px" $width="58%" />
            <SkeletonText lines={2} lineHeight="14px" widths={['82%', '56%']} />
            <SkeletonInline>
              <SkeletonCircle $size="36px" />
              <SkeletonText lines={2} lineHeight="12px" widths={['140px', '96px']} />
            </SkeletonInline>
          </SkeletonCard>
        </DashboardColumn>
        <DashboardColumn>
          <div>
            <SectionLabelWithMargin $height="12px" $width="112px" />
            <DashboardRoundGrid>
              {Array.from({ length: 3 }, (_, index) => (
                <MiniStatSkeleton key={index} />
              ))}
            </DashboardRoundGrid>
          </div>
          <div>
            <SectionLabelWithMargin $height="12px" $width="142px" />
            <SkeletonStack $gap={tokens.spacing.xl}>
              <SkeletonCard $padding={tokens.spacing.xl}>
                <SpaceBetweenInline>
                  <SkeletonBlock $height="18px" $width="112px" />
                  <SkeletonBlock $height="18px" $width="56px" />
                </SpaceBetweenInline>
                <SkeletonBlock $height="8px" $width="100%" $radius={tokens.radius.pill} />
              </SkeletonCard>
              <SkeletonCard $padding={tokens.spacing.xl}>
                <SkeletonBlock $height="20px" $width="44%" />
                <SkeletonText lines={2} lineHeight="14px" widths={['92%', '68%']} />
              </SkeletonCard>
            </SkeletonStack>
          </div>
        </DashboardColumn>
      </DashboardMainGrid>
      <SkeletonCard $padding={tokens.spacing.xl}>
        <SpaceBetweenInline>
          <SectionLabelSkeleton $height="12px" $width="112px" />
          <SkeletonBlock $height="12px" $width="84px" />
        </SpaceBetweenInline>
        <TierRowsSkeleton rows={5} />
      </SkeletonCard>
    </>
  )
}

function DashboardCompactSkeleton() {
  return (
    <>
      <SkeletonCard $padding={tokens.spacing.lg} $gap={tokens.spacing.sm}>
        <SpaceBetweenInline>
          <SkeletonBlock $height="28px" $width="152px" />
          <SkeletonBlock $height="14px" $width="92px" />
        </SpaceBetweenInline>
        <SkeletonInline>
          <SkeletonCircle $size="22px" />
          <SkeletonBlock $height="12px" $width="180px" />
        </SkeletonInline>
      </SkeletonCard>
      <SkeletonCard $padding={tokens.spacing.lg}>
        <SpaceBetweenInline>
          <SkeletonBlock $height="16px" $width="112px" />
          <SkeletonBlock $height="16px" $width="64px" />
        </SpaceBetweenInline>
        <SkeletonBlock $height="8px" $radius={tokens.radius.pill} />
        <SpaceBetweenInline>
          <SkeletonBlock $height="12px" $width="86px" />
          <SkeletonBlock $height="12px" $width="86px" />
        </SpaceBetweenInline>
      </SkeletonCard>
      <SkeletonGrid $columns="repeat(3, minmax(0, 1fr))">
        {Array.from({ length: 3 }, (_, index) => (
          <MiniStatSkeleton key={index} />
        ))}
      </SkeletonGrid>
      <TierRowsSkeleton rows={5} />
    </>
  )
}

export function DashboardPageSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <DashboardShell $compact={compact} label="Loading dashboard">
      {compact ? <DashboardCompactSkeleton /> : <DashboardWideSkeleton />}
    </DashboardShell>
  )
}

const StatsBar = styled(SkeletonGrid)`
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid ${tokens.color.gray};
  border-radius: ${tokens.radius.md};
  box-shadow: ${tokens.shadow.sm};
  background: ${tokens.color.surface};
  overflow: hidden;
  gap: 0;
`

const StatsCell = styled(SkeletonStack)`
  align-items: center;
  gap: ${tokens.spacing.xs};
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};

  &:not(:last-child) {
    border-right: 1px solid ${tokens.color.borderLight};
  }
`

export function StatsBarSkeleton() {
  return (
    <SkeletonRegion label="Loading delegate stats">
      <StatsBar>
        {Array.from({ length: 3 }, (_, index) => (
          <StatsCell key={index}>
            <SkeletonBlock $height="22px" $width="58px" />
            <SkeletonBlock $height="12px" $width={index === 2 ? '136px' : '92px'} />
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

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

function VoterCardSkeleton() {
  return (
    <SkeletonCard $padding={tokens.spacing.xl} $gap={tokens.spacing.lg}>
      <SkeletonInline>
        <SkeletonCircle $size="40px" />
        <SkeletonText lines={2} lineHeight="12px" widths={['132px', '92px']} />
      </SkeletonInline>
      <SkeletonStack $gap={tokens.spacing.xs}>
        <SkeletonBlock $height="12px" $width="112px" />
        <SkeletonInline $gap={tokens.spacing.xs}>
          {Array.from({ length: 10 }, (_, index) => (
            <FluidSkeletonBlock key={index} $height="18px" $radius="4px" />
          ))}
        </SkeletonInline>
      </SkeletonStack>
      <SkeletonGrid $columns="repeat(3, minmax(0, 1fr))">
        {Array.from({ length: 3 }, (_, index) => (
          <SkeletonStack key={index} $gap="4px">
            <SkeletonBlock $height="16px" $width="70%" />
            <SkeletonBlock $height="12px" $width="88%" />
          </SkeletonStack>
        ))}
      </SkeletonGrid>
      <SkeletonStack>
        <SkeletonBlock $height="36px" />
        <CenteredSkeletonBlock $height="14px" $width="84px" />
      </SkeletonStack>
    </SkeletonCard>
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

const ProfileShell = styled(SkeletonRegion)`
  max-width: ${tokens.maxWidth.lg};
  margin: 0 auto;
  padding: ${tokens.spacing['2xl']} ${tokens.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};
  animation: ${fadeInUp} 0.35s ease both;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['4xl']} ${tokens.spacing['2xl']};
  }
`

const ProfileHero = styled(SkeletonCard)`
  align-items: center;
  text-align: center;
  padding: ${tokens.spacing['3xl']} ${tokens.spacing.xl};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['4xl']} ${tokens.spacing['3xl']};
  }
`

const ProfileStatsGrid = styled(SkeletonGrid)`
  grid-template-columns: repeat(2, 1fr);

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`

export function DelegateProfileSkeleton() {
  return (
    <ProfileShell label="Loading delegate profile">
      <SkeletonBlock $height="18px" $width="112px" />
      <ProfileHero $gap={tokens.spacing.lg}>
        <SkeletonCircle $size="96px" />
        <SkeletonText lines={2} lineHeight="18px" widths={['220px', '160px']} />
        <SkeletonBlock $height="50px" $width="100%" $maxWidth="400px" />
        <SkeletonBlock $height="12px" $width="116px" />
      </ProfileHero>
      <ProfileStatsGrid>
        {Array.from({ length: 4 }, (_, index) => (
          <MiniStatSkeleton key={index} />
        ))}
      </ProfileStatsGrid>
      <SkeletonCard $padding={tokens.spacing.xl}>
        <SectionLabelSkeleton $height="12px" $width="220px" />
        <SkeletonInline $gap={tokens.spacing.xs}>
          {Array.from({ length: 10 }, (_, index) => (
            <FluidSkeletonBlock key={index} $height="34px" $radius="6px" />
          ))}
        </SkeletonInline>
      </SkeletonCard>
      <CenteredSkeletonBlock $height="18px" $width="260px" />
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

const RoundsHeadingRow = styled(SkeletonInline)`
  align-items: center;
  flex-wrap: wrap;
  gap: ${tokens.spacing.lg};
`

const RoundsGrid = styled.div`
  display: grid;
  gap: ${tokens.spacing['3xl']};
  min-width: 0;

  @media (min-width: 1024px) {
    grid-template-columns: 2fr minmax(280px, 1fr);
  }
`

const RoundsLeftColumn = styled(SkeletonStack)`
  gap: ${tokens.spacing['3xl']};
`

function RoundSummaryCardSkeleton() {
  return (
    <SkeletonCard $padding={tokens.spacing.xl} $gap={tokens.spacing.lg}>
      <SpaceBetweenInline>
        <SkeletonBlock $height="22px" $width="132px" />
        <SkeletonBlock $height="28px" $width="96px" $radius={tokens.radius.pill} />
      </SpaceBetweenInline>
      <SkeletonBlock $height="10px" $radius={tokens.radius.pill} />
      <SkeletonGrid $columns="repeat(2, minmax(0, 1fr))">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonStack key={index} $gap="4px">
            <SkeletonBlock $height="12px" $width="58%" />
            <SkeletonBlock $height="18px" $width="76%" />
          </SkeletonStack>
        ))}
      </SkeletonGrid>
    </SkeletonCard>
  )
}

export function RoundsPageSkeleton() {
  return (
    <RoundsShell label="Loading rounds page">
      <SkeletonStack $gap={tokens.spacing.lg}>
        <SectionLabelSkeleton $height="12px" $width="72px" />
        <RoundsHeadingRow>
          <SkeletonBlock $height="54px" $width="310px" $maxWidth="100%" />
          <SkeletonBlock $height="54px" $width="156px" $radius={tokens.radius.sm} />
        </RoundsHeadingRow>
        <SkeletonStack $gap={tokens.spacing.lg}>
          <SectionLabelSkeleton $height="12px" $width="124px" />
          <AddressFormSkeleton />
        </SkeletonStack>
      </SkeletonStack>
      <RoundsGrid>
        <RoundsLeftColumn>
          <RoundSummaryCardSkeleton />
          <TableSkeleton rows={5} columns={4} />
        </RoundsLeftColumn>
        <TierRowsSkeleton rows={5} />
      </RoundsGrid>
    </RoundsShell>
  )
}

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

const LotteryRoot = styled(SkeletonRegion)`
  width: 100%;
  animation: ${fadeInUp} 0.35s ease both;
`

const LotteryHeaderBand = styled.section`
  width: 100%;
  background: linear-gradient(to bottom, ${tokens.color.lightBlue}, ${tokens.color.white});
  border-bottom: 1px solid ${tokens.color.borderLight};
`

const LotteryHeaderContent = styled(SkeletonStack)`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl} ${tokens.spacing['3xl']};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['6xl']} ${tokens.spacing['2xl']} ${tokens.spacing['4xl']};
  }
`

const LotteryContent = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  padding: ${tokens.spacing['3xl']} ${tokens.spacing.xl} ${tokens.spacing['7xl']};
  display: grid;
  gap: ${tokens.spacing['3xl']};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['4xl']} ${tokens.spacing['2xl']} ${tokens.spacing['7xl']};
  }
`

const LotteryExplorerGrid = styled.div`
  display: grid;
  gap: ${tokens.spacing.lg};

  @media (min-width: 980px) {
    grid-template-columns: minmax(280px, 0.36fr) minmax(0, 0.64fr);
  }
`

const LotteryTopGrid = styled.div`
  display: grid;
  gap: ${tokens.spacing.lg};

  @media (min-width: 980px) {
    grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  }
`

function RoundOptionSkeleton() {
  return (
    <SkeletonCard $padding={tokens.spacing.md} $gap={tokens.spacing.xs} $radius={tokens.radius.sm}>
      <SpaceBetweenInline>
        <SkeletonBlock $height="16px" $width="72px" />
        <SkeletonBlock $height="22px" $width="48px" $radius={tokens.radius.pill} />
      </SpaceBetweenInline>
      <SkeletonBlock $height="12px" $width="84%" />
    </SkeletonCard>
  )
}

export function LotteryPageSkeleton() {
  return (
    <LotteryRoot label="Loading lottery page">
      <LotteryHeaderBand>
        <LotteryHeaderContent $gap={tokens.spacing.lg}>
          <SectionLabelSkeleton $height="12px" $width="72px" />
          <SkeletonBlock $height="50px" $width="340px" $maxWidth="100%" />
          <SkeletonText lines={2} lineHeight="16px" maxWidth="680px" widths={['100%', '68%']} />
          <SkeletonBlock $height="14px" $width="420px" $maxWidth="100%" />
        </LotteryHeaderContent>
      </LotteryHeaderBand>
      <LotteryContent>
        <LotteryExplorerGrid>
          <SkeletonCard $padding={tokens.spacing['2xl']}>
            <SpaceBetweenInline>
              <SkeletonBlock $height="24px" $width="116px" />
              <SkeletonBlock $height="14px" $width="64px" />
            </SpaceBetweenInline>
            {Array.from({ length: 4 }, (_, index) => (
              <RoundOptionSkeleton key={index} />
            ))}
          </SkeletonCard>
          <SkeletonCard $padding={tokens.spacing['2xl']}>
            <SpaceBetweenInline>
              <SkeletonBlock $height="26px" $width="190px" />
              <SkeletonBlock $height="28px" $width="86px" $radius={tokens.radius.pill} />
            </SpaceBetweenInline>
            <SkeletonGrid $columns="repeat(4, minmax(0, 1fr))">
              {Array.from({ length: 4 }, (_, index) => (
                <MiniStatSkeleton key={index} />
              ))}
            </SkeletonGrid>
            <TableSkeleton rows={4} columns={4} />
          </SkeletonCard>
        </LotteryExplorerGrid>
        <LotteryTopGrid>
          <SkeletonCard $padding={tokens.spacing['2xl']}>
            <SkeletonBlock $height="26px" $width="210px" />
            <SkeletonText lines={2} lineHeight="14px" widths={['100%', '70%']} />
            <SkeletonGrid $columns="repeat(3, minmax(0, 1fr))">
              {Array.from({ length: 3 }, (_, index) => (
                <MiniStatSkeleton key={index} />
              ))}
            </SkeletonGrid>
          </SkeletonCard>
          <SkeletonCard $padding={tokens.spacing['2xl']}>
            <SkeletonBlock $height="26px" $width="160px" />
            <SkeletonText lines={2} lineHeight="14px" widths={['78%', '48%']} />
            <AddressFormSkeleton />
          </SkeletonCard>
        </LotteryTopGrid>
      </LotteryContent>
    </LotteryRoot>
  )
}

const TransparencyStatsRegion = styled(SkeletonRegion)`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
`

const TransparencyStatGrid = styled(SkeletonGrid)`
  grid-template-columns: 1fr 1fr;
`

export function TransparencyStatsSkeleton() {
  return (
    <TransparencyStatsRegion label="Loading transparency stats">
      <SectionLabelSkeleton $height="12px" $width="170px" />
      <TransparencyStatGrid>
        {Array.from({ length: 4 }, (_, index) => (
          <MiniStatSkeleton key={index} />
        ))}
      </TransparencyStatGrid>
    </TransparencyStatsRegion>
  )
}
