import styled from 'styled-components'
import { Button, Spinner } from '@ensdomains/thorin'
import { useLottery } from '@/features/lottery/useLottery'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { truncateAddress } from '@/utils/format'
import { tokens } from '@/styles/tokens'

/* ─── Layout ─── */

/**
 * The page renders inside AppLayout with $fullWidth=true (no padding/max-width
 * on the outer <main>). The Hero spans the full viewport width; all content
 * below is centered in a 680px column.
 */

const HeroSection = styled.section`
  width: 100%;
  background: linear-gradient(to bottom, ${tokens.color.lightBlue}, ${tokens.color.white});
  border-bottom: 1px solid ${tokens.color.middleGray};
  padding: ${tokens.spacing['7xl']} ${tokens.spacing.xl} ${tokens.spacing['6xl']};
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing.lg};

  @media (min-width: 768px) {
    padding: 100px ${tokens.spacing['4xl']} ${tokens.spacing['7xl']};
  }
`

const HeroEyebrow = styled.span`
  display: inline-block;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: ${tokens.color.darkGray};
`

const HeroTitle = styled.h1`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.darkBlue};
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin: 0;
  white-space: pre-line;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['5xl']};
  }
`

const HeroDescription = styled.p`
  font-size: ${tokens.font.size.lg};
  color: ${tokens.color.darkGray};
  line-height: 1.6;
  margin: 0;
  max-width: 480px;
`

/* ─── Narrow content column ─── */

const ContentColumn = styled.div`
  max-width: 680px;
  margin: 0 auto;
  padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl} ${tokens.spacing['7xl']};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['4xl']};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['5xl']} ${tokens.spacing['2xl']} ${tokens.spacing['7xl']};
  }
`

/* ─── Qualify card ─── */

const QualifyCard = styled.div`
  background: ${tokens.color.tierHighlight};
  border: 1px solid ${tokens.color.positiveEmphasis};
  border-radius: ${tokens.radius.lg};
  padding: ${tokens.spacing.xl} ${tokens.spacing['2xl']};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
`

const QualifyHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
  flex-wrap: wrap;
`

const QualifyTitle = styled.span`
  font-size: ${tokens.font.size.md};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.positiveEmphasis};
`

const PoolPill = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.positiveEmphasis};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.positiveEmphasis};
  border-radius: ${tokens.radius.pill};
  padding: 2px ${tokens.spacing.md};
  white-space: nowrap;
`

const QualifyStats = styled.div`
  display: flex;
  gap: ${tokens.spacing.xl};
  flex-wrap: wrap;

  @media (min-width: 480px) {
    gap: ${tokens.spacing['3xl']};
  }
`

const QualifyStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const QualifyStatValue = styled.span`
  font-size: ${tokens.font.size.md};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkBlue};
`

const QualifyStatLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
`

/* ─── Prize card ─── */

const PrizeCard = styled.div`
  border-radius: ${tokens.radius.lg};
  border: 1px solid ${tokens.color.borderLight};
  padding: ${tokens.spacing['3xl']} ${tokens.spacing['2xl']};
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing.lg};
  background: ${tokens.color.surface};
  box-shadow: ${tokens.shadow.sm};
`

const TrophyCircle = styled.div`
  width: 52px;
  height: 52px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.tierHighlight};
  border: 1px solid ${tokens.color.positiveEmphasis};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  line-height: 1;
`

const PrizeLabel = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${tokens.color.darkGray};
`

const PrizeAmount = styled.span`
  font-size: ${tokens.font.size['4xl']};
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.positiveEmphasis};
  letter-spacing: -0.02em;
  line-height: 1;
`

const PrizeSubtitle = styled.span`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkGray};
`

const PrizeDivider = styled.div`
  width: 100%;
  height: 1px;
  background: ${tokens.color.borderLight};
  margin-top: ${tokens.spacing.sm};
`

const PrizeStatRow = styled.div`
  display: flex;
  gap: ${tokens.spacing.md};
  width: 100%;

  @media (min-width: 480px) {
    gap: ${tokens.spacing.xl};
  }
`

const PrizeStatBox = styled.div`
  flex: 1;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.spacing.lg} ${tokens.spacing.md};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: ${tokens.color.bgSubtle};
`

const PrizeStatBoxValue = styled.span`
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

const PrizeStatBoxLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
  text-align: center;
  line-height: 1.4;
`

/* ─── How it works ─── */

const HowItWorksBox = styled.div`
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.lg};
  padding: ${tokens.spacing['2xl']};
  background: ${tokens.color.surface};
  box-shadow: ${tokens.shadow.sm};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};
`

const HowItWorksTitle = styled.h2`
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  margin: 0;
`

const StepList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xl};
`

const Step = styled.div`
  display: flex;
  gap: ${tokens.spacing.lg};
  align-items: flex-start;
`

const StepNumber = styled.div`
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.blue};
  color: ${tokens.color.white};
  font-weight: ${tokens.font.weight.bold};
  font-size: ${tokens.font.size.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
`

const StepText = styled.p`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkGray};
  margin: 0;
  line-height: 1.6;
  padding-top: 3px;
`

const MethodologyLink = styled.a`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.blue};
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding-top: ${tokens.spacing.sm};
  border-top: 1px solid ${tokens.color.borderLight};

  &:hover {
    text-decoration: underline;
  }
`

/* ─── Last winner section ─── */

const LastWinnerSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
`

const SectionEyebrow = styled.span`
  display: block;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: ${tokens.color.darkGray};
`

const WinnerCard = styled.div`
  border-radius: ${tokens.radius.lg};
  border: 1px solid ${tokens.color.orange};
  padding: ${tokens.spacing.xl} ${tokens.spacing['2xl']};
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.lg};
  background: ${tokens.color.lightOrange};
  box-shadow: ${tokens.shadow.sm};
`

const WinnerInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const WinnerName = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkBlue};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const WinnerMeta = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
`

const WinnerPrize = styled.span`
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.orange};
  white-space: nowrap;
  flex-shrink: 0;
`

const ViewAllLink = styled.a`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.blue};
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;

  &:hover {
    text-decoration: underline;
  }
`

/* ─── Loading / error / empty states ─── */

const LoadingWrap = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
`

const StateColumn = styled.div`
  max-width: 680px;
  margin: 0 auto;
  padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['4xl']};
`

const ErrorCard = styled.div`
  border-radius: ${tokens.radius.xl};
  background: linear-gradient(135deg, #FEE9F0 0%, #FDE8E8 100%);
  border: 1px solid #FBCDD8;
  padding: ${tokens.spacing['4xl']} ${tokens.spacing['3xl']};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing.lg};
  text-align: center;
`

const ErrorIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: ${tokens.radius.pill};
  background: #FBCDD8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
`

const ErrorTitle = styled.h2`
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  color: #93001A;
  margin: 0;
`

const ErrorDetail = styled.p`
  font-size: ${tokens.font.size.base};
  color: #C0365A;
  margin: 0;
  max-width: 340px;
  line-height: 1.5;
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${tokens.spacing['5xl']} ${tokens.spacing['2xl']};
  border-radius: ${tokens.radius.lg};
  border: 1px dashed ${tokens.color.borderLight};
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.md};
  line-height: 1.6;
  gap: ${tokens.spacing.sm};
`

const EmptyIcon = styled.span`
  font-size: ${tokens.font.size['4xl']};
  opacity: 0.6;
`

/* ─── Static content ─── */

const HOW_IT_WORKS_STEPS = [
  'Small balances that fall below the minimum payout threshold are pooled together into a lottery.',
  'At the end of each round, a verifiable random draw selects a winner from the pool.',
  'The winner receives the entire pooled amount — giving small holders a real shot at meaningful rewards.',
]

/* ─── Sub-components ─── */

function HeroBlock() {
  return (
    <HeroSection>
      <HeroEyebrow>Lottery</HeroEyebrow>
      <HeroTitle>{'Small balance?\nYou still have a shot.'}</HeroTitle>
      <HeroDescription>
        Payouts below 1 ENS pool together and become a 10 ENS prize. One winner per pool, drawn at round end.
      </HeroDescription>
    </HeroSection>
  )
}

function HowItWorksSection() {
  return (
    <HowItWorksBox>
      <HowItWorksTitle>How the draw works</HowItWorksTitle>
      <StepList>
        {HOW_IT_WORKS_STEPS.map((text, i) => (
          <Step key={i}>
            <StepNumber>{i + 1}</StepNumber>
            <StepText>{text}</StepText>
          </Step>
        ))}
      </StepList>
      <MethodologyLink href="#" onClick={(e) => e.preventDefault()}>
        View randomness methodology →
      </MethodologyLink>
    </HowItWorksBox>
  )
}

/* ─── Page component ─── */

export function LotteryPage() {
  const { data, loading, error, execute } = useLottery()

  if (loading) {
    return (
      <>
        <HeroBlock />
        <LoadingWrap>
          <Spinner />
        </LoadingWrap>
      </>
    )
  }

  if (error) {
    return (
      <>
        <HeroBlock />
        <StateColumn>
          <ErrorCard>
            <ErrorIcon aria-hidden>⚠️</ErrorIcon>
            <ErrorTitle>Couldn't load lottery data</ErrorTitle>
            <ErrorDetail>
              Something went wrong while fetching the latest round. This is usually temporary.
            </ErrorDetail>
            <Button
              colorStyle="redSecondary"
              size="medium"
              width="auto"
              onClick={execute}
            >
              Try again
            </Button>
          </ErrorCard>
          <HowItWorksSection />
        </StateColumn>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <HeroBlock />
        <StateColumn>
          <EmptyState>
            <EmptyIcon aria-hidden>🎲</EmptyIcon>
            <p>No rounds have been completed yet.</p>
            <p>Lottery results will appear here after the first round ends.</p>
          </EmptyState>
          <HowItWorksSection />
        </StateColumn>
      </>
    )
  }

  const pool = data.lotteryPools[0]
  const entryCount = pool?.entries.length ?? 0
  const poolCount = data.lotteryPools.length
  const prizeEns = pool?.totalPrizeEns ?? '10'

  const poolNumber = 14

  const oddsDisplay =
    entryCount > 0
      ? `~${((1 / entryCount) * 100).toFixed(1)}%`
      : '—'

  const prizeNum = parseFloat(prizeEns)
  const accumulatedDisplay = isNaN(prizeNum) ? prizeEns : `${prizeNum} / ${prizeNum} ENS`

  const roundEndDisplay = '14d 6h'

  const winnerAddress = pool?.winner
  const winnerEnsName = pool?.winnerEnsName

  return (
    <>
      <HeroBlock />

      <ContentColumn>
        {pool && (
          <QualifyCard>
            <QualifyHeader>
              <QualifyTitle>You qualify for the lottery</QualifyTitle>
              <PoolPill>Pool #{poolNumber}</PoolPill>
            </QualifyHeader>
            <QualifyStats>
              <QualifyStat>
                <QualifyStatValue>{oddsDisplay}</QualifyStatValue>
                <QualifyStatLabel>your odds</QualifyStatLabel>
              </QualifyStat>
              <QualifyStat>
                <QualifyStatValue>{accumulatedDisplay}</QualifyStatValue>
                <QualifyStatLabel>pool accumulated</QualifyStatLabel>
              </QualifyStat>
              <QualifyStat>
                <QualifyStatValue>{roundEndDisplay}</QualifyStatValue>
                <QualifyStatLabel>until draw</QualifyStatLabel>
              </QualifyStat>
            </QualifyStats>
          </QualifyCard>
        )}

        <PrizeCard>
          <TrophyCircle aria-hidden>🏆</TrophyCircle>
          <PrizeLabel>Prize Per Pool</PrizeLabel>
          <PrizeAmount>{prizeEns} ENS</PrizeAmount>
          <PrizeSubtitle>Sent directly to your wallet at round end</PrizeSubtitle>
          <PrizeDivider />
          <PrizeStatRow>
            <PrizeStatBox>
              <PrizeStatBoxValue>{entryCount.toLocaleString()}</PrizeStatBoxValue>
              <PrizeStatBoxLabel>qualifying addresses</PrizeStatBoxLabel>
            </PrizeStatBox>
            <PrizeStatBox>
              <PrizeStatBoxValue>{poolCount}</PrizeStatBoxValue>
              <PrizeStatBoxLabel>active prize pool{poolCount !== 1 ? 's' : ''}</PrizeStatBoxLabel>
            </PrizeStatBox>
          </PrizeStatRow>
        </PrizeCard>

        <HowItWorksSection />

        {winnerAddress && (
          <LastWinnerSection>
            <SectionEyebrow>Last Winner · Round 1</SectionEyebrow>
            <WinnerCard>
              <EnsAvatar address={winnerAddress} size={40} />
              <WinnerInfo>
                <WinnerName>
                  {winnerEnsName ?? truncateAddress(winnerAddress)}
                </WinnerName>
                <WinnerMeta>
                  Pool #{poolNumber} · Jan 15, 2025
                </WinnerMeta>
              </WinnerInfo>
              <WinnerPrize>{prizeEns} ENS won</WinnerPrize>
            </WinnerCard>
            <ViewAllLink href="#" onClick={(e) => e.preventDefault()}>
              View all past winners →
            </ViewAllLink>
          </LastWinnerSection>
        )}
      </ContentColumn>
    </>
  )
}
