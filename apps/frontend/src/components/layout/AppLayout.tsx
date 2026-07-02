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

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background:
    linear-gradient(180deg, rgba(56, 137, 255, 0.2) 0%, rgba(255, 255, 255, 0.2) 20.4%),
    ${tokens.color.white};
`

const FULL_WIDTH_PATHS = ['/']

export function AppLayout() {
  const { pathname, hash } = useLocation()
  const isFullWidth = FULL_WIDTH_PATHS.includes(pathname)

  useEffect(() => {
    // A shared deep link like `/#faq` should land on that section. The landing
    // view depends on wallet state, so the target may not exist on the first
    // frame — retry across a few frames before giving up. `scroll-margin-top`
    // on the target section keeps it clear of the sticky header.
    if (hash) {
      const id = decodeURIComponent(hash.slice(1))
      let frames = 0
      let raf = requestAnimationFrame(function tryScroll() {
        const el = document.getElementById(id)
        if (el) {
          el.scrollIntoView({ block: 'start' })
        } else if (frames++ < 20) {
          raf = requestAnimationFrame(tryScroll)
        }
      })
      return () => cancelAnimationFrame(raf)
    }
    // Reset scroll on route change so navigating into a new page starts at the top
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])

  return (
    <Wrapper>
      <Header />
      <Main $fullWidth={isFullWidth}>
        <Outlet />
      </Main>
      <Footer />
    </Wrapper>
  )
}
