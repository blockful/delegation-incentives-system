import { useState, useCallback, useEffect } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import styled, { css, keyframes } from 'styled-components'
import { Button, EnsSVG, Profile, WalletSVG } from '@ensdomains/thorin'
import { useEnsAvatar } from 'wagmi'
import makeBlockie from 'ethereum-blockies-base64'
import { useWalletState } from '@/features/wallet/useWalletState'
import { tokens } from '@/styles/tokens'

async function openWalletModal() {
  const { appKit } = await import('@/app/providers/AppKitProvider')
  appKit.open()
}

const StyledHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid ${tokens.color.white};
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 0;
  z-index: 100;

  @media (max-width: 360px) {
    padding: 20px 12px;
  }

  @media (min-width: 768px) {
    padding: 20px 40px;
  }
`

const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: inherit;
  flex-shrink: 0;
  transition: opacity ${tokens.transition.fast};

  &:hover {
    text-decoration: none;
    opacity: 0.6;
  }
`

const BrandText = styled.span`
  font-weight: ${tokens.font.weight.bold};
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.blue};
  white-space: nowrap;

  @media (max-width: 360px) {
    display: none;
  }

  @media (min-width: 768px) {
    font-size: ${tokens.font.size.lg};
  }
`

const DesktopNav = styled.nav`
  display: none;
  gap: 6px;

  @media (min-width: 1032px) {
    display: flex;
    align-items: center;
  }
`

const navLinkStyles = css`
  position: relative;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: ${tokens.radius.sm};
  text-decoration: none;
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.textSecondary};
  transition:
    background ${tokens.transition.fast},
    color ${tokens.transition.fast};

  &:hover {
    color: ${tokens.color.blue};
  }

  &.active {
    color: ${tokens.color.blue};
    font-weight: ${tokens.font.weight.medium};
    background: ${tokens.color.lightBlueOpacity};
    border-radius: 9999px;
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

const MobileOnly = styled.span`
  @media (min-width: 1032px) {
    display: none;
  }
`

const DesktopOnly = styled.span`
  display: none;

  @media (min-width: 1032px) {
    display: inline;
  }
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

  @media (min-width: 1032px) {
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

  @media (min-width: 1032px) {
    display: none;
  }
`

const MobileDrawer = styled.nav`
  position: fixed;
  top: 57px;
  left: 0;
  right: 0;
  background: ${tokens.color.surface};
  border-bottom: 1px solid ${tokens.color.border};
  padding: 8px 0;
  z-index: 100;
  animation: ${slideIn} 0.2s ease;
  box-shadow: ${tokens.shadow.lg};

  @media (min-width: 1032px) {
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
    font-weight: ${tokens.font.weight.medium};
    background: ${tokens.color.lightBlue};
  }
`

const publicNavItems = [
  { to: '/', label: 'Home' },
  { to: '/voters', label: 'Voters' },
  { to: '/rounds', label: 'Rounds' },
  { to: '/lottery', label: 'Lottery' },
  { to: '/transparency', label: 'Transparency' },
] as const

const walletNavItems = [
  { to: '/dashboard', label: 'Dashboard' },
] as const

function ConnectedAccount({
  address,
  ensName,
}: {
  address: `0x${string}`
  ensName?: string
}) {
  const { data: resolvedAvatar } = useEnsAvatar({
    name: ensName,
    query: { enabled: !!ensName },
  })
  const avatar = resolvedAvatar ?? makeBlockie(address)
  return (
    <ProfileScaler>
      <Profile
        address={address}
        ensName={ensName ?? undefined}
        avatar={avatar}
        size="medium"
        alignDropdown="right"
        dropdownItems={[
          { label: 'Account', onClick: () => { void openWalletModal() }, icon: <WalletSVG /> },
        ]}
      />
    </ProfileScaler>
  )
}

export function Header() {
  const walletState = useWalletState()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const isConnected = walletState.status !== 'disconnected'
  const address = isConnected ? walletState.address : undefined
  const ensName = walletState.status === 'delegated' ? walletState.ensName : undefined

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
          {publicNavItems.map(({ to, label }) => (
            <StyledNavLink key={to} to={to} end={to === '/'}>
              {label}
            </StyledNavLink>
          ))}
          {isConnected && walletNavItems.map(({ to, label }) => (
            <StyledNavLink key={to} to={to}>
              {label}
            </StyledNavLink>
          ))}
        </DesktopNav>

        <RightArea>
          {isConnected && address ? (
            <ConnectedAccount address={address} ensName={ensName} />
          ) : (
            <Button
              size="small"
              colorStyle="bluePrimary"
              onClick={() => { void openWalletModal() }}
              prefix={<WalletSVG />}
            >
              <MobileOnly>Connect</MobileOnly>
              <DesktopOnly>Connect wallet</DesktopOnly>
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
            {publicNavItems.map(({ to, label }) => (
              <MobileNavLink key={to} to={to} end={to === '/'} onClick={closeMenu}>
                {label}
              </MobileNavLink>
            ))}
            {isConnected && walletNavItems.map(({ to, label }) => (
              <MobileNavLink key={to} to={to} onClick={closeMenu}>
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
