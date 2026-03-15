import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/LandingPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { DelegatesPage } from '@/pages/DelegatesPage'
import { RoundsPage } from '@/pages/RoundsPage'
import { LotteryPage } from '@/pages/LotteryPage'
import { TransparencyPage } from '@/pages/TransparencyPage'

export function Router() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="delegates" element={<DelegatesPage />} />
        <Route path="rounds" element={<RoundsPage />} />
        <Route path="lottery" element={<LotteryPage />} />
        <Route path="transparency" element={<TransparencyPage />} />
      </Route>
    </Routes>
  )
}
