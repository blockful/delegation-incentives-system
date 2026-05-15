import styled, { css, keyframes } from 'styled-components'
import { Button, EnsSVG } from '@ensdomains/thorin'
import { Link } from 'react-router-dom'
import { tokens } from '@/styles/tokens'
import { fadeInUp } from '@/styles/primitives'
import { LiveDot } from '@/components/shared/LiveDot'
import { formatTimeLeft } from '@/utils/format'

const RouterLink = styled(Link)`
  text-decoration: none;

  @media (max-width: 767px) {
    width: 100%;
    display: block;

    button {
      width: 100%;
      justify-content: center;
    }
  }
`

const AnchorLink = styled.a`
  text-decoration: none;

  @media (max-width: 767px) {
    width: 100%;
    display: block;

    button {
      width: 100%;
      justify-content: center;
    }
  }
`

interface HeroSectionProps {
  currentAprPct: string
  roundNumber?: number
  roundEndDate?: string
}

const Section = styled.section`
  padding: ${tokens.spacing['5xl']} ${tokens.spacing.xl};
  text-align: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(
    to bottom,
    ${tokens.color.lightBlue},
    ${tokens.color.white}
  );
  border-bottom: 1px solid ${tokens.color.borderLight};

  @media (min-width: 768px) {
    padding: 100px ${tokens.spacing['4xl']} ${tokens.spacing['9xl']};
  }
`

const Content = styled.div`
  position: relative;
  z-index: 1;
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
`

const HeroEyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkGray};
  margin-bottom: ${tokens.spacing['2xl']};
  animation: ${fadeInUp} 0.5s ease both;
`

const Headline = styled.h1`
  font-size: ${tokens.font.size['4xl']};
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.darkBlue};
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin: 0 auto ${tokens.spacing.lg};
  max-width: 720px;
  animation: ${fadeInUp} 0.5s ease 0.1s both;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['6xl']};
  }
`

const floatUp = keyframes`
  0%   { transform: translateY(0);      opacity: 0.35; }
  60%  {                                opacity: 0.12; }
  100% { transform: translateY(-110vh); opacity: 0; }
`

const ParticlesLayer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`

const Particle = styled.div<{
  $left: number
  $size: number
  $duration: number
  $delay: number
}>`
  position: absolute;
  bottom: -60px;
  left: ${({ $left }) => $left}%;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  opacity: 0;
  will-change: transform, opacity;
  animation: ${floatUp} ${({ $duration }) => $duration}s ease-in
    ${({ $delay }) => $delay}s infinite;

  svg {
    width: 100%;
    height: 100%;
    color: ${tokens.color.blue};
  }
`

const AprValue = styled.span`
  display: inline-block;
  color: ${tokens.color.blue};
  background: ${tokens.color.lightBlueOpacity};
  padding: ${tokens.spacing.xs} ${tokens.spacing.md};
  border-radius: ${tokens.radius.md};
`

const Subtitle = styled.p`
  font-size: ${tokens.font.size.xl};
  line-height: 1.6;
  color: ${tokens.color.darkGray};
  max-width: ${tokens.maxWidth.md};
  margin: 0 auto ${tokens.spacing['4xl']};
  animation: ${fadeInUp} 0.5s ease 0.2s both;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['2xl']};
  }
`

const FreeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(246, 248, 250, 0.2);
  border: 1px solid rgba(208, 215, 222, 0.2);
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
  color: white;
  margin-left: ${tokens.spacing.sm};
  vertical-align: middle;
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: ${tokens.spacing.md};
  margin: 0 auto ${tokens.spacing['5xl']};
  width: 100%;
  animation: ${fadeInUp} 0.5s ease 0.3s both;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: center;
    width: auto;
    align-items: center;
  }
`

// Fewer particles, more curated spacing — calmer feel.
const PARTICLE_CONFIGS = [
  { id: 0, left: 8, size: 22, duration: 14, delay: 0 },
  { id: 1, left: 22, size: 14, duration: 11, delay: 4 },
  { id: 2, left: 36, size: 28, duration: 16, delay: 8 },
  { id: 3, left: 52, size: 18, duration: 12, delay: 2 },
  { id: 4, left: 66, size: 24, duration: 15, delay: 6 },
  { id: 5, left: 78, size: 16, duration: 13, delay: 10 },
  { id: 6, left: 90, size: 20, duration: 10, delay: 3 },
]

function buildEyebrow(roundNumber?: number, roundEndDate?: string): string {
  if (!roundNumber) return 'ENS Governance · Active program'
  if (!roundEndDate) return `Round ${roundNumber} · in progress`
  return `Round ${roundNumber} · ${formatTimeLeft(roundEndDate)}`
}

export function HeroSection({ currentAprPct, roundNumber, roundEndDate }: HeroSectionProps) {
  return (
    <Section>
      <ParticlesLayer aria-hidden>
        {PARTICLE_CONFIGS.map((p) => (
          <Particle
            key={p.id}
            $left={p.left}
            $size={p.size}
            $duration={p.duration}
            $delay={p.delay}
          >
            <EnsSVG />
          </Particle>
        ))}
      </ParticlesLayer>
      <Content>
        <HeroEyebrow>
          <LiveDot tone="success" size={8} />
          {buildEyebrow(roundNumber, roundEndDate)}
        </HeroEyebrow>
        <Headline>
          Earn <AprValue>{`${currentAprPct}% APR`}</AprValue> on your ENS,
          <br />
          automatically.
        </Headline>
        <Subtitle>Delegate to an active voter — gas is on us.</Subtitle>
        <Actions>
          <RouterLink to="/voters">
            <Button colorStyle="bluePrimary">
              Delegate now<FreeBadge>Free</FreeBadge>
            </Button>
          </RouterLink>
          <AnchorLink href="#how-it-works">
            <Button colorStyle="blueSecondary">See how it works ↓</Button>
          </AnchorLink>
        </Actions>
      </Content>
    </Section>
  )
}
