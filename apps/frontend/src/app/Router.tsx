import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'

function Placeholder({ name }: { name: string }) {
  return <h1>{name}</h1>
}

export function Router() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Placeholder name="Landing" />} />
        <Route path="dashboard" element={<Placeholder name="Dashboard" />} />
        <Route path="delegates" element={<Placeholder name="Active Delegates" />} />
        <Route path="rounds" element={<Placeholder name="Rounds" />} />
        <Route path="lottery" element={<Placeholder name="Lottery" />} />
        <Route path="transparency" element={<Placeholder name="Transparency" />} />
      </Route>
    </Routes>
  )
}
