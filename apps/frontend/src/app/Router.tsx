import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/LandingPage'
import { DelegatesPage } from '@/pages/DelegatesPage'

function Placeholder({ name }: { name: string }) {
  return <h1>{name}</h1>
}

export function Router() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="dashboard" element={<Placeholder name="Dashboard" />} />
        <Route path="delegates" element={<DelegatesPage />} />
        <Route path="rounds" element={<Placeholder name="Rounds" />} />
        <Route path="lottery" element={<Placeholder name="Lottery" />} />
        <Route path="transparency" element={<Placeholder name="Transparency" />} />
      </Route>
    </Routes>
  )
}
