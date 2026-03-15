import styled from 'styled-components'
import { Button, PersonPlusSVG, FlameSVG, EthSVG, HeartSVG, Heading as ThorinHeading, Typography } from '@ensdomains/thorin'
import { Link } from 'react-router-dom'

const RouterLink = styled(Link)`
  text-decoration: none;
`

const Section = styled.section`
  padding: 48px 20px;
  background: #f6f6f6;

  @media (min-width: 768px) {
    padding: 80px 40px;
  }
`

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`

const Cards = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (min-width: 768px) {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }
`

const Card = styled.div`
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 16px;
  padding: 24px;
  position: relative;
`

const CardIcon = styled.div<{ $bg: string; $color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${({ $bg }) => $bg};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: ${({ $color }) => $color};

  svg {
    width: 24px;
    height: 24px;
  }
`

const StepNumber = styled.span`
  position: absolute;
  top: 20px;
  right: 24px;
  font-size: 28px;
  font-weight: 700;
  color: #E5E5E5;
`

const CardTitle = styled.h3`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 8px;
`

const CardDesc = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: #4A5C63;
  margin: 0 0 16px;
`

const CardTag = styled.span<{ $color: string; $bg: string }>`
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: ${({ $color }) => $color};
  background: ${({ $bg }) => $bg};
  padding: 4px 10px;
  border-radius: 8px;
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 36px;

  @media (min-width: 768px) {
    flex-direction: row;
  }
`

const steps = [
  {
    Icon: PersonPlusSVG,
    bg: '#e8f5e9',
    iconColor: '#1a6b3c',
    number: '1',
    title: 'Delegate to an active voter',
    desc: 'Pick a delegate who consistently votes on ENS proposals. You keep your tokens.',
    tag: 'Gas sponsored \u2014 free to delegate',
    tagColor: '#1a6b3c',
    tagBg: '#e8f5e9',
  },
  {
    Icon: FlameSVG,
    bg: '#fff3e0',
    iconColor: '#c77700',
    number: '2',
    title: 'Your share grows with time',
    desc: 'Rewards are based on your average ENS balance over the last 180 days \u2014 not just your current balance. Longer holding means a bigger share.',
    tag: 'No claiming needed \u2014 sent to your wallet',
    tagColor: '#c77700',
    tagBg: '#fff3e0',
  },
  {
    Icon: EthSVG,
    bg: '#fff3e0',
    iconColor: '#c77700',
    number: '3a',
    title: 'Receive ENS at round end',
    desc: "If your share is 1 ENS or more, it's sent directly to your wallet at the end of each monthly round.",
    tag: 'Currently earning ~5.75% APY',
    tagColor: '#c77700',
    tagBg: '#fff3e0',
  },
  {
    Icon: HeartSVG,
    bg: '#fce4ec',
    iconColor: '#c62828',
    number: '3b',
    title: 'Small balance? Enter the lottery',
    desc: 'Payouts under 1 ENS pool together until they reach 10 ENS \u2014 one winner takes the full prize.',
    tag: 'Lottery prize: 10 ENS',
    tagColor: '#c62828',
    tagBg: '#fce4ec',
  },
]

export function HowItWorksSection() {
  return (
    <Section>
      <Inner>
        <div style={{ margin: '0 0 12px' }}>
          <Typography
            fontVariant="label"
            color="grey"
            weight="bold"
            style={{ textTransform: 'uppercase', letterSpacing: '1.5px' }}
          >
            How It Works
          </Typography>
        </div>
        <div style={{ margin: '0 0 12px' }}>
          <ThorinHeading level="2" responsive>
            Simple to join. Better when more people do.
          </ThorinHeading>
        </div>
        <div style={{ margin: '0 0 36px', maxWidth: '520px' }}>
          <Typography fontVariant="body" color="textSecondary">
            ENS governance is only as strong as its participation. This program
            makes it worth your while.
          </Typography>
        </div>

        <Cards>
          {steps.map((step) => (
            <Card key={step.number}>
              <CardIcon $bg={step.bg} $color={step.iconColor}><step.Icon /></CardIcon>
              <StepNumber>{step.number}</StepNumber>
              <CardTitle>{step.title}</CardTitle>
              <CardDesc>{step.desc}</CardDesc>
              <CardTag $color={step.tagColor} $bg={step.tagBg}>
                {step.tag}
              </CardTag>
            </Card>
          ))}
        </Cards>

        <Actions>
          <RouterLink to="/rounds">
            <Button colorStyle="bluePrimary">
              Round breakdown &rarr;
            </Button>
          </RouterLink>
          <RouterLink to="/lottery">
            <Button colorStyle="blueSecondary">
              Check lottery status
            </Button>
          </RouterLink>
        </Actions>
      </Inner>
    </Section>
  )
}
