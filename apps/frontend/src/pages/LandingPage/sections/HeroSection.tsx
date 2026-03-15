import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { Link } from 'react-router-dom'

const RouterLink = styled(Link)`
  text-decoration: none;
`

interface HeroSectionProps {
  currentApyPct: string
}

const Section = styled.section`
  background: linear-gradient(180deg, #CEE1E8 0%, #f6f6f6 100%);
  padding: 48px 20px 40px;
  text-align: center;

  @media (min-width: 768px) {
    padding: 80px 40px 64px;
  }
`

const Label = styled.p`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #4A5C63;
  margin: 0 0 16px;
`

const Heading = styled.h1`
  font-size: 32px;
  font-weight: 800;
  line-height: 1.15;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 20px;

  @media (min-width: 768px) {
    font-size: 48px;
  }
`

const ApyHighlight = styled.span`
  display: inline-block;
  background: #0080BC;
  color: #fff;
  padding: 2px 12px;
  border-radius: 8px;
  font-weight: 800;
`

const Subtitle = styled.p`
  font-size: 16px;
  line-height: 1.5;
  color: #4A5C63;
  margin: 0 auto 32px;
  max-width: 480px;

  @media (min-width: 768px) {
    font-size: 18px;
  }
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
  margin: 0 auto;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: center;
  }
`

export function HeroSection({ currentApyPct }: HeroSectionProps) {
  return (
    <Section>
      <Label>ENS Governance &middot; 90-Day Pilot</Label>
      <Heading>
        Your ENS is sitting idle. It could be earning{' '}
        <ApyHighlight>{currentApyPct}% APY</ApyHighlight>
      </Heading>
      <Subtitle>
        Help secure ENS governance by delegating to an active voter. Rewards are
        automatic, gas is sponsored.
      </Subtitle>
      <Actions>
        <RouterLink to="/delegates">
          <Button colorStyle="bluePrimary">
            Delegate Now &rarr; Free
          </Button>
        </RouterLink>
        <RouterLink to="#">
          <Button colorStyle="blueSecondary">
            Share this initiative
          </Button>
        </RouterLink>
      </Actions>
    </Section>
  )
}
