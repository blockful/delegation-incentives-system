import styled from 'styled-components'
import { Button, CheckSVG } from '@ensdomains/thorin'
import { Link } from 'react-router-dom'
import { tokens } from '@/styles/tokens'

const RouterLink = styled(Link)`
  text-decoration: none;
`

const Section = styled.section`
  background: ${tokens.color.darkBlue};
  padding: ${tokens.spacing['7xl']} ${tokens.spacing.xl};
  text-align: center;

  @media (min-width: 768px) {
    padding: 120px ${tokens.spacing['4xl']};
  }
`

const Heading = styled.h2`
  font-size: ${tokens.spacing['3xl']};
  font-weight: ${tokens.font.weight.extrabold};
  color: ${tokens.color.surface};
  line-height: 1.15;
  margin: 0 auto ${tokens.spacing.lg};
  max-width: 500px;

  @media (min-width: 768px) {
    font-size: 44px;
  }
`

const Subtitle = styled.p`
  font-family: ${tokens.font.serif};
  font-size: 19px;
  color: ${tokens.color.lightBlue};
  opacity: 0.7;
  margin: 0 auto ${tokens.spacing['4xl']};
  max-width: 400px;
  line-height: 1.5;
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
  max-width: 420px;
  margin: 0 auto ${tokens.spacing['5xl']};

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: center;
  }
`

const Checks = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  align-items: center;

  @media (min-width: 768px) {
    flex-direction: row;
    gap: ${tokens.spacing['2xl']};
    justify-content: center;
  }
`

const Check = styled.span`
  font-size: 13px;
  color: ${tokens.color.lightBlue};
  opacity: 0.6;
  display: flex;
  align-items: center;
  gap: 6px;
`

const CheckMark = styled.span`
  display: flex;
  align-items: center;
  color: ${tokens.color.positive};

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
