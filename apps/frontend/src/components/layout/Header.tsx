import { NavLink, Link } from 'react-router-dom'
import styled from 'styled-components'
import { useWalletState } from '@/features/wallet/useWalletState'
import { AppKitButton, AppKitAccountButton } from '@reown/appkit/react'

const StyledHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #e8e8e8;
  background: #fff;
`

const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: inherit;
`

const Logo = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #44bcf0, #7b61ff, #ff6b6b);
`

const BrandText = styled.span`
  font-weight: 600;
  font-size: 16px;
  color: #1a1a2e;
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
  color: #666;
  transition: color 0.15s;

  &:hover {
    color: #1a1a2e;
  }

  &.active {
    color: #3889ff;
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

export function Header() {
  const wallet = useWalletState()
  const isConnected = wallet.status !== 'disconnected'

  return (
    <StyledHeader>
      <Brand to="/">
        <Logo aria-hidden />
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
        {isConnected ? <AppKitAccountButton /> : <AppKitButton />}
      </WalletArea>
    </StyledHeader>
  )
}
