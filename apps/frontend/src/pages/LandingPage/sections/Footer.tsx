import styled from 'styled-components'
import { Link } from 'react-router-dom'
import { EnsSVG } from '@ensdomains/thorin'
import { tokens } from '@/styles/tokens'

const FooterEl = styled.footer`
  background: ${tokens.color.bgSubtle};
  border-top: 1px solid ${tokens.color.borderLight};
  padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['5xl']} ${tokens.spacing['4xl']};
  }
`

const Inner = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
`

const Top = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`

const BrandCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
`

const LogoRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
`

const BrandName = styled.span`
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

const Tagline = styled.span`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkGray};
  line-height: 1.5;
`

const Nav = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.spacing.sm} ${tokens.spacing.xl};
`

const NavLink = styled(Link)`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkGray};
  text-decoration: none;

  &:hover {
    color: ${tokens.color.darkBlue};
  }
`

const ExternalLink = styled.a`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.blue};
  text-decoration: none;

  &:hover {
    opacity: 0.8;
  }
`

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background: ${tokens.color.borderLight};
`

const Bottom = styled.div`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.textSubtle};
  text-align: center;
`

export function Footer() {
  return (
    <FooterEl>
      <Inner>
        <Top>
          <BrandCol>
            <LogoRow>
              <EnsSVG width={24} height={24} />
              <BrandName>Incentives Pilot v1</BrandName>
            </LogoRow>
            <Tagline>A security campaign for safer ENS governance</Tagline>
          </BrandCol>

          <Nav>
            <NavLink to="/#how-it-works">How It Works</NavLink>
            <NavLink to="/delegates">Active Delegates</NavLink>
            <NavLink to="/rounds">Rounds</NavLink>
            <NavLink to="/lottery">Lottery</NavLink>
            <NavLink to="/transparency">Verify Data</NavLink>
            <ExternalLink href="https://discuss.ens.domains" target="_blank" rel="noopener noreferrer">
              ENS Forum ↗
            </ExternalLink>
            <ExternalLink href="https://github.com/blockful-io" target="_blank" rel="noopener noreferrer">
              GitHub ↗
            </ExternalLink>
          </Nav>
        </Top>

        <Divider />

        <Bottom>
          Built by{' '}
          <ExternalLink href="https://blockful.io/" target="_blank" rel="noopener noreferrer">Blockful</ExternalLink>
          {' · '}Powered by{' '}
          <ExternalLink href="https://anticapture.com/" target="_blank" rel="noopener noreferrer">Anticapture</ExternalLink>
        </Bottom>
      </Inner>
    </FooterEl>
  )
}
