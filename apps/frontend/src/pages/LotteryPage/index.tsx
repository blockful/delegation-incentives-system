import { useEffect, useRef, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { Button, Spinner } from '@ensdomains/thorin'
import { fadeInUp } from '@/styles'
import { useLottery } from '@/features/lottery/useLottery'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { StepList } from '@/components/shared/StepList'
import { TrophyIcon } from '@/components/shared/icons/TrophyIcon'
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
  padding: ${tokens.spacing['3xl']} ${tokens.spacing.xl};
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing.lg};
  animation: ${fadeInUp} 0.4s ease both;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['6xl']} ${tokens.spacing['4xl']} ${tokens.spacing['7xl']};
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
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl} ${tokens.spacing['5xl']};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
  animation: ${fadeInUp} 0.4s ease 0.1s both;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['2xl']} ${tokens.spacing['2xl']} ${tokens.spacing['7xl']};
    gap: ${tokens.spacing['4xl']};
  }
`

/* ─── Qualify card ─── */

const QualifyCard = styled.div`
  background: #F0FFF4;
  border: 1.5px solid ${tokens.color.middleGray};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.spacing.md} ${tokens.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
`

const QualifyHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
`

const QualifyTitle = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.positiveEmphasis};
`

const PoolPill = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.positiveEmphasis};
  background: ${tokens.color.tierHighlight};
  border-radius: ${tokens.radius.pill};
  padding: 3px 10px;
  white-space: nowrap;
`

const QualifyStats = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  gap: ${tokens.spacing['3xl']};
`

const statEnter = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`

const QualifyStat = styled.div<{ $index: number }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  opacity: 0;
  animation: ${statEnter} 0.35s ease forwards;
  animation-delay: ${({ $index }) => $index * 80}ms;
`

const QualifyStatValue = styled.span`
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  letter-spacing: -0.02em;
`

const QualifyStatLabel = styled.span`
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.darkGray};
`

/* ─── Prize card ─── */

const PrizeCard = styled.div`
  border-radius: ${tokens.radius.lg};
  border: 1px solid ${tokens.color.gray};
  padding: ${tokens.spacing['3xl']} ${tokens.spacing['2xl']};
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing.xs};
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
    padding-top: ${tokens.spacing.md};
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
  padding-bottom: ${tokens.spacing['3xl']};
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
  border: 1px solid ${tokens.color.gray};
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
  border: 1px solid ${tokens.color.gray};
  border-radius: ${tokens.radius.lg};
  padding: ${tokens.spacing['2xl']};
  background: ${tokens.color.surface};
  box-shadow: ${tokens.shadow.sm};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};
`

const HowItWorksTitle = styled.h2`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  margin: 0;
`


const MethodologyLink = styled.a`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.blue};
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding-top: ${tokens.spacing.sm};

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
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const WinnerMeta = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
`

const WinnerPrize = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  white-space: nowrap;
`

const WinnerPrizeAmount = styled.span`
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.orange};
`

const WinnerPrizeLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.orange};
  font-weight: ${tokens.font.weight.normal};
`

const ViewAllLink = styled.a`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
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

/* ─── Odds counter ─── */

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0)
  const raf = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setValue(target * eased)
      if (progress < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])

  return value
}

function OddsCounter({ value }: { value: string }) {
  const match = value.match(/^~?([\d.]+)%$/)
  const numeric = match ? parseFloat(match[1]) : null
  const animated = useCountUp(numeric ?? 0)

  if (numeric === null) return <>{value}</>
  return <>~{animated.toFixed(1)}%</>
}

/* ─── Static content ─── */

const HOW_IT_WORKS_STEPS = [
  'Sub-1 ENS payouts grouped into pools approaching 10 ENS each.',
  'Odds are proportional to calculated payout — bigger balance means better odds.',
  'Winner drawn using RANDAO (last block of the round) — publicly verifiable.',
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
      <StepList steps={HOW_IT_WORKS_STEPS} />
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
              <QualifyStat $index={0}>
                <QualifyStatValue><OddsCounter value={oddsDisplay} /></QualifyStatValue>
                <QualifyStatLabel>your odds</QualifyStatLabel>
              </QualifyStat>
              <QualifyStat $index={1}>
                <QualifyStatValue>{accumulatedDisplay}</QualifyStatValue>
                <QualifyStatLabel>pool accumulated</QualifyStatLabel>
              </QualifyStat>
              <QualifyStat $index={2}>
                <QualifyStatValue>{roundEndDisplay}</QualifyStatValue>
                <QualifyStatLabel>until draw</QualifyStatLabel>
              </QualifyStat>
            </QualifyStats>
          </QualifyCard>
        )}

        <PrizeCard>
          <TrophyCircle>
            <TrophyIcon size={24} color={tokens.color.positiveEmphasis} />
          </TrophyCircle>
          <PrizeLabel>Prize Per Pool</PrizeLabel>
          <PrizeAmount>{prizeEns} ENS</PrizeAmount>
          <PrizeSubtitle>Sent directly to your wallet at round end</PrizeSubtitle>
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
              <WinnerPrize>
                <WinnerPrizeAmount>{prizeEns} ENS</WinnerPrizeAmount>
                <WinnerPrizeLabel>won</WinnerPrizeLabel>
              </WinnerPrize>
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
