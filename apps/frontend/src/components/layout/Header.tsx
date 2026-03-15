import { NavLink, Link } from 'react-router-dom'
import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { useAccount, useEnsName } from 'wagmi'
import { appKit } from '@/app/providers/AppKitProvider'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { truncateAddress } from '@/utils/format'

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

const AccountPill = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 6px;
  border-radius: 24px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  transition: background 0.15s;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }
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
  const displayName = ensName ?? truncateAddress(address)

  return (
    <AccountPill onClick={() => appKit.open()}>
      <EnsAvatar address={address} name={ensName ?? undefined} size={24} />
      {displayName}
    </AccountPill>
  )
}

export function Header() {
  const { address, isConnected } = useAccount()

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
