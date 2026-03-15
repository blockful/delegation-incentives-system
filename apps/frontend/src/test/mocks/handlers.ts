import { http, HttpResponse } from 'msw'

import {
  statusFixture,
  delegatesFixture,
  roundsFixture,
  eligibleDelegatorFixture,
  apyFixture,
  distributionFixture,
  roundInfoFixture,
} from './fixtures'

export const handlers = [
  http.get('/api/status', () => HttpResponse.json(statusFixture)),

  http.get('/api/delegates/active', () =>
    HttpResponse.json(delegatesFixture),
  ),

  http.get('/api/tiers/progression', () =>
    HttpResponse.json(roundsFixture),
  ),

  http.get('/api/eligibility/:address', () =>
    HttpResponse.json(eligibleDelegatorFixture),
  ),

  http.get('/api/apy/:address', () => HttpResponse.json(apyFixture)),

  http.get('/api/distributions/:month', () =>
    HttpResponse.json(distributionFixture),
  ),

  http.get('/api/rounds/current', () =>
    HttpResponse.json(roundInfoFixture),
  ),
]
