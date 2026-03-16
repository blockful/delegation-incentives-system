import styled from 'styled-components'
import { Button, Spinner } from '@ensdomains/thorin'
import { useLottery } from '@/features/lottery/useLottery'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { truncateAddress } from '@/utils/format'
import { tokens, Eyebrow, SectionHeading } from '@/styles'

const Page = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
`

const Hero = styled.div`
  background: linear-gradient(135deg, ${tokens.color.lightBlue} 0%, ${tokens.color.surface} 100%);
  border-radius: ${tokens.radius.xl};
  padding: ${tokens.spacing['3xl']} ${tokens.spacing['2xl']};
  text-align: center;
`

const HeroTitle = styled.h1`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.extrabold};
  color: ${tokens.color.text};
  line-height: 1.2;
  margin: ${tokens.spacing.md} 0 0;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['4xl']};
  }
`

const QualifyCard = styled.div`
  background: ${tokens.color.lightBlue};
  border-radius: ${tokens.radius.lg};
  padding: ${tokens.spacing.xl} ${tokens.spacing['2xl']};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
`

const QualifyTitle = styled.span`
  font-size: ${tokens.font.size.md};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.positive};
`

const QualifyDetail = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.text};
`

const PrizeCard = styled.div`
  border-radius: ${tokens.radius.lg};
  border: 1px solid ${tokens.color.border};
  padding: ${tokens.spacing['2xl']};
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing.md};
  background: ${tokens.color.surface};
`

const TrophyIcon = styled.span`
  width: 48px;
  height: 48px;
  border-radius: ${tokens.radius.lg};
  background: ${tokens.color.lightYellow};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${tokens.font.size['2xl']};
`

const PrizeLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${tokens.color.textMuted};
`

const PrizeAmount = styled.span`
  font-size: ${tokens.font.size['4xl']};
  font-weight: ${tokens.font.weight.extrabold};
  color: ${tokens.color.positive};
`

const PrizeStat = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
`

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
  padding-top: ${tokens.spacing.lg};
  border-top: 1px solid ${tokens.color.border};
`

const StepList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
`

const Step = styled.div`
  display: flex;
  gap: ${tokens.spacing.md};
  align-items: flex-start;
`

const StepNumber = styled.div`
  width: 28px;
  height: 28px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.accent};
  color: ${tokens.color.surface};
  font-weight: ${tokens.font.weight.bold};
  font-size: ${tokens.font.size.base};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const StepText = styled.p`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.text};
  margin: 0;
  line-height: 1.5;
  padding-top: 3px;
`

const WinnerCard = styled.div`
  border-radius: ${tokens.radius.lg};
  border: 1px solid ${tokens.color.border};
  padding: ${tokens.spacing.xl} ${tokens.spacing['2xl']};
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
  background: ${tokens.color.surface};
`

const WinnerInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const WinnerLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${tokens.color.textMuted};
`

const WinnerAddress = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.text};
`

const WinnerPrize = styled.span`
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.positive};
`

const LoadingWrap = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
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
  border: 1px dashed ${tokens.color.border};
  color: ${tokens.color.textMuted};
  font-size: ${tokens.font.size.md};
  line-height: 1.6;
  gap: ${tokens.spacing.sm};
`

const EmptyIcon = styled.span`
  font-size: ${tokens.font.size['4xl']};
  opacity: 0.6;
`

const HOW_IT_WORKS_STEPS = [
  'Small balances that fall below the minimum payout threshold are pooled together into a lottery.',
  'At the end of each round, a verifiable random draw selects a winner from the pool.',
  'The winner receives the entire pooled amount — giving small holders a real shot at meaningful rewards.',
]

export function LotteryPage() {
  const { data, loading, error, execute } = useLottery()

  if (loading) {
    return (
      <Page>
        <LoadingWrap>
          <Spinner />
        </LoadingWrap>
      </Page>
    )
  }

  if (error) {
    return (
      <Page>
        <Hero>
          <Typography
            fontVariant="label"
            color="blue"
            weight="bold"
            style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
          >
            Lottery
          </Typography>
          <div style={{ marginTop: 12 }}>
            <ThorinHeading level="1" responsive>
              Small balance? You still have a shot.
            </ThorinHeading>
          </div>
        </Hero>
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
        <Section>
          <ThorinHeading level="2">How the draw works</ThorinHeading>
          <StepList>
            {HOW_IT_WORKS_STEPS.map((text, i) => (
              <Step key={i}>
                <StepNumber>{i + 1}</StepNumber>
                <StepText>{text}</StepText>
              </Step>
            ))}
          </StepList>
        </Section>
      </Page>
    )
  }

  // No completed rounds yet — show explainer instead of breaking
  if (!data) {
    return (
      <Page>
        <Hero>
          <Eyebrow>Lottery</Eyebrow>
          <HeroTitle>Small balance? You still have a shot.</HeroTitle>
        </Hero>
        <EmptyState>
          <EmptyIcon aria-hidden>🎲</EmptyIcon>
          <p>No rounds have been completed yet.</p>
          <p>Lottery results will appear here after the first round ends.</p>
        </EmptyState>
        <Section>
          <SectionHeading>How the draw works</SectionHeading>
          <StepList>
            {HOW_IT_WORKS_STEPS.map((text, i) => (
              <Step key={i}>
                <StepNumber>{i + 1}</StepNumber>
                <StepText>{text}</StepText>
              </Step>
            ))}
          </StepList>
        </Section>
      </Page>
    )
  }

  const pool = data.lotteryPools[0]
  const entryCount = pool?.entries.length ?? 0
  const poolCount = data.lotteryPools.length

  return (
    <Page>
      <Hero>
        <Eyebrow>Lottery</Eyebrow>
        <HeroTitle>Small balance? You still have a shot.</HeroTitle>
      </Hero>

      {pool && (
        <QualifyCard>
          <QualifyTitle>You qualify for the lottery</QualifyTitle>
          <QualifyDetail>
            {entryCount} qualifying addresses · {poolCount} active pool
            {poolCount !== 1 ? 's' : ''}
          </QualifyDetail>
        </QualifyCard>
      )}

      <PrizeCard>
        <TrophyIcon aria-hidden>🏆</TrophyIcon>
        <PrizeLabel>Prize Per Pool</PrizeLabel>
        <PrizeAmount>{pool?.totalPrizeEns ?? '10'} ENS</PrizeAmount>
        <PrizeStat>
          {entryCount} qualifying addresses · {poolCount} active pool
          {poolCount !== 1 ? 's' : ''}
        </PrizeStat>
      </PrizeCard>

      <Section>
        <SectionHeading>How the draw works</SectionHeading>
        <StepList>
          {HOW_IT_WORKS_STEPS.map((text, i) => (
            <Step key={i}>
              <StepNumber>{i + 1}</StepNumber>
              <StepText>{text}</StepText>
            </Step>
          ))}
        </StepList>
      </Section>

      {pool?.winner && (
        <Section>
          <SectionHeading>Last Winner</SectionHeading>
          <WinnerCard>
            <EnsAvatar address={pool.winner} size={40} />
            <WinnerInfo>
              <WinnerLabel>Winner</WinnerLabel>
              <WinnerAddress>{truncateAddress(pool.winner)}</WinnerAddress>
            </WinnerInfo>
            <WinnerPrize>{pool.totalPrizeEns} ENS</WinnerPrize>
          </WinnerCard>
        </Section>
      )}
    </Page>
  )
}
