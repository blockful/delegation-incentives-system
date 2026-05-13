import { lazy, Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ThorinProvider } from './providers/ThorinProvider'
import { GlobalStyles } from '@/styles/GlobalStyles'
import { Router } from './Router'
import { LandingPageSkeleton } from '@/components/shared/PageSkeletons'

const AppKitProvider = lazy(() => import('./providers/AppKitProvider').then((module) => ({ default: module.AppKitProvider })))

export function App() {
  return (
    <ThorinProvider>
      <GlobalStyles />
      <BrowserRouter>
        <Suspense fallback={<LandingPageSkeleton />}>
          <AppKitProvider>
            <Router />
          </AppKitProvider>
        </Suspense>
      </BrowserRouter>
    </ThorinProvider>
  )
}
