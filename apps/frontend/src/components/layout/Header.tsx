import { NavLink, Link } from 'react-router-dom'
import styled from 'styled-components'
import { Button, EnsSVG, Profile, WalletSVG, ExitSVG } from '@ensdomains/thorin'
import { useAccount, useEnsName, useEnsAvatar, useDisconnect } from 'wagmi'
import { appKit } from '@/app/providers/AppKitProvider'
import { tokens } from '@/styles/tokens'

const StyledHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${tokens.spacing.lg} ${tokens.spacing['2xl']};
  border-bottom: 1px solid ${tokens.color.border};
  background: ${tokens.color.surface};

  @media (min-width: 768px) {
    padding: ${tokens.spacing.lg} ${tokens.spacing['4xl']};
  }
`

const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: inherit;
`

const BrandText = styled.span`
  font-weight: ${tokens.font.weight.bold};
  font-size: ${tokens.font.size.md};
  color: ${tokens.color.darkBlue};
  letter-spacing: -0.01em;
`

const Nav = styled.nav`
  display: flex;
  gap: 28px;

  @media (max-width: 768px) {
    display: none;
  }
`

const StyledNavLink = styled(NavLink)`
  text-decoration: none;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.textMuted};
  transition: color ${tokens.transition.fast};
  letter-spacing: 0.01em;

  &:hover {
    color: ${tokens.color.darkBlue};
  }

  &.active {
    color: ${tokens.color.darkBlue};
    font-weight: ${tokens.font.weight.semibold};
  }
`

const WalletArea = styled.div`
  display: flex;
  align-items: center;
`

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/delegates', label: 'Delegates' },
  { to: '/rounds', label: 'Rounds' },
  { to: '/lottery', label: 'Lottery' },
  { to: '/transparency', label: 'Transparency' },
] as const

function ConnectedAccount({ address }: { address: `0x${string}` }) {
  const { data: ensName } = useEnsName({ address })
  const { data: avatarUrl } = useEnsAvatar({ name: ensName ?? undefined })
  const { disconnect } = useDisconnect()

  return (
    <Profile
      address={address}
      ensName={ensName ?? undefined}
      avatar={avatarUrl ?? undefined}
      size="small"
      dropdownItems={[
        { label: 'Account', onClick: () => appKit.open(), icon: <WalletSVG /> },
        { label: 'Disconnect', onClick: () => disconnect(), color: 'red', icon: <ExitSVG /> },
      ]}
    />
  )
}

export function Header() {
  const { address, isConnected } = useAccount()

  return (
    <StyledHeader>
      <Brand to="/">
        <EnsSVG style={{ width: 28, height: 28 }} />
        <BrandText>Incentives Program</BrandText>
      </Brand>

      <Nav>
        {navItems.map(({ to, label }) => (
          <StyledNavLink key={to} to={to}>
            {label}
          </StyledNavLink>
        ))}
      </Nav>

      <WalletArea>
        {isConnected && address ? (
          <ConnectedAccount address={address} />
        ) : (
          <Button
            size="small"
            colorStyle="bluePrimary"
            onClick={() => appKit.open()}
          >
            Connect Wallet
          </Button>
        )}
      </WalletArea>
    </StyledHeader>
  )
}
