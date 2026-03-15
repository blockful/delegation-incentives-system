import { NavLink, Link } from 'react-router-dom'
import styled from 'styled-components'
import { Button, EnsSVG, Profile, WalletSVG, ExitSVG } from '@ensdomains/thorin'
import { useAccount, useEnsName, useEnsAvatar, useDisconnect } from 'wagmi'
import { appKit } from '@/app/providers/AppKitProvider'

const StyledHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #E5E5E5;
  background: #fff;
`

const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
`

const BrandText = styled.span`
  font-weight: 600;
  font-size: 16px;
  color: #011A25;
`

const Nav = styled.nav`
  display: flex;
  gap: 24px;

  @media (max-width: 768px) {
    display: none;
  }
`

const StyledNavLink = styled(NavLink)`
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  color: #4A5C63;
  transition: color 0.15s;

  &:hover {
    color: #011A25;
  }

  &.active {
    color: #0080BC;
  }
`

const WalletArea = styled.div`
  display: flex;
  align-items: center;
`

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/delegates', label: 'Active Delegates' },
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
        <EnsSVG style={{ width: 32, height: 32 }} />
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
