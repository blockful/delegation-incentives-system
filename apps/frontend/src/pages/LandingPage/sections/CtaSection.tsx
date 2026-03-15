import styled from 'styled-components'
import { Button, CheckSVG } from '@ensdomains/thorin'
import { Link } from 'react-router-dom'

const RouterLink = styled(Link)`
  text-decoration: none;
`

const Section = styled.section`
  background: #011A25;
  padding: 80px 20px;
  text-align: center;

  @media (min-width: 768px) {
    padding: 120px 40px;
  }
`

const Heading = styled.h2`
  font-size: 32px;
  font-weight: 800;
  color: #fff;
  line-height: 1.15;
  margin: 0 auto 16px;
  max-width: 500px;

  @media (min-width: 768px) {
    font-size: 44px;
  }
`

const Subtitle = styled.p`
  font-family: 'EB Garamond', 'Georgia', serif;
  font-size: 19px;
  color: #CEE1E8;
  opacity: 0.7;
  margin: 0 auto 40px;
  max-width: 400px;
  line-height: 1.5;
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 420px;
  margin: 0 auto 48px;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: center;
  }
`

const Checks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;

  @media (min-width: 768px) {
    flex-direction: row;
    gap: 24px;
    justify-content: center;
  }
`

const Check = styled.span`
  font-size: 13px;
  color: #CEE1E8;
  opacity: 0.6;
  display: flex;
  align-items: center;
  gap: 6px;
`

const CheckMark = styled.span`
  display: flex;
  align-items: center;
  color: #007C23;

  svg {
    width: 14px;
    height: 14px;
  }
`

const checkItems = [
  'Gas sponsored',
  'No tokens locked',
  'Rewards auto-sent',
]

export function CtaSection() {
  return (
    <Section data-testid="cta-section">
      <Heading>
        Earn ENS rewards.<br />
        Strengthen governance.
      </Heading>
      <Subtitle>
        Delegate in under a minute. Gas is sponsored. Rewards are automatic.
      </Subtitle>
      <Actions>
        <RouterLink to="/delegates">
          <Button colorStyle="bluePrimary">
            Delegate Now &rarr;
          </Button>
        </RouterLink>
        <RouterLink to="/rounds">
          <Button colorStyle="blueSecondary">
            View Round Progress
          </Button>
        </RouterLink>
      </Actions>
      <Checks>
        {checkItems.map((item) => (
          <Check key={item}>
            <CheckMark><CheckSVG /></CheckMark>
            {item}
          </Check>
        ))}
      </Checks>
    </Section>
  )
}
