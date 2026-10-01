import { vi } from 'vitest'

vi.mock('@/config/env', () => ({
  env: { useMockApi: false, apiBaseUrl: '/api', reownProjectId: 'test' },
}))

import { screen } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { server } from '@/test/mocks/server'
import { endedProgramHandlers, type BackendShape } from '@/test/mocks/programEndedHandlers'
import { RoundsPage } from './index'

describe.each<BackendShape>(['extended', 'legacy'])(
  'RoundsPage once the pilot has ended (%s backend)',
  (shape) => {
    beforeEach(() => {
      server.use(...endedProgramHandlers(shape))
    })

    it('hides the live tier card and keeps the round history', async () => {
      renderApp(<RoundsPage />)

      expect(
        await screen.findByRole('heading', { level: 1, name: /Round 3 is paid/ }),
      ).toBeInTheDocument()
      expect(screen.getByText(/The pilot ran for 3 rounds/)).toBeInTheDocument()
      expect(screen.queryByText(/Currently on Tier/)).not.toBeInTheDocument()
      expect(screen.queryByText(/unlocks the next tier/)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Share to unlock/ })).not.toBeInTheDocument()
      expect(screen.getByText('Round 1')).toBeInTheDocument()
      expect(screen.getByText('Round 2')).toBeInTheDocument()
    })
  },
)

describe('RoundsPage while a round is live', () => {
  it('keeps the current-tier card', async () => {
    renderApp(<RoundsPage />)

    expect(await screen.findByText(/Currently on Tier 2 of 7/)).toBeInTheDocument()
    expect(screen.getByText(/Track the current round below/)).toBeInTheDocument()
  })
})
