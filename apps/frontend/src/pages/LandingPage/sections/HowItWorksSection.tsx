import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { Link } from 'react-router-dom'

const RouterLink = styled(Link)`
  text-decoration: none;
`

const Section = styled.section`
  padding: 48px 20px;
  background: #f7f9fc;

  @media (min-width: 768px) {
    padding: 80px 40px;
  }
`

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`

const Eyebrow = styled.p`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #7a7a85;
  margin: 0 0 12px;
`

const Heading = styled.h2`
  font-size: 28px;
  font-weight: 800;
  line-height: 1.15;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 12px;

  @media (min-width: 768px) {
    font-size: 36px;
  }
`

const Subtitle = styled.p`
  font-size: 15px;
  line-height: 1.6;
  color: #7a7a85;
  margin: 0 0 36px;
  max-width: 520px;
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
  border: 1px solid #e8e8ed;
  border-radius: 16px;
  padding: 24px;
  position: relative;
`

const CardIcon = styled.div<{ $bg: string }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ $bg }) => $bg};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-bottom: 16px;
`

const StepNumber = styled.span`
  position: absolute;
  top: 20px;
  right: 24px;
  font-size: 28px;
  font-weight: 700;
  color: #e8e8ed;
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
  color: #7a7a85;
  margin: 0 0 16px;
`

const CardTag = styled.span<{ $color: string; $bg: string }>`
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: ${({ $color }) => $color};
  background: ${({ $bg }) => $bg};
  padding: 4px 10px;
  border-radius: 6px;
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
    icon: '\u270D\uFE0F',
    bg: '#e8f5e9',
    number: '1',
    title: 'Delegate to an active voter',
    desc: 'Pick a delegate who consistently votes on ENS proposals. You keep your tokens.',
    tag: 'Gas sponsored \u2014 free to delegate',
    tagColor: '#1a6b3c',
    tagBg: '#e8f5e9',
  },
  {
    icon: '\uD83D\uDCC8',
    bg: '#fff3e0',
    number: '2',
    title: 'Your share grows with time',
    desc: 'Rewards are based on your average ENS balance over the last 180 days \u2014 not just your current balance. Longer holding means a bigger share.',
    tag: 'No claiming needed \u2014 sent to your wallet',
    tagColor: '#c77700',
    tagBg: '#fff3e0',
  },
  {
    icon: '\uD83D\uDCB0',
    bg: '#fff3e0',
    number: '3a',
    title: 'Receive ENS at round end',
    desc: "If your share is 1 ENS or more, it's sent directly to your wallet at the end of each monthly round.",
    tag: 'Currently earning ~5.75% APY',
    tagColor: '#c77700',
    tagBg: '#fff3e0',
  },
  {
    icon: '\uD83C\uDFC6',
    bg: '#fce4ec',
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
        <Eyebrow>How It Works</Eyebrow>
        <Heading>
          Simple to join. Better when more people do.
        </Heading>
        <Subtitle>
          ENS governance is only as strong as its participation. This program
          makes it worth your while.
        </Subtitle>

        <Cards>
          {steps.map((step) => (
            <Card key={step.number}>
              <CardIcon $bg={step.bg}>{step.icon}</CardIcon>
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
