import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { Link } from 'react-router-dom'

const RouterLink = styled(Link)`
  text-decoration: none;
`

const Section = styled.section`
  padding: 64px 20px;
  background: #f6f6f6;

  @media (min-width: 768px) {
    padding: 96px 40px;
  }
`

const Inner = styled.div`
  max-width: 1120px;
  margin: 0 auto;
`

const Eyebrow = styled.span`
  display: block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #0080BC;
  margin-bottom: 16px;
`

const Heading = styled.h2`
  font-size: 28px;
  font-weight: 800;
  color: #011A25;
  line-height: 1.2;
  margin: 0 0 48px;

  @media (min-width: 768px) {
    font-size: 36px;
    margin-bottom: 56px;
  }
`

const Steps = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-bottom: 48px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
  }
`

const Step = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const StepNumber = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: #0080BC;
  letter-spacing: 0.1em;
`

const StepTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: #011A25;
  margin: 0;
  line-height: 1.3;
`

const StepDesc = styled.p`
  font-family: 'EB Garamond', 'Georgia', serif;
  font-size: 16px;
  line-height: 1.55;
  color: #4A5C63;
  margin: 0;
`

const StepTag = styled.span`
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: #093C52;
  background: #CEE1E8;
  padding: 4px 10px;
  border-radius: 6px;
  align-self: flex-start;
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (min-width: 768px) {
    flex-direction: row;
  }
`

const steps = [
  {
    number: 'STEP 01',
    title: 'Delegate to an active voter',
    desc: 'Pick a delegate who consistently votes on ENS proposals. You keep full custody of your tokens.',
    tag: 'Gas sponsored — free',
  },
  {
    number: 'STEP 02',
    title: 'Your share grows with time',
    desc: 'Rewards are based on your 180-day average ENS balance. Longer holding means a bigger share.',
    tag: 'No claiming needed',
  },
  {
    number: 'STEP 03',
    title: 'Receive ENS or enter the lottery',
    desc: 'Payouts above 1 ENS are sent directly to your wallet. Smaller amounts pool into a lottery for a bigger prize.',
    tag: 'Automatic payouts',
  },
]

export function HowItWorksSection() {
  return (
    <Section>
      <Inner>
        <Eyebrow>How It Works</Eyebrow>
        <Heading>Three steps to earn</Heading>

        <Steps>
          {steps.map((step) => (
            <Step key={step.number}>
              <StepNumber>{step.number}</StepNumber>
              <StepTitle>{step.title}</StepTitle>
              <StepDesc>{step.desc}</StepDesc>
              <StepTag>{step.tag}</StepTag>
            </Step>
          ))}
        </Steps>

        <Actions>
          <RouterLink to="/delegates">
            <Button colorStyle="bluePrimary">
              Browse Active Delegates &rarr;
            </Button>
          </RouterLink>
          <RouterLink to="/lottery">
            <Button colorStyle="blueSecondary">
              Lottery details
            </Button>
          </RouterLink>
        </Actions>
      </Inner>
    </Section>
  )
}
