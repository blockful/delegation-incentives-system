import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { EnsSVG } from '@ensdomains/thorin'

const StyledFooter = styled.footer`
  border-top: 1px solid #E5E5E5;
  padding: 32px 24px;
  background: #f6f6f6;

  @media (min-width: 768px) {
    padding: 40px 40px;
  }
`

const Inner = styled.div`
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const Top = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
`

const BrandBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const BrandRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const BrandText = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #011A25;
`

const BrandSub = styled.span`
  font-family: 'EB Garamond', 'Georgia', serif;
  font-size: 14px;
  color: #4A5C63;
`

const Nav = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
`

const FooterLink = styled(Link)`
  font-size: 13px;
  color: #4A5C63;
  text-decoration: none;

  &:hover {
    color: #011A25;
  }
`

const ExternalLink = styled.a`
  font-size: 13px;
  color: #4A5C63;
  text-decoration: none;

  &:hover {
    color: #011A25;
  }
`

const BottomLine = styled.span`
  font-size: 12px;
  color: #C4C7C8;
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
