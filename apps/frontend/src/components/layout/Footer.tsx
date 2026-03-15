import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { EnsSVG } from '@ensdomains/thorin'
import { tokens } from '@/styles/tokens'

const StyledFooter = styled.footer`
  border-top: 1px solid ${tokens.color.border};
  padding: ${tokens.spacing['3xl']} ${tokens.spacing['2xl']};
  background: ${tokens.color.surfaceAlt};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['4xl']} ${tokens.spacing['4xl']};
  }
`

const Inner = styled.div`
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};
`

const Top = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: ${tokens.spacing.lg};
`

const BrandBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const BrandRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
`

const BrandText = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

const BrandSub = styled.span`
  font-family: ${tokens.font.serif};
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.textMuted};
`

const Nav = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.spacing.lg};
`

const FooterLink = styled(Link)`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.textMuted};
  text-decoration: none;

  &:hover {
    color: ${tokens.color.darkBlue};
  }
`

const ExternalLink = styled.a`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.textMuted};
  text-decoration: none;

  &:hover {
    color: ${tokens.color.darkBlue};
  }
`

const BottomLine = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textFaint};
  text-align: center;
`

export function Footer() {
  return (
    <StyledFooter>
      <Inner>
        <Top>
          <BrandBlock>
            <BrandRow>
              <EnsSVG style={{ width: 20, height: 20 }} />
              <BrandText>Incentives Program</BrandText>
            </BrandRow>
            <BrandSub>A security campaign for safer ENS governance</BrandSub>
          </BrandBlock>
          <Nav>
            <FooterLink to="/">How It Works</FooterLink>
            <FooterLink to="/delegates">Delegates</FooterLink>
            <FooterLink to="/rounds">Rounds</FooterLink>
            <FooterLink to="/lottery">Lottery</FooterLink>
            <FooterLink to="/transparency">Verify</FooterLink>
            <ExternalLink
              href="https://discuss.ens.domains"
              target="_blank"
              rel="noopener noreferrer"
            >
              Forum &#8599;
            </ExternalLink>
            <ExternalLink
              href="https://github.com/blockful-io"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub &#8599;
            </ExternalLink>
          </Nav>
        </Top>
        <BottomLine>
          Built by Blockful &middot; Powered by Anticapture
        </BottomLine>
      </Inner>
    </StyledFooter>
  )
}
