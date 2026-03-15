import styled from 'styled-components'
import { Spinner } from '@ensdomains/thorin'
import { useLottery } from '@/features/lottery/useLottery'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { truncateAddress } from '@/utils/format'

const Page = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  gap: 32px;
`

const Hero = styled.div`
  background: linear-gradient(135deg, #CEE1E8 0%, #dce8f9 100%);
  border-radius: 20px;
  padding: 32px 24px;
  text-align: center;
`

const HeroLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #0080BC;
`

const HeroHeading = styled.h1`
  font-size: 28px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
  margin: 12px 0 0;
  line-height: 1.2;

  @media (min-width: 768px) {
    font-size: 36px;
  }
`

const QualifyCard = styled.div`
  background: #e8f5e9;
  border-radius: 16px;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const QualifyTitle = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: #2e7d32;
`

const QualifyDetail = styled.span`
  font-size: 13px;
  color: #4a7c4e;
`

const PrizeCard = styled.div`
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: ${({ theme }) => theme.colors.background};
`

const TrophyIcon = styled.span`
  font-size: 40px;
`

const PrizeLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const PrizeAmount = styled.span`
  font-size: 36px;
  font-weight: 800;
  color: #007C23;
`

const PrizeStat = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`

const StepList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const Step = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
`

const StepNumber = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #0080BC;
  color: white;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const StepText = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  line-height: 1.5;
  padding-top: 3px;
`

const WinnerCard = styled.div`
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: ${({ theme }) => theme.colors.background};
`

const WinnerInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const WinnerLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const WinnerAddress = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`

const WinnerPrize = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: #007C23;
`

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
`

const ErrorMessage = styled.p`
  text-align: center;
  padding: 64px 20px;
  color: #c62828;
  font-size: 16px;
`

const HOW_IT_WORKS_STEPS = [
  'Small balances that fall below the minimum payout threshold are pooled together into a lottery.',
  'At the end of each round, a verifiable random draw selects a winner from the pool.',
  'The winner receives the entire pooled amount — giving small holders a real shot at meaningful rewards.',
]

export function LotteryPage() {
  const { data, loading, error } = useLottery()

  if (loading) {
    return (
      <Page>
        <LoadingWrapper>
          <Spinner />
        </LoadingWrapper>
      </Page>
    )
  }

  if (error) {
    return (
      <Page>
        <ErrorMessage>Failed to load lottery data: {error}</ErrorMessage>
      </Page>
    )
  }

  const pool = data?.lotteryPools[0]
  const entryCount = pool?.entries.length ?? 0
  const poolCount = data?.lotteryPools.length ?? 0

  return (
    <Page>
      <Hero>
        <HeroLabel>Lottery</HeroLabel>
        <HeroHeading>Small balance? You still have a shot.</HeroHeading>
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
        <SectionTitle>How the draw works</SectionTitle>
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
          <SectionTitle>Last Winner</SectionTitle>
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
