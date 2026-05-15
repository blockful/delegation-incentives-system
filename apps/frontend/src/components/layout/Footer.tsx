import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { EnsSVG } from '@ensdomains/thorin'
import { tokens } from '@/styles/tokens'

const StyledFooter = styled.footer`
  background: ${tokens.color.darkBlue};
  color: ${tokens.color.white};
  padding: ${tokens.spacing['4xl']} ${tokens.spacing['2xl']} ${tokens.spacing['2xl']};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['6xl']} ${tokens.spacing['4xl']} ${tokens.spacing['3xl']};
  }
`

const Inner = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['4xl']};

  @media (min-width: 768px) {
    gap: ${tokens.spacing['8xl']};
  }
`

const Top = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing['3xl']};

  @media (min-width: 768px) {
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: ${tokens.spacing['5xl']};
  }
`

const BrandBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
`

const BrandText = styled.span`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.white};
`

const BrandSub = styled.span`
  font-size: ${tokens.font.size.base};
  color: rgba(255, 255, 255, 0.75);
  max-width: 340px;
  line-height: 1.5;
`

const NavColumn = styled.nav`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  min-width: 140px;
`

const ColumnTitle = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${tokens.color.white};
  margin-bottom: ${tokens.spacing.xs};
`

const FooterLink = styled(Link)`
  font-size: ${tokens.font.size.base};
  color: rgba(255, 255, 255, 0.75);
  text-decoration: none;
  transition: color ${tokens.transition.fast};

  &:hover {
    color: ${tokens.color.white};
  }
`

const ExternalLink = styled.a`
  font-size: ${tokens.font.size.base};
  color: rgba(255, 255, 255, 0.75);
  text-decoration: none;
  transition: color ${tokens.transition.fast};

  &:hover {
    color: ${tokens.color.white};
  }
`

const Bottom = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xl};
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  padding-top: ${tokens.spacing.xl};

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
    gap: ${tokens.spacing['3xl']};
  }
`

const FootMark = styled.span`
  display: inline-flex;
  color: ${tokens.color.white};
  line-height: 0;

  svg {
    width: 56px;
    height: 56px;
    color: ${tokens.color.white};
    fill: ${tokens.color.white};
  }

  svg path,
  svg circle,
  svg rect,
  svg polygon {
    fill: ${tokens.color.white};
  }

  @media (min-width: 768px) {
    svg {
      width: 104px;
      height: 104px;
    }
  }
`

const Wordmark = styled.span`
  font-size: 56px;
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.white};
  line-height: 0.95;
  letter-spacing: -0.04em;
  white-space: nowrap;

  @media (min-width: 768px) {
    font-size: 104px;
  }
`

export function Footer() {
  return (
    <StyledFooter>
      <Inner>
        <Top>
          <BrandBlock>
            <BrandText>A security campaign for safer ENS governance.</BrandText>
            <BrandSub>Built by Blockful · Powered by Anticapture.</BrandSub>
          </BrandBlock>

          <NavColumn>
            <ColumnTitle>Explore</ColumnTitle>
            <FooterLink to="/">How It Works</FooterLink>
            <FooterLink to="/voters">Voters</FooterLink>
            <FooterLink to="/rounds">Rounds</FooterLink>
            <FooterLink to="/lottery">Lottery</FooterLink>
            <FooterLink to="/transparency">Transparency</FooterLink>
          </NavColumn>

          <NavColumn>
            <ColumnTitle>Resources</ColumnTitle>
            <ExternalLink
              href="https://discuss.ens.domains"
              target="_blank"
              rel="noopener noreferrer"
            >
              Forum ↗
            </ExternalLink>
            <ExternalLink
              href="https://github.com/blockful-io"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub ↗
            </ExternalLink>
          </NavColumn>
        </Top>

        <Bottom>
          <FootMark aria-hidden>
            <EnsSVG />
          </FootMark>
          <Wordmark>Incentives Program</Wordmark>
        </Bottom>
      </Inner>
    </StyledFooter>
  )
}
