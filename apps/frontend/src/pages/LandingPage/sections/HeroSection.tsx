import styled, { keyframes } from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { Link } from 'react-router-dom'
import { tokens } from '@/styles/tokens'
import { fadeInUp } from '@/styles/primitives'

const RouterLink = styled(Link)`
  text-decoration: none;
`

interface HeroSectionProps {
  currentApyPct: string
}

const Section = styled.section`
  background: ${tokens.color.darkBlue};
  padding: 72px ${tokens.spacing.xl} ${tokens.spacing['6xl']};
  text-align: center;
  position: relative;
  overflow: hidden;

  /* Subtle radial glow behind the headline */
  &::before {
    content: '';
    position: absolute;
    top: 30%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    height: 400px;
    background: radial-gradient(
      ellipse at center,
      rgba(0, 128, 188, 0.12) 0%,
      transparent 70%
    );
    pointer-events: none;
  }

  @media (min-width: 768px) {
    padding: 100px ${tokens.spacing['4xl']} ${tokens.spacing['7xl']};
  }
`

const Content = styled.div`
  position: relative;
  z-index: 1;
`

const HeroEyebrow = styled.span`
  display: inline-block;
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: ${tokens.color.accent};
  margin-bottom: ${tokens.spacing['2xl']};
  animation: ${fadeInUp} 0.5s ease both;
`

const Headline = styled.h1`
  font-size: 32px;
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.surface};
  line-height: 1.15;
  margin: 0 auto ${tokens.spacing.lg};
  max-width: 640px;
  animation: ${fadeInUp} 0.5s ease 0.1s both;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['5xl']};
  }
`

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`

const ApyValue = styled.span`
  display: inline-block;
  background: linear-gradient(
    90deg,
    ${tokens.color.accent} 0%,
    #44B4E0 30%,
    ${tokens.color.accent} 60%,
    #44B4E0 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 4s linear infinite;
`

const Subtitle = styled.p`
  font-size: ${tokens.font.size.xl};
  line-height: 1.6;
  color: ${tokens.color.lightBlue};
  max-width: 440px;
  margin: 0 auto ${tokens.spacing['4xl']};
  opacity: 0.75;
  animation: ${fadeInUp} 0.5s ease 0.2s both;

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
  animation: ${fadeInUp} 0.5s ease 0.3s both;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: center;
  }
`

export function HeroSection({ currentApyPct }: HeroSectionProps) {
  return (
    <Section>
      <Content>
        <HeroEyebrow>ENS Governance &middot; 90-Day Pilot</HeroEyebrow>
        <Headline>
          Your ENS could be earning{' '}
          <ApyValue>{currentApyPct}% APY</ApyValue>
        </Headline>
        <Subtitle>
        Help secure ENS governance by delegating to an active voter.
        Rewards are automatic, gas is sponsored.
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
      </Content>
    </Section>
  )
}
