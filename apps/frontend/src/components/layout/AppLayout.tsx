import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { Header } from './Header'
import { Footer } from './Footer'
import { tokens } from '@/styles/tokens'

const Main = styled.main<{ $fullWidth?: boolean }>`
  flex: 1;
  width: 100%;
  ${({ $fullWidth }) =>
    $fullWidth
      ? ''
      : `
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: ${tokens.spacing.xl} ${tokens.spacing.lg};

    @media (min-width: 768px) {
      padding: 40px 24px 80px;
    }
  `}
`

const Wrapper = styled.div<{ $hasGradient?: boolean }>`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  ${({ $hasGradient }) =>
    $hasGradient
      ? `background:
          linear-gradient(180deg, rgba(56, 137, 255, 0.2) 0%, rgba(255, 255, 255, 0.2) 20.4%),
          ${tokens.color.white};`
      : ''}
`

const FULL_WIDTH_PATHS = ['/']

export function AppLayout() {
  const { pathname } = useLocation()
  const isFullWidth = FULL_WIDTH_PATHS.includes(pathname)

  // Reset scroll on route change so navigating into a new page starts at the top
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])

  return (
    <Wrapper $hasGradient={!isFullWidth}>
      <Header />
      <Main $fullWidth={isFullWidth}>
        <Outlet />
      </Main>
      <Footer />
    </Wrapper>
  )
}
