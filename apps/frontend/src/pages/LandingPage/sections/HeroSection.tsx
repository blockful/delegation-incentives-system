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
  padding: ${tokens.spacing['7xl']} ${tokens.spacing.xl};
  text-align: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(
    to bottom,
    ${tokens.color.lightBlue},
    ${tokens.color.white}
  );
  border-bottom: 1px solid ${tokens.color.middleGray};

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
  display: inline-block;
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: ${tokens.color.darkGray};
  margin-bottom: ${tokens.spacing['2xl']};
  animation: ${fadeInUp} 0.5s ease both;
`

const Headline = styled.h1`
  font-size: ${tokens.font.size['4xl']};
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.darkBlue};
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 0 auto ${tokens.spacing.lg};
  max-width: 640px;
  animation: ${fadeInUp} 0.5s ease 0.1s both;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['6xl']};
  }
`

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`

const ApyValue = styled.span`
  display: inline-block;
  color: ${tokens.color.blue};
  background: ${tokens.color.lightBlueOpacity};
  padding:  ${tokens.spacing.xs} ${tokens.spacing.md};
  border-radius: ${tokens.radius.md};
`

const Subtitle = styled.p`
  font-size: ${tokens.font.size.xl};
  line-height: 1.6;
  color: ${tokens.color.darkGray};
  max-width: ${tokens.maxWidth.md};
  margin: 0 auto ${tokens.spacing['4xl']};
  opacity: 0.75;
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
  align-items: center;
  gap: ${tokens.spacing.md};
  margin: 0 auto ${tokens.spacing['5xl']};
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
              Delegate Now &rarr;<FreeBadge>Free</FreeBadge>
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
