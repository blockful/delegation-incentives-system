import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { EnsSVG, Typography } from '@ensdomains/thorin'

const StyledFooter = styled.footer`
  border-top: 1px solid #E5E5E5;
  padding: 32px 24px;
  background: #fafafa;
`

const Inner = styled.div`
  max-width: 1200px;
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
    color: #0080BC;
  }
`

const ExternalLink = styled.a`
  font-size: 13px;
  color: #4A5C63;
  text-decoration: none;

  &:hover {
    color: #0080BC;
  }
`

export function Footer() {
  return (
    <StyledFooter>
      <Inner>
        <Top>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <EnsSVG style={{ width: 24, height: 24 }} />
              <Typography fontVariant="body" weight="bold">Incentives Program</Typography>
            </div>
            <Typography fontVariant="small" color="textTertiary">A security campaign for safer ENS governance</Typography>
          </div>
          <Nav>
            <FooterLink to="/">How It Works</FooterLink>
            <FooterLink to="/delegates">Active Delegates</FooterLink>
            <FooterLink to="/rounds">Rounds</FooterLink>
            <FooterLink to="/lottery">Lottery</FooterLink>
            <FooterLink to="/transparency">Verify Data</FooterLink>
            <ExternalLink
              href="https://discuss.ens.domains"
              target="_blank"
              rel="noopener noreferrer"
            >
              ENS Forum &#8599;
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
        <Typography fontVariant="small" color="textTertiary" style={{ textAlign: 'center' }}>
          Built by Blockful &middot; Powered by Anticapture
        </Typography>
      </Inner>
    </StyledFooter>
  )
}
