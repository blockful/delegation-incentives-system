import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'

async function boot() {
  if (import.meta.env.DEV) {
    const isMockMode = new URLSearchParams(window.location.search).has('mock')

    if (isMockMode) {
      // Force MSW when ?mock is present, regardless of backend availability
      const { worker } = await import('./test/mocks/browser')
      await worker.start({ onUnhandledRequest: 'bypass' })
    } else {
      try {
        const res = await fetch('/api/health')
        if (!res.ok) throw new Error()
      } catch {
        const { worker } = await import('./test/mocks/browser')
        await worker.start({ onUnhandledRequest: 'bypass' })
      }
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

boot()
