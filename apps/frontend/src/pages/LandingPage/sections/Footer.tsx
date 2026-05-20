import styled from 'styled-components'
import { Link } from 'react-router-dom'
import { EnsSVG } from '@ensdomains/thorin'
import { tokens } from '@/styles/tokens'

const FooterEl = styled.footer`
  background: ${tokens.color.surface};
  border-top: 1px solid ${tokens.color.borderLight};
  padding: ${tokens.spacing['3xl']} ${tokens.spacing.xl};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['4xl']} ${tokens.spacing['4xl']} ${tokens.spacing['3xl']};
  }
`

const Inner = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};
`

const Top = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`

const Brand = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
`

const BrandName = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkBlue};
  letter-spacing: -0.01em;
`

const Nav = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.spacing.sm} ${tokens.spacing.xl};
  align-items: center;
`

const NavLink = styled(Link)`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
  text-decoration: none;
  transition: color ${tokens.transition.fast};

  &:hover {
    color: ${tokens.color.darkBlue};
  }
`

const ExternalLink = styled.a`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
  text-decoration: none;
  transition: color ${tokens.transition.fast};
  display: inline-flex;
  align-items: center;
  gap: 4px;

  &:hover {
    color: ${tokens.color.blue};
  }
`

const Bottom = styled.div`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textSubtle};
  border-top: 1px solid ${tokens.color.borderLight};
  padding-top: ${tokens.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`

const Credit = styled.span``

const FineLink = styled.a`
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid currentColor;
  opacity: 0.7;
  transition: opacity ${tokens.transition.fast};

  &:hover {
    opacity: 1;
  }
`

export function Footer() {
  return (
    <FooterEl>
      <Inner>
        <Top>
          <Brand>
            <EnsSVG width={20} height={20} />
            <BrandName>ENS Incentives</BrandName>
          </Brand>

          <Nav>
            <NavLink to="/#how-it-works">How it works</NavLink>
            <NavLink to="/voters">Voters</NavLink>
            <NavLink to="/rounds">Rounds</NavLink>
            <NavLink to="/transparency">Transparency</NavLink>
            <ExternalLink
              href="https://discuss.ens.domains"
              target="_blank"
              rel="noopener noreferrer"
            >
              ENS Forum ↗
            </ExternalLink>
            <ExternalLink
              href="https://github.com/blockful-io"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub ↗
            </ExternalLink>
          </Nav>
        </Top>

        <Bottom>
          <Credit>
            Built by{' '}
            <FineLink href="https://blockful.io/" target="_blank" rel="noopener noreferrer">
              Blockful
            </FineLink>
            {' for ENS DAO.'}
          </Credit>
          <Credit>
            Governance data via{' '}
            <FineLink href="https://anticapture.com/" target="_blank" rel="noopener noreferrer">
              Anticapture
            </FineLink>
            .
          </Credit>
        </Bottom>
      </Inner>
    </FooterEl>
  )
}
