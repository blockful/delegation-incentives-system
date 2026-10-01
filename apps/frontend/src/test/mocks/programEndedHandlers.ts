import { http, HttpResponse } from 'msw'
import {
  endedAddressDistributionFixture,
  endedAprFixture,
  endedRoundInfoFixture,
  endedRoundListFixture,
  endedTierProgressionFixture,
  legacyEndedAprFixture,
  legacyEndedRoundInfoFixture,
  legacyEndedTierProgressionFixture,
} from './fixtures'

export type BackendShape = 'extended' | 'legacy'

/**
 * Overrides for a program whose last round has settled. `extended` is the
 * backend that reports `programEnded`; `legacy` omits it and still serves a
 * live projection, so the frontend has to derive the state from /rounds.
 * Use with `server.use(...endedProgramHandlers('extended'))`.
 */
export function endedProgramHandlers(shape: BackendShape) {
  const extended = shape === 'extended'
  return [
    http.get('/api/rounds', () => HttpResponse.json(endedRoundListFixture)),
    http.get('/api/rounds/current', () =>
      HttpResponse.json(extended ? endedRoundInfoFixture : legacyEndedRoundInfoFixture),
    ),
    http.get('/api/tiers/progression', () =>
      HttpResponse.json(extended ? endedTierProgressionFixture : legacyEndedTierProgressionFixture),
    ),
    http.get('/api/apr/:address', () =>
      HttpResponse.json(extended ? endedAprFixture : legacyEndedAprFixture),
    ),
    http.get('/api/distributions', ({ request }) => {
      const url = new URL(request.url)
      if (url.searchParams.has('address')) {
        return HttpResponse.json(endedAddressDistributionFixture)
      }
      return HttpResponse.json(endedRoundListFixture.rounds.map((r) => r.month))
    }),
  ]
}
