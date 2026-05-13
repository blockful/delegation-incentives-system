import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { Link } from 'react-router-dom'
import { tokens } from '@/styles/tokens'

const RouterLink = styled(Link)<{ $fullWidthMobile?: boolean }>`
  text-decoration: none;

  ${({ $fullWidthMobile }) =>
    $fullWidthMobile &&
    `
    @media (max-width: 767px) {
      display: block;
      width: 100%;

      button {
        width: 100%;
        justify-content: center;
      }
    }
  `}
`

const Section = styled.section`
  background: ${tokens.color.darkBlue};
  padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['7xl']} ${tokens.spacing['4xl']};
  }
`

const Inner = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing['4xl']};
`

const Heading = styled.h2`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.white};
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 0;
  white-space: pre-line;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['5xl']};
  }
`

const Subtitle = styled.p`
  font-size: ${tokens.font.size.lg};
  color: ${tokens.color.middleGray};
  line-height: 1.6;
  margin: 0;
  white-space: pre-line;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size.xl};
  }
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
  width: 100%;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: center;
    width: auto;
  }
`

export function CtaSection() {
  return (
    <Section data-testid="cta-section">
      <Inner>
        <Heading>
          {'Earn ENS rewards.\nStrengthen governance.'}
        </Heading>
        <Subtitle>
          {'Delegate in under a minute.\nGas is sponsored. Rewards are automatic.'}
        </Subtitle>
        <Actions>
          <RouterLink to="/voters" $fullWidthMobile>
            <Button colorStyle="bluePrimary">
              Delegate to an Active Voter &rarr;
            </Button>
          </RouterLink>
          <RouterLink to="/rounds" $fullWidthMobile>
            <Button colorStyle="blueSecondary">
              View Live Round Progress
            </Button>
          </RouterLink>
        </Actions>
      </Inner>
    </Section>
  )
}
