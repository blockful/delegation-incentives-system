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

  // --- Matchmaking selections (static + match-count must precede :address) ---
  http.get('/api/selections/word-pool', () =>
    HttpResponse.json({
      pool: [
        { id: 'ens_adoption', label: 'ENS Adoption' },
        { id: 'user_experience', label: 'ENS User Experience' },
        { id: 'public_goods_funding', label: 'Public Goods Funding' },
        { id: 'governance_transparency', label: 'Governance Transparency' },
        { id: 'ensv2', label: 'ENSv2' },
        { id: 'decentralization_resilience', label: 'Decentralization & Resilience' },
      ],
    }),
  ),

  http.get('/api/selections/:address/match-count', () =>
    HttpResponse.json({ matchCount: 2, matchingActiveVoters: 1 }),
  ),

  http.get('/api/selections/:address', ({ params }) => {
    const address = String(params.address).toLowerCase()
    // The zero address has no selection — exercises the 404 → null path.
    if (address === '0x0000000000000000000000000000000000000000') {
      return HttpResponse.json({ error: 'No selection for this address' }, { status: 404 })
    }
    return HttpResponse.json({
      address,
      words: ['ens_adoption', 'user_experience', 'public_goods_funding', 'governance_transparency', 'ensv2'],
      updatedAt: 1781619462005,
    })
  }),

  http.put('/api/selections/:address', async ({ request, params }) => {
    const body = (await request.json()) as { words: string[] }
    const address = String(params.address)
    return HttpResponse.json({
      address: address.toLowerCase(),
      words: body.words,
      updatedAt: 1781619462005,
    })
  }),

  http.get('/api/gateful/ens/relay/balance', () =>
    HttpResponse.json({ hasEnoughBalance: true }),
  ),

  http.get('/api/gateful/ens/relay/config', () =>
    HttpResponse.json({
      minVotingPower: '1000000000000000000',
      limits: { vote: 5, delegation: 5 },
    }),
  ),

  http.get('/api/gateful/ens/relay/rate-limit/:address', () =>
    HttpResponse.json({
      delegation: { used: 0, remaining: 5, limit: 5 },
      vote: { used: 0, remaining: 5, limit: 5 },
      resetsAt: '2099-12-31T00:00:00.000Z',
    }),
  ),

  http.post('/api/gateful/ens/relay/delegate', () =>
    HttpResponse.json({
      transactionHash: '0x' + 'ab'.repeat(32),
    }),
  ),
]
