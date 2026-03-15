import styled from 'styled-components'
import { Button, Heading as ThorinHeading, Typography } from '@ensdomains/thorin'
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

const ApyHighlight = styled.span`
  display: inline-block;
  background: #0080BC;
  color: #fff;
  padding: 2px 12px;
  border-radius: 8px;
  font-weight: 800;
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
      <div style={{ margin: '0 0 16px' }}>
        <Typography
          fontVariant="label"
          color="grey"
          weight="bold"
          style={{ textTransform: 'uppercase', letterSpacing: '1.5px' }}
        >
          ENS Governance &middot; 90-Day Pilot
        </Typography>
      </div>
      <div style={{ margin: '0 0 20px' }}>
        <ThorinHeading level="1" responsive>
          Your ENS is sitting idle. It could be earning{' '}
          <ApyHighlight>{currentApyPct}% APY</ApyHighlight>
        </ThorinHeading>
      </div>
      <div style={{ margin: '0 auto 32px', maxWidth: '480px' }}>
        <Typography fontVariant="large" color="textSecondary">
          Help secure ENS governance by delegating to an active voter. Rewards are
          automatic, gas is sponsored.
        </Typography>
      </div>
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
