import styled, { keyframes } from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { Link } from 'react-router-dom'

const RouterLink = styled(Link)`
  text-decoration: none;
`

interface HeroSectionProps {
  currentApyPct: string
}

const Section = styled.section`
  background: #011A25;
  padding: 72px 20px 64px;
  text-align: center;
  position: relative;
  overflow: hidden;

  @media (min-width: 768px) {
    padding: 100px 40px 80px;
  }
`

const Eyebrow = styled.span`
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #0080BC;
  margin-bottom: 24px;
`

const Headline = styled.h1`
  font-size: 32px;
  font-weight: 800;
  color: #fff;
  line-height: 1.15;
  margin: 0 auto 16px;
  max-width: 640px;

  @media (min-width: 768px) {
    font-size: 48px;
  }
`

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
`

const ApyValue = styled.span`
  display: inline-block;
  color: #0080BC;
  animation: ${pulse} 3s ease-in-out infinite;
`

const Subtitle = styled.p`
  font-family: 'EB Garamond', 'Georgia', serif;
  font-size: 18px;
  line-height: 1.6;
  color: #CEE1E8;
  max-width: 440px;
  margin: 0 auto 40px;
  opacity: 0.8;

  @media (min-width: 768px) {
    font-size: 20px;
  }
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
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
