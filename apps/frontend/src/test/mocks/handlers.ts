import { http, HttpResponse } from 'msw'

import {
  statusFixture,
  votersFixture,
  roundsFixture,
  eligibleTokenHolderFixture,
  aprFixture,
  distributionFixture,
  roundInfoFixture,
  addressDistributionFixture,
  emptyRoundDetailFixture,
  roundDetailFixture,
  roundListFixture,
} from './fixtures'

export const handlers = [
  http.get('/api/stats', () => HttpResponse.json(statusFixture)),

  http.get('/api/voters/active', () =>
    HttpResponse.json(votersFixture),
  ),

  http.get('/api/tiers/progression', () =>
    HttpResponse.json(roundsFixture),
  ),

  http.get('/api/eligibility/:address', () =>
    HttpResponse.json(eligibleTokenHolderFixture),
  ),

  http.get('/api/apr/:address', () => HttpResponse.json(aprFixture)),

  http.get('/api/distributions', ({ request }) => {
    const url = new URL(request.url)
    if (url.searchParams.has('address')) {
      return HttpResponse.json(addressDistributionFixture)
    }

    return HttpResponse.json([distributionFixture.month])
  }),

  http.get('/api/distributions/:month', () =>
    HttpResponse.json(distributionFixture),
  ),

  http.get('/api/rounds/current', () =>
    HttpResponse.json(roundInfoFixture),
  ),

  http.get('/api/rounds', () => HttpResponse.json(roundListFixture)),

  http.get('/api/rounds/:roundNumber', ({ params }) =>
    HttpResponse.json(params.roundNumber === '2'
      ? roundDetailFixture
      : emptyRoundDetailFixture),
  ),
]
