import { Outlet, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { Header } from './Header'
import { Footer } from './Footer'

const Main = styled.main<{ $fullWidth?: boolean }>`
  flex: 1;
  width: 100%;
  ${({ $fullWidth }) =>
    $fullWidth
      ? ''
      : `
    max-width: 1120px;
    margin: 0 auto;
    padding: 24px;
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
      <Footer />
    </Wrapper>
  )
}
