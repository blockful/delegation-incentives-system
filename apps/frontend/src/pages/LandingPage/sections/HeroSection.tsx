import styled, { keyframes } from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { RouterLink } from '@/styles'
import { tokens } from '@/styles/tokens'

interface HeroSectionProps {
  currentApyPct: string
}

const Section = styled.section`
  background: ${tokens.color.darkBlue};
  padding: 72px ${tokens.spacing.xl} ${tokens.spacing['6xl']};
  text-align: center;
  position: relative;
  overflow: hidden;

  @media (min-width: 768px) {
    padding: 100px ${tokens.spacing['4xl']} ${tokens.spacing['7xl']};
  }
`

const Eyebrow = styled.span`
  display: inline-block;
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: ${tokens.color.accent};
  margin-bottom: ${tokens.spacing['2xl']};
`

const Headline = styled.h1`
  font-size: 32px;
  font-weight: ${tokens.font.weight.extrabold};
  color: ${tokens.color.surface};
  line-height: 1.15;
  margin: 0 auto ${tokens.spacing.lg};
  max-width: 640px;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['5xl']};
  }
`

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
`

const ApyValue = styled.span`
  display: inline-block;
  color: ${tokens.color.accent};
  animation: ${pulse} 3s ease-in-out infinite;
`

const Subtitle = styled.p`
  font-family: ${tokens.font.serif};
  font-size: ${tokens.font.size.xl};
  line-height: 1.6;
  color: ${tokens.color.lightBlue};
  max-width: 440px;
  margin: 0 auto ${tokens.spacing['4xl']};
  opacity: 0.8;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['2xl']};
  }
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
  max-width: 360px;
  margin: 0 auto;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: center;
  }
`

export function HeroSection({ currentApyPct }: HeroSectionProps) {
  return (
    <Section>
      <Eyebrow>ENS Governance &middot; 90-Day Pilot</Eyebrow>
      <Headline>
        Your ENS could be earning{' '}
        <ApyValue>{currentApyPct}% APY</ApyValue>
      </Headline>
      <Subtitle>
        Delegate to an active voter. Earn rewards automatically.
        Gas is sponsored — it costs nothing.
      </Subtitle>
      <Actions>
        <RouterLink to="/delegates">
          <Button colorStyle="bluePrimary">
            Delegate Now &rarr;
          </Button>
        </RouterLink>
        <RouterLink to="/rounds">
          <Button colorStyle="blueSecondary">
            View Rounds
          </Button>
        </RouterLink>
      </Actions>
    </Section>
  )
}
