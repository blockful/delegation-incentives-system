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
  position: relative;
  z-index: 100;

  @media (min-width: 768px) {
    padding: 16px 40px;
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
  font-weight: 700;
  font-size: 15px;
  color: #011A25;
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
  font-size: 13px;
  font-weight: 500;
  color: #4A5C63;
  transition: color 0.15s;
  letter-spacing: 0.01em;

  &:hover {
    color: #011A25;
  }

  &.active {
    color: #011A25;
    font-weight: 600;
  }
`

const WalletArea = styled.div`
  display: flex;
  align-items: center;
`

/* Scale medium Profile down ~85% to sit comfortably in the header */
const ProfileScaler = styled.div`
  transform: scale(0.85);
  transform-origin: right center;
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
    <ProfileScaler>
      <Profile
        address={address}
        ensName={ensName ?? undefined}
        avatar={avatarUrl ?? undefined}
        size="medium"
        alignDropdown="right"
        dropdownItems={[
          { label: 'Account', onClick: () => appKit.open(), icon: <WalletSVG /> },
          { label: 'Disconnect', onClick: () => disconnect(), color: 'red', icon: <ExitSVG /> },
        ]}
      />
    </ProfileScaler>
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
