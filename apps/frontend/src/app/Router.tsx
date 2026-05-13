import { lazy, Suspense, type ReactNode } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPageSkeleton } from '@/components/shared/PageSkeletons'
import { LandingPage } from '@/pages/LandingPage'

const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const VotersPage = lazy(() => import('@/pages/VotersPage').then((module) => ({ default: module.VotersPage })))
const VoterProfilePage = lazy(() => import('@/pages/VoterProfilePage').then((module) => ({ default: module.VoterProfilePage })))
const RoundsPage = lazy(() => import('@/pages/RoundsPage').then((module) => ({ default: module.RoundsPage })))
const RoundDetailPage = lazy(() => import('@/pages/RoundsPage/RoundDetailPage').then((module) => ({ default: module.RoundDetailPage })))
const LotteryPage = lazy(() => import('@/pages/LotteryPage').then((module) => ({ default: module.LotteryPage })))
const TransparencyPage = lazy(() => import('@/pages/TransparencyPage').then((module) => ({ default: module.TransparencyPage })))

function LazyPage({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<DashboardPageSkeleton compact />}>
      {children}
    </Suspense>
  )
}

export function Router() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="dashboard" element={<LazyPage><DashboardPage /></LazyPage>} />
        <Route path="voters" element={<LazyPage><VotersPage /></LazyPage>} />
        <Route path="voters/:address" element={<LazyPage><VoterProfilePage /></LazyPage>} />
        <Route path="rounds/:roundNumber" element={<LazyPage><RoundDetailPage /></LazyPage>} />
        <Route path="rounds" element={<LazyPage><RoundsPage /></LazyPage>} />
        <Route path="lottery" element={<LazyPage><LotteryPage /></LazyPage>} />
        <Route path="transparency" element={<LazyPage><TransparencyPage /></LazyPage>} />
      </Route>
    </Routes>
  )
}
