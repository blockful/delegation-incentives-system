import styled from 'styled-components'
import { Button, CheckSVG, Heading as ThorinHeading, Typography } from '@ensdomains/thorin'
import { Link } from 'react-router-dom'

const RouterLink = styled(Link)`
  text-decoration: none;
`

const Section = styled.section`
  background: #011A25;
  padding: 64px 20px;
  text-align: center;

  @media (min-width: 768px) {
    padding: 96px 40px;
  }
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
  margin: 0 auto 40px;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: center;
    max-width: 500px;
  }
`

const Checks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  max-width: 400px;
  margin: 0 auto;

  @media (min-width: 768px) {
    flex-direction: row;
    gap: 24px;
    max-width: none;
    justify-content: center;
  }
`

const Check = styled.span`
  font-size: 14px;
  color: #a0a0ab;
  display: flex;
  align-items: center;
  gap: 8px;
`

const CheckMark = styled.span`
  display: flex;
  align-items: center;
  color: #007C23;

  svg {
    width: 16px;
    height: 16px;
  }
`

const checkItems = [
  'Gas sponsored via delegateBySig',
  'No tokens locked \u2014 delegate anytime',
  'Rewards sent automatically',
]

export function CtaSection() {
  return (
    <Section data-testid="cta-section">
      <div style={{ margin: '0 0 16px' }}>
        <ThorinHeading level="2" responsive style={{ color: '#fff' }}>
          Earn ENS rewards.
          <br />
          Strengthen governance.
        </ThorinHeading>
      </div>
      <div style={{ margin: '0 auto 32px', maxWidth: '420px' }}>
        <Typography fontVariant="body" style={{ color: '#a0a0ab' }}>
          Delegate in under a minute. Gas is sponsored. Rewards are automatic.
        </Typography>
      </div>
      <Actions>
        <RouterLink to="/delegates">
          <Button colorStyle="bluePrimary">
            Delegate to an Active Delegate &rarr;
          </Button>
        </RouterLink>
        <RouterLink to="/rounds">
          <Button colorStyle="blueSecondary">
            View Live Round Progress
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
