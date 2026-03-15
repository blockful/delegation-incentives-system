# Frontend Redesign — Thorin + Reown AppKit

**Date:** 2026-03-15
**Status:** Approved
**Scope:** Full rebuild of `apps/frontend` to match Paper wireframes exactly, using ENS Thorin design system, mobile-first, with real wallet connection via Reown AppKit.

---

## 1. Overview

Complete replacement of the current custom-component frontend with a consumer-facing dapp that matches the "ENS Incentives" Paper wireframes pixel-for-pixel. The app is mobile-first (390px base), scales to desktop (1440px), uses the Thorin design system exclusively, and integrates Reown AppKit for wallet connection on Ethereum mainnet.

All existing source files under `apps/frontend/src/` are deleted except `src/api/` (client, types, index) and `src/hooks/useAsync.ts`, which are preserved unchanged.

---

## 2. Pages & Routes

### 2.1 `/` — Landing Page

Three wallet-state variants rendered on the same route, driven by `AppWalletState`:

**Disconnected:**
- Header: "ENS GOVERNANCE · 90-DAY PILOT" label
- Hero headline: "Your ENS is sitting idle. It could be earning [APY]%" — APY value is the current tier's `momGrowthMaxPct` from `TierProgressionResponse.tiers[currentTierIndex].momGrowthMaxPct`
- Subtext: "Help secure ENS governance by delegating to an active voter. Rewards are automatic, gas is sponsored."
- CTAs: "Delegate Now → Free" (primary blue), "Share this initiative" (secondary)
- Round status bar: "No tokens locked · Gas sponsored · Rewards auto-sent" · Round # with live dot · +X.X% active VP growth · Tier N pool size
- Section: "THE MORE PEOPLE JOIN, THE MORE YOU EARN" — left: copy + "Share & Grow the Pool" button; right: tier table (6 tiers, dot indicator, APY, lock/check icon, current tier highlighted green)
- Section: "HOW IT WORKS" — 3 steps with icons and colored tags: (1) Delegate to active voter — "Gas sponsored — free to delegate"; (2) Your share grows with time — "No claiming needed — sent to your wallet"; (3a) Receive ENS at round end — "Currently earning ~X.XX% APY"; (3b) Small balance? Enter the lottery — "Lottery prize: 10 ENS"
- CTA section (dark background): "Earn ENS rewards. Strengthen governance." + "Delegate to an Active Delegate →" (blue) + "View Live Round Progress" (white outline)
- Footer (see §2.7)

**Connected (not delegated):**
- Same page as disconnected with wallet address shown in header instead of "Connect"

**Connected + Delegated:**
- Header shows wallet avatar + truncated address; "Connect" button is gone
- Hero sub-headline changes to "You're earning X.XX% APY" with current tier tag
- "Delegate Now" CTA becomes "View your dashboard →" (links to `/dashboard`)
- Second CTA "Share this initiative" remains
- Round status bar unchanged
- Tier table highlights the user's current tier (same as disconnected)
- "HOW IT WORKS" steps show personalised tags: step 3a shows user's current APY; step 3b shows lottery pool if qualifying
- Dark CTA section buttons: "Go to Dashboard →" (blue) + "View Active Delegates" (outline)

---

### 2.2 `/dashboard` — Dashboard

Only meaningful when wallet is connected (shows earnings for connected address). Redirects/prompts connect if disconnected.

**Mobile layout (single column):**
- "YOUR EARNINGS" label
- Large green "+X.XXXX" ENS earned so far
- "ENS earned so far" subtext
- "Earning at X.XX% APY" + Tier N tag (blue pill)
- Pills: ENS avatar + "Delegating to [ens/address]" · "Round N" · "Xd Xh left"
- Share buttons: "✕ Share your earnings" (blue, full width) · "Share on Telegram" (outline, full width)
- Stats row (3 cards): BALANCE Xd ENS 180-day avg · ROUND ENDS Xd Xh / date · POOL NK ENS reward pool
- "ROUND PROGRESS" card → links to `/rounds`: "Round N · X% complete" + progress bar + chevron
- "LOTTERY" card → links to `/lottery`: "You're in pool #N" + "X.X/10 ENS accumulated · ~X.X% odds" + chevron

**Desktop layout (two columns):**
- Left col: YOUR EARNINGS card (earnings number, APY, pills, share buttons)
- Right col: ROUND DETAILS header + 3 stat cards + SHARE YOUR EARNINGS header + ROUND PROGRESS card + LOTTERY card

**ENS name resolution:** The "Delegating to nick.eth" pill resolves the `delegatedTo` address (raw `0x…` from `EligibilityResponse`) via wagmi's `useEnsName({ address, chainId: mainnet.id })`. If resolution returns null, display truncated address (`0x1234…abcd`) instead. Resolution is done client-side; no backend change required.

**API:** `/eligibility/:address`, `/apy/:address`, `/status`, `/tiers/progression`, `/distributions/:month`

---

### 2.3 `/delegates` — Active Delegates

**Header:**
- "DELEGATE YOUR TOKENS" label
- Headline: "Delegate to someone who shows up"
- Subtext: "Every delegate here has voted on at least 7 of the last 10 on-chain proposals. Pick one and start earning."

**Stats bar (3 numbers):** active delegate count · total ENS delegated (display as "12.4M") · holders earning

**Sort controls:** pill toggle — "Voting Power" (default, filled) · "Activity" · "Random"

**Delegate cards:**
- ENS avatar (Effigy-style, fallback to blockie)
- ENS name (bold) + truncated address (0x1234…abcd)
- "Last 10 proposals" label + 10-segment green bar (filled = voted) + "9/10" score
- 3 stats: VP (display as "42K VP") · Delegators count · Active since (e.g. "Jan '24")
- Action: "Delegate" button (blue, full width) OR "Delegated ✓" green state (if this is current delegatee)
- "Full profile ↗" link (blue, centered below button)

**Mobile:** single column. **Desktop:** 3-column grid.

**Known data gap — backend extension required:** `GET /delegates/active` currently returns only `{ count: number; delegates: string[] }` — raw addresses with no metadata. The delegate cards require VP, delegator count, active-since date, and last-10-proposal vote history. These fields must be added to the backend response before the Delegates page can be fully implemented. The backend should return an extended type:

```typescript
interface DelegateDetail {
  address: string;
  ensName: string | null;          // resolved server-side or null
  votingPower: string;             // e.g. "42000" (raw), displayed as "42K VP"
  delegatorCount: number;
  activeSince: string;             // ISO date string, displayed as "Jan '24"
  last10ProposalsVoted: boolean[]; // array of 10 booleans, true = voted
}
interface ActiveDelegatesResponse {
  count: number;
  delegates: DelegateDetail[];
}
```

Until the backend is extended, the Delegates page renders address-only cards (avatar + truncated address, no VP/delegators/proposal bar). The frontend component API must accept the extended type from day one so no page refactor is needed when the backend ships.

**API:** `/delegates/active` (extended — see above)

---

### 2.4 `/rounds` — Rounds

**Header:**
- "ROUNDS" label
- Headline: "Round N is" + "• live" green pill badge (or "• upcoming" / "• ended")
- Subtext: "Each round lasts 30 days. Your share is based on your 180-day average ENS balance — longer holding, bigger share."

**Round card:**
- "Round N" + "In progress" badge (blue) + "X% complete" right-aligned
- Progress bar (blue fill)
- Start date left · "Xd Xh left · Mar XX" right
- 3 stat cards: POOL NK ENS · YOUR TIER Tier N (shows current tier if connected; shows "—" if disconnected) · CURRENT APY X.XX%

**APY TIERS section:**
- "APY TIERS" label + subtext
- 6 rows: Tier #N · dot indicator (N filled, 6-N unfilled) · ~X.X% APY · lock icon (locked tiers) or check icon (current/unlocked)
- Current tier row highlighted with green background

**ROUND HISTORY table:**
- Columns: ROUND · DATES · EARNED · STATUS
- Earned shown in green "+X.XXXX ENS"
- Status: "Live" (blue badge) or "Paid" (grey badge)

**Desktop layout:** round card + history on left (2/3 width) · APY tiers on right sidebar (1/3 width)

**API:** `/tiers/progression`, `/distributions/:month` (for round history)

---

### 2.5 `/lottery` — Lottery

**Header (centered, light blue background section):**
- "LOTTERY" label
- Headline: "Small balance? You still have a shot."
- Subtext: "Payouts below 1 ENS pool together and become a 10 ENS prize. One winner per pool, drawn at round end."

**"You qualify for the lottery" card (green, if connected + qualifying):**
- "~X.X% your odds" · "X.X/10 ENS pool accumulated" · "Xd Xh until draw" · "Pool #N" (top right)

**Prize card:**
- Trophy icon (green circle background)
- "PRIZE PER POOL" label · "10 ENS" large green number
- "Sent directly to your wallet at round end" subtext
- Stats row: qualifying addresses count · active prize pools count

**"How the draw works" box:**
- 3 numbered steps (blue circles): Sub-1 ENS payouts grouped into pools approaching 10 ENS each · Odds are proportional to calculated payout, bigger balance = better odds · Winner drawn using RANDAO (last block of the round) — publicly verifiable
- "View randomness methodology →" link

**LAST WINNER · ROUND N:**
- ENS avatar + name · Pool #N · date · "10 ENS won" (orange/amber)
- "View all past winners →" link

**In-progress lottery data gap:** The current API's `DistributionResponse.lotteryPools` represents completed distributions with settled winners. There is no endpoint for in-progress pool accumulation data ("8.4/10 ENS accumulated", "~3.2% odds"). Until such an endpoint exists, the "You qualify for the lottery" card is shown only when a completed distribution exists for the current month and the connected address appears in a lottery pool. The pool accumulation and odds values are derived from the most recent available distribution. The "Last winner" section always uses the previous month's distribution.

`month` is computed as `YYYY-MM` from `new Date()` for the current round. If no distribution exists for the current month, the qualifying card is hidden and a "Round in progress — results available at round end" message is shown instead.

**API:** `/distributions/:month` (lottery pools data)

---

### 2.6 `/transparency` — Transparency

**Header:**
- "TRANSPARENCY" label
- Headline: "Verify everything on-chain"
- Subtext: "Every calculation is public. Every payout is verifiable. No trust required, check it yourself."

**"VERIFY YOURSELF" section:**
- 3 link rows with icon, title, description, chevron: GitHub (allocation scripts and data) · Anticapture (delegate activity & governance health) · Dune Analytics (live round data & payout breakdown)

**"SMART CONTRACTS" section:**
- 3 contract rows: name · truncated address · "Verified" green badge · external link icon

**"ROUND N · LIVE DATA" section:**
- 2×2 stat grid: SNAPSHOT BLOCK · TOTAL DELEGATED · ELIGIBLE HOLDERS · REWARD POOL

**"HOW REWARDS ARE CALCULATED" section:**
- 3 numbered steps: (1) Balance snapshot · (2) Tier assignment · (3) Payout at round end

**Desktop layout:** left col = Verify Yourself + Smart Contracts + Live Data · right col = How Rewards Are Calculated

**API:** `/status`, `/tiers/progression`

---

### 2.7 Persistent Footer (all pages)

- ENS logo + "Incentives Pilot v1" bold · "A security campaign for safer ENS governance"
- Nav links: How It Works · Active Delegates · Rounds · Lottery · Verify Data · ENS Forum ↗ · GitHub ↗
- "Built by Blockful · Powered by Anticapture"

---

### 2.8 Modals / Overlays

**Wallet Options (AppKit modal):**
- Triggered by "Connect" button in header
- Handled entirely by Reown AppKit — no custom implementation needed
- Theme configured to match Thorin blue accent

**Delegation Success:**
- Full-screen overlay shown after "Delegate" tap on a delegate card
- Shows delegate ENS name/avatar, confirmation message, share prompts
- "Back to dashboard" CTA

**Wallet Dropdown:**
- Triggered by wallet avatar/address in header (connected state)
- Shows full address, ENS name if available, "Disconnect" option
- Handled by AppKit's built-in account modal

---

## 3. Architecture

### 3.1 Tech Stack

| Category | Package |
|---|---|
| Framework | React 19 + Vite 6 + TypeScript strict |
| Design system | `@ensdomains/thorin` + `styled-components` |
| Routing | `react-router-dom` v7 |
| Wallet connection | `@reown/appkit` + `@reown/appkit-adapter-wagmi` |
| Onchain reads | `wagmi` + `viem` (Ethereum mainnet) |
| API client | `src/api/` (preserved) + `useAsync` hook (preserved) |
| Unit/component tests | `vitest` + `@testing-library/react` + `msw` |
| E2E tests | `@playwright/test` |

### 3.2 Folder Structure

```
apps/frontend/src/
├── app/
│   ├── App.tsx
│   ├── Router.tsx
│   └── providers/
│       ├── AppKitProvider.tsx       # Reown AppKit + wagmi config
│       └── ThorinProvider.tsx       # Thorin theme wrapper
│
├── pages/
│   ├── LandingPage/
│   │   ├── index.tsx
│   │   ├── LandingPage.test.tsx
│   │   ├── sections/
│   │   │   ├── HeroSection.tsx
│   │   │   ├── RoundStatusBar.tsx
│   │   │   ├── TierTableSection.tsx
│   │   │   ├── HowItWorksSection.tsx
│   │   │   └── CtaSection.tsx
│   │   └── states/
│   │       ├── DisconnectedLanding.tsx
│   │       ├── ConnectedLanding.tsx
│   │       └── DelegatedLanding.tsx
│   ├── DashboardPage/
│   │   ├── index.tsx
│   │   ├── DashboardPage.test.tsx
│   │   └── sections/
│   │       ├── EarningsCard.tsx
│   │       ├── RoundDetailsSection.tsx
│   │       ├── RoundProgressCard.tsx
│   │       └── LotteryStatusCard.tsx
│   ├── DelegatesPage/
│   │   ├── index.tsx
│   │   ├── DelegatesPage.test.tsx
│   │   └── components/
│   │       ├── DelegateCard.tsx
│   │       ├── DelegateCard.test.tsx
│   │       ├── SortControls.tsx
│   │       └── StatsBar.tsx
│   ├── RoundsPage/
│   │   ├── index.tsx
│   │   ├── RoundsPage.test.tsx
│   │   └── components/
│   │       ├── RoundCard.tsx
│   │       ├── TierTable.tsx
│   │       ├── TierTable.test.tsx
│   │       └── RoundHistoryTable.tsx
│   ├── LotteryPage/
│   │   ├── index.tsx
│   │   └── LotteryPage.test.tsx
│   └── TransparencyPage/
│       ├── index.tsx
│       └── TransparencyPage.test.tsx
│
├── features/
│   ├── wallet/
│   │   ├── WalletStateProvider.tsx
│   │   ├── useWalletState.ts
│   │   └── wallet.types.ts
│   ├── delegates/
│   │   ├── useDelegates.ts
│   │   └── useDelegates.test.ts
│   ├── rounds/
│   │   ├── useRounds.ts
│   │   └── useRounds.test.ts
│   ├── lottery/
│   │   ├── useLottery.ts
│   │   └── useLottery.test.ts
│   └── transparency/
│       └── useTransparency.ts
│
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   └── shared/
│       ├── ProposalBar.tsx          # 10-segment voted indicator
│       ├── ProposalBar.test.tsx
│       ├── EnsAvatar.tsx            # avatar with fallback to blockie
│       └── TierDots.tsx             # tier dot indicator
│
├── api/                             # preserved unchanged
├── hooks/                           # useAsync preserved
│
└── test/
    ├── setup.ts
    ├── utils.tsx                    # render() with all providers
    └── mocks/
        ├── server.ts                # MSW server setup
        ├── handlers.ts              # API route handlers
        └── fixtures/
            ├── status.ts
            ├── delegates.ts
            ├── rounds.ts
            ├── lottery.ts
            └── eligibility.ts
```

### 3.3 Wallet State

```typescript
type AppWalletState =
  | { status: 'disconnected' }
  | { status: 'connected'; address: `0x${string}` }
  | { status: 'delegated'; address: `0x${string}`; delegatedTo: string; ensName?: string }
```

`WalletStateProvider` derives this by:
1. Reading `useAccount()` from wagmi (connection + address)
2. When connected, calling `/eligibility/:address` from our API
3. If `isDelegatorToActiveDelegate === true`, state becomes `delegated`

### 3.4 Reown AppKit Config

```typescript
// app/providers/AppKitProvider.tsx
const wagmiAdapter = new WagmiAdapter({ networks: [mainnet], projectId })
createAppKit({
  adapters: [wagmiAdapter],
  networks: [mainnet],
  projectId,                     // from VITE_REOWN_PROJECT_ID env var
  themeMode: 'light',
  themeVariables: { '--w3m-accent': '#3b82f6' }
})
```

### 3.5 API Mapping

| Page | Endpoint(s) |
|---|---|
| Landing | `GET /status` |
| Dashboard | `GET /status`, `/eligibility/:address`, `/apy/:address`, `/tiers/progression`, `/distributions/:month` |
| Delegates | `GET /delegates/active` |
| Rounds | `GET /tiers/progression`, `/distributions/:month` |
| Lottery | `GET /distributions/:month` |
| Transparency | `GET /status`, `/tiers/progression` |

---

## 4. Testing Strategy

### 4.1 TDD Discipline

All hooks and non-trivial components follow red → green → refactor. Tests are written before implementation. No implementation code is written without a failing test first.

### 4.2 Unit Tests (Vitest)

Feature hooks tested in isolation with MSW intercepting API calls:
- `useDelegates` — loading, success, sort behaviour
- `useRounds` — tier data, round history
- `useLottery` — pool data, qualifying state
- `useWalletState` — all 3 state transitions
- `ProposalBar` — correct segment fill count

### 4.3 Component Tests (Vitest + Testing Library)

Pages rendered with test providers (all 3 wallet states for Landing, mock API data via MSW):
- `LandingPage` — disconnected, connected, delegated states
- `DelegatesPage` — renders cards, sort toggle changes order, "Delegate" button fires action, "Delegated ✓" shown for current delegatee
- `RoundsPage` — round card displays correct data, tier table highlights current tier, history table renders rows
- `DelegateCard` — proposal bar fills correct segments, stats display correctly
- `TierTable` — current tier highlighted, locked tiers show lock icon

### 4.4 E2E Tests (Playwright, mobile 390px viewport)

**Flow 1 — Core delegation journey:**
Landing (disconnected) → tap "Connect" → AppKit modal opens → connect mock wallet → Landing (connected) → tap "Delegate Now" → Delegates page → tap "Delegate" on first card → Delegation Success screen → tap "Dashboard" → Dashboard shows earnings

**Flow 2 — Browse delegates:**
Delegates page → assert stats bar values → tap "Activity" sort → order changes → tap "Random" → assert shuffle → tap "Full profile ↗" → external link

**Flow 3 — Rounds:**
Navigate to `/rounds` → assert "Round N is live" → assert tier table (6 tiers, current highlighted) → assert round history rows

**Flow 4 — Lottery:**
Navigate to `/lottery` → assert prize card (10 ENS) → assert "How the draw works" steps → assert last winner

**Flow 5 — Transparency:**
Navigate to `/transparency` → assert 3 verify links → assert 3 smart contracts with Verified badge → assert live data stats

All flows run at 390px viewport width. Core flows (1–3) also run at 1440px.

---

## 5. What Gets Deleted

All of the following are deleted as part of the clean-slate rebuild:

- `src/components/` (all atoms, molecules, organisms)
- `src/pages/` (DashboardPage, EligibilityPage, TiersPage, DistributionsPage)
- `src/theme/` (tokens, global.css, index)
- `src/test/` (all old component tests)
- `src/main.tsx` (rewritten)
- `src/App.tsx` (rewritten)

**Preserved:**
- `src/api/client.ts`, `src/api/index.ts`, `src/api/types.ts`
- `src/hooks/useAsync.ts`
- `vite.config.ts`, `tsconfig.json`, `vitest.config.ts` (updated, not replaced)
- `package.json` (updated with new dependencies)

---

## 6. Dependencies to Install

```
@ensdomains/thorin
styled-components
@reown/appkit
@reown/appkit-adapter-wagmi
wagmi
viem
msw
@playwright/test
@testing-library/react
@testing-library/user-event
@testing-library/jest-dom
```

Remove:
- No packages to remove (existing deps remain valid)

---

## 7. Environment Variables

```
VITE_REOWN_PROJECT_ID=<from reown.com dashboard>
VITE_API_BASE_URL=http://localhost:42069
```

---

## 8. Success Criteria

- Every screen matches the Paper wireframes at 390px mobile and 1440px desktop
- Thorin components used exclusively — no custom CSS beyond Thorin tokens
- Reown AppKit wallet connection works on Ethereum mainnet
- All unit and component tests pass (`vitest run`)
- All 5 Playwright E2E flows pass at mobile viewport
- Zero TypeScript errors (`tsc --noEmit`)
