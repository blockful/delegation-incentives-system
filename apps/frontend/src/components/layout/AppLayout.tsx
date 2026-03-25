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
    max-width: 1200px;
    margin: 0 auto;
    padding: ${tokens.spacing.lg};

    @media (min-width: 768px) {
      padding: ${tokens.spacing['2xl']};
    }
  `}
`

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`

const FULL_WIDTH_PATHS = ['/']

export function AppLayout() {
  const { pathname } = useLocation()
  const isFullWidth = FULL_WIDTH_PATHS.includes(pathname)

  return (
    <Wrapper>
      <Header />
      <Main $fullWidth={isFullWidth}>
        <Outlet />
      </Main>
      {!isFullWidth && <Footer />}
    </Wrapper>
  )
}
