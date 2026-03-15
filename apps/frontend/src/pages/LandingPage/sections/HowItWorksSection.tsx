import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { RouterLink } from '@/styles'
import { tokens } from '@/styles/tokens'

const Section = styled.section`
  padding: ${tokens.spacing['6xl']} ${tokens.spacing.xl};
  background: ${tokens.color.surfaceAlt};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['8xl']} ${tokens.spacing['4xl']};
  }
`

const Inner = styled.div`
  max-width: 1120px;
  margin: 0 auto;
`

const Eyebrow = styled.span`
  display: block;
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: ${tokens.color.accent};
  margin-bottom: ${tokens.spacing.lg};
`

const Heading = styled.h2`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.extrabold};
  color: ${tokens.color.darkBlue};
  line-height: 1.2;
  margin: 0 0 ${tokens.spacing['5xl']};

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['4xl']};
    margin-bottom: 56px;
  }
`

const Steps = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing['2xl']};
  margin-bottom: ${tokens.spacing['5xl']};

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
    gap: ${tokens.spacing['3xl']};
  }
`

const Step = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
`

const StepNumber = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.accent};
  letter-spacing: 0.1em;
`

const StepTitle = styled.h3`
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  margin: 0;
  line-height: 1.3;
`

const StepDesc = styled.p`
  font-family: ${tokens.font.serif};
  font-size: ${tokens.font.size.lg};
  line-height: 1.55;
  color: ${tokens.color.textMuted};
  margin: 0;
`

const StepTag = styled.span`
  display: inline-block;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.midnightBlue};
  background: ${tokens.color.lightBlue};
  padding: ${tokens.spacing.xs} 10px;
  border-radius: 6px;
  align-self: flex-start;
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};

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
