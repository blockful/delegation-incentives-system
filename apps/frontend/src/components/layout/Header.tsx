import { useState, useCallback, useEffect } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import styled, { css, keyframes } from 'styled-components'
import { Button, EnsSVG, Profile, WalletSVG, ExitSVG } from '@ensdomains/thorin'
import { useAccount, useEnsName, useEnsAvatar, useDisconnect } from 'wagmi'
import { appKit } from '@/app/providers/AppKitProvider'
import { tokens } from '@/styles/tokens'

const StyledHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 57px;
  border-bottom: 1px solid ${tokens.color.border};
  background: ${tokens.color.surface};
  position: sticky;
  top: 0;
  z-index: 100;

  @media (min-width: 768px) {
    padding: 0 40px;
    height: 72px;
  }
`

const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: inherit;
  flex-shrink: 0;
`

const BrandText = styled.span`
  font-weight: ${tokens.font.weight.bold};
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkBlue};
  white-space: nowrap;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size.lg};
  }
`

const DesktopNav = styled.nav`
  display: none;
  gap: 32px;

  @media (min-width: 768px) {
    display: flex;
    align-items: center;
  }
`

const navLinkStyles = css`
  position: relative;
  text-decoration: none;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  transition: color ${tokens.transition.base};

  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 0;
    right: 0;
    height: 2px;
    background: ${tokens.color.blue};
    border-radius: 1px;
    transform: scaleX(0);
    transition: transform ${tokens.transition.base};
  }

  &:hover {
    color: ${tokens.color.darkBlue};
  }

  &.active {
    color: ${tokens.color.blue};
    font-weight: ${tokens.font.weight.bold};

    &::after {
      transform: scaleX(1);
    }
  }
`

const StyledNavLink = styled(NavLink)`
  ${navLinkStyles}
`

const RightArea = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const ProfileScaler = styled.div`
  zoom: 0.85;
`

/* ─── Mobile menu ─── */

const HamburgerButton = styled.button<{ $open: boolean }>`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 36px;
  height: 36px;
  padding: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: ${tokens.radius.sm};
  transition: background ${tokens.transition.fast};

  &:hover {
    background: ${tokens.color.surfaceAlt};
  }

  @media (min-width: 768px) {
    display: none;
  }

  span {
    display: block;
    height: 2px;
    width: 100%;
    background: ${tokens.color.text};
    border-radius: 1px;
    transition: transform 0.25s ease, opacity 0.2s ease;
  }

  ${({ $open }) =>
    $open &&
    css`
      span:nth-child(1) {
        transform: translateY(7px) rotate(45deg);
      }
      span:nth-child(2) {
        opacity: 0;
      }
      span:nth-child(3) {
        transform: translateY(-7px) rotate(-45deg);
      }
    `}
`

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  top: 57px;
  background: rgba(1, 26, 37, 0.3);
  z-index: 99;

  @media (min-width: 768px) {
    display: none;
  }
`

const MobileDrawer = styled.nav`
  position: fixed;
  top: 57px;
  left: 0;
  right: 0;
  left: 0;
  right: 0;
  background: ${tokens.color.surface};
  border-bottom: 1px solid ${tokens.color.border};
  padding: 8px 0;
  z-index: 100;
  animation: ${slideIn} 0.2s ease;
  box-shadow: ${tokens.shadow.lg};

  @media (min-width: 768px) {
    display: none;
  }
`

const MobileNavLink = styled(NavLink)`
  display: flex;
  align-items: center;
  padding: 14px 24px;
  text-decoration: none;
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  transition: background ${tokens.transition.fast}, color ${tokens.transition.fast};

  &:hover {
    background: ${tokens.color.surfaceAlt};
    color: ${tokens.color.darkBlue};
  }

  &.active {
    color: ${tokens.color.blue};
    font-weight: ${tokens.font.weight.bold};
    background: ${tokens.color.lightBlue};
  }
`

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/delegates', label: 'Active Delegates' },
  { to: '/rounds', label: 'Rounds' },
  { to: '/lottery', label: 'Lottery' },
  { to: '/transparency', label: 'Transparency' },
] as const

const desktopNavItems = navItems.filter((item) => item.to !== '/')

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
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const toggleMenu = useCallback(() => setMenuOpen((prev) => !prev), [])
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <>
      <StyledHeader>
        <Brand to="/">
          <EnsSVG style={{ width: 28, height: 28 }} />
          <BrandText>Incentives Program</BrandText>
        </Brand>

        <DesktopNav>
          {desktopNavItems.map(({ to, label }) => (
            <StyledNavLink key={to} to={to}>
              {label}
            </StyledNavLink>
          ))}
        </DesktopNav>

        <RightArea>
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
          <HamburgerButton
            $open={menuOpen}
            onClick={toggleMenu}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </HamburgerButton>
        </RightArea>
      </StyledHeader>

      {menuOpen && (
        <>
          <MobileDrawer>
            {navItems.map(({ to, label }) => (
              <MobileNavLink key={to} to={to} end={to === '/'} onClick={closeMenu}>
                {label}
              </MobileNavLink>
            ))}
          </MobileDrawer>
          <Overlay onClick={closeMenu} />
        </>
      )}
    </>
  )
}
