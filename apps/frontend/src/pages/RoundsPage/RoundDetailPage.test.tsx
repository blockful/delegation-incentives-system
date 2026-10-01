import { vi } from 'vitest'

vi.mock('@/config/env', () => ({
  env: { useMockApi: false, apiBaseUrl: '/api', reownProjectId: 'test' },
}))

import { Route, Routes } from 'react-router-dom'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderApp } from '@/test/utils'
import { server } from '@/test/mocks/server'
import { roundInfoFixture } from '@/test/mocks/fixtures'
import { RoundDetailPage } from './RoundDetailPage'

function renderDetail(path: string) {
  return renderApp(
    <Routes>
      <Route path="/rounds/:roundNumber" element={<RoundDetailPage />} />
    </Routes>,
    { initialPath: path },
  )
}

describe('RoundDetailPage header stats', () => {
  it('shows the settled pool and tier for a paid round even when /rounds/current still points at it', async () => {
    // After the last round ends, /rounds/current keeps returning that round
    // number but with a projection for the current calendar month.
    server.use(
      http.get('/api/rounds/current', () =>
        HttpResponse.json({
          ...roundInfoFixture,
          roundNumber: 2,
          percentComplete: 100,
          daysRemaining: 0,
          poolSizeEns: '5000.000000000000000000',
          tierIndex: 0,
          vpGrowthPct: '-0.03',
        }),
      ),
    )

    renderDetail('/rounds/2')

    expect(await screen.findByText('8K ENS')).toBeInTheDocument()
    expect(screen.getByText('Tier 2 reached')).toBeInTheDocument()
    expect(screen.queryByText('5K ENS')).not.toBeInTheDocument()
  })

  it('uses the live /rounds/current payload while the viewed round is live', async () => {
    server.use(
      http.get('/api/rounds/current', () =>
        HttpResponse.json({
          ...roundInfoFixture,
          poolSizeEns: '16000.000000000000000000',
          tierIndex: 2,
        }),
      ),
    )

    renderDetail('/rounds/3')

    expect(await screen.findByText('16K ENS')).toBeInTheDocument()
    expect(screen.getByText('Tier 3 reached')).toBeInTheDocument()
  })
})
