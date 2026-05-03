import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Spinner } from '@ensdomains/thorin'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/LandingPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { DelegatesPage } from '@/pages/DelegatesPage'
import { DelegateProfilePage } from '@/pages/DelegateProfilePage'
import { RoundsPage } from '@/pages/RoundsPage'
import { RoundDetailPage } from '@/pages/RoundsPage/RoundDetailPage'
import { LotteryPage } from '@/pages/LotteryPage'
import { TransparencyPage } from '@/pages/TransparencyPage'

const Dashboard1 = lazy(() => import('@/pages/DashboardPage/variants/Dashboard1'))
const Dashboard2 = lazy(() => import('@/pages/DashboardPage/variants/Dashboard2'))
const Dashboard3 = lazy(() => import('@/pages/DashboardPage/variants/Dashboard3'))
const Dashboard4 = lazy(() => import('@/pages/DashboardPage/variants/Dashboard4'))

function LazyFallback() {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><Spinner /></div>
}

export function Router() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="dashboard-1" element={<Suspense fallback={<LazyFallback />}><Dashboard1 /></Suspense>} />
        <Route path="dashboard-2" element={<Suspense fallback={<LazyFallback />}><Dashboard2 /></Suspense>} />
        <Route path="dashboard-3" element={<Suspense fallback={<LazyFallback />}><Dashboard3 /></Suspense>} />
        <Route path="dashboard-4" element={<Suspense fallback={<LazyFallback />}><Dashboard4 /></Suspense>} />
        <Route path="delegates" element={<DelegatesPage />} />
        <Route path="delegates/:address" element={<DelegateProfilePage />} />
        <Route path="rounds/:roundNumber" element={<RoundDetailPage />} />
        <Route path="rounds" element={<RoundsPage />} />
        <Route path="lottery" element={<LotteryPage />} />
        <Route path="transparency" element={<TransparencyPage />} />
      </Route>
    </Routes>
  )
}
