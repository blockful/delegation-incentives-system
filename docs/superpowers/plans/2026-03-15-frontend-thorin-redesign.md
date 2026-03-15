# Frontend Thorin Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the frontend to match Paper wireframes exactly using Thorin design system, Reown AppKit wallet connection, mobile-first, with TDD and Playwright E2E.

**Architecture:** Clean-slate rebuild. Delete all existing components/pages/theme. Preserve `src/api/` and `src/hooks/useAsync.ts`. Feature-based folder structure with `pages/`, `features/`, `components/`. Wallet state derived from wagmi + API eligibility check.

**Tech Stack:** React 19, Vite 6, TypeScript, @ensdomains/thorin, styled-components, @reown/appkit + wagmi + viem, MSW 2, Playwright, Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-03-15-frontend-thorin-redesign.md`

**Paper design:** Open Paper app — file "ENS Incentives", page "Wireframes". Reference artboards by name (e.g., "Mobile / Landing Page", "Desktop / Dashboard").

---

## Chunk 1: Project Setup & Clean Slate

### Task 1: Delete old source files

**Files to delete:**
- `src/components/` (entire directory)
- `src/pages/` (entire directory)
- `src/theme/` (entire directory)
- `src/test/` (entire directory)
- `src/App.tsx`
- `src/main.tsx`

**Files to preserve:**
- `src/api/client.ts`, `src/api/index.ts`, `src/api/types.ts`
- `src/hooks/useAsync.ts`

- [ ] **Step 1: Delete old directories and files**

```bash
cd apps/frontend
rm -rf src/components src/pages src/theme src/test
rm src/App.tsx src/main.tsx
```

- [ ] **Step 2: Verify preserved files exist**

```bash
ls src/api/client.ts src/api/index.ts src/api/types.ts src/hooks/useAsync.ts
```

Expected: all 4 files listed, no errors.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: clean slate — delete old components, pages, theme, tests"
```

---

### Task 2: Install new dependencies

- [ ] **Step 1: Install production dependencies**

```bash
cd apps/frontend
pnpm add @ensdomains/thorin styled-components @reown/appkit @reown/appkit-adapter-wagmi wagmi viem @tanstack/react-query
```

- [ ] **Step 2: Install dev dependencies**

```bash
pnpm add -D msw @playwright/test
```

- [ ] **Step 3: Install Playwright browsers**

```bash
pnpm exec playwright install chromium
```

- [ ] **Step 4: Add env vars to root `.env.example`**

Append to `/Users/netto/work/delegation-incentives-system/.env.example`:

```
VITE_REOWN_PROJECT_ID=your_reown_project_id
VITE_CONTRACT_ENS_INCENTIVES=0x0000000000000000000000000000000000000000
VITE_CONTRACT_DELEGATE_BY_SIG=0x0000000000000000000000000000000000000000
VITE_CONTRACT_REWARD_DISTRIBUTOR=0x0000000000000000000000000000000000000000
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: install thorin, appkit, wagmi, msw, playwright"
```

---

### Task 3: Create scaffolding directories

- [ ] **Step 1: Create all directories**

```bash
cd apps/frontend
mkdir -p src/app/providers
mkdir -p src/config
mkdir -p src/features/wallet src/features/delegates src/features/rounds src/features/lottery src/features/transparency
mkdir -p src/components/layout src/components/shared
mkdir -p src/pages/LandingPage/sections src/pages/LandingPage/states
mkdir -p src/pages/DashboardPage/sections
mkdir -p src/pages/DelegatesPage/components
mkdir -p src/pages/RoundsPage/components
mkdir -p src/pages/LotteryPage
mkdir -p src/pages/TransparencyPage
mkdir -p src/test/mocks/fixtures
mkdir -p e2e
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "chore: scaffold directory structure" --allow-empty
```

---

### Task 4: Create config files

**Files:**
- Create: `apps/frontend/src/config/contracts.ts`
- Create: `apps/frontend/playwright.config.ts`

- [ ] **Step 1: Create contracts config**

```typescript
// src/config/contracts.ts
export const contracts = {
  ensIncentives: (import.meta.env.VITE_CONTRACT_ENS_INCENTIVES ??
    '0x0000000000000000000000000000000000000000') as `0x${string}`,
  delegateBySig: (import.meta.env.VITE_CONTRACT_DELEGATE_BY_SIG ??
    '0x0000000000000000000000000000000000000000') as `0x${string}`,
  rewardDistributor: (import.meta.env.VITE_CONTRACT_REWARD_DISTRIBUTOR ??
    '0x0000000000000000000000000000000000000000') as `0x${string}`,
} as const
```

- [ ] **Step 2: Create Playwright config**

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
})
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: add contracts config and playwright config"
```

---

## Chunk 2: Test Infrastructure

### Task 5: Create MSW fixtures

**Files:**
- Create: `src/test/mocks/fixtures/status.ts`
- Create: `src/test/mocks/fixtures/delegates.ts`
- Create: `src/test/mocks/fixtures/rounds.ts`
- Create: `src/test/mocks/fixtures/eligibility.ts`
- Create: `src/test/mocks/fixtures/apy.ts`
- Create: `src/test/mocks/fixtures/lottery.ts`

- [ ] **Step 1: Create status fixture**

```typescript
// src/test/mocks/fixtures/status.ts
import type { StatusResponse } from '@/api/types'

export const statusFixture: StatusResponse = {
  activeDelegateCount: 47,
  proposalCount: 10,
  cachedDistributions: ['2025-01', '2025-02'],
}
```

- [ ] **Step 2: Create delegates fixture**

```typescript
// src/test/mocks/fixtures/delegates.ts
import type { ActiveDelegatesResponse } from '@/api/types'

export const delegatesFixture: ActiveDelegatesResponse = {
  count: 3,
  delegates: [
    '0x1234567890abcdef1234567890abcdef12345678',
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    '0x9876543210fedcba9876543210fedcba98765432',
  ],
}
```

- [ ] **Step 3: Create rounds (tier progression) fixture**

```typescript
// src/test/mocks/fixtures/rounds.ts
import type { TierProgressionResponse } from '@/api/types'

export const roundsFixture: TierProgressionResponse = {
  currentAVP: '12400000000000000000000000',
  previousAVP: '11000000000000000000000000',
  currentGrowthBps: '1240',
  currentGrowthPct: '12.40',
  currentTierIndex: 1,
  activeDelegateCount: 47,
  tiers: [
    { index: 0, momGrowthMinPct: '0', momGrowthMaxPct: '4.0', poolSizeEns: '4000', delegateCapEns: '50', delegatorCapEns: '10', isCurrent: false, isUnlocked: true, additionalVPNeeded: '0', requiredAVP: '0' },
    { index: 1, momGrowthMinPct: '4.0', momGrowthMaxPct: '5.75', poolSizeEns: '8000', delegateCapEns: '100', delegatorCapEns: '20', isCurrent: true, isUnlocked: true, additionalVPNeeded: '0', requiredAVP: '0' },
    { index: 2, momGrowthMinPct: '5.75', momGrowthMaxPct: '6.5', poolSizeEns: '12000', delegateCapEns: '150', delegatorCapEns: '30', isCurrent: false, isUnlocked: false, additionalVPNeeded: '1000000', requiredAVP: '13000000' },
    { index: 3, momGrowthMinPct: '6.5', momGrowthMaxPct: '9.0', poolSizeEns: '16000', delegateCapEns: '200', delegatorCapEns: '40', isCurrent: false, isUnlocked: false, additionalVPNeeded: '2000000', requiredAVP: '14000000' },
    { index: 4, momGrowthMinPct: '9.0', momGrowthMaxPct: '10.5', poolSizeEns: '20000', delegateCapEns: '250', delegatorCapEns: '50', isCurrent: false, isUnlocked: false, additionalVPNeeded: '3000000', requiredAVP: '15000000' },
    { index: 5, momGrowthMinPct: '10.5', momGrowthMaxPct: '11.3', poolSizeEns: '24000', delegateCapEns: '300', delegatorCapEns: '60', isCurrent: false, isUnlocked: false, additionalVPNeeded: '4000000', requiredAVP: '16000000' },
  ],
}
```

- [ ] **Step 4: Create eligibility fixture**

```typescript
// src/test/mocks/fixtures/eligibility.ts
import type { EligibilityResponse } from '@/api/types'

export const eligibilityFixture: EligibilityResponse = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  isActiveDelegate: false,
  isDelegatorToActiveDelegate: true,
  eligible: true,
  delegatedTo: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
}

export const ineligibleFixture: EligibilityResponse = {
  address: '0x9999999999999999999999999999999999999999',
  isActiveDelegate: false,
  isDelegatorToActiveDelegate: false,
  eligible: false,
  delegatedTo: null,
}
```

- [ ] **Step 5: Create APY fixture**

```typescript
// src/test/mocks/fixtures/apy.ts
import type { ApyEstimateResponse } from '@/api/types'

export const apyFixture: ApyEstimateResponse = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  role: 'delegator',
  delegatedTo: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  currentTierIndex: 1,
  poolSizeEns: '8000',
  estimatedMonthlyRewardEns: '0.0042',
  estimatedApyPct: '5.75',
  userWeight: '1000',
  totalPoolWeight: '100000',
  currentBalanceEns: '3.41',
}
```

- [ ] **Step 6: Create lottery (distribution) fixture**

```typescript
// src/test/mocks/fixtures/lottery.ts
import type { DistributionResponse } from '@/api/types'

export const distributionFixture: DistributionResponse = {
  month: '2025-02',
  metadata: {
    totalDistributed: '8000000000000000000000',
    totalDistributedEns: '8000',
    poolTier: { momGrowthMinBps: '400', momGrowthMaxBps: '575', poolSize: '8000', delegateCap: '100', delegatorCap: '20' },
    momGrowthBps: '1240',
    activeDelegateCount: 47,
    eligibleDelegatorCount: 2341,
    computedAt: '2025-02-28T23:59:59Z',
    randaoSeed: '0xabc123',
  },
  directPayouts: [
    { address: '0x1234567890abcdef1234567890abcdef12345678', amount: '1000000000000000000', amountEns: '1.0', role: 'delegate' },
    { address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', amount: '500000000000000000', amountEns: '0.5', role: 'delegator' },
  ],
  lotteryPools: [
    {
      totalPrize: '10000000000000000000',
      totalPrizeEns: '10',
      winner: '0x9876543210fedcba9876543210fedcba98765432',
      entries: [
        { address: '0x9876543210fedcba9876543210fedcba98765432', originalAmount: '300000000000000000', role: 'delegator' },
        { address: '0x1111111111111111111111111111111111111111', originalAmount: '200000000000000000', role: 'delegator' },
      ],
    },
  ],
}
```

- [ ] **Step 7: Create index barrel for fixtures**

```typescript
// src/test/mocks/fixtures/index.ts
export { statusFixture } from './status'
export { delegatesFixture } from './delegates'
export { roundsFixture } from './rounds'
export { eligibilityFixture, ineligibleFixture } from './eligibility'
export { apyFixture } from './apy'
export { distributionFixture } from './lottery'
```

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "test: add MSW fixtures for all API endpoints"
```

---

### Task 6: Create MSW server and handlers

**Files:**
- Create: `src/test/mocks/handlers.ts`
- Create: `src/test/mocks/server.ts`

- [ ] **Step 1: Create MSW handlers**

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw'
import {
  statusFixture,
  delegatesFixture,
  roundsFixture,
  eligibilityFixture,
  apyFixture,
  distributionFixture,
} from './fixtures'

export const handlers = [
  http.get('/api/status', () => HttpResponse.json(statusFixture)),
  http.get('/api/delegates/active', () => HttpResponse.json(delegatesFixture)),
  http.get('/api/tiers/progression', () => HttpResponse.json(roundsFixture)),
  http.get('/api/eligibility/:address', () => HttpResponse.json(eligibilityFixture)),
  http.get('/api/apy/:address', () => HttpResponse.json(apyFixture)),
  http.get('/api/distributions/:month', () => HttpResponse.json(distributionFixture)),
]
```

- [ ] **Step 2: Create MSW server**

```typescript
// src/test/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "test: add MSW server and API handlers"
```

---

### Task 7: Create test setup and utilities

**Files:**
- Create: `src/test/setup.ts`
- Create: `src/test/utils.tsx`

- [ ] **Step 1: Create test setup**

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
import { server } from './mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

- [ ] **Step 2: Create test render utility**

This wraps components in all required providers. Wallet state is injectable for testing different states without wagmi.

```typescript
// src/test/utils.tsx
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'

// These imports will be wired up after providers are created (Task 10, 12).
// For now, create the file with a simple wrapper that will be extended.
import type { AppWalletState } from '@/features/wallet/wallet.types'

interface TestRenderOptions extends RenderOptions {
  walletState?: AppWalletState
  initialPath?: string
}

export function renderApp(
  ui: ReactElement,
  {
    walletState = { status: 'disconnected' },
    initialPath = '/',
    ...options
  }: TestRenderOptions = {},
) {
  // WalletStateContext and ThorinProvider will be added in Task 12
  // after the providers are created. For now, wrap in MemoryRouter only.
  return render(
    <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>,
    options,
  )
}

export { default as userEvent } from '@testing-library/user-event'
```

> **Note:** `renderApp` will be updated in Task 12 to wrap with `ThorinProvider` and `WalletStateContext.Provider`. This initial version lets tests compile before providers exist.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "test: add test setup with MSW and renderApp utility"
```

---

## Chunk 3: Core App Shell

### Task 8: Create wallet types

**Files:**
- Create: `src/features/wallet/wallet.types.ts`

- [ ] **Step 1: Write wallet types**

```typescript
// src/features/wallet/wallet.types.ts
export type AppWalletState =
  | { status: 'disconnected' }
  | { status: 'connected'; address: `0x${string}` }
  | {
      status: 'delegated'
      address: `0x${string}`
      delegatedTo: `0x${string}`
      ensName?: string
    }
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add AppWalletState type"
```

---

### Task 9: Create ThorinProvider

**Files:**
- Create: `src/app/providers/ThorinProvider.tsx`

- [ ] **Step 1: Write ThorinProvider**

Check Thorin docs at https://thorin.ens.domains for exact import paths. The standard setup is:

```typescript
// src/app/providers/ThorinProvider.tsx
import { ThorinGlobalStyles, lightTheme } from '@ensdomains/thorin'
import { ThemeProvider } from 'styled-components'
import type { ReactNode } from 'react'

export function ThorinProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={lightTheme}>
      <ThorinGlobalStyles />
      {children}
    </ThemeProvider>
  )
}
```

> **Important:** If Thorin's import API has changed, check `node_modules/@ensdomains/thorin/dist/types/index.d.ts` for the correct export names.

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add ThorinProvider"
```

---

### Task 10: Create AppKitProvider

**Files:**
- Create: `src/app/providers/AppKitProvider.tsx`

- [ ] **Step 1: Write AppKitProvider**

Reference Reown AppKit docs: https://docs.reown.com/appkit/react/core/installation

```typescript
// src/app/providers/AppKitProvider.tsx
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet } from '@reown/appkit/networks'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID ?? ''
const queryClient = new QueryClient()

const wagmiAdapter = new WagmiAdapter({
  networks: [mainnet],
  projectId,
})

createAppKit({
  adapters: [wagmiAdapter],
  networks: [mainnet],
  projectId,
  themeMode: 'light',
  themeVariables: { '--w3m-accent': '#3889ff' },
})

export function AppKitProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

> **Note:** If AppKit or wagmi adapter APIs differ, check installed package docs. The `createAppKit` call must happen at module level, outside the component.

- [ ] **Step 2: Verify it compiles**

```bash
cd apps/frontend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: may have errors from missing files (App.tsx, main.tsx). That's OK — those are created next.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add AppKitProvider with wagmi + Reown"
```

---

### Task 11: Create WalletStateProvider + useWalletState (TDD)

**Files:**
- Create: `src/features/wallet/WalletStateProvider.tsx`
- Create: `src/features/wallet/useWalletState.ts`
- Create: `src/features/wallet/useWalletState.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/wallet/useWalletState.test.ts
import { renderHook } from '@testing-library/react'
import { useWalletState } from './useWalletState'
import { WalletStateContext } from './WalletStateProvider'
import type { AppWalletState } from './wallet.types'
import type { ReactNode } from 'react'

function createWrapper(state: AppWalletState) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <WalletStateContext.Provider value={state}>
        {children}
      </WalletStateContext.Provider>
    )
  }
}

describe('useWalletState', () => {
  it('returns disconnected state', () => {
    const { result } = renderHook(() => useWalletState(), {
      wrapper: createWrapper({ status: 'disconnected' }),
    })
    expect(result.current.status).toBe('disconnected')
  })

  it('returns connected state with address', () => {
    const state: AppWalletState = {
      status: 'connected',
      address: '0x1234567890abcdef1234567890abcdef12345678',
    }
    const { result } = renderHook(() => useWalletState(), {
      wrapper: createWrapper(state),
    })
    expect(result.current.status).toBe('connected')
    if (result.current.status === 'connected') {
      expect(result.current.address).toBe('0x1234567890abcdef1234567890abcdef12345678')
    }
  })

  it('returns delegated state with delegatee info', () => {
    const state: AppWalletState = {
      status: 'delegated',
      address: '0x1234567890abcdef1234567890abcdef12345678',
      delegatedTo: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ensName: 'nick.eth',
    }
    const { result } = renderHook(() => useWalletState(), {
      wrapper: createWrapper(state),
    })
    expect(result.current.status).toBe('delegated')
    if (result.current.status === 'delegated') {
      expect(result.current.ensName).toBe('nick.eth')
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/frontend && pnpm vitest run src/features/wallet/useWalletState.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement WalletStateProvider and useWalletState**

```typescript
// src/features/wallet/WalletStateProvider.tsx
import { createContext, useMemo, useCallback, type ReactNode } from 'react'
import { useAccount } from 'wagmi'
import { useEnsName } from 'wagmi'
import { mainnet } from 'viem/chains'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/api'
import type { AppWalletState } from './wallet.types'

export const WalletStateContext = createContext<AppWalletState>({
  status: 'disconnected',
})

export function WalletStateProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount()

  const eligibilityFn = useCallback(
    () =>
      address
        ? api.eligibility(address)
        : Promise.reject(new Error('no address')),
    [address],
  )
  // useAsync's 2nd arg is a boolean guard — check src/hooks/useAsync.ts
  // to confirm it supports conditional execution. If not, wrap in useEffect instead.
  const eligibility = useAsync(eligibilityFn, isConnected && !!address)
  const { data: ensName } = useEnsName({
    address: eligibility.data?.delegatedTo as `0x${string}` | undefined,
    chainId: mainnet.id,
  })

  const state = useMemo<AppWalletState>(() => {
    if (!isConnected || !address) return { status: 'disconnected' }
    if (
      eligibility.data?.isDelegatorToActiveDelegate &&
      eligibility.data.delegatedTo
    ) {
      return {
        status: 'delegated',
        address,
        delegatedTo: eligibility.data.delegatedTo as `0x${string}`,
        ensName: ensName ?? undefined,
      }
    }
    return { status: 'connected', address }
  }, [isConnected, address, eligibility.data, ensName])

  return (
    <WalletStateContext.Provider value={state}>
      {children}
    </WalletStateContext.Provider>
  )
}
```

```typescript
// src/features/wallet/useWalletState.ts
import { useContext } from 'react'
import { WalletStateContext } from './WalletStateProvider'

export function useWalletState() {
  return useContext(WalletStateContext)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/frontend && pnpm vitest run src/features/wallet/useWalletState.test.ts
```

Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add WalletStateProvider and useWalletState hook"
```

---

### Task 12: Update test utilities with providers

**Files:**
- Modify: `src/test/utils.tsx`

- [ ] **Step 1: Update renderApp to include ThorinProvider and WalletStateContext**

```typescript
// src/test/utils.tsx — replace entire file
import { render, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ThorinProvider } from '@/app/providers/ThorinProvider'
import { WalletStateContext } from '@/features/wallet/WalletStateProvider'
import type { AppWalletState } from '@/features/wallet/wallet.types'
import type { ReactElement } from 'react'

interface TestRenderOptions extends RenderOptions {
  walletState?: AppWalletState
  initialPath?: string
}

export function renderApp(
  ui: ReactElement,
  {
    walletState = { status: 'disconnected' },
    initialPath = '/',
    ...options
  }: TestRenderOptions = {},
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ThorinProvider>
        <WalletStateContext.Provider value={walletState}>
          {ui}
        </WalletStateContext.Provider>
      </ThorinProvider>
    </MemoryRouter>,
    options,
  )
}

export { userEvent }
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "test: update renderApp with ThorinProvider and WalletStateContext"
```

---

### Task 13: Create Header and Footer

**Files:**
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/layout/Footer.tsx`

- [ ] **Step 1: Create Header**

Match Paper artboard "Mobile / Landing Page" header: ENS logo + "Incentives Program" left, "Connect" button right. Desktop nav: Dashboard, Active Delegates, Rounds, Lottery, Transparency.

```typescript
// src/components/layout/Header.tsx
import { NavLink } from 'react-router-dom'
import { Button } from '@ensdomains/thorin'
import { useWalletState } from '@/features/wallet/useWalletState'
import styled from 'styled-components'

const HeaderContainer = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  position: sticky;
  top: 0;
  z-index: 10;
`

const LogoArea = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const Brand = styled.span`
  font-size: 16px;
  font-weight: 830;
  color: ${({ theme }) => theme.colors.text};
`

const Nav = styled.nav`
  display: none;
  gap: 4px;
  @media (min-width: 768px) {
    display: flex;
  }
`

const StyledNavLink = styled(NavLink)`
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.textTertiary};
  transition: background 150ms ease, color 150ms ease;
  &.active {
    color: ${({ theme }) => theme.colors.accent};
    background: ${({ theme }) => theme.colors.accentSurface};
  }
`

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/delegates', label: 'Active Delegates' },
  { to: '/rounds', label: 'Rounds' },
  { to: '/lottery', label: 'Lottery' },
  { to: '/transparency', label: 'Transparency' },
]

const truncateAddress = (addr: string) =>
  `${addr.slice(0, 6)}…${addr.slice(-4)}`

export function Header() {
  const wallet = useWalletState()

  return (
    <HeaderContainer>
      <LogoArea>
        <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          {/* ENS-style logo — a circle with the ENS icon */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#3889FF" />
            <path d="M8 9l6 5-6 5V9z" fill="white" />
            <path d="M20 19l-6-5 6-5v10z" fill="white" opacity="0.6" />
          </svg>
          <Brand>Incentives Program</Brand>
        </NavLink>
      </LogoArea>
      <Nav>
        {navItems.map(({ to, label }) => (
          <StyledNavLink key={to} to={to}>{label}</StyledNavLink>
        ))}
      </Nav>
      {wallet.status === 'disconnected' ? (
        <appkit-button size="sm" />
      ) : (
        <appkit-account-button />
      )}
    </HeaderContainer>
  )
}
```

> **Note:** `<appkit-button>` and `<appkit-account-button>` are Reown AppKit web components that render the connect/account button. Declare their types in `vite-env.d.ts` if TypeScript complains. See https://docs.reown.com/appkit/react/core/components

- [ ] **Step 2: Create Footer**

Match Paper footer: "Incentives Pilot v1" + nav links + "Built by Blockful · Powered by Anticapture".

```typescript
// src/components/layout/Footer.tsx
import { Link } from 'react-router-dom'
import styled from 'styled-components'

const FooterContainer = styled.footer`
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  padding: 40px 20px;
  margin-top: 64px;
`

const FooterInner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
`

const TitleText = styled.span`
  font-weight: 700;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.text};
`

const Subtitle = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin: 0 0 24px;
`

const NavLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
`

const FooterLink = styled(Link)`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-decoration: none;
  &:hover { text-decoration: underline; }
`

const ExternalLink = styled.a`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.accent};
  text-decoration: none;
  &:hover { text-decoration: underline; }
`

const Credit = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin: 0;
`

export function Footer() {
  return (
    <FooterContainer>
      <FooterInner>
        <Title>
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#3889FF" />
            <path d="M8 9l6 5-6 5V9z" fill="white" />
            <path d="M20 19l-6-5 6-5v10z" fill="white" opacity="0.6" />
          </svg>
          <TitleText>Incentives Pilot v1</TitleText>
        </Title>
        <Subtitle>A security campaign for safer ENS governance</Subtitle>
        <NavLinks>
          <FooterLink to="/">How It Works</FooterLink>
          <FooterLink to="/delegates">Active Delegates</FooterLink>
          <FooterLink to="/rounds">Rounds</FooterLink>
          <FooterLink to="/lottery">Lottery</FooterLink>
          <FooterLink to="/transparency">Verify Data</FooterLink>
          <ExternalLink href="https://discuss.ens.domains" target="_blank" rel="noopener">
            ENS Forum ↗
          </ExternalLink>
          <ExternalLink href="https://github.com/blockful" target="_blank" rel="noopener">
            GitHub ↗
          </ExternalLink>
        </NavLinks>
        <Credit>Built by Blockful · Powered by Anticapture</Credit>
      </FooterInner>
    </FooterContainer>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add Header and Footer components"
```

---

### Task 14: Create AppLayout, Router, App, and main.tsx

**Files:**
- Create: `src/components/layout/AppLayout.tsx`
- Create: `src/app/Router.tsx`
- Create: `src/app/App.tsx`
- Create: `src/main.tsx`

- [ ] **Step 1: Create AppLayout**

```typescript
// src/components/layout/AppLayout.tsx
import { Header } from './Header'
import { Footer } from './Footer'
import styled from 'styled-components'
import type { ReactNode } from 'react'

const Main = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 20px;
  min-height: calc(100vh - 200px);
`

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <Main>{children}</Main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: Create Router with placeholder pages**

```typescript
// src/app/Router.tsx
import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'

// Placeholder pages — each will be replaced in subsequent tasks
function Placeholder({ name }: { name: string }) {
  return <div data-testid={`page-${name.toLowerCase()}`}>{name} — coming soon</div>
}

export function Router() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Placeholder name="Landing" />} />
        <Route path="/dashboard" element={<Placeholder name="Dashboard" />} />
        <Route path="/delegates" element={<Placeholder name="Delegates" />} />
        <Route path="/rounds" element={<Placeholder name="Rounds" />} />
        <Route path="/lottery" element={<Placeholder name="Lottery" />} />
        <Route path="/transparency" element={<Placeholder name="Transparency" />} />
      </Routes>
    </AppLayout>
  )
}
```

- [ ] **Step 3: Create App**

```typescript
// src/app/App.tsx
import { BrowserRouter } from 'react-router-dom'
import { AppKitProvider } from './providers/AppKitProvider'
import { ThorinProvider } from './providers/ThorinProvider'
import { WalletStateProvider } from '@/features/wallet/WalletStateProvider'
import { Router } from './Router'

export function App() {
  return (
    <AppKitProvider>
      <ThorinProvider>
        <BrowserRouter>
          <WalletStateProvider>
            <Router />
          </WalletStateProvider>
        </BrowserRouter>
      </ThorinProvider>
    </AppKitProvider>
  )
}
```

- [ ] **Step 4: Create main.tsx**

```typescript
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5: Verify the app compiles and starts**

```bash
cd apps/frontend && pnpm exec tsc --noEmit
```

Fix any type errors. Then:

```bash
pnpm dev &
sleep 3
curl -s http://localhost:5173 | head -5
kill %1
```

Expected: HTML response (vite dev server serving index.html).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add AppLayout, Router, App shell with all providers"
```

---

## Chunk 4: Shared Components

### Task 15: ProposalBar (TDD)

**Files:**
- Create: `src/components/shared/ProposalBar.tsx`
- Create: `src/components/shared/ProposalBar.test.tsx`

Match Paper design: 10 segments, filled segments are blue for voted, grey gap for missed. Score text "9/10" right-aligned.

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/shared/ProposalBar.test.tsx
import { render, screen } from '@testing-library/react'
import { ProposalBar } from './ProposalBar'

describe('ProposalBar', () => {
  it('renders score text', () => {
    const votes = [true, true, true, true, true, true, true, true, true, false]
    render(<ProposalBar votes={votes} />)
    expect(screen.getByText('9/10')).toBeInTheDocument()
  })

  it('renders 10 segments', () => {
    const votes = Array(10).fill(true) as boolean[]
    const { container } = render(<ProposalBar votes={votes} />)
    const segments = container.querySelectorAll('[data-segment]')
    expect(segments).toHaveLength(10)
  })

  it('marks voted segments as filled', () => {
    const votes = [true, false, true, false, true, false, true, false, true, false]
    const { container } = render(<ProposalBar votes={votes} />)
    const filled = container.querySelectorAll('[data-voted="true"]')
    expect(filled).toHaveLength(5)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd apps/frontend && pnpm vitest run src/components/shared/ProposalBar.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement ProposalBar**

```typescript
// src/components/shared/ProposalBar.tsx
import styled from 'styled-components'

interface ProposalBarProps {
  votes: boolean[]
}

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const Segments = styled.div`
  display: flex;
  gap: 2px;
  flex: 1;
`

const Segment = styled.div<{ $voted: boolean }>`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: ${({ $voted }) => ($voted ? '#3889FF' : '#E8E8ED')};
`

const Score = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textSecondary};
  min-width: 28px;
  text-align: right;
`

export function ProposalBar({ votes }: ProposalBarProps) {
  const votedCount = votes.filter(Boolean).length
  return (
    <Container>
      <Segments>
        {votes.map((voted, i) => (
          <Segment key={i} $voted={voted} data-segment data-voted={voted} />
        ))}
      </Segments>
      <Score>{votedCount}/{votes.length}</Score>
    </Container>
  )
}
```

- [ ] **Step 4: Run to verify passing**

```bash
cd apps/frontend && pnpm vitest run src/components/shared/ProposalBar.test.tsx
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add ProposalBar component with TDD"
```

---

### Task 16: TierDots component

**Files:**
- Create: `src/components/shared/TierDots.tsx`

Match Paper design: 6 dots, filled dots represent progress toward tier. Current tier dots are green, locked tier dots are grey.

- [ ] **Step 1: Implement TierDots**

```typescript
// src/components/shared/TierDots.tsx
import styled from 'styled-components'

interface TierDotsProps {
  tierIndex: number
  totalTiers?: number
}

const Container = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`

const Dot = styled.div<{ $filled: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $filled }) => ($filled ? '#121218' : '#E8E8ED')};
`

export function TierDots({ tierIndex, totalTiers = 6 }: TierDotsProps) {
  return (
    <Container>
      {Array.from({ length: totalTiers }, (_, i) => (
        <Dot key={i} $filled={i <= tierIndex} />
      ))}
    </Container>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add TierDots component"
```

---

### Task 17: EnsAvatar component

**Files:**
- Create: `src/components/shared/EnsAvatar.tsx`

ENS avatar with fallback to a colored circle with initials.

- [ ] **Step 1: Implement EnsAvatar**

```typescript
// src/components/shared/EnsAvatar.tsx
import styled from 'styled-components'

interface EnsAvatarProps {
  address: string
  name?: string
  size?: number
}

const AvatarCircle = styled.div<{ $size: number; $color: string }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ $size }) => Math.round($size * 0.4)}px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
`

function addressToColor(address: string): string {
  const hash = address.slice(2, 8)
  const num = parseInt(hash, 16)
  const hue = num % 360
  return `hsl(${hue}, 55%, 55%)`
}

export function EnsAvatar({ address, name, size = 40 }: EnsAvatarProps) {
  const label = name ? name.slice(0, 2).toUpperCase() : address.slice(2, 4).toUpperCase()
  const color = addressToColor(address)
  return (
    <AvatarCircle $size={size} $color={color} title={name ?? address}>
      {label}
    </AvatarCircle>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add EnsAvatar component"
```

---

## Chunk 5: Landing Page

### Task 18: HeroSection

**Files:**
- Create: `src/pages/LandingPage/sections/HeroSection.tsx`

Match Paper "Mobile / Landing Page" hero: "ENS GOVERNANCE · 90-DAY PILOT" label, large heading with APY highlight, subtitle, two CTAs.

- [ ] **Step 1: Implement HeroSection**

```typescript
// src/pages/LandingPage/sections/HeroSection.tsx
import { Button } from '@ensdomains/thorin'
import styled from 'styled-components'

interface HeroSectionProps {
  currentApyPct: string
}

const Section = styled.section`
  text-align: center;
  padding: 48px 0 32px;
  background: linear-gradient(180deg, #EBF2FF 0%, #FFFFFF 100%);
  margin: -32px -20px 0;
  padding: 48px 20px 40px;
`

const Label = styled.p`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin: 0 0 16px;
`

const Heading = styled.h1`
  font-size: 32px;
  font-weight: 830;
  line-height: 1.15;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 16px;
  @media (min-width: 768px) {
    font-size: 48px;
  }
`

const ApyHighlight = styled.span`
  background: #D4E8FF;
  padding: 2px 8px;
  border-radius: 6px;
  color: #3889FF;
`

const Subtitle = styled.p`
  font-size: 16px;
  color: ${({ theme }) => theme.colors.textSecondary};
  max-width: 480px;
  margin: 0 auto 24px;
  line-height: 1.5;
`

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
`

export function HeroSection({ currentApyPct }: HeroSectionProps) {
  return (
    <Section>
      <Label>ENS Governance · 90-Day Pilot</Label>
      <Heading>
        Your ENS is sitting idle.{' '}
        It could be earning <ApyHighlight>{currentApyPct}% APY</ApyHighlight>
      </Heading>
      <Subtitle>
        Help secure ENS governance by delegating to an active voter.
        Rewards are automatic, gas is sponsored.
      </Subtitle>
      <ButtonRow>
        <Button as="a" href="/delegates" colorStyle="accentPrimary">
          Delegate Now → Free
        </Button>
        <Button as="a" href="/" colorStyle="accentSecondary">
          Share this initiative
        </Button>
      </ButtonRow>
    </Section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add HeroSection for Landing page"
```

---

### Task 19: RoundStatusBar

**Files:**
- Create: `src/pages/LandingPage/sections/RoundStatusBar.tsx`

Match Paper: "No tokens locked · Gas sponsored · Rewards auto-sent" pills + round info bar.

- [ ] **Step 1: Implement RoundStatusBar**

```typescript
// src/pages/LandingPage/sections/RoundStatusBar.tsx
import styled from 'styled-components'

interface RoundStatusBarProps {
  currentGrowthPct: string
  currentTierIndex: number
  poolSizeEns: string
}

const Container = styled.div`
  text-align: center;
  margin-bottom: 32px;
`

const Pills = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  font-size: 13px;
  color: #199C75;
  font-weight: 600;
`

const InfoBar = styled.div`
  display: flex;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  overflow: hidden;
  max-width: 500px;
  margin: 0 auto;
`

const InfoCell = styled.div<{ $highlighted?: boolean }>`
  flex: 1;
  padding: 12px 16px;
  text-align: center;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-right: none; }
  ${({ $highlighted }) => $highlighted && `background: #F0FDF4;`}
`

const CellLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin-bottom: 2px;
`

const CellValue = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`

export function RoundStatusBar({ currentGrowthPct, currentTierIndex, poolSizeEns }: RoundStatusBarProps) {
  return (
    <Container>
      <Pills>
        <span>No tokens locked</span>
        <span>·</span>
        <span>Gas sponsored</span>
        <span>·</span>
        <span>Rewards auto-sent</span>
      </Pills>
      <InfoBar>
        {/* Round number hardcoded — backend does not provide round metadata yet */}
        <InfoCell $highlighted>
          <CellLabel>• Round 2</CellLabel>
          <CellValue>ends 18d 14h</CellValue>
        </InfoCell>
        <InfoCell>
          <CellLabel>Active VP Growth</CellLabel>
          <CellValue>+{currentGrowthPct}%</CellValue>
        </InfoCell>
        <InfoCell>
          <CellLabel>Tier {currentTierIndex + 1}</CellLabel>
          <CellValue>{poolSizeEns} ENS pool</CellValue>
        </InfoCell>
      </InfoBar>
    </Container>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add RoundStatusBar for Landing page"
```

---

### Task 20: TierTableSection

**Files:**
- Create: `src/pages/LandingPage/sections/TierTableSection.tsx`

Match Paper: left side copy + "Share & Grow the Pool" button. Right side: 6-tier table with dots, APY, lock/check icons.

- [ ] **Step 1: Implement TierTableSection**

```typescript
// src/pages/LandingPage/sections/TierTableSection.tsx
import { Button } from '@ensdomains/thorin'
import { TierDots } from '@/components/shared/TierDots'
import type { TierEntry } from '@/api/types'
import styled from 'styled-components'

interface TierTableSectionProps {
  tiers: TierEntry[]
}

const Section = styled.section`
  padding: 48px 0;
`

const Label = styled.p`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin: 0 0 12px;
`

const Heading = styled.h2`
  font-size: 28px;
  font-weight: 830;
  line-height: 1.15;
  margin: 0 0 12px;
  @media (min-width: 768px) { font-size: 36px; }
`

const Description = styled.p`
  font-size: 16px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.5;
  margin: 0 0 24px;
`

const Grid = styled.div`
  @media (min-width: 768px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    align-items: start;
  }
`

const Table = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  overflow: hidden;
`

const TierRow = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: none; }
  ${({ $active }) => $active && `background: #F0FDF4;`}
`

const TierName = styled.span<{ $active: boolean }>`
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  min-width: 56px;
`

const ApyText = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
`

const Icon = styled.span`
  font-size: 14px;
  margin-left: 4px;
`

export function TierTableSection({ tiers }: TierTableSectionProps) {
  return (
    <Section>
      <Grid>
        <div>
          <Label>The More People Join, The More You Earn</Label>
          <Heading>Your APY grows when others delegate too</Heading>
          <Description>
            This isn't a fixed yield. The reward pool unlocks higher tiers as more ENS gets
            delegated to active voters — so every person you bring in increases everyone's earnings.
          </Description>
          <Button colorStyle="accentPrimary" width="fit">
            Share & Grow the Pool
          </Button>
        </div>
        <Table>
          {tiers.map((tier) => (
            <TierRow key={tier.index} $active={tier.isCurrent}>
              <TierName $active={tier.isCurrent}>Tier #{tier.index + 1}</TierName>
              <TierDots tierIndex={tier.index} />
              <ApyText>~{tier.momGrowthMaxPct}% APY</ApyText>
              <Icon>{tier.isUnlocked ? '✓' : '🔒'}</Icon>
            </TierRow>
          ))}
        </Table>
      </Grid>
    </Section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add TierTableSection for Landing page"
```

---

### Task 21: HowItWorksSection and CtaSection

**Files:**
- Create: `src/pages/LandingPage/sections/HowItWorksSection.tsx`
- Create: `src/pages/LandingPage/sections/CtaSection.tsx`

- [ ] **Step 1: Implement HowItWorksSection**

Match Paper: "Simple to join. Better when more people do." heading + 4 step cards (1, 2, 3a, 3b).

```typescript
// src/pages/LandingPage/sections/HowItWorksSection.tsx
import styled from 'styled-components'

const Section = styled.section`
  padding: 48px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`

const Label = styled.p`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin: 0 0 12px;
`

const Heading = styled.h2`
  font-size: 28px;
  font-weight: 830;
  line-height: 1.15;
  margin: 0 0 8px;
  @media (min-width: 768px) { font-size: 36px; }
`

const Sub = styled.p`
  font-size: 16px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.5;
  margin: 0 0 32px;
`

const StepGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  @media (min-width: 768px) {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
`

const StepCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  padding: 20px;
  position: relative;
`

const StepNumber = styled.span`
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const StepIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-bottom: 12px;
`

const StepTitle = styled.h3`
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 6px;
`

const StepDesc = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.4;
  margin: 0 0 12px;
`

const StepTag = styled.span<{ $color: string }>`
  font-size: 12px;
  font-weight: 600;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => $color}15;
  padding: 4px 8px;
  border-radius: 4px;
`

const steps = [
  { num: '1', icon: '📋', bg: '#EBF2FF', title: 'Delegate to an active voter', desc: 'Pick a delegate who consistently votes on ENS proposals. You keep your tokens.', tag: 'Gas sponsored — free to delegate', tagColor: '#199C75' },
  { num: '2', icon: '📊', bg: '#FFF7EB', title: 'Your share grows with time', desc: 'Rewards are based on your average ENS balance over the last 180 days — not just your current balance. Longer holding means a bigger share.', tag: 'No claiming needed — sent to your wallet', tagColor: '#199C75' },
  { num: '3a', icon: '💰', bg: '#FFF0EB', title: 'Receive ENS at round end', desc: "If your share is 1 ENS or more, it's sent directly to your wallet at the end of each monthly round.", tag: 'Currently earning ~5.75% APY', tagColor: '#3889FF' },
  { num: '3b', icon: '🎰', bg: '#F5EBFF', title: 'Small balance? Enter the lottery', desc: 'Payouts under 1 ENS pool together until they reach 10 ENS — one winner takes the full prize.', tag: 'Lottery prize: 10 ENS', tagColor: '#C6302B' },
]

export function HowItWorksSection() {
  return (
    <Section>
      <Label>How It Works</Label>
      <Heading>Simple to join. Better when more people do.</Heading>
      <Sub>
        ENS governance is only as strong as its participation.
        This program makes it worth your while.
      </Sub>
      <StepGrid>
        {steps.map((s) => (
          <StepCard key={s.num}>
            <StepNumber>{s.num}</StepNumber>
            <StepIcon style={{ background: s.bg }}>{s.icon}</StepIcon>
            <StepTitle>{s.title}</StepTitle>
            <StepDesc>{s.desc}</StepDesc>
            <StepTag $color={s.tagColor}>{s.tag}</StepTag>
          </StepCard>
        ))}
      </StepGrid>
    </Section>
  )
}
```

- [ ] **Step 2: Implement CtaSection**

Match Paper: dark background, large heading, subtitle, two CTAs, green checkmarks.

```typescript
// src/pages/LandingPage/sections/CtaSection.tsx
import { Button } from '@ensdomains/thorin'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

const Section = styled.section`
  background: #121218;
  color: white;
  text-align: center;
  padding: 64px 20px;
  margin: 48px -20px 0;
  border-radius: 24px 24px 0 0;
`

const Heading = styled.h2`
  font-size: 28px;
  font-weight: 830;
  line-height: 1.15;
  margin: 0 0 12px;
  @media (min-width: 768px) { font-size: 40px; }
`

const Sub = styled.p`
  font-size: 16px;
  color: #9B9BA7;
  margin: 0 0 32px;
  line-height: 1.5;
`

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 32px;
`

const Checks = styled.div`
  display: flex;
  gap: 24px;
  justify-content: center;
  flex-wrap: wrap;
  font-size: 14px;
  color: #9B9BA7;
`

const Check = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  &::before {
    content: '✓';
    color: #199C75;
    font-weight: 700;
  }
`

export function CtaSection() {
  return (
    <Section>
      <Heading>Earn ENS rewards. Strengthen governance.</Heading>
      <Sub>Delegate in under a minute. Gas is sponsored. Rewards are automatic.</Sub>
      <ButtonRow>
        <Button as={Link} to="/delegates" colorStyle="accentPrimary">
          Delegate to an Active Delegate →
        </Button>
        <Button as={Link} to="/rounds" colorStyle="accentSecondary">
          View Live Round Progress
        </Button>
      </ButtonRow>
      <Checks>
        <Check>Gas sponsored via delegateBySig</Check>
        <Check>No tokens locked — delegate anytime</Check>
        <Check>Rewards sent automatically</Check>
      </Checks>
    </Section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add HowItWorksSection and CtaSection for Landing page"
```

---

### Task 22: Landing page states and page component

**Files:**
- Create: `src/pages/LandingPage/states/DisconnectedLanding.tsx`
- Create: `src/pages/LandingPage/states/ConnectedLanding.tsx`
- Create: `src/pages/LandingPage/states/DelegatedLanding.tsx`
- Create: `src/pages/LandingPage/index.tsx`

- [ ] **Step 1: Create DisconnectedLanding**

Composes all sections: Hero → RoundStatusBar → TierTable → HowItWorks → Cta.

```typescript
// src/pages/LandingPage/states/DisconnectedLanding.tsx
import { HeroSection } from '../sections/HeroSection'
import { RoundStatusBar } from '../sections/RoundStatusBar'
import { TierTableSection } from '../sections/TierTableSection'
import { HowItWorksSection } from '../sections/HowItWorksSection'
import { CtaSection } from '../sections/CtaSection'
import type { TierProgressionResponse } from '@/api/types'

interface Props {
  tiers: TierProgressionResponse
}

export function DisconnectedLanding({ tiers }: Props) {
  const currentTier = tiers.tiers[tiers.currentTierIndex]
  return (
    <>
      <HeroSection currentApyPct={currentTier?.momGrowthMaxPct ?? '0'} />
      <RoundStatusBar
        currentGrowthPct={tiers.currentGrowthPct}
        currentTierIndex={tiers.currentTierIndex}
        poolSizeEns={currentTier?.poolSizeEns ?? '0'}
      />
      <TierTableSection tiers={tiers.tiers} />
      <HowItWorksSection />
      <CtaSection />
    </>
  )
}
```

- [ ] **Step 2: Create ConnectedLanding and DelegatedLanding**

For now these are thin wrappers around DisconnectedLanding with minor UI differences (see spec §2.1). Full differentiation will be implemented when wallet integration is wired up.

```typescript
// src/pages/LandingPage/states/ConnectedLanding.tsx
import { DisconnectedLanding } from './DisconnectedLanding'
import type { TierProgressionResponse } from '@/api/types'

interface Props { tiers: TierProgressionResponse }

export function ConnectedLanding({ tiers }: Props) {
  // DEFERRED: Per spec §2.1, the connected state is visually identical
  // to disconnected except wallet address appears in Header (handled by Header component).
  // No CTA changes needed for connected-but-not-delegated state.
  return <DisconnectedLanding tiers={tiers} />
}
```

```typescript
// src/pages/LandingPage/states/DelegatedLanding.tsx
import { DisconnectedLanding } from './DisconnectedLanding'
import type { TierProgressionResponse } from '@/api/types'

interface Props { tiers: TierProgressionResponse }

export function DelegatedLanding({ tiers }: Props) {
  // DEFERRED: Per spec §2.1, delegated state should change:
  // - Hero sub-headline → "You're earning X.XX% APY" with tier tag
  // - "Delegate Now" CTA → "View your dashboard →"
  // - Dark CTA buttons → "Go to Dashboard" + "View Active Delegates"
  // These require passing APY data as props. Add after DashboardPage is wired.
  return <DisconnectedLanding tiers={tiers} />
}
```

- [ ] **Step 3: Create LandingPage index**

```typescript
// src/pages/LandingPage/index.tsx
import { useCallback } from 'react'
import { Spinner } from '@ensdomains/thorin'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/api'
import { useWalletState } from '@/features/wallet/useWalletState'
import { DisconnectedLanding } from './states/DisconnectedLanding'
import { ConnectedLanding } from './states/ConnectedLanding'
import { DelegatedLanding } from './states/DelegatedLanding'
import type { TierProgressionResponse } from '@/api/types'
import styled from 'styled-components'

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`

export function LandingPage() {
  const wallet = useWalletState()
  const tiersFn = useCallback(() => api.tierProgression(), [])
  const tiers = useAsync<TierProgressionResponse>(tiersFn)

  if (tiers.loading) {
    return <LoadingContainer><Spinner /></LoadingContainer>
  }

  if (tiers.error || !tiers.data) {
    return <p>Failed to load data. Please try again.</p>
  }

  switch (wallet.status) {
    case 'delegated':
      return <DelegatedLanding tiers={tiers.data} />
    case 'connected':
      return <ConnectedLanding tiers={tiers.data} />
    default:
      return <DisconnectedLanding tiers={tiers.data} />
  }
}
```

- [ ] **Step 4: Update Router to use LandingPage**

In `src/app/Router.tsx`, replace the Landing placeholder:

```typescript
import { LandingPage } from '@/pages/LandingPage'
// ...
<Route path="/" element={<LandingPage />} />
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add LandingPage with 3 wallet states"
```

---

### Task 23: LandingPage tests

**Files:**
- Create: `src/pages/LandingPage/LandingPage.test.tsx`

- [ ] **Step 1: Write LandingPage tests**

```typescript
// src/pages/LandingPage/LandingPage.test.tsx
import { screen, waitFor } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { LandingPage } from './index'

describe('LandingPage', () => {
  it('renders hero heading when disconnected', async () => {
    renderApp(<LandingPage />)
    await waitFor(() => {
      expect(screen.getByText(/Your ENS is sitting idle/)).toBeInTheDocument()
    })
  })

  it('renders tier table with 6 tiers', async () => {
    renderApp(<LandingPage />)
    await waitFor(() => {
      expect(screen.getByText('Tier #1')).toBeInTheDocument()
      expect(screen.getByText('Tier #6')).toBeInTheDocument()
    })
  })

  it('renders how it works section', async () => {
    renderApp(<LandingPage />)
    await waitFor(() => {
      expect(screen.getByText(/Simple to join/)).toBeInTheDocument()
    })
  })

  it('renders CTA section', async () => {
    renderApp(<LandingPage />)
    await waitFor(() => {
      expect(screen.getByText(/Earn ENS rewards/)).toBeInTheDocument()
    })
  })

  it('shows current APY in hero from tier data', async () => {
    renderApp(<LandingPage />)
    await waitFor(() => {
      // Fixture currentTierIndex=1, tiers[1].momGrowthMaxPct='5.75'
      expect(screen.getByText(/5\.75% APY/)).toBeInTheDocument()
    })
  })

  it('renders landing when wallet is connected', async () => {
    renderApp(<LandingPage />, {
      walletState: { status: 'connected', address: '0x1234567890abcdef1234567890abcdef12345678' },
    })
    await waitFor(() => {
      expect(screen.getByText(/Your ENS is sitting idle/)).toBeInTheDocument()
    })
  })

  it('renders landing when wallet is delegated', async () => {
    renderApp(<LandingPage />, {
      walletState: {
        status: 'delegated',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        delegatedTo: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        ensName: 'nick.eth',
      },
    })
    await waitFor(() => {
      // DEFERRED: when DelegatedLanding is differentiated,
      // update this test to check for "You're earning" instead
      expect(screen.getByText(/Your ENS is sitting idle/)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run tests**

```bash
cd apps/frontend && pnpm vitest run src/pages/LandingPage/LandingPage.test.tsx
```

Expected: PASS — 5 tests

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "test: add LandingPage tests"
```

---

## Chunk 6: Delegates Page (Core Flow)

### Task 24: Extend API types for DelegateDetail

**Files:**
- Modify: `src/api/types.ts`

- [ ] **Step 1: Add DelegateDetail type**

Append to `src/api/types.ts`:

```typescript
/** Extended delegate type — backend extension required for full data.
 *  Until backend ships, frontend creates partial DelegateDetail from addresses. */
export interface DelegateDetail {
  address: string
  ensName: string | null
  votingPower: string | null
  delegatorCount: number | null
  activeSince: string | null
  last10ProposalsVoted: boolean[] | null
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add DelegateDetail type to API types"
```

---

### Task 25: useDelegates hook (TDD)

**Files:**
- Create: `src/features/delegates/useDelegates.ts`
- Create: `src/features/delegates/useDelegates.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/features/delegates/useDelegates.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useDelegates } from './useDelegates'

describe('useDelegates', () => {
  it('fetches delegates and returns DelegateDetail array', async () => {
    const { result } = renderHook(() => useDelegates())
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.data).toHaveLength(3)
    expect(result.current.data![0].address).toBe(
      '0x1234567890abcdef1234567890abcdef12345678',
    )
  })

  it('sets loading to true initially', () => {
    const { result } = renderHook(() => useDelegates())
    expect(result.current.loading).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd apps/frontend && pnpm vitest run src/features/delegates/useDelegates.test.ts
```

- [ ] **Step 3: Implement useDelegates**

```typescript
// src/features/delegates/useDelegates.ts
import { useCallback } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/api'
import type { DelegateDetail } from '@/api/types'

export function useDelegates() {
  const fetchFn = useCallback(async () => {
    const res = await api.activeDelegates()
    // Transform address-only response to DelegateDetail[]
    // When backend is extended, this mapping becomes a pass-through
    const delegates: DelegateDetail[] = res.delegates.map((addr) => ({
      address: addr,
      ensName: null,
      votingPower: null,
      delegatorCount: null,
      activeSince: null,
      last10ProposalsVoted: null,
    }))
    return { count: res.count, delegates }
  }, [])

  const result = useAsync(fetchFn)

  return {
    loading: result.loading,
    error: result.error,
    data: result.data?.delegates ?? null,
    count: result.data?.count ?? 0,
  }
}
```

- [ ] **Step 4: Run to verify passing**

```bash
cd apps/frontend && pnpm vitest run src/features/delegates/useDelegates.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add useDelegates hook"
```

---

### Task 26: DelegateCard (TDD)

**Files:**
- Create: `src/pages/DelegatesPage/components/DelegateCard.tsx`
- Create: `src/pages/DelegatesPage/components/DelegateCard.test.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// src/pages/DelegatesPage/components/DelegateCard.test.tsx
import { screen } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { DelegateCard } from './DelegateCard'
import type { DelegateDetail } from '@/api/types'

const mockDelegate: DelegateDetail = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  ensName: 'nick.eth',
  votingPower: '42000',
  delegatorCount: 234,
  activeSince: '2024-01-15',
  last10ProposalsVoted: [true, true, true, true, true, true, true, true, true, false],
}

describe('DelegateCard', () => {
  it('renders ENS name', () => {
    renderApp(<DelegateCard delegate={mockDelegate} />)
    expect(screen.getByText('nick.eth')).toBeInTheDocument()
  })

  it('renders truncated address', () => {
    renderApp(<DelegateCard delegate={mockDelegate} />)
    expect(screen.getByText(/0x1234…5678/)).toBeInTheDocument()
  })

  it('renders voting power', () => {
    renderApp(<DelegateCard delegate={mockDelegate} />)
    expect(screen.getByText('42K VP')).toBeInTheDocument()
  })

  it('renders proposal score', () => {
    renderApp(<DelegateCard delegate={mockDelegate} />)
    expect(screen.getByText('9/10')).toBeInTheDocument()
  })

  it('renders Delegate button when not delegated', () => {
    renderApp(<DelegateCard delegate={mockDelegate} />)
    expect(screen.getByRole('button', { name: /Delegate/i })).toBeInTheDocument()
  })

  it('renders address-only card when metadata is null', () => {
    const minimal: DelegateDetail = {
      address: '0x1234567890abcdef1234567890abcdef12345678',
      ensName: null, votingPower: null, delegatorCount: null,
      activeSince: null, last10ProposalsVoted: null,
    }
    renderApp(<DelegateCard delegate={minimal} />)
    expect(screen.getByText(/0x1234…5678/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd apps/frontend && pnpm vitest run src/pages/DelegatesPage/components/DelegateCard.test.tsx
```

- [ ] **Step 3: Implement DelegateCard**

Match Paper artboard "Mobile / Delegates Page" card layout: avatar, name/address, proposal bar, stats, delegate button, full profile link.

```typescript
// src/pages/DelegatesPage/components/DelegateCard.tsx
import { Button } from '@ensdomains/thorin'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { ProposalBar } from '@/components/shared/ProposalBar'
import { useWalletState } from '@/features/wallet/useWalletState'
import type { DelegateDetail } from '@/api/types'
import styled from 'styled-components'

interface DelegateCardProps {
  delegate: DelegateDetail
}

const Card = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  padding: 20px;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`

const NameBlock = styled.div``

const Name = styled.div`
  font-size: 16px;
  font-weight: 700;
`

const Address = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const ProposalLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin-bottom: 4px;
`

const Stats = styled.div`
  display: flex;
  gap: 16px;
  margin: 16px 0;
`

const Stat = styled.div`
  text-align: left;
`

const StatValue = styled.div`
  font-size: 16px;
  font-weight: 700;
`

const StatLabel = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const ProfileLink = styled.a`
  display: block;
  text-align: center;
  margin-top: 8px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.accent};
  font-weight: 600;
  text-decoration: none;
`

const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`

function formatVP(vp: string): string {
  const n = Number(vp)
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M VP`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K VP`
  return `${n} VP`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`
}

export function DelegateCard({ delegate }: DelegateCardProps) {
  const wallet = useWalletState()
  const isDelegated = wallet.status === 'delegated' &&
    wallet.delegatedTo.toLowerCase() === delegate.address.toLowerCase()

  return (
    <Card>
      <Header>
        <EnsAvatar address={delegate.address} name={delegate.ensName ?? undefined} />
        <NameBlock>
          <Name>{delegate.ensName ?? truncate(delegate.address)}</Name>
          <Address>{truncate(delegate.address)}</Address>
        </NameBlock>
      </Header>

      {delegate.last10ProposalsVoted && (
        <>
          <ProposalLabel>Last 10 proposals</ProposalLabel>
          <ProposalBar votes={delegate.last10ProposalsVoted} />
        </>
      )}

      {(delegate.votingPower || delegate.delegatorCount !== null || delegate.activeSince) && (
        <Stats>
          {delegate.votingPower && (
            <Stat>
              <StatValue>{formatVP(delegate.votingPower)}</StatValue>
              <StatLabel>Voting power</StatLabel>
            </Stat>
          )}
          {delegate.delegatorCount !== null && (
            <Stat>
              <StatValue>{delegate.delegatorCount}</StatValue>
              <StatLabel>Delegators</StatLabel>
            </Stat>
          )}
          {delegate.activeSince && (
            <Stat>
              <StatValue>{formatDate(delegate.activeSince)}</StatValue>
              <StatLabel>Active since</StatLabel>
            </Stat>
          )}
        </Stats>
      )}

      <Button
        width="full"
        colorStyle={isDelegated ? 'greenPrimary' : 'accentPrimary'}
        disabled={isDelegated}
      >
        {isDelegated ? 'Delegated ✓' : 'Delegate'}
      </Button>
      <ProfileLink href={`https://app.ens.domains/${delegate.ensName ?? delegate.address}`} target="_blank" rel="noopener">
        Full profile ↗
      </ProfileLink>
    </Card>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
cd apps/frontend && pnpm vitest run src/pages/DelegatesPage/components/DelegateCard.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add DelegateCard component with TDD"
```

---

### Task 27: SortControls and StatsBar

**Files:**
- Create: `src/pages/DelegatesPage/components/SortControls.tsx`
- Create: `src/pages/DelegatesPage/components/StatsBar.tsx`

- [ ] **Step 1: Implement SortControls**

```typescript
// src/pages/DelegatesPage/components/SortControls.tsx
import styled from 'styled-components'

export type SortOption = 'votingPower' | 'activity' | 'random'

interface SortControlsProps {
  value: SortOption
  onChange: (option: SortOption) => void
}

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
`

const Label = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
`

const Pill = styled.button<{ $active: boolean }>`
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.border)};
  background: ${({ $active, theme }) => ($active ? theme.colors.text : 'transparent')};
  color: ${({ $active, theme }) => ($active ? 'white' : theme.colors.textSecondary)};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms;
`

const options: { value: SortOption; label: string }[] = [
  { value: 'votingPower', label: 'Voting Power' },
  { value: 'activity', label: 'Activity' },
  { value: 'random', label: 'Random' },
]

export function SortControls({ value, onChange }: SortControlsProps) {
  return (
    <Container>
      <Label>Sort by</Label>
      {options.map((opt) => (
        <Pill key={opt.value} $active={value === opt.value} onClick={() => onChange(opt.value)}>
          {opt.label}
        </Pill>
      ))}
    </Container>
  )
}
```

- [ ] **Step 2: Implement StatsBar**

```typescript
// src/pages/DelegatesPage/components/StatsBar.tsx
import styled from 'styled-components'

interface StatsBarProps {
  activeDelegates: number
  totalDelegated?: string
  holdersEarning?: number
}

const Bar = styled.div`
  display: flex;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 32px;
`

const Cell = styled.div`
  flex: 1;
  padding: 16px;
  text-align: center;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-right: none; }
`

const Value = styled.div`
  font-size: 24px;
  font-weight: 830;
`

const Label = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

export function StatsBar({ activeDelegates, totalDelegated, holdersEarning }: StatsBarProps) {
  return (
    <Bar>
      <Cell>
        <Value>{activeDelegates}</Value>
        <Label>active delegates</Label>
      </Cell>
      <Cell>
        <Value>{totalDelegated ?? '—'}</Value>
        <Label>ENS delegated</Label>
      </Cell>
      <Cell>
        <Value>{holdersEarning ?? '—'}</Value>
        <Label>holders earning</Label>
      </Cell>
    </Bar>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add SortControls and StatsBar for Delegates page"
```

---

### Task 28: DelegatesPage + tests

**Files:**
- Create: `src/pages/DelegatesPage/index.tsx`
- Create: `src/pages/DelegatesPage/DelegatesPage.test.tsx`

- [ ] **Step 1: Implement DelegatesPage**

```typescript
// src/pages/DelegatesPage/index.tsx
import { useState } from 'react'
import { Spinner } from '@ensdomains/thorin'
import { useDelegates } from '@/features/delegates/useDelegates'
import { DelegateCard } from './components/DelegateCard'
import { SortControls, type SortOption } from './components/SortControls'
import { StatsBar } from './components/StatsBar'
import styled from 'styled-components'

const Label = styled.p`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.accent};
  margin: 0 0 8px;
`

const Heading = styled.h1`
  font-size: 28px;
  font-weight: 830;
  line-height: 1.15;
  margin: 0 0 12px;
  @media (min-width: 768px) { font-size: 36px; }
`

const Sub = styled.p`
  font-size: 16px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.5;
  margin: 0 0 32px;
`

const Grid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  @media (min-width: 768px) {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }
`

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 64px;
`

export function DelegatesPage() {
  const { data, loading, count } = useDelegates()
  const [sort, setSort] = useState<SortOption>('votingPower')

  const sorted = data ? [...data].sort(() => {
    if (sort === 'random') return Math.random() - 0.5
    return 0 // votingPower and activity sorting requires backend data
  }) : []

  return (
    <>
      <Label>Delegate Your Tokens</Label>
      <Heading>Delegate to someone who shows up</Heading>
      <Sub>
        Every delegate here has voted on at least 7 of the last 10 on-chain proposals.
        Pick one and start earning.
      </Sub>

      <StatsBar activeDelegates={count} />
      <SortControls value={sort} onChange={setSort} />

      {loading && <LoadingContainer><Spinner /></LoadingContainer>}

      {!loading && data && (
        <Grid>
          {sorted.map((d) => (
            <DelegateCard key={d.address} delegate={d} />
          ))}
        </Grid>
      )}
    </>
  )
}
```

- [ ] **Step 2: Write DelegatesPage tests**

```typescript
// src/pages/DelegatesPage/DelegatesPage.test.tsx
import { screen, waitFor } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { DelegatesPage } from './index'

describe('DelegatesPage', () => {
  it('renders page heading', async () => {
    renderApp(<DelegatesPage />)
    expect(screen.getByText(/Delegate to someone who shows up/)).toBeInTheDocument()
  })

  it('renders stats bar with delegate count', async () => {
    renderApp(<DelegatesPage />)
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument() // fixture count
    })
  })

  it('renders delegate cards after loading', async () => {
    renderApp(<DelegatesPage />)
    await waitFor(() => {
      expect(screen.getAllByText(/0x.*…/)).toHaveLength(3) // 3 delegates from fixture
    })
  })

  it('renders sort controls', () => {
    renderApp(<DelegatesPage />)
    expect(screen.getByText('Voting Power')).toBeInTheDocument()
    expect(screen.getByText('Activity')).toBeInTheDocument()
    expect(screen.getByText('Random')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Update Router**

In `src/app/Router.tsx`:
```typescript
import { DelegatesPage } from '@/pages/DelegatesPage'
// Replace: <Route path="/delegates" element={<Placeholder name="Delegates" />} />
// With:
<Route path="/delegates" element={<DelegatesPage />} />
```

- [ ] **Step 4: Run tests**

```bash
cd apps/frontend && pnpm vitest run src/pages/DelegatesPage/
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add DelegatesPage with card grid, sort, stats"
```

---

## Chunk 7: Rounds Page (Core Flow)

### Task 29: useRounds hook (TDD)

**Files:**
- Create: `src/features/rounds/useRounds.ts`
- Create: `src/features/rounds/useRounds.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/features/rounds/useRounds.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useRounds } from './useRounds'

describe('useRounds', () => {
  it('fetches tier progression data', async () => {
    const { result } = renderHook(() => useRounds())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data?.currentTierIndex).toBe(1)
    expect(result.current.data?.tiers).toHaveLength(6)
  })

  it('returns current growth pct', async () => {
    const { result } = renderHook(() => useRounds())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data?.currentGrowthPct).toBe('12.40')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd apps/frontend && pnpm vitest run src/features/rounds/useRounds.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement useRounds**

```typescript
// src/features/rounds/useRounds.ts
import { useCallback } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/api'
import type { TierProgressionResponse } from '@/api/types'

export function useRounds() {
  const fetchFn = useCallback(() => api.tierProgression(), [])
  return useAsync<TierProgressionResponse>(fetchFn)
}
```

- [ ] **Step 4: Run tests**

```bash
cd apps/frontend && pnpm vitest run src/features/rounds/useRounds.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add useRounds hook"
```

---

### Task 30: TierTable (TDD)

**Files:**
- Create: `src/pages/RoundsPage/components/TierTable.tsx`
- Create: `src/pages/RoundsPage/components/TierTable.test.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// src/pages/RoundsPage/components/TierTable.test.tsx
import { screen } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { TierTable } from './TierTable'
import { roundsFixture } from '@/test/mocks/fixtures'

describe('TierTable', () => {
  it('renders all 6 tiers', () => {
    renderApp(<TierTable tiers={roundsFixture.tiers} currentTierIndex={1} />)
    expect(screen.getByText('Tier #1')).toBeInTheDocument()
    expect(screen.getByText('Tier #6')).toBeInTheDocument()
  })

  it('highlights current tier', () => {
    const { container } = renderApp(
      <TierTable tiers={roundsFixture.tiers} currentTierIndex={1} />,
    )
    const rows = container.querySelectorAll('[data-tier-row]')
    // Second row (index 1) should have active styling
    expect(rows[1]).toHaveAttribute('data-active', 'true')
  })

  it('shows APY for each tier', () => {
    renderApp(<TierTable tiers={roundsFixture.tiers} currentTierIndex={1} />)
    expect(screen.getByText(/~4\.0% APY/)).toBeInTheDocument()
    expect(screen.getByText(/~5\.75% APY/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Implement TierTable**

```typescript
// src/pages/RoundsPage/components/TierTable.tsx
import { TierDots } from '@/components/shared/TierDots'
import type { TierEntry } from '@/api/types'
import styled from 'styled-components'

interface TierTableProps {
  tiers: TierEntry[]
  currentTierIndex: number
}

const Container = styled.div``

const Label = styled.p`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin: 0 0 8px;
`

const Description = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0 0 16px;
  line-height: 1.4;
`

const Row = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: none; }
  ${({ $active }) => $active && `background: #F0FDF4; border-radius: 8px;`}
`

const TierName = styled.span<{ $active: boolean }>`
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  min-width: 56px;
`

const ApyText = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
`

const Icon = styled.span`
  font-size: 14px;
  margin-left: 4px;
`

export function TierTable({ tiers, currentTierIndex }: TierTableProps) {
  return (
    <Container>
      <Label>APY Tiers</Label>
      <Description>
        Higher tiers unlock as more ENS gets delegated. Everyone earns more when the pool grows.
      </Description>
      {tiers.map((tier) => (
        <Row
          key={tier.index}
          $active={tier.isCurrent}
          data-tier-row
          data-active={tier.isCurrent}
        >
          <TierName $active={tier.isCurrent}>Tier #{tier.index + 1}</TierName>
          <TierDots tierIndex={tier.index} />
          <ApyText>~{tier.momGrowthMaxPct}% APY</ApyText>
          <Icon>{tier.isUnlocked ? '✓' : '🔒'}</Icon>
        </Row>
      ))}
    </Container>
  )
}
```

- [ ] **Step 3: Run tests**

```bash
cd apps/frontend && pnpm vitest run src/pages/RoundsPage/components/TierTable.test.tsx
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add TierTable component with TDD"
```

---

### Task 31: RoundCard and RoundHistoryTable

**Files:**
- Create: `src/pages/RoundsPage/components/RoundCard.tsx`
- Create: `src/pages/RoundsPage/components/RoundHistoryTable.tsx`

- [ ] **Step 1: Implement RoundCard**

Match Paper "Mobile / Rounds Page" card: "Round 2" + "In progress" badge + % complete + progress bar + dates + 3 stat cards.

```typescript
// src/pages/RoundsPage/components/RoundCard.tsx
import { Tag } from '@ensdomains/thorin'
import styled from 'styled-components'

interface RoundCardProps {
  roundNumber: number
  percentComplete: number
  startDate: string   // e.g. "Feb 14, 2025"
  endDate: string     // e.g. "Mar 16"
  timeLeft: string    // e.g. "14d 6h left"
  poolSizeEns: string
  currentTier: number
  currentApyPct: string
}

const Card = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
`

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`

const RoundLabel = styled.span`
  font-size: 18px;
  font-weight: 830;
`

const Percent = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
`

const ProgressBar = styled.div`
  height: 6px;
  background: ${({ theme }) => theme.colors.border};
  border-radius: 3px;
  margin-bottom: 8px;
  overflow: hidden;
`

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: #3889FF;
  border-radius: 3px;
`

const DateRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin-bottom: 16px;
`

const StatsRow = styled.div`
  display: flex;
  gap: 8px;
`

const StatCard = styled.div`
  flex: 1;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 12px;
`

const StatLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin-bottom: 4px;
`

const StatValue = styled.div`
  font-size: 18px;
  font-weight: 830;
`

export function RoundCard({ roundNumber, percentComplete, startDate, endDate, timeLeft, poolSizeEns, currentTier, currentApyPct }: RoundCardProps) {
  return (
    <Card>
      <HeaderRow>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RoundLabel>Round {roundNumber}</RoundLabel>
          <Tag colorStyle="bluePrimary">In progress</Tag>
        </div>
        <Percent>{percentComplete}% complete</Percent>
      </HeaderRow>
      <ProgressBar><ProgressFill $pct={percentComplete} /></ProgressBar>
      <DateRow>
        <span>{startDate}</span>
        <span>{timeLeft} · {endDate}</span>
      </DateRow>
      <StatsRow>
        <StatCard><StatLabel>Pool</StatLabel><StatValue>{poolSizeEns} ENS</StatValue></StatCard>
        <StatCard><StatLabel>Your Tier</StatLabel><StatValue>Tier {currentTier + 1}</StatValue></StatCard>
        <StatCard><StatLabel>Current APY</StatLabel><StatValue style={{ color: '#199C75' }}>{currentApyPct}%</StatValue></StatCard>
      </StatsRow>
    </Card>
  )
}
```

- [ ] **Step 2: Implement RoundHistoryTable**

```typescript
// src/pages/RoundsPage/components/RoundHistoryTable.tsx
import { Tag } from '@ensdomains/thorin'
import styled from 'styled-components'

interface RoundHistoryEntry {
  round: number
  dates: string
  earned: string
  status: 'live' | 'paid'
}

interface RoundHistoryTableProps {
  entries: RoundHistoryEntry[]
}

const Label = styled.p`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin: 0 0 16px;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`

const Th = styled.th`
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textTertiary};
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const Td = styled.td`
  padding: 12px 0;
  font-size: 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const EarnedText = styled.span`
  color: #199C75;
  font-weight: 700;
`

export function RoundHistoryTable({ entries }: RoundHistoryTableProps) {
  return (
    <>
      <Label>Round History</Label>
      <Table>
        <thead>
          <tr><Th>Round</Th><Th>Dates</Th><Th>Earned</Th><Th>Status</Th></tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.round}>
              <Td><strong>Round {e.round}</strong></Td>
              <Td>{e.dates}</Td>
              <Td><EarnedText>+{e.earned} ENS</EarnedText></Td>
              <Td><Tag colorStyle={e.status === 'live' ? 'bluePrimary' : 'greyPrimary'}>{e.status === 'live' ? 'Live' : 'Paid'}</Tag></Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add RoundCard and RoundHistoryTable components"
```

---

### Task 32: RoundsPage + tests

**Files:**
- Create: `src/pages/RoundsPage/index.tsx`
- Create: `src/pages/RoundsPage/RoundsPage.test.tsx`

- [ ] **Step 1: Implement RoundsPage**

```typescript
// src/pages/RoundsPage/index.tsx
import { Spinner } from '@ensdomains/thorin'
import { useRounds } from '@/features/rounds/useRounds'
import { RoundCard } from './components/RoundCard'
import { TierTable } from './components/TierTable'
import { RoundHistoryTable } from './components/RoundHistoryTable'
import styled from 'styled-components'

const Label = styled.p`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin: 0 0 8px;
`

const Heading = styled.h1`
  font-size: 28px;
  font-weight: 830;
  margin: 0 0 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  @media (min-width: 768px) { font-size: 42px; }
`

const LiveBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #F0FDF4;
  color: #199C75;
  padding: 6px 16px;
  border-radius: 12px;
  font-size: 24px;
  font-weight: 700;
`

const Sub = styled.p`
  font-size: 16px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.5;
  margin: 0 0 32px;
`

const Grid = styled.div`
  @media (min-width: 768px) {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 32px;
    align-items: start;
  }
`

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 64px;
`

export function RoundsPage() {
  const rounds = useRounds()

  if (rounds.loading) {
    return <LoadingContainer><Spinner /></LoadingContainer>
  }

  if (rounds.error || !rounds.data) {
    return <p>Failed to load rounds data.</p>
  }

  const { data } = rounds
  const currentTier = data.tiers[data.currentTierIndex]

  // Round dates and history are not available from the current API.
  // These are hardcoded for the initial build. When the backend adds
  // round metadata (start/end dates, round number), replace with API data.
  // See spec §2.4 known limitation.
  const history = [
    { round: 2, dates: 'Dec 16 - Jan 14', earned: '0.0174', status: 'live' as const },
    { round: 1, dates: 'Nov 16 - Dec 15', earned: '0.0161', status: 'paid' as const },
  ]

  return (
    <>
      <Label>Rounds</Label>
      <Heading>
        Round {data.currentTierIndex + 1} is <LiveBadge>• live</LiveBadge>
      </Heading>
      <Sub>
        Each round lasts 30 days. Your share is based on your 180-day average ENS balance —
        longer holding, bigger share.
      </Sub>

      <Grid>
        <div>
          <RoundCard
            roundNumber={data.currentTierIndex + 1}
            percentComplete={47}
            poolSizeEns={currentTier?.poolSizeEns ?? '0'}
            currentTier={data.currentTierIndex}
            currentApyPct={currentTier?.momGrowthMaxPct ?? '0'}
          />
          <RoundHistoryTable entries={history} />
        </div>
        <TierTable tiers={data.tiers} currentTierIndex={data.currentTierIndex} />
      </Grid>
    </>
  )
}
```

- [ ] **Step 2: Write RoundsPage tests**

```typescript
// src/pages/RoundsPage/RoundsPage.test.tsx
import { screen, waitFor } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { RoundsPage } from './index'

describe('RoundsPage', () => {
  it('renders round heading with live badge', async () => {
    renderApp(<RoundsPage />)
    await waitFor(() => {
      expect(screen.getByText(/Round.*is/)).toBeInTheDocument()
      expect(screen.getByText(/live/)).toBeInTheDocument()
    })
  })

  it('renders tier table with 6 tiers', async () => {
    renderApp(<RoundsPage />)
    await waitFor(() => {
      expect(screen.getByText('Tier #1')).toBeInTheDocument()
      expect(screen.getByText('Tier #6')).toBeInTheDocument()
    })
  })

  it('renders round history', async () => {
    renderApp(<RoundsPage />)
    await waitFor(() => {
      expect(screen.getByText('Round History')).toBeInTheDocument()
    })
  })

  it('renders round card stats', async () => {
    renderApp(<RoundsPage />)
    await waitFor(() => {
      expect(screen.getByText(/8000 ENS/)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 3: Update Router**

```typescript
import { RoundsPage } from '@/pages/RoundsPage'
<Route path="/rounds" element={<RoundsPage />} />
```

- [ ] **Step 4: Run tests**

```bash
cd apps/frontend && pnpm vitest run src/pages/RoundsPage/
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add RoundsPage with round card, tier table, history"
```

---

## Chunk 8: Dashboard Page

### Task 33: Dashboard sections

**Files:**
- Create: `src/pages/DashboardPage/sections/EarningsCard.tsx`
- Create: `src/pages/DashboardPage/sections/RoundDetailsSection.tsx`
- Create: `src/pages/DashboardPage/sections/RoundProgressCard.tsx`
- Create: `src/pages/DashboardPage/sections/LotteryStatusCard.tsx`

- [ ] **Step 1: Implement EarningsCard**

Match Paper "Mobile / Dashboard" earnings section: large green number, APY badge, delegation pills, share buttons.

```typescript
// src/pages/DashboardPage/sections/EarningsCard.tsx
import { Button, Tag } from '@ensdomains/thorin'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import styled from 'styled-components'

interface EarningsCardProps {
  earnedEns: string
  apyPct: string
  tierIndex: number
  delegatedTo: string
  delegateEnsName?: string
  roundNumber: number
  timeLeft: string
}

const Card = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  padding: 24px;
`

const Label = styled.p`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin: 0 0 8px;
`

const EarningsAmount = styled.div`
  font-size: 48px;
  font-weight: 830;
  color: #199C75;
  line-height: 1;
  margin-bottom: 4px;
  @media (min-width: 768px) { font-size: 64px; }
`

const Subtitle = styled.p`
  font-size: 18px;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 8px;
`

const ApyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 14px;
`

const Pills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
`

const Pill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
`

const TimePill = styled(Pill)`
  color: #3889FF;
  border-color: #D4E8FF;
`

const ButtonRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 24px;
`

const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`

export function EarningsCard({ earnedEns, apyPct, tierIndex, delegatedTo, delegateEnsName, roundNumber, timeLeft }: EarningsCardProps) {
  return (
    <Card>
      <Label>Your Earnings</Label>
      <EarningsAmount>+{earnedEns}</EarningsAmount>
      <Subtitle>ENS earned so far</Subtitle>
      <ApyRow>
        Earning at <strong>{apyPct}% APY</strong>
        <Tag colorStyle="bluePrimary">Tier {tierIndex + 1}</Tag>
      </ApyRow>
      <Pills>
        <Pill>
          <EnsAvatar address={delegatedTo} name={delegateEnsName} size={20} />
          Delegating to <strong>{delegateEnsName ?? truncate(delegatedTo)}</strong>
        </Pill>
        <Pill>Round {roundNumber}</Pill>
        <TimePill>{timeLeft} left</TimePill>
      </Pills>
      <ButtonRow>
        <Button colorStyle="accentPrimary" width="full">✕ Share your earnings</Button>
        <Button colorStyle="accentSecondary" width="full">Share on Telegram</Button>
      </ButtonRow>
    </Card>
  )
}
```

- [ ] **Step 2: Implement RoundDetailsSection**

```typescript
// src/pages/DashboardPage/sections/RoundDetailsSection.tsx
import styled from 'styled-components'

interface RoundDetailsSectionProps {
  balanceEns: string
  roundEnds: string
  roundEndDate: string
  poolSizeEns: string
}

const Label = styled.p`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin: 0 0 12px;
`

const Grid = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
`

const StatCard = styled.div`
  flex: 1;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 12px;
`

const StatLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin-bottom: 4px;
`

const StatValue = styled.div`
  font-size: 18px;
  font-weight: 830;
`

const StatSub = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

export function RoundDetailsSection({ balanceEns, roundEnds, roundEndDate, poolSizeEns }: RoundDetailsSectionProps) {
  return (
    <>
      <Label>Round Details</Label>
      <Grid>
        <StatCard>
          <StatLabel>Balance</StatLabel>
          <StatValue>{balanceEns} ENS</StatValue>
          <StatSub>180-day avg</StatSub>
        </StatCard>
        <StatCard>
          <StatLabel>Round Ends</StatLabel>
          <StatValue>{roundEnds}</StatValue>
          <StatSub>{roundEndDate}</StatSub>
        </StatCard>
        <StatCard>
          <StatLabel>Pool</StatLabel>
          <StatValue>{poolSizeEns} ENS</StatValue>
          <StatSub>reward pool</StatSub>
        </StatCard>
      </Grid>
    </>
  )
}
```

- [ ] **Step 3: Implement RoundProgressCard and LotteryStatusCard**

```typescript
// src/pages/DashboardPage/sections/RoundProgressCard.tsx
import { Link } from 'react-router-dom'
import styled from 'styled-components'

interface RoundProgressCardProps {
  roundNumber: number
  percentComplete: number
}

const Card = styled(Link)`
  display: block;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  padding: 20px;
  text-decoration: none;
  color: inherit;
  margin-bottom: 12px;
`

const Label = styled.p`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin: 0 0 8px;
`

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const Value = styled.span`
  font-size: 16px;
  font-weight: 700;
`

const Chevron = styled.span`
  font-size: 18px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const ProgressBar = styled.div`
  height: 4px;
  background: ${({ theme }) => theme.colors.border};
  border-radius: 2px;
  margin-top: 12px;
`

const Fill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: #3889FF;
  border-radius: 2px;
`

export function RoundProgressCard({ roundNumber, percentComplete }: RoundProgressCardProps) {
  return (
    <Card to="/rounds">
      <Label>Round Progress</Label>
      <Row>
        <Value>Round {roundNumber} · {percentComplete}% complete</Value>
        <Chevron>›</Chevron>
      </Row>
      <ProgressBar><Fill $pct={percentComplete} /></ProgressBar>
    </Card>
  )
}
```

```typescript
// src/pages/DashboardPage/sections/LotteryStatusCard.tsx
import { Link } from 'react-router-dom'
import styled from 'styled-components'

interface LotteryStatusCardProps {
  poolNumber: number
  accumulated: string
  odds: string
}

const Card = styled(Link)`
  display: block;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  padding: 20px;
  text-decoration: none;
  color: inherit;
`

const Label = styled.p`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin: 0 0 8px;
`

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const Value = styled.span`
  font-size: 16px;
  font-weight: 700;
`

const Sub = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 4px 0 0;
`

export function LotteryStatusCard({ poolNumber, accumulated, odds }: LotteryStatusCardProps) {
  return (
    <Card to="/lottery">
      <Label>Lottery</Label>
      <Row>
        <Value>You're in pool #{poolNumber}</Value>
        <span style={{ fontSize: 18, color: '#9B9BA7' }}>›</span>
      </Row>
      <Sub>{accumulated} ENS accumulated · ~{odds}% odds</Sub>
    </Card>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add Dashboard section components"
```

---

### Task 34: DashboardPage + tests

**Files:**
- Create: `src/pages/DashboardPage/index.tsx`
- Create: `src/pages/DashboardPage/DashboardPage.test.tsx`

- [ ] **Step 1: Implement DashboardPage**

```typescript
// src/pages/DashboardPage/index.tsx
import { useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { Spinner } from '@ensdomains/thorin'
import { useWalletState } from '@/features/wallet/useWalletState'
import { useEnsName } from 'wagmi'
import { mainnet } from 'viem/chains'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/api'
import { EarningsCard } from './sections/EarningsCard'
import { RoundDetailsSection } from './sections/RoundDetailsSection'
import { RoundProgressCard } from './sections/RoundProgressCard'
import { LotteryStatusCard } from './sections/LotteryStatusCard'
import type { ApyEstimateResponse, TierProgressionResponse } from '@/api/types'
import styled from 'styled-components'

const Grid = styled.div`
  @media (min-width: 768px) {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 32px;
    align-items: start;
  }
`

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 64px;
`

export function DashboardPage() {
  const wallet = useWalletState()

  if (wallet.status === 'disconnected') {
    return <Navigate to="/" replace />
  }

  const address = wallet.address

  const apyFn = useCallback(() => api.apy(address), [address])
  const tiersFn = useCallback(() => api.tierProgression(), [])
  const apyData = useAsync<ApyEstimateResponse>(apyFn)
  const tiersData = useAsync<TierProgressionResponse>(tiersFn)

  if (apyData.loading || tiersData.loading) {
    return <LoadingContainer><Spinner /></LoadingContainer>
  }

  if (!apyData.data || !tiersData.data) {
    return <p>Failed to load dashboard data.</p>
  }

  const apy = apyData.data
  const tiers = tiersData.data
  const currentTier = tiers.tiers[tiers.currentTierIndex]

  // Resolve ENS name of the delegate (not the connected user)
  const delegateAddress = apy.delegatedTo as `0x${string}` | undefined
  const { data: delegateEnsName } = useEnsName({
    address: delegateAddress ?? undefined,
    chainId: mainnet.id,
  })

  return (
    <Grid>
      <EarningsCard
        earnedEns={apy.estimatedMonthlyRewardEns}
        apyPct={apy.estimatedApyPct}
        tierIndex={apy.currentTierIndex}
        delegatedTo={apy.delegatedTo ?? address}
        delegateEnsName={delegateEnsName ?? undefined}
        roundNumber={tiers.currentTierIndex + 1}
        timeLeft="14d 6h"
      />
      <div>
        <RoundDetailsSection
          balanceEns={apy.currentBalanceEns}
          roundEnds="14d 6h"
          roundEndDate="Mar 16, 2025"
          poolSizeEns={currentTier?.poolSizeEns ?? '0'}
        />
        <RoundProgressCard roundNumber={tiers.currentTierIndex + 1} percentComplete={47} />
        <LotteryStatusCard poolNumber={14} accumulated="8.4 / 10" odds="3.2" />
      </div>
    </Grid>
  )
}
```

- [ ] **Step 2: Write DashboardPage tests**

```typescript
// src/pages/DashboardPage/DashboardPage.test.tsx
import { screen, waitFor } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { DashboardPage } from './index'

const connectedWallet = {
  status: 'connected' as const,
  address: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
}

describe('DashboardPage', () => {
  it('redirects to landing when disconnected', () => {
    renderApp(<DashboardPage />)
    // Since we use MemoryRouter, it won't actually navigate, but we should not see dashboard content
    expect(screen.queryByText('Your Earnings')).not.toBeInTheDocument()
  })

  it('renders earnings when connected', async () => {
    renderApp(<DashboardPage />, { walletState: connectedWallet })
    await waitFor(() => {
      expect(screen.getByText(/ENS earned so far/)).toBeInTheDocument()
    })
  })

  it('shows APY and balance data', async () => {
    renderApp(<DashboardPage />, { walletState: connectedWallet })
    await waitFor(() => {
      expect(screen.getByText(/5\.75% APY/)).toBeInTheDocument()
    })
  })

  it('renders round progress card', async () => {
    renderApp(<DashboardPage />, { walletState: connectedWallet })
    await waitFor(() => {
      expect(screen.getByText(/Round Progress/)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 3: Update Router**

```typescript
import { DashboardPage } from '@/pages/DashboardPage'
<Route path="/dashboard" element={<DashboardPage />} />
```

- [ ] **Step 4: Run tests**

```bash
cd apps/frontend && pnpm vitest run src/pages/DashboardPage/
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add DashboardPage with earnings, round details, lottery"
```

---

## Chunk 9: Lottery & Transparency Pages

### Task 35: useLottery hook (TDD)

**Files:**
- Create: `src/features/lottery/useLottery.ts`
- Create: `src/features/lottery/useLottery.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/features/lottery/useLottery.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useLottery } from './useLottery'

describe('useLottery', () => {
  it('fetches distribution data with lottery pools', async () => {
    const { result } = renderHook(() => useLottery())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data?.lotteryPools).toHaveLength(1)
    expect(result.current.data?.lotteryPools[0].totalPrizeEns).toBe('10')
  })
})
```

- [ ] **Step 2: Implement useLottery**

```typescript
// src/features/lottery/useLottery.ts
import { useCallback } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/api'
import type { DistributionResponse } from '@/api/types'

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function useLottery() {
  const month = currentMonth()
  const fetchFn = useCallback(() => api.distribution(month), [month])
  return useAsync<DistributionResponse>(fetchFn)
}
```

- [ ] **Step 3: Run tests**

```bash
cd apps/frontend && pnpm vitest run src/features/lottery/useLottery.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add useLottery hook"
```

---

### Task 36: LotteryPage + tests

**Files:**
- Create: `src/pages/LotteryPage/index.tsx`
- Create: `src/pages/LotteryPage/LotteryPage.test.tsx`

- [ ] **Step 1: Implement LotteryPage**

Match Paper "Mobile / Lottery Page": hero with light blue bg, qualifying card, prize card, "How the draw works", last winner.

```typescript
// src/pages/LotteryPage/index.tsx
import { Spinner } from '@ensdomains/thorin'
import { useLottery } from '@/features/lottery/useLottery'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import styled from 'styled-components'

const HeroSection = styled.section`
  background: linear-gradient(180deg, #EBF2FF 0%, #FFFFFF 100%);
  margin: -32px -20px 0;
  padding: 48px 20px 40px;
  text-align: center;
`

const Label = styled.p`
  font-size: 12px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; color: ${({ theme }) => theme.colors.textTertiary};
  margin: 0 0 12px;
`

const Heading = styled.h1`
  font-size: 28px; font-weight: 830; line-height: 1.15;
  margin: 0 0 12px;
  @media (min-width: 768px) { font-size: 42px; }
`

const Sub = styled.p`
  font-size: 16px; color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.5; margin: 0 auto 32px; max-width: 520px;
`

const PrizeCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 32px;
`

const PrizeAmount = styled.div`
  font-size: 48px; font-weight: 830; color: #199C75; margin: 8px 0;
`

const StatsRow = styled.div`
  display: flex; gap: 0; border-top: 1px solid ${({ theme }) => theme.colors.border};
  margin-top: 16px;
`

const StatCell = styled.div`
  flex: 1; padding: 12px; text-align: center;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-right: none; }
`

const StatValue = styled.div` font-size: 24px; font-weight: 830; `
const StatLabel = styled.div` font-size: 11px; color: ${({ theme }) => theme.colors.textTertiary}; `

const HowBox = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px; padding: 20px; margin-bottom: 32px;
`

const StepRow = styled.div`
  display: flex; gap: 12px; align-items: flex-start; padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-of-type { border-bottom: none; }
`

const StepNum = styled.span`
  width: 28px; height: 28px; border-radius: 50%; background: #3889FF;
  color: white; display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; flex-shrink: 0;
`

const WinnerCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px; padding: 20px;
`

const WinnerRow = styled.div`
  display: flex; align-items: center; justify-content: space-between;
`

const WinnerInfo = styled.div`
  display: flex; align-items: center; gap: 12px;
`

const WinnerAmount = styled.span`
  font-size: 18px; font-weight: 830; color: #E9B911;
`

const LoadingContainer = styled.div`
  display: flex; justify-content: center; padding: 64px;
`

const ViewLink = styled.a`
  display: block; margin-top: 12px; font-size: 14px;
  color: ${({ theme }) => theme.colors.accent}; font-weight: 600; text-decoration: none;
`

export function LotteryPage() {
  const lottery = useLottery()

  if (lottery.loading) {
    return <LoadingContainer><Spinner /></LoadingContainer>
  }

  const data = lottery.data
  const lastWinner = data?.lotteryPools[0]

  return (
    <>
      <HeroSection>
        <Label>Lottery</Label>
        <Heading>Small balance? You still have a shot.</Heading>
        <Sub>
          Payouts below 1 ENS pool together and become a 10 ENS prize.
          One winner per pool, drawn at round end.
        </Sub>
      </HeroSection>

      {/* "You qualify for the lottery" card — shown when connected and qualifying */}
      {data && (
        <div style={{ border: '1px solid #199C75', borderRadius: 16, padding: 20, background: '#F0FDF4', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: '#199C75', fontWeight: 700 }}>You qualify for the lottery</span>
            <span style={{ color: '#3889FF', fontWeight: 700 }}>Pool #{data.lotteryPools.length}</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div><div style={{ fontWeight: 830, fontSize: 18 }}>~3.2%</div><div style={{ fontSize: 12, color: '#6B7280' }}>your odds</div></div>
            <div><div style={{ fontWeight: 830, fontSize: 18 }}>{data.lotteryPools[0]?.totalPrizeEns ?? '0'}/10 ENS</div><div style={{ fontSize: 12, color: '#6B7280' }}>pool accumulated</div></div>
            <div><div style={{ fontWeight: 830, fontSize: 18 }}>14d 6h</div><div style={{ fontSize: 12, color: '#6B7280' }}>until draw</div></div>
          </div>
        </div>
      )}

      <PrizeCard>
        <div style={{ fontSize: 40 }}>🏆</div>
        <Label>Prize Per Pool</Label>
        <PrizeAmount>10 ENS</PrizeAmount>
        <Sub style={{ marginBottom: 0 }}>Sent directly to your wallet at round end</Sub>
        <StatsRow>
          <StatCell>
            <StatValue>{data?.metadata.eligibleDelegatorCount ?? '—'}</StatValue>
            <StatLabel>qualifying addresses</StatLabel>
          </StatCell>
          <StatCell>
            <StatValue>{data?.lotteryPools.length ?? '—'}</StatValue>
            <StatLabel>active prize pools</StatLabel>
          </StatCell>
        </StatsRow>
      </PrizeCard>

      <HowBox>
        <h3 style={{ fontWeight: 700, margin: '0 0 12px' }}>How the draw works</h3>
        <StepRow>
          <StepNum>1</StepNum>
          <p style={{ margin: 0, fontSize: 14 }}>Sub-1 ENS payouts grouped into pools approaching 10 ENS each</p>
        </StepRow>
        <StepRow>
          <StepNum>2</StepNum>
          <p style={{ margin: 0, fontSize: 14 }}>Odds are proportional to calculated payout, bigger balance = better odds</p>
        </StepRow>
        <StepRow>
          <StepNum>3</StepNum>
          <p style={{ margin: 0, fontSize: 14 }}>Winner drawn using RANDAO (last block of the round) — publicly verifiable</p>
        </StepRow>
        <ViewLink href="#">View randomness methodology →</ViewLink>
      </HowBox>

      {lastWinner && (
        <>
          <Label style={{ textAlign: 'left' }}>Last Winner · Round 1</Label>
          <WinnerCard>
            <WinnerRow>
              <WinnerInfo>
                <EnsAvatar address={lastWinner.winner} size={40} />
                <div>
                  <div style={{ fontWeight: 700 }}>{lastWinner.winner.slice(0, 10)}…</div>
                  <div style={{ fontSize: 13, color: '#9B9BA7' }}>Pool #87 · Jan 15, 2025</div>
                </div>
              </WinnerInfo>
              <div style={{ textAlign: 'right' }}>
                <WinnerAmount>10 ENS</WinnerAmount>
                <div style={{ fontSize: 12, color: '#E9B911' }}>won</div>
              </div>
            </WinnerRow>
          </WinnerCard>
          <ViewLink href="#" style={{ textAlign: 'left' }}>View all past winners →</ViewLink>
        </>
      )}
    </>
  )
}
```

- [ ] **Step 2: Write LotteryPage tests**

```typescript
// src/pages/LotteryPage/LotteryPage.test.tsx
import { screen, waitFor } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { LotteryPage } from './index'

describe('LotteryPage', () => {
  it('renders lottery heading', async () => {
    renderApp(<LotteryPage />)
    expect(screen.getByText(/Small balance/)).toBeInTheDocument()
  })

  it('renders prize amount', async () => {
    renderApp(<LotteryPage />)
    await waitFor(() => {
      expect(screen.getByText('10 ENS')).toBeInTheDocument()
    })
  })

  it('renders how the draw works', () => {
    renderApp(<LotteryPage />)
    expect(screen.getByText(/How the draw works/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Update Router**

```typescript
import { LotteryPage } from '@/pages/LotteryPage'
<Route path="/lottery" element={<LotteryPage />} />
```

- [ ] **Step 4: Run tests**

```bash
cd apps/frontend && pnpm vitest run src/pages/LotteryPage/
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add LotteryPage with prize card, draw steps, last winner"
```

---

### Task 37: TransparencyPage + tests

**Files:**
- Create: `src/pages/TransparencyPage/index.tsx`
- Create: `src/pages/TransparencyPage/TransparencyPage.test.tsx`

- [ ] **Step 1: Implement TransparencyPage**

Match Paper "Mobile / Transparency": verify links, smart contracts with Verified badges, live data stats, how rewards are calculated steps.

```typescript
// src/pages/TransparencyPage/index.tsx
import { useCallback } from 'react'
import { Spinner, Tag } from '@ensdomains/thorin'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/api'
import { contracts } from '@/config/contracts'
import type { StatusResponse, TierProgressionResponse } from '@/api/types'
import styled from 'styled-components'

const Label = styled.p`
  font-size: 12px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; color: ${({ theme }) => theme.colors.textTertiary};
  margin: 0 0 8px;
`

const Heading = styled.h1`
  font-size: 28px; font-weight: 830; line-height: 1.15; margin: 0 0 12px;
  @media (min-width: 768px) { font-size: 42px; }
`

const Sub = styled.p`
  font-size: 16px; color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.5; margin: 0 0 32px;
`

const LinkCard = styled.a`
  display: flex; align-items: center; justify-content: space-between;
  border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 12px;
  padding: 16px; margin-bottom: 8px; text-decoration: none; color: inherit;
  &:hover { background: ${({ theme }) => theme.colors.backgroundSecondary}; }
`

const LinkInfo = styled.div`
  display: flex; align-items: center; gap: 12px;
`

const LinkIcon = styled.div`
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; background: ${({ theme }) => theme.colors.backgroundSecondary};
`

const ContractRow = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 12px;
  padding: 16px; margin-bottom: 8px;
`

const StatGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 32px;
`

const StatCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 12px; padding: 16px;
`

const StatCardLabel = styled.div`
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  color: ${({ theme }) => theme.colors.accent}; margin-bottom: 4px;
`

const StatCardValue = styled.div` font-size: 20px; font-weight: 830; `

const StepRow = styled.div`
  display: flex; gap: 12px; margin-bottom: 24px;
`

const StepNum = styled.span`
  width: 28px; height: 28px; border-radius: 50%; background: #3889FF;
  color: white; display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; flex-shrink: 0;
`

const Grid = styled.div`
  @media (min-width: 768px) {
    display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: start;
  }
`

const Section = styled.section` margin-bottom: 32px; `

const LoadingContainer = styled.div`
  display: flex; justify-content: center; padding: 64px;
`

const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`

const verifyLinks = [
  { icon: '🐙', name: 'GitHub', desc: 'Allocation scripts and data', href: 'https://github.com/blockful' },
  { icon: '🌐', name: 'Anticapture', desc: 'Delegate activity & governance health', href: 'https://anticapture.xyz' },
  { icon: '📊', name: 'Dune Analytics', desc: 'Live round data & payout breakdown', href: 'https://dune.com' },
]

const contractList = [
  { name: 'ENS Incentives', address: contracts.ensIncentives },
  { name: 'DelegateBySig', address: contracts.delegateBySig },
  { name: 'Reward Distributor', address: contracts.rewardDistributor },
]

export function TransparencyPage() {
  const statusFn = useCallback(() => api.status(), [])
  const tiersFn = useCallback(() => api.tierProgression(), [])
  const status = useAsync<StatusResponse>(statusFn)
  const tiers = useAsync<TierProgressionResponse>(tiersFn)

  if (status.loading || tiers.loading) {
    return <LoadingContainer><Spinner /></LoadingContainer>
  }

  const currentTier = tiers.data?.tiers[tiers.data.currentTierIndex]

  return (
    <>
      <Label>Transparency</Label>
      <Heading>Verify everything on-chain</Heading>
      <Sub>
        Every calculation is public. Every payout is verifiable.
        No trust required, check it yourself.
      </Sub>

      <Grid>
        <div>
          <Section>
            <Label>Verify Yourself</Label>
            {verifyLinks.map((l) => (
              <LinkCard key={l.name} href={l.href} target="_blank" rel="noopener">
                <LinkInfo>
                  <LinkIcon>{l.icon}</LinkIcon>
                  <div>
                    <div style={{ fontWeight: 700 }}>{l.name}</div>
                    <div style={{ fontSize: 13, color: '#9B9BA7' }}>{l.desc}</div>
                  </div>
                </LinkInfo>
                <span style={{ color: '#9B9BA7' }}>›</span>
              </LinkCard>
            ))}
          </Section>

          <Section>
            <Label>Smart Contracts</Label>
            {contractList.map((c) => (
              <ContractRow key={c.name}>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: '#9B9BA7' }}>{truncate(c.address)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag colorStyle="greenSecondary">Verified</Tag>
                  <a href={`https://etherscan.io/address/${c.address}`} target="_blank" rel="noopener" style={{ color: '#9B9BA7' }}>↗</a>
                </div>
              </ContractRow>
            ))}
          </Section>

          <Section>
            <Label>Round {(tiers.data?.currentTierIndex ?? 0) + 1} · Live Data</Label>
            <StatGrid>
              <StatCard><StatCardLabel>Snapshot Block</StatCardLabel><StatCardValue>#19,204,881</StatCardValue></StatCard>
              <StatCard><StatCardLabel>Total Delegated</StatCardLabel><StatCardValue>12.4M ENS</StatCardValue></StatCard>
              <StatCard><StatCardLabel>Eligible Holders</StatCardLabel><StatCardValue>{status.data?.activeDelegateCount ?? '—'}</StatCardValue></StatCard>
              <StatCard><StatCardLabel>Reward Pool</StatCardLabel><StatCardValue>{currentTier?.poolSizeEns ?? '—'} ENS</StatCardValue></StatCard>
            </StatGrid>
          </Section>
        </div>

        <Section>
          <Label>How Rewards Are Calculated</Label>
          <StepRow>
            <StepNum>1</StepNum>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Balance snapshot</div>
              <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.4 }}>
                Your share is based on the average of your daily ENS balance over the last 180 days — not just your current balance.
              </p>
            </div>
          </StepRow>
          <StepRow>
            <StepNum>2</StepNum>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Tier assignment</div>
              <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.4 }}>
                Tiers unlock as total delegated VP grows. Your tier is set at round start and determines your APY for the full 30-day round.
              </p>
            </div>
          </StepRow>
          <StepRow>
            <StepNum>3</StepNum>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Payout at round end</div>
              <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.4 }}>
                ENS is sent directly to your wallet. No claiming needed. Sub-1 ENS amounts enter the lottery pool instead.
              </p>
            </div>
          </StepRow>
        </Section>
      </Grid>
    </>
  )
}
```

- [ ] **Step 2: Write TransparencyPage tests**

```typescript
// src/pages/TransparencyPage/TransparencyPage.test.tsx
import { screen, waitFor } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { TransparencyPage } from './index'

describe('TransparencyPage', () => {
  it('renders page heading', () => {
    renderApp(<TransparencyPage />)
    expect(screen.getByText(/Verify everything on-chain/)).toBeInTheDocument()
  })

  it('renders verify links', () => {
    renderApp(<TransparencyPage />)
    expect(screen.getByText('GitHub')).toBeInTheDocument()
    expect(screen.getByText('Anticapture')).toBeInTheDocument()
    expect(screen.getByText('Dune Analytics')).toBeInTheDocument()
  })

  it('renders smart contracts with Verified badges', async () => {
    renderApp(<TransparencyPage />)
    expect(screen.getByText('ENS Incentives')).toBeInTheDocument()
    expect(screen.getByText('DelegateBySig')).toBeInTheDocument()
    const badges = screen.getAllByText('Verified')
    expect(badges).toHaveLength(3)
  })

  it('renders how rewards are calculated steps', () => {
    renderApp(<TransparencyPage />)
    expect(screen.getByText('Balance snapshot')).toBeInTheDocument()
    expect(screen.getByText('Tier assignment')).toBeInTheDocument()
    expect(screen.getByText('Payout at round end')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Update Router**

```typescript
import { TransparencyPage } from '@/pages/TransparencyPage'
<Route path="/transparency" element={<TransparencyPage />} />
```

- [ ] **Step 4: Run tests**

```bash
cd apps/frontend && pnpm vitest run src/pages/TransparencyPage/
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add TransparencyPage with contracts, live data, how rewards work"
```

---

## Chunk 10: Playwright E2E

### Task 38: E2E setup and core flow

**Files:**
- Create: `apps/frontend/e2e/landing.spec.ts`
- Create: `apps/frontend/e2e/delegates.spec.ts`
- Create: `apps/frontend/e2e/rounds.spec.ts`
- Create: `apps/frontend/e2e/lottery.spec.ts`
- Create: `apps/frontend/e2e/transparency.spec.ts`

> **Wallet mocking strategy:** For E2E tests that require wallet connection (spec flows 1, 2), inject a mock EIP-1193 provider via `page.addInitScript()` before each test. Use a hardcoded test account (e.g., `0x1234...`) that returns success for `eth_requestAccounts`. For the initial build, focus on public page flows (spec flows 2–5) and add wallet-connected flows once the mock provider is stable. Mark wallet-dependent tests with `test.skip` and a `// TODO: enable after mock provider setup` comment.

- [ ] **Step 1: Create landing E2E test**

```typescript
// e2e/landing.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('renders hero heading', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Your ENS is sitting idle/)).toBeVisible()
  })

  test('renders tier table', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Tier #1')).toBeVisible()
    await expect(page.getByText('Tier #6')).toBeVisible()
  })

  test('renders how it works section', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Simple to join/)).toBeVisible()
  })

  test('renders footer', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Built by Blockful/)).toBeVisible()
  })

  test('navigate to delegates from CTA', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /Delegate Now/i }).click()
    await expect(page).toHaveURL('/delegates')
  })

  test('navigate through all nav links', async ({ page }) => {
    await page.goto('/')
    // Verify navigation to each page works
    for (const path of ['/delegates', '/rounds', '/lottery', '/transparency']) {
      await page.goto(path)
      await expect(page.locator('h1')).toBeVisible()
    }
  })
})
```

- [ ] **Step 2: Create delegates E2E test**

```typescript
// e2e/delegates.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Delegates Page', () => {
  test('renders delegate heading', async ({ page }) => {
    await page.goto('/delegates')
    await expect(page.getByText(/Delegate to someone who shows up/)).toBeVisible()
  })

  test('renders sort controls', async ({ page }) => {
    await page.goto('/delegates')
    await expect(page.getByText('Voting Power')).toBeVisible()
    await expect(page.getByText('Activity')).toBeVisible()
    await expect(page.getByText('Random')).toBeVisible()
  })

  test('renders delegate cards after loading', async ({ page }) => {
    await page.goto('/delegates')
    await expect(page.getByRole('button', { name: /Delegate/i }).first()).toBeVisible()
  })
})
```

- [ ] **Step 3: Create rounds E2E test**

```typescript
// e2e/rounds.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Rounds Page', () => {
  test('renders round heading with live badge', async ({ page }) => {
    await page.goto('/rounds')
    await expect(page.getByText(/live/)).toBeVisible()
  })

  test('renders tier table', async ({ page }) => {
    await page.goto('/rounds')
    await expect(page.getByText('Tier #1')).toBeVisible()
  })

  test('renders round history', async ({ page }) => {
    await page.goto('/rounds')
    await expect(page.getByText('Round History')).toBeVisible()
  })
})
```

- [ ] **Step 4: Create lottery E2E test**

```typescript
// e2e/lottery.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Lottery Page', () => {
  test('renders lottery heading', async ({ page }) => {
    await page.goto('/lottery')
    await expect(page.getByText(/Small balance/)).toBeVisible()
  })

  test('renders how the draw works', async ({ page }) => {
    await page.goto('/lottery')
    await expect(page.getByText(/How the draw works/)).toBeVisible()
  })
})
```

- [ ] **Step 5: Create transparency E2E test**

```typescript
// e2e/transparency.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Transparency Page', () => {
  test('renders heading', async ({ page }) => {
    await page.goto('/transparency')
    await expect(page.getByText(/Verify everything on-chain/)).toBeVisible()
  })

  test('renders smart contracts', async ({ page }) => {
    await page.goto('/transparency')
    await expect(page.getByText('ENS Incentives')).toBeVisible()
    await expect(page.getByText('DelegateBySig')).toBeVisible()
  })

  test('renders verify links', async ({ page }) => {
    await page.goto('/transparency')
    await expect(page.getByText('GitHub')).toBeVisible()
    await expect(page.getByText('Dune Analytics')).toBeVisible()
  })
})
```

- [ ] **Step 6: Run E2E tests**

Start the dev server with the backend running, then:

```bash
cd apps/frontend && pnpm exec playwright test --project=mobile
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "test: add Playwright E2E tests for all pages"
```

---

### Task 39: Final Router cleanup and full test run

- [ ] **Step 1: Finalize Router with all page imports**

Ensure `src/app/Router.tsx` imports all real pages and has no Placeholder components left:

```typescript
// src/app/Router.tsx
import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/LandingPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { DelegatesPage } from '@/pages/DelegatesPage'
import { RoundsPage } from '@/pages/RoundsPage'
import { LotteryPage } from '@/pages/LotteryPage'
import { TransparencyPage } from '@/pages/TransparencyPage'

export function Router() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/delegates" element={<DelegatesPage />} />
        <Route path="/rounds" element={<RoundsPage />} />
        <Route path="/lottery" element={<LotteryPage />} />
        <Route path="/transparency" element={<TransparencyPage />} />
      </Routes>
    </AppLayout>
  )
}
```

- [ ] **Step 2: Run full unit/component test suite**

```bash
cd apps/frontend && pnpm vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Run TypeScript check**

```bash
cd apps/frontend && pnpm exec tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: finalize Router, all pages wired up"
```

---

### Task 40: Visual QA against Paper designs

- [ ] **Step 1: Start dev server**

```bash
cd apps/frontend && pnpm dev
```

- [ ] **Step 2: Compare each page against Paper artboards**

Open the app at `http://localhost:5173` in Chrome DevTools mobile mode (390px).

Compare each page against the corresponding Paper artboard:
- `/` → "Mobile / Landing Page"
- `/delegates` → "Mobile / Delegates Page"
- `/rounds` → "Mobile / Rounds Page"
- `/lottery` → "Mobile / Lottery Page"
- `/transparency` → "Mobile / Transparency"

At desktop width (1440px):
- `/` → "Desktop / Landing Page"
- `/delegates` → "Desktop / Delegates Page"
- `/rounds` → "Desktop / Rounds Page"
- `/lottery` → "Desktop / Lottery Page"
- `/transparency` → "Desktop / Transparency"

- [ ] **Step 3: Fix visual discrepancies**

Adjust spacing, typography, colors, and layout to match Paper exactly. Use Paper's MCP tools (`get_screenshot`, `get_computed_styles`) to get precise values.

- [ ] **Step 4: Commit fixes**

```bash
git add -A && git commit -m "fix: visual polish to match Paper wireframes"
```
