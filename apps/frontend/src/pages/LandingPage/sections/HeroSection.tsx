import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { Link } from 'react-router-dom'

interface HeroSectionProps {
  currentApyPct: string
}

const Section = styled.section`
  background: linear-gradient(180deg, #e8f0fe 0%, #f7f9fc 100%);
  padding: 48px 20px 40px;
  text-align: center;

  @media (min-width: 768px) {
    padding: 80px 40px 60px;
  }
`

const Label = styled.p`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #7a7a85;
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
  background: #3889ff;
  color: #fff;
  padding: 2px 12px;
  border-radius: 8px;
  font-weight: 800;
`

const Subtitle = styled.p`
  font-size: 16px;
  line-height: 1.5;
  color: #7a7a85;
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
        <Button as="a" href="/delegates" colorStyle="bluePrimary">
          Delegate Now &rarr; Free
        </Button>
        <Button as="a" href="#" colorStyle="blueSecondary">
          Share this initiative
        </Button>
      </Actions>
    </Section>
  )
}
