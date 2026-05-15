import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { Link } from 'react-router-dom'
import { tokens } from '@/styles/tokens'
import { ProcessSteps, type ProcessStep } from '@/components/shared/ProcessSteps'

const Section = styled.section`
  padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl};
  background: ${tokens.color.surfaceAlt};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['7xl']} ${tokens.spacing['4xl']};
  }
`

const Inner = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
`

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
  margin-bottom: ${tokens.spacing['4xl']};
`

const Eyebrow = styled.span`
  display: block;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkGray};
`

const Heading = styled.h2`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.darkBlue};
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 0;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['5xl']};
  }
`

const Description = styled.p`
  font-size: ${tokens.font.size.lg};
  line-height: 1.5;
  color: ${tokens.color.darkGray};
  margin: 0;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size.xl};
  }
`

const CtaRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
  margin-top: ${tokens.spacing['2xl']};

  a {
    text-decoration: none;
    display: block;

    button {
      width: 100%;
      justify-content: center;
    }
  }

  @media (min-width: 768px) {
    flex-direction: row;

    a {
      display: inline-flex;

      button {
        width: auto;
      }
    }
  }
`

const steps: ProcessStep[] = [
  {
    title: 'Pick a voter',
    desc: 'Browse active delegates on the Voters page. You keep your tokens.',
  },
  {
    title: 'Sit back',
    desc: 'Gas is on us; rewards auto-credited. Your share grows with the 180-day average.',
  },
  {
    title: 'Earn monthly',
    desc: 'Shares ≥1 ENS sent directly at round close; smaller shares pool into a 10 ENS lottery.',
  },
]

export function HowItWorksSection() {
  return (
    <Section id="how-it-works">
      <Inner>
        <Header>
          <Eyebrow>How it works</Eyebrow>
          <Heading>
            Simple to join. <br />
            Better when more people do.
          </Heading>
          <Description>
            ENS governance is only as strong as its participation. This program makes it worth your while.
          </Description>
        </Header>

        <ProcessSteps steps={steps} />

        <CtaRow>
          <Link to="/rounds">
            <Button colorStyle="bluePrimary">Round breakdown &rarr;</Button>
          </Link>
          <Link to="/lottery">
            <Button colorStyle="blueSecondary">Check lottery status</Button>
          </Link>
        </CtaRow>
      </Inner>
    </Section>
  )
}
