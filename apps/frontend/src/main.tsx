import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'

async function boot() {
  if (import.meta.env.DEV) {
    try {
      const res = await fetch('/api/health')
      if (!res.ok) throw new Error()
    } catch {
      const { worker } = await import('./test/mocks/browser')
      await worker.start({ onUnhandledRequest: 'bypass' })
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

boot()

