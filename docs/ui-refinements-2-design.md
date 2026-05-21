# UI Refinements v2 — Design Specs

**Branch:** `ui-refinements-2`
**Companion doc:** `docs/ui-refinements-2-analysis.md` (audit + critique)
**This doc:** concrete v2 specs, one page per iteration. Data-source-grounded, DS-consistent, interactive-first.

---

## Summary

Every page in the frontend has a v2 spec below (§2.1–2.7), grounded in real API fields (no fictional data), built on a shared token/primitive library (§1, §2.8, §2.9). The work is sized for **three sprints** plus a deferred backend-dependent tail. The headline changes:

- **Landing** stops rendering three identical wallet states. Disconnected gets an interactive **balance slider** that previews tier + projected APR. Connected becomes a **delegate-picker** with 3 recommended voters. Delegated becomes a **mini-dashboard** with projected reward + delegate last-10 vote glance.
- **Dashboard** keeps its strong streaming-earnings hero and tier-ladder; adds an **always-visible lottery callout** (qualifying or direct-payout — never hidden), a **delta-vs-last-round chip**, the delegate's **last-10 voting glance**, and a **past-rounds strip**.
- **VoterProfile** surfaces **ENS bio + verified links** (Twitter, Web — pulled from ENS text records), a **recent rewards history**, and a **delegate-cap utilization indicator**. No more disappearing cards or template-string voting records.
- **Voters list** gets the missing **search input**, **3 filter dropdowns** (Participation / VP range / Delegators), and a **Compare Dock** (floating bottom-right when ≥2 cards selected).
- **Rounds + RoundDetail** are reordered so the user's outcome leads. Lottery seed becomes verifiable (CopyChip + Etherscan link). Recipients tables get search and address-jump. The duplicate TierTable in the Rounds sidebar is replaced with a Lottery Snapshot card.
- **Lottery** auto-pins and auto-selects the user's bucket. Adds an **All Winners tab** for round-level scanning and a **BucketSlotGrid** visualization that makes the weighted-random draw visible.
- **Transparency** swaps text bullets for a **clickable methodology diagram** with code-link drawers, a **worked example** using the latest paid round's real numbers, **on-chain liveness probes** on contract cards, and **CSV/JSON exports** per round.
- **Design system** adds status families (5 tones × 3 roles), a real radius scale, a real mono font, a soft shadow, and motion tokens. Replaces 5 files' worth of inline hex bypasses with token refs. Adds 14 shared primitives that delete ~250 LOC of duplicated styled-components across pages.

The work is paced so **P0 sprint ships visible improvements to every page** by consolidating duplicated patterns into primitives and unlocking the wallet-state-aware landing. P1 lands the credibility moves (lottery transparency, methodology diagram, worked example) that forum stakeholders will inspect first. P2 is refinement.

---

## 0.0 Priority order — what to build, in what order

Each item lists the spec section it implements, an effort estimate in days (FE-engineer days, not calendar), and what it blocks/unblocks.

### P0 — Foundation + visible wins (sprint 1, ~10 days)

**Goal:** every page is visibly better; no page is worse; the DS is consistent; nothing is gated on backend.

| Item | Spec | Effort | Notes |
|---|---|---|---|
| Add `status.*` color families + `surface.mat` + `shadow.soft` + `motion.*` + new `radius` scale + IBM Plex Mono | §2.8.6 Phase 1 | 1d | Pure-additive token PR. Non-breaking. |
| Replace 5-file inline hex bypasses with token refs | §2.8.4 | 0.5d | Mechanical s/r once tokens land. |
| Add primitives: `<StatusPill>`, `<BackLink>`, `<LiveDot>`, `<StatStrip>`, `<Address>`, `<EnsAmount>` | §2.9 P9, P11, P12, P10, P1, P2 | 2d | Each tiny; unblocks everything downstream. |
| Add `<ToneCallout>` primitive | §2.9 P5 | 1d | Single biggest LOC win — deletes ~80 LOC of duplicated `$tone` panels in RoundDetail + Lottery. |
| Landing: differentiate 3 wallet states (Disconnected slider, Connected delegate-picker, Delegated mini-dashboard) | §2.3 | 2d | Highest-leverage page change. |
| Dashboard: always-visible lottery callout (replaces conditional `LotteryCard`) | §2.2 implementation step 2 | 0.5d | Touches `qualifiesForLottery` branch only; trivial. |
| Dashboard: greeting strip + Δ chip + delegate's last-10 dot row | §2.2 implementation steps 3–4 | 1d | Reuses ProposalBar; one extra fetch. |
| Dashboard: past-rounds strip via `distributionsForAddress` | §2.2 step 5 | 1d | Existing endpoint; just rendering. |
| Rounds page: replace duplicate TierTable sidebar with Lottery Snapshot card; promote lookup toolbar; mobile reflow → card stack | §2.5 RoundsPage steps 2–4 | 1.5d | Pure restructure, no new data. |

**Sprint 1 ends with:** every page tighter, every status-coded panel unified, three wallet states actually differentiated, lottery status always present on Dashboard, Rounds page cleaner. Forum-stakeholder check: yes, RoundsPage and Dashboard look more polished even though we haven't touched credibility yet.

### P1 — Credibility & trust (sprint 2, ~10 days)

**Goal:** forum-stated objections (lottery fairness, methodology complexity) get answered by visible proof.

| Item | Spec | Effort | Notes |
|---|---|---|---|
| RoundDetailPage: section reorder (Your Result → Round Overview → Methodology → Recipients → Lottery Transparency) | §2.5 RoundDetailPage steps 4–5 | 1d | Pure JSX reorder. |
| RoundDetailPage: ToneCallout copy locked verbatim per tone (replaces template "metrics show X" strings) | §2.5 micro-interactions | 0.5d | Copy-only work. |
| RoundDetailPage: Methodology card with **seed CopyChip + Etherscan block link + algorithm GitHub link** | §2.5 step 6 | 1d | High credibility value, low engineering cost. |
| Add `<CopyChip>` primitive | §2.9 P7 | 0.5d | Used by seed + Transparency contracts. |
| Add `<SideDrawer>` primitive | §2.9 P13 | 1d | Unblocks methodology drawer + future Compare drawer. |
| Add `<BucketSlotGrid>` primitive | §2.9 P6 | 1.5d | Marquee visualization. Inline SVG, no chart lib. |
| RoundDetailPage: recipients-table search + auto-highlight connected address + pagination control | §2.5 step 7 | 1.5d | Existing `rewardLimit=all` API param supports this. |
| Lottery page: AddressStatusPanel → `<ToneCallout>` (replaces duplicated 5-tone branch) | §2.6 step 1 | 0.5d | Same primitive, second consumer. |
| Lottery page: BucketSlotGrid rendered inside SelectedBucketDetail + participants-table mobile reflow | §2.6 steps 5–6 | 1d | Reuses primitive. |
| TransparencyPage: replace silent fail with explicit error+retry + dynamic round label | §2.7 implementation steps 2–3 | 0.5d | Bug fixes. |
| TransparencyPage: **Methodology diagram** with SideDrawer drill-down + code links | §2.7 step 6 | 2d | The "wow" for credibility. Inline SVG, hand-rolled. |
| TransparencyPage: **Worked Example** using latest paid round | §2.7 step 7 | 1d | Pulls from existing `/rounds/{N}` data. |
| TransparencyPage: contract liveness probes via viem `getCode` | §2.7 step 5 | 0.5d | Pure wagmi/viem; no backend. |

**Sprint 2 ends with:** the lottery's fairness is visible (not just claimed), the program's methodology has a one-screen answer, every contract claim has a live "reachable as of block N" chip. A skeptic can leave knowing where to look for source code without trusting our copy.

### P2 — Picker quality & refinement (sprint 3, ~8 days)

**Goal:** the delegate-picking flow becomes good, not just functional.

| Item | Spec | Effort | Notes |
|---|---|---|---|
| Add `<StatCard>` `trend` chip + `size="hero"` + `<Sparkline>` primitive (sparkline gated on backend) | §2.9 P3, P4 | 1d | Sparkline shipped without data until endpoint lands. |
| Voters list: search input + 3 filter dropdowns (Participation / VP / Delegators) | §2.4 implementation steps 1–3 | 1.5d | Pure client-side. |
| Voters list: ENS text record bio per visible card | §2.4 step 4 | 0.5d | viem `useEnsText`, batched. |
| Voters list: Compare Dock + `useCompare()` hook + `/voters/compare` route | §2.4 steps 5–6 | 2d | New route, no backend. |
| Lottery page: "Win up to 10 ENS" pill + "● You" pin + auto-select user's bucket + All Winners tab | §2.6 steps 2–4, 7 | 1.5d | Tab control via Thorin if available, else minimal toggle. |
| VoterProfile: ENS bio + Twitter/Web/Email chips (via ENS text records) | §2.1 step 3 | 0.5d | viem text record reads. |
| VoterProfile: Rewards History (last 3 rounds via `api.round(N, address)`) | §2.1 step 4 | 1d | Existing endpoint. |
| VoterProfile: Delegate Cap Utilization indicator | §2.1 step 5 | 0.5d | Derived from existing fields. |
| TransparencyPage: per-round CSV/JSON downloads | §2.7 step 8 | 1d | Client-side serialization. |
| Add `<TierLadderRow>` primitive (extracted from existing RewardTiers) | §2.9 P14 | 0.5d | Unblocks Landing tier slider preview reuse. |
| Rounds: VP-growth sparkline column on history table | §2.5 RoundsPage step 3 | 0.5d | Pure inline SVG. |

**Sprint 3 ends with:** voter-picking is the strongest flow in the app. ENS bios surface where they exist. Researchers can download round data. Every page-spec's P2 items are landed.

### P3 — Deferred (waiting on backend)

Items that **cannot** ship until backend exposes the data. Each is fully specified above; the FE work is small once the data arrives.

| Item | Blocking endpoint | Effort once unblocked |
|---|---|---|
| ProposalBar tooltips with proposal title + vote direction (every page that renders the bar) | `GET /proposals?last=10` returning `[{id, title, createdAt, voteOfDelegate}]` | 0.5d |
| Voting Power sparklines on VoterProfile + Dashboard + Stats strip | `GET /voters/{addr}/voting-power-history` | 0.5d |
| "Active in last 30 days" filter + per-card "Last voted N days ago" line on Voters list | `lastVoteAt: ISO` field on `/voters/active` records | 0.5d |
| Transparency hero counter sparklines | `GET /stats/history` returning per-round metrics | 0.5d |
| Worked Example Step 4 (caps redistributed) | `cappedCount` + `excessRedistributedEns` on `DistributionMetadata` | 0.25d |
| Lottery cross-round "Your lottery history" strip | `GET /addresses/{addr}/lottery-history` | 1d |
| ProposalRow primitive (replaces ProposalBar fallback) | Same as proposal endpoint | 0.5d |
| Recipients-table search across **full** server list (not just the 100 loaded) — verify | `api.round(N, addr, rewardLimit:'all')` already accepts this in the client; confirm backend returns full list | 0.25d |

---

## 0.1 Backend asks (consolidated)

| # | Endpoint / change | Used by | Priority |
|---|---|---|---|
| BE-1 | `GET /proposals?last=10` → `[{id, title, createdAt, voteOfDelegate?}]` | Voting record everywhere (P3 unblock) | Highest |
| BE-2 | `GET /voters/{addr}/voting-power-history` → `[{block, vpWei}]` | VP sparklines (P3) | High |
| BE-3 | Add `lastVoteAt: ISO` to `/voters/active` records | Activity-recency filter + last-voted line on cards (P3) | High |
| BE-4 | `GET /stats/history` → per-round metrics across rounds | Transparency hero sparklines (P3) | Medium |
| BE-5 | Add `cappedCount` + `excessRedistributedEns` to `DistributionMetadata` | Worked Example Step 4 (P3) | Medium |
| BE-6 | `GET /addresses/{addr}/lottery-history` aggregated | Lottery cross-round strip (P3) | Medium |
| BE-7 | Verify `api.round(N, addr, rewardLimit:'all')` returns the full recipient list | Recipients-table search (P3) | Low — likely already works |
| BE-8 | Verify behavior: `/apr/{address}` for non-token-holder addresses | Landing Connected hero degradation (P0) | Low — read-only check |
| BE-9 | Optionally: surface `RoundSummary.computedAt` on `/rounds` list | Rounds history "computed N min ago" chip | Low |
| BE-10 | Optionally: `?limit=N` query on `/distributions?address=…` | Past-rounds strip pagination | Low |

---

## 0.2 Out of scope (explicitly not building in `ui-refinements-2`)

| Item | Reason |
|---|---|
| **Delegate button real wiring** | Integration-gated. Relayer infrastructure not in this branch. Spec keeps the existing stub visual; tooltip clarifies "Gas sponsored by the incentives program relayer." |
| **Dark mode** | Out of scope. Doubles visual QA. After P0/P1 ship if requested. |
| **Top earners leaderboard / "most rewarded" sort** | Forum anti-pattern. The program's success metric is *distribution* not concentration; surfacing top earners encourages mercenary farming (estmcmxci's concern). Sorting by VP is fine (legitimate signal). |
| **Spin-the-wheel / gamified lottery animation** | Wrong tone for governance infrastructure. BucketSlotGrid visualizes weighted odds plainly; that's the visual we ship. |
| **ENS-landing aspirational voice ("Welcome to the new internet")** | Wrong audience. This product is for forum-skeptical DAO governance participants. Voice = plainspoken-functional (matches ENS *app*, not ENS *landing*). |
| **Auto-promoted "Change delegate" CTAs** | The program's success metric includes *stickiness*. Don't engineer churn into the picker pattern. Voters list has a Compare drawer; that's enough. |
| **A leaderboard of "most active delegates" on Landing** | Same anti-pattern reasoning as top earners — concentrates attention on a few delegates rather than distributing. |
| **Voting records that paraphrase governance language** | When proposal titles land (BE-1), they render verbatim from the chain. No editorial summarization. |
| **Multi-chain / cross-chain views** | Single-chain (mainnet ENS governance) only this iteration. |

---

## 0.3 How to read this doc

- **§0.0 / 0.1 / 0.2** above are the executive summary — read these if you're picking up the work cold.
- **§1** is the foundation: tokens to add, primitives that span pages.
- **§2.1 – 2.7** are page-by-page specs. Each follows the same template: Goal → Refero references → Layout ASCII → Data sources table → Micro-interactions → Empty states → DS notes → Implementation order → Open backend asks.
- **§2.8** is the design-system audit with concrete file-level findings and a 5-phase migration plan.
- **§2.9** is the shared-primitives library: props, states, motion, a11y for 14 components.
- **§3** is the iteration log (history of how this doc was built).

If you're implementing a single page, jump straight to its §2.X section — every section is self-contained and lists its own implementation order and backend dependencies.

If you're implementing the design system, start with §2.8.6 Phase 1 (token additions) and §2.9 implementation order — they're sequenced so each step unblocks the next.

---

## 0. Methodology

### 0.1 Data discipline

Every proposed UI element traces to one of:
- **Existing endpoint** — `apps/frontend/src/api/client.ts` (verified per section).
- **Existing indexed event** — Ponder schema in `apps/backend/ponder.schema.ts` and handlers in `apps/backend/src/handlers/*`. If reachable but not yet exposed, flagged **[needs endpoint extension]**.
- **External authoritative source** — Anticapture, Etherscan, ENS resolver text records via wagmi.

Never proposed:
- Stats without a known computation path
- Badges without a defined rule
- Charts without a real time series
- Quotes/testimonials/bios that aren't directly readable from a verifiable source (ENS text records included, blog posts not)

### 0.2 Iteration plan

Per-iteration tasks (loop-driven):
1. ✅ **VoterProfile v2** — establishes the spine (this iteration).
2. Dashboard v2
3. Landing v2 (per wallet state)
4. Voters list v2
5. Rounds + RoundDetail v2
6. Lottery v2
7. Transparency v2
8. DS consistency audit + token refactor proposal
9. Cross-cutting micro-interaction library spec
10. Convergence pass → single shippable design doc

Each iteration appends to this file, in order.

### 0.3 Stopping criterion

Stop when every page has a v2 spec, every spec passes the "real-data" filter, and the convergence pass produces a one-document handoff with a P0/P1/P2 priority list and an implementation order.

---

## 1. Foundation — design system upgrades (referenced by every page spec)

These are the cross-page primitives. The DS audit (task 8) will finalize hex values; this section locks roles and structure.

### 1.1 Token additions to `apps/frontend/src/styles/tokens.ts`

| Token family | Why | Roles |
|---|---|---|
| `color.surface` (2-step) | Today every card sits on `#fff` over `#fff`. Add `surface.mat` (a faint warm gray, ≈ `#FAFAFC`) and keep `surface.card` (white). Card sits on mat. | `surface.mat` = page bg; `surface.card` = card bg |
| `color.status.*` (5 tone families × 3 roles) | Today `RoundDetailPage` invents 6 tone colors inline. Promote to tokens. | `success`, `warning`, `pending`, `danger`, `neutral` × `{bg, border, fg}` |
| `radius` (3-step real scale) | Today `sm/md/lg = 8/8/8` — flat. Reset to `sm 6 / md 10 / lg 16` so hierarchy reads. | Pills stay `pill: 9999` |
| `shadow.soft` | Today `sm` (1px 3px) is invisible on light bg, `lg` is heavy. | One `soft` (`0 1px 0 border + 0 4px 24px rgba(0,0,0,0.04)`) for elevation moments |
| `font.mono` | Addresses, hashes, seeds, block numbers, exact ENS amounts in tables need machine-value affordance. | `IBM Plex Mono` or `Geist Mono` |
| `motion.spring` | Animation durations are scattered. | `motion.in: 200ms ease-out`, `motion.in-fast: 120ms ease-out`, `motion.out: 160ms ease-in` |

### 1.2 New shared primitives in `apps/frontend/src/components/shared/`

These are referenced by multiple page specs; each gets a separate spec in the cross-cutting iteration (task 9). Roles below:

- **`<Address value ens? avatar? copyable truncate? />`** — single source of truth for rendering on-chain identity. Resolves `voter.ensName` first, then wagmi `useEnsName`, then truncates `0x1234…cdef`. Click → copy + toast.
- **`<EnsAmount value precision? mono? />`** — formats `123456789…` wei into `12.3 ENS` / `12.3K ENS` / `12.3M ENS`. Mono digits, regular suffix. Click → reveal full precision.
- **`<Sparkline data accent />`** — 60px tall, no axes, hover-scrub with cursor-following tooltip.
- **`<StatCard label value sublabel? trend? help? />`** — stat tile with optional delta and inline `?` tooltip.
- **`<ToneCallout tone title body metrics? />`** — replaces the 6-tone panels currently inlined in `RoundDetailPage`. Tone enum: `success | warning | pending | danger | neutral`.
- **`<BucketSlotGrid entries winnerIndex />`** — visual lottery: each entry one slot, winner has a badge. Used on `RoundDetail` and `Lottery` pages.
- **`<CopyChip text label? mono? />`** — copyable inline value with a copy icon revealed on hover, "Copied!" toast on click.
- **`<ProposalRow title vote date href />`** — one row of voting history (replaces the abstract `ProposalBar` once we have proposal-title data).

### 1.3 Layout conventions

- **Page width:** `tokens.maxWidth.lg` (1120px) for content-dense pages (Dashboard, RoundDetail, VoterProfile), `tokens.maxWidth.xl` (1440px) only for Voters grid.
- **Vertical rhythm:** `tokens.spacing['2xl']` between major sections, `lg` between cards within a section.
- **Section header:** ALL CAPS eyebrow (12px) + `h2` (24-28px). No exceptions.
- **Card padding:** `xl` desktop, `lg` mobile. No card padding-less.
- **Skeleton on every async section.** Never spinners.

### 1.4 Motion rules

- Mount fade-in: 200ms ease-out, opacity + 8px translateY. Already implemented (`fadeInUp`); keep, retune duration.
- Count-up on first paint for hero numbers (300ms, `prefers-reduced-motion: no-preference`).
- Hover lift: `translateY(-1px)` + `shadow.soft`, 120ms.
- Status pulse: `live` status only, 1.4s ease-in-out infinite.
- Confetti: lottery-win moment only, single burst, respect reduced-motion.

---

## 2. Page specs

### 2.1 VoterProfilePage v2 (`/voters/:address`)

> **Iteration 1.** This is the canonical example — every other page mirrors its rigor.

#### Goal

The page answers three user questions in this order:

1. **"Should I trust this delegate?"** — credibility signals (voting consistency, longevity, what they vote on, who else trusts them).
2. **"If I delegate, what changes?"** — APR estimate, gas, current relationship.
3. **"Who is this person?"** — bio + verified links (ENS text records only).

If the page can't answer #1 confidently, fix that before adding richer content.

#### Refero references (synthesized, not copied)

- **GitHub user profile** (`github.com/<user>`) — eyebrow stats row + contribution heatmap. The heatmap pattern fits voting cadence over months.
- **Robinhood / Wealthsimple stock page** — sticky hero with the asset's primary metric + line chart, structured details below. Fits VP-over-time as the hero chart.
- **Stocktwits NVDA profile** — sentiment-tinted stat cards with secondary text. Fits "Active since" + "Top delegator share."
- **Cake Equity portfolio** — vesting-style progress bars in cards. Fits "delegate cap utilization" indicator.
- **Linktree analytics profile** — paneled stats with sparklines + a clean tab system for "Overview / Activity / Followers." Fits the Anticapture-out-link replacement.

#### Layout (top → bottom)

```
┌─────────────────────────────────────────────────────────────┐
│ ← All voters                                                │  Back link, mono link style
├─────────────────────────────────────────────────────────────┤
│ HERO BAND (2-col desktop, stack mobile)                     │
│  Left:  avatar 96px + ENS name (h1, 32px) + address chip    │
│         + bio (if ENS `description` text record exists)     │
│         + verified link chips (Twitter, Web, Email — if     │
│           ENS text records exist; otherwise omit row)       │
│  Right: APR pill ("Up to 6.4% APR") + Delegate button       │
│         + "Gas sponsored" microcopy + secondary "Open in    │
│         app.ens.domains ↗" link                             │
├─────────────────────────────────────────────────────────────┤
│ STATS STRIP (4-up desktop, 2x2 mobile)                      │
│  Voting Power  · Delegators · Participation · Active since  │
│  Each card: value (24px), label (12px), delta vs. last      │
│  round (sparkline arrow chip)                               │
├─────────────────────────────────────────────────────────────┤
│ VOTING RECORD (full width)                                  │
│  Eyebrow "VOTING RECORD"                                    │
│  Header: "Voted on N of last 10 proposals · See full history│
│  on Anticapture ↗"                                          │
│  10 ProposalRows: [vote chip] proposal title (truncated) ·  │
│   date · "Voted For/Against/Abstain"                        │
│   — IF proposal title/vote-direction unavailable in API,    │
│   fall back to today's ProposalBar (10 dots) and label      │
│   "Vote details available on Anticapture ↗"                 │
├─────────────────────────────────────────────────────────────┤
│ REWARDS HISTORY (3-card horizontal)                         │
│  Eyebrow "RECENT VOTER REWARDS"                             │
│  Last 3 finalized rounds, each card:                        │
│   Round N · Month · "X.X ENS earned" · tier pill            │
│  Click → /rounds/N?address=<voter address>                  │
├─────────────────────────────────────────────────────────────┤
│ DELEGATE CAP UTILIZATION (single card)                      │
│  Eyebrow "POOL CAP THIS ROUND"                              │
│  Progress bar: VP / (1% of round pool) — shows headroom     │
│  Helper: "If this delegate hits the 1% cap, excess          │
│   redistributes pro-rata to uncapped delegates."            │
├─────────────────────────────────────────────────────────────┤
│ EXTERNAL VERIFICATION (3-chip row)                          │
│  Anticapture · Etherscan · ENS profile (app.ens.domains)    │
└─────────────────────────────────────────────────────────────┘
```

#### Per-section data sources & status

| Section | Field | Source | Status |
|---|---|---|---|
| Hero — name | `voter.ensName` then wagmi `useEnsName(address)` | `/voters/active` + wagmi | ✅ available |
| Hero — avatar | `voter.avatarUrl` or wagmi avatar | API | ✅ available |
| Hero — bio | ENS text record `description` | viem `getEnsText({ key: 'description' })` | ✅ available (ENS resolver) |
| Hero — Twitter | ENS text record `com.twitter` | viem `getEnsText({ key: 'com.twitter' })` | ✅ available |
| Hero — Web | ENS text record `url` | viem `getEnsText({ key: 'url' })` | ✅ available |
| Hero — Email | ENS text record `email` | viem `getEnsText({ key: 'email' })` | ✅ available (rarely set, ok to skip) |
| Hero — APR pill | `tiers.maxTokenHolderAprPct` | `/tiers/progression` | ✅ available |
| Stats — Voting Power | `voter.votingPower` | `/voters/active` | ✅ available |
| Stats — Delegators | `voter.tokenHolderCount` | `/voters/active` | ✅ available |
| Stats — Participation | derived from `voter.last10ProposalsVoted` | API-derived | ✅ available |
| Stats — Active since | `voter.activeSince` | `/voters/active` | ✅ available (may be null — degrade gracefully, see §2.1 fallback) |
| Stats — VP delta sparkline | per-block VP history | **[needs endpoint]** Ponder indexes `DelegateVotesChanged`. Propose `/voters/{addr}/voting-power-history?from=ROUND_N` returning `[{block, vpWei}]`. | ⚠️ ship without sparklines until endpoint lands |
| Voting record — proposal title | proposal `description` field | **[needs endpoint]** Backend's `ens-governor.ts` handler captures `ProposalCreated` events. Propose `/proposals?last=10` returning `[{id, title, createdAt, voteOfDelegate}]`. | ⚠️ fallback to existing `ProposalBar` + Anticapture deep-link until endpoint lands |
| Voting record — vote direction (For/Against/Abstain) | `VoteCast.support` field | **[needs endpoint]** Same as above, joined per delegate. | ⚠️ same fallback |
| Rewards history — per-round reward | `api.round(N, address).addressReward` | `/rounds/{N}?address=…` | ✅ available; fetch last 3 rounds (existing pattern in RoundDetailPage) |
| Cap utilization — delegate VP | `voter.votingPower` (wei) | `/voters/active` | ✅ available |
| Cap utilization — round pool size | `currentRound.poolSizeEns` | `/rounds/current` | ✅ available |
| Cap utilization — delegate cap | `currentRound.tierIndex` → `tiers[N].voterCap` | `/tiers/progression` + `/rounds/current` | ✅ available (compose) |
| External — Anticapture URL | `getAnticaptureDelegateUrl(address)` | local helper | ✅ available |
| External — Etherscan URL | `https://etherscan.io/address/{address}` | static | ✅ available |
| External — ENS app | `https://app.ens.domains/{ensName ?? address}` | static | ✅ available |

#### Micro-interactions

- **Hero address chip** — click copies the full address, toast: "Copied 0x1234…cdef." Hover reveals a tiny `Etherscan ↗` glyph.
- **Bio expand** — if ENS `description` > 140 chars, truncate with a "Read more" toggle (expand in-place, no modal).
- **Verified link chips** — outbound icon on hover. Twitter chip resolves the avatar Twitter-side via a lightweight check (skip if you want zero external calls); recommended: just open the URL.
- **APR pill** — has a `?` tooltip: "Estimated rate at your tier this round. Click to see how rewards are calculated → /transparency."
- **Delegate button** — out of scope per current direction (integration-gated). Keep current visual; tooltip clarifies "Gas sponsored — handled by the incentives program relayer (not yet live)."
- **Stat sparklines** — scrub on hover/drag, show value + block number in a follow-cursor tooltip. (Gated on backend endpoint.)
- **Proposal rows** — entire row clickable (link to Anticapture proposal page if available; else just static). Hover lift, focus-visible ring.
- **Rewards history cards** — hover lift; click → RoundDetail with address pre-filled. If a card represents a round where the voter wasn't a top-25 recipient and `addressReward` is null, show "0 ENS — below threshold" not "Unavailable."
- **Cap utilization bar** — animates from 0 to actual on mount (300ms), color shifts from `success` (<50%) to `warning` (50-90%) to `danger` (>90%). Hover reveals the exact ENS values.
- **External chips** — all `target="_blank" rel="noopener noreferrer"`, with `↗` glyph after label.

#### Empty / degraded states

- **No bio (no ENS `description` record)** — entire bio block omitted, no empty paragraph.
- **No Twitter/Web records** — entire verified-links row omitted, no empty chips.
- **Active since missing** — replace value with em-dash, dim label to subtle gray. Don't remove the card (grid collapse looks broken).
- **No rewards history yet (voter never ranked or new program)** — replace 3-card row with one ToneCallout: tone=`neutral`, body="No finalized rewards yet for this voter. First payout after round closes."
- **Round detail endpoint 500** — fall back to ProposalBar; show one inline ToneCallout above voting card: tone=`warning`, body="Couldn't load round data. Voting record shown without per-round detail."
- **Voter address valid but not in `/voters/active`** — same as today, "Voter not found. They may not be an active voter in the incentives program." Add a secondary CTA: "View on Anticapture ↗" (they may be on-chain even if not in our program).

#### DS-consistency notes

- Hero name uses `font.size['3xl']` (32px); the only h1 on the page. No duplicate hero sizes.
- All four stat cards use **identical** padding and identical label/value type sizes. Today's spec is consistent — keep.
- Mono token applied to: address chips, ENS amount values in stat cards (the `12.3K ENS` digit only — `ENS` suffix stays regular), rewards-history amount.
- Status colors used: `success` for "delegated to" status, `warning` for cap >50%, `danger` for cap >90%, `neutral` for all other tone callouts.
- All async sections wrapped in skeletons matching their final shape (StatGridSkeleton, VotingRecordSkeleton, RewardsHistorySkeleton — extend `PageSkeletons.tsx`).

#### Implementation order

1. Extract `<Address>`, `<EnsAmount>`, `<StatCard>`, `<ToneCallout>` primitives (cross-cutting, task 9).
2. Refactor current `VoterProfilePage` to use those primitives — preserves behavior, gains consistency.
3. Add ENS text records fetch (`useEnsText` for `description`, `com.twitter`, `url`) — pure frontend, no backend change.
4. Add Rewards History section using existing `api.round(N, address)` calls (last 3 rounds).
5. Add Cap Utilization card using existing pool/tier/VP data.
6. Wire Voting Record proposal titles **when** the proposals endpoint lands; until then ship the ProposalBar fallback + Anticapture deep-link with the new "Voted N of last 10" header copy.
7. Add VP sparkline **when** the voting-power-history endpoint lands.

#### Open backend asks (created by this spec)

| Endpoint | Purpose | Notes |
|---|---|---|
| `GET /proposals?last=10` | Voting record with titles + dates + vote direction | Ponder already indexes `ProposalCreated` and `VoteCast`. Need a join keyed by delegate address. |
| `GET /voters/{addr}/voting-power-history` | Sparkline in stat cards | Ponder indexes `DelegateVotesChanged`. Endpoint can be a thin select. |

If both land, the entire voting/credibility story upgrades from "abstract bar" to "verifiable record." That's the next leverage point after the data discipline pass.

---

### 2.2 DashboardPage v2 (`/dashboard`)

> **Iteration 2.** Connected/delegated users land here. The page already does a lot well — streaming earnings counter (`useStreamingCounter`), tier ladder with VP-to-next progression and lock/unlock states, share buttons. v2 builds on that base; closes gaps on lottery visibility (currently hidden for non-qualifying users), past rounds (currently absent), delegate accountability (no vote glance in hero).

#### Goal

Three user questions in order:

1. **"Am I earning, and how much?"** — current round projection + delta to last + APR + tier.
2. **"What's my path forward?"** — tier ladder with VP-to-next-tier (already strong); show projected gain at next tier.
3. **"Is the program healthy and is my delegate active?"** — pool size, round status, delegate's recent voting glance, my round history.

#### Refero references (synthesized)

- **Wealthsimple stock detail / Mercury Panorama** — clean dashboard with one tabular-num hero number + supporting stat strip + chart. Same posture as our EarningsStrip.
- **Brilliant "Welcome to Leagues"** — centered iconography + plainspoken framing for status moments. Fits the always-visible lottery callout (qualifying vs. direct payout).
- **Mercury account list with micro-graphics** — small inline directional arrows + currency. Fits the past-rounds strip.
- **Square loyalty / Fourthwall memberships** — stepped reward tiers with clear locked/unlocked states. Our existing `RewardTiers` already nails this — keep.

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Greeting strip (utility type, 12–13px)                      │
│  "GM, {ensName ?? short address} · Round N · M days left"   │
├─────────────────────────────────────────────────────────────┤
│ EARNINGS HERO (full width, builds on current EarningsStrip) │
│  +X.XX ENS (streaming counter, existing) · Δ chip vs last   │
│  "ENS earned so far" subtitle                               │
│  "Earning at Y% APR · Tier N"                               │
│  Delegate pill: avatar · "Delegating to {ensName}"          │
│  Delegate's last-10 votes (compact ProposalBar, new)        │
│  Round/days pills (existing)                                │
│  Share to X / Telegram / Copy link (existing + new third)   │
├─────────────────────────────────────────────────────────────┤
│ STATS STRIP (3-up, replaces today's Round Details grid)     │
│  Balance (180-day avg) · Round ends in · Pool this round    │
│  Each: value, sublabel, sparkline slot (when endpoint lands)│
├─────────────────────────────────────────────────────────────┤
│ LOTTERY STATUS (always-on ToneCallout, replaces conditional │
│  LotteryCard)                                               │
│  qualifies=true  → "You're in the lottery pool"             │
│  qualifies=false → "Direct payout — no lottery"             │
│  Body explains the 1-ENS threshold + RANDAO seed link to    │
│  Transparency.                                              │
├─────────────────────────────────────────────────────────────┤
│ ROUND PROGRESS card (existing RoundProgressCard, keep)      │
├─────────────────────────────────────────────────────────────┤
│ REWARD TIERS (existing RewardTiers, keep — already strong)  │
├─────────────────────────────────────────────────────────────┤
│ PAST ROUNDS STRIP (horizontal scroll, 3–4 cards visible)    │
│  Eyebrow "YOUR ROUND HISTORY"                               │
│  Per card: Round N · Month · "+ X.XX ENS earned" · status   │
│  Tail "+ N earlier" → /rounds?address=<user>                │
└─────────────────────────────────────────────────────────────┘
```

#### Per-section data sources & status

| Section | Field | Source | Status |
|---|---|---|---|
| Greeting — name | wagmi `useEnsName(address)` | wagmi | ✅ |
| Greeting — round number | `round.roundNumber` | `/rounds/current` | ✅ |
| Earnings hero — streaming counter | `apr.estimatedMonthlyRewardEns` via `useStreamingCounter(start,end)` | existing | ✅ |
| Earnings hero — APR | `apr.estimatedAprPct` | `/apr/{addr}` | ✅ |
| Earnings hero — tier badge | `tiers.currentTierIndex` | `/tiers/progression` | ✅ |
| Earnings hero — delegate avatar/name | `apr.delegatedTo`, `apr.delegatedToEnsName`, `apr.delegatedToAvatarUrl` | `/apr/{addr}` | ✅ |
| Earnings hero — delegate's last-10 dots | `activeVoters.voters.find(v => v.address === delegatedTo).last10ProposalsVoted` | `/voters/active` (one extra fetch; reuse if Voters page cached it) | ✅ |
| Earnings hero — Δ vs last round chip | previous round's `addressReward.totalRewardEns` from `api.distributionsForAddress(address)` | `/distributions?address=…` | ✅ |
| Stats strip — Balance | `apr.currentBalanceEns` | `/apr/{addr}` | ✅ |
| Stats strip — Round ends | `round.daysRemaining` + `round.endDate` | `/rounds/current` | ✅ |
| Stats strip — Pool | `tiers.tiers[currentTierIndex].poolSizeEns` | `/tiers/progression` | ✅ |
| Stats strip — sparklines | balance/pool history per round | **[needs endpoint]** — joint ask with VoterProfile §2.1 | ⚠️ ship without |
| Lottery status — qualifying flag | `apr.qualifiesForLottery` | `/apr/{addr}` | ✅ |
| Lottery status — projected payout | `apr.estimatedMonthlyRewardEns` | `/apr/{addr}` | ✅ |
| Lottery status — actual bucket (post-close) | `api.round(currentRound, address).addressReward.lotteryReward` | `/rounds/{N}?address=…` | ✅ (only after round close) |
| Round progress | `round.percentComplete` | `/rounds/current` | ✅ |
| Reward tiers | `tiers.tiers[]`, `currentTierIndex`, `isUnlocked`, `additionalVPNeeded`, `estimatedAprPct` | `/tiers/progression` | ✅ (already wired) |
| Past rounds — payout | `AddressDistributionRound.totalRewardEns` | `/distributions?address=…` | ✅ |
| Past rounds — status pill | `AddressDistributionRound.rewardStatus` | same | ✅ |

#### Micro-interactions

- **Greeting** — "GM/GA/GE" swaps by local time-of-day. No emoji. Fade in 200ms.
- **Streaming counter** — keep. Add a Δ chip beside subtitle that count-ups once on mount.
- **Tier badge** in hero — click scrolls smoothly to RewardTiers, applies a 1.5s glow to the current row using `motion.in-fast`.
- **Delegate pill** — entire pill links to `/voters/{address}`. Hover reveals "View profile →" suffix in `motion.in-fast`.
- **Delegate last-10 dots** — same `ProposalBar` component as VoterProfile. Tooltip per dot shows proposal title + vote direction (when endpoint lands); until then "Voted on proposal N of last 10."
- **Δ chip** — color via `status.success.fg` if positive, `status.neutral.fg` if 0, `status.warning.fg` if negative. Tooltip: "+0.42 ENS vs Round N-1."
- **Stats strip cards** — hover lift (`translateY(-1px)` + `shadow.soft`, 120ms). Each card has a `?` icon → tooltip:
  - Balance: "180-day per-second average. Filters short-term holders." [link → Transparency]
  - Round ends: ISO timestamp on hover.
  - Pool: "Sized by month-over-month active VP growth. Currently tier {N}."
- **Lottery callout** — primary inline link "see your bucket on Lottery →" → `/lottery?address={user}&round={current}`. Tone stays `neutral` pre-close; flips to `success` (if `addressReward.lotteryReward > 0`) or `neutral` ("entered, did not win") after close, with copy regenerated from `api.round(currentRound, address)`.
- **Past rounds strip** — scroll-snap on mobile; arrow buttons + keyboard arrow-key nav on desktop. Card hover lift. Card click → `/rounds/{N}?address={user}`. Tail "+ earlier" card → `/rounds?address={user}`.
- **Share buttons** — keep X / Telegram. Add third "Copy link" button that copies `https://<site>/dashboard?as={address}` (deep-link if/when public view is decided; otherwise just current URL). Toast on copy.

#### Empty / degraded states

- **No delegate** (`apr.delegatedTo === user address || null`) — Earnings hero collapses; replaced with a tone=`warning` ToneCallout: *"Not delegated yet. Pick a voter to start earning."* + "Browse voters" CTA → `/voters`. The streaming counter slot shows "0.0 ENS." Past Rounds may still render if the user earned as a token holder previously.
- **Delegate is no longer active** (the user is `connected` not `delegated` per WalletStateProvider — but they used to be delegated) — tone=`warning` ToneCallout: *"Your delegate is below the 7-of-10 activity threshold. You earn 0 ENS this round."* + "Pick another voter →".
- **First round (no past rounds)** — Past Rounds strip shows single neutral card: *"First round in progress. Your first payout appears here after Round {N} closes on {endDate}."*
- **`distributionsForAddress` error** — silently omit Past Rounds, render a footer "Couldn't load round history. [Retry]." Hero must never depend on history-fetch success.
- **Streaming counter at zero** — render "0.00" with subtle pulse, not blank.
- **`activeVoters` fetch error blocks delegate's last-10 dots** — fall back to showing only the delegate pill without the dot row, no error message.

#### DS-consistency notes

- Mono token (§1.1) applied to: hero earnings number digits, Δ chip number, Balance stat-card value, Past-rounds payout digits. ENS suffix stays in regular weight.
- Today's inline `box-shadow: 0 4px 12px rgba(82,152,255,0.3)` on share buttons → swap to `shadow.soft` once token lands.
- Replace inline tone colors in `LotteryCard` and `EarningsStrip` with the new `<ToneCallout>` primitive (§1.2).
- Greeting strip uses utility type size (12–13px, §1.3) so it doesn't compete with the hero number.
- Past Rounds card height matches `RoundProgressCard` for visual family consistency.
- The existing `RewardTiers` component is the canonical tier-ladder visual — promote its sub-pattern (dot row + APR pill + lock icon) into the foundation §1.2 as a "TierLadderRow" primitive for reuse on Landing v2 (tier preview slider) and VoterProfile (cap-utilization could mirror the dot style).

#### Implementation order

1. Add the three primitives (ToneCallout, EnsAmount, Address) from cross-cutting (task 9).
2. Always-render lottery callout — convert today's `{apr.qualifiesForLottery && <LotteryCard />}` into a single `<ToneCallout>` with branched copy. Lowest-risk visible change.
3. Greeting strip (cheap addition, sets the tone).
4. Δ chip + delegate last-10 dot row inside `EarningsStrip` (require fetching one previous round + `activeVoters`).
5. Past Rounds strip using existing `distributionsForAddress`.
6. Replace tokenless `box-shadow` literals.
7. Wire stat-card sparklines + per-proposal tooltips when backend endpoints land.

#### Open backend asks

| Endpoint | Purpose | Notes |
|---|---|---|
| (joint with VoterProfile §2.1) `/proposals?last=10` | Delegate's last-10 dot tooltips | Same endpoint covers both pages |
| (joint with VoterProfile §2.1) `/voters/{addr}/voting-power-history` | Stats strip sparklines | Same |
| Optional: `/distributions?address=…&limit=N` | Past Rounds pagination param | Trivial change; nice-to-have |

---

### 2.3 LandingPage v2 (`/`, three wallet states)

> **Iteration 3.** Confirmed via code audit: `DisconnectedLanding.tsx`, `ConnectedLanding.tsx`, and `DelegatedLanding.tsx` are **byte-identical copies** — same 5-section render tree, same props. The largest leverage on Landing is differentiating the **hero** per state while reusing the rest. The page already has rich pieces below the fold: `RoundStatusBar` (compact live-round card with tagline), `TierTableSection` (tier ladder with intersection-observer fade-in), `HowItWorksSection` (4-step grid with mobile merge for steps 3a/3b). Those stay; the hero and ordering change.

#### Goal

Per state, the hero answers a different question first:

- **Disconnected** → *"What is this and what would I earn?"* — pitch + interactive balance preview + connect CTA.
- **Connected, not delegated** → *"Who should I delegate to?"* — balance + projected APR + suggested voters.
- **Delegated** → *"Am I set up? When's the next payout?"* — projected reward + round progress + dashboard shortcut.

All three states keep the same below-fold sequence (Round status → Tier table → How it works → footer) for navigational consistency, but with `currentTierIndex` / `connectedBalance` carried through as URL state so tier highlighting stays in sync with the hero.

#### Refero references (synthesized)

- **Wealthsimple Retirement Calculator** — exemplar slider-driven "what would I earn" landing block. Fits Disconnected state's balance slider.
- **Wise live FX modal** — "as of N min ago" live-data framing. Fits the LiveDot + freshness chip in the Round status row.
- **Monarch Money plan** — personalized hero that branches on connection state with no jarring layout shifts. Fits the three-hero pattern.
- **Runey dashboard hero** — clean light-mode top stat strip with sparklines and avatar pills. Fits Delegated state's hero composition.

#### Layout — Disconnected hero

```
┌─────────────────────────────────────────────────────────────┐
│ DISCONNECTED HERO                                           │
│  Eyebrow: "ENS GOVERNANCE · 90-DAY PILOT"                   │
│  Headline: "Earn up to {maxAPR}% APR on idle ENS"           │
│  Subhead: "Round {N} ends in {timeLeft}. {poolEns} ENS in   │
│   this round's reward pool."                                │
│  ───── BALANCE PREVIEW (interactive) ─────                  │
│  Slider: 1K ENS ──────●──────── 100K ENS  (default 10K)     │
│  Stepped buttons (mobile): 1K / 10K / 50K / 100K            │
│  Live output (2-line):                                      │
│   "At {balance} ENS, you'd be in Tier {N}"                  │
│   "≈ {projectedRewardEns} ENS / round · ~{aprPct}% APR"     │
│  Primary CTA: "Connect wallet to start" (Thorin Button)     │
│  Secondary: "How it works ↓" (smooth-scrolls to §3)         │
│  Microcopy: "No tokens locked · Gas sponsored"              │
└─────────────────────────────────────────────────────────────┘
   ↓ RoundStatusBar (existing, tagline unchanged)
   ↓ TierTableSection (existing, current tier auto-highlights
     based on slider value — re-uses tier.isCurrent token)
   ↓ HowItWorksSection (existing 4-step grid)
   ↓ Footer
```

#### Layout — Connected hero (wallet connected, no active-voter delegation)

```
┌─────────────────────────────────────────────────────────────┐
│ CONNECTED HERO                                              │
│  Eyebrow: "WALLET CONNECTED"                                │
│  Headline: "You hold {balanceEns} ENS"                      │
│  Subhead: "Delegate to an active voter to earn              │
│   ~{projectedAPR}% APR (Tier {tierIndex+1})"                │
│  ───── RECOMMENDED VOTERS (3-card horizontal) ─────         │
│  Per card: avatar + ENS · last-10 dots · "{votingPower}     │
│   ENS · {tokenHolderCount} delegators"                      │
│  Cards link to /voters/{address}                            │
│  Primary CTA: "Browse all voters →"                         │
│  Secondary: "How rewards work ↓"                            │
└─────────────────────────────────────────────────────────────┘
   ↓ RoundStatusBar (existing — tagline OK)
   ↓ TierTableSection (user's current tier auto-highlighted
     from apr.currentBalanceEns)
   ↓ HowItWorksSection (steps 1, 2, 3 — step 1 reads as "Step
     completed: wallet connected" with green check)
   ↓ Footer
```

#### Layout — Delegated hero

```
┌─────────────────────────────────────────────────────────────┐
│ DELEGATED HERO                                              │
│  Eyebrow: "DELEGATED · ROUND {N}"                           │
│  Hero number (mono, tabular-nums):                          │
│   "≈ {projectedRewardEns} ENS this round"                   │
│   Subtitle: "Earning {aprPct}% APR · Tier {N}"              │
│  Delegate row (single-line):                                │
│   [avatar 24px] "Delegated to {ensName}" · last-10 dots     │
│   · "View profile →" link to /voters/{address}              │
│  ───── ROUND PROGRESS (mini, not the full Dashboard one) ── │
│   {N}% complete bar · "Ends {endDate}"                      │
│  Primary CTA: "Open dashboard →" (Thorin)                   │
│  Secondary: "Change delegate" → /voters                     │
└─────────────────────────────────────────────────────────────┘
   ↓ RoundStatusBar (existing)
   ↓ TierTableSection (current tier auto-highlighted)
   ↓ HowItWorksSection (compact mode — collapse to a single
     "Steps you've completed ✓" summary card; users in this
     state already know the program)
   ↓ Footer
```

#### Per-section data sources & status

| State | Section / element | Field | Source | Status |
|---|---|---|---|---|
| All | Eyebrow / round number | `round.roundNumber` | `/rounds/current` | ✅ |
| All | Max APR | `tiers.maxTokenHolderAprPct` | `/tiers/progression` | ✅ |
| All | Time left | derived from `round.endDate` via `formatTimeLeft()` | existing helper | ✅ |
| All | Pool size | `tiers.tiers[round.tierIndex].poolSizeEns` | `/tiers/progression` + `/rounds/current` | ✅ |
| Disconnected | Slider tier resolution | walk `tiers.tiers[]` and find the entry whose `requiredTotalVP` ≤ sliderValue (compare in wei) | client-side over existing data | ✅ |
| Disconnected | Projected reward at slider value | `tiers.tiers[matched].estimatedAprPct` × sliderValue × `(daysInMonth / 365)` | derived | ✅ |
| Connected | Balance | `apr.currentBalanceEns` | `/apr/{addr}` | ✅ |
| Connected | Projected APR if delegated | `apr.estimatedAprPct` (the response computes the user's tier APR even when not yet earning) | `/apr/{addr}` | ✅ — verify by reading backend `apps/backend/src/api/routes/apr.ts` behavior for non-delegated callers; if it 404s or returns null APR, fall back to `tiers.tiers[currentTierIndex].estimatedAprPct` derived from balance |
| Connected | Recommended voters (3 cards) | filter `activeVoters.voters` where `last10ProposalsVoted.filter(Boolean).length >= 9`, sort by `tokenHolderCount` asc (a fresh delegator is more meaningful to small-roster delegates), take 3 | `/voters/active` | ✅ |
| Connected | Voter card last-10 dots | `voter.last10ProposalsVoted` | `/voters/active` | ✅ |
| Delegated | Projected reward | `apr.estimatedMonthlyRewardEns` | `/apr/{addr}` | ✅ |
| Delegated | APR | `apr.estimatedAprPct` | `/apr/{addr}` | ✅ |
| Delegated | Delegate ENS + avatar | `apr.delegatedToEnsName`, `apr.delegatedToAvatarUrl` | `/apr/{addr}` | ✅ |
| Delegated | Delegate last-10 dots | `activeVoters.voters.find(v => v.address === apr.delegatedTo).last10ProposalsVoted` | `/voters/active` (one extra fetch, cache reused across pages) | ✅ |
| Delegated | Round progress | `round.percentComplete` | `/rounds/current` | ✅ |

#### Micro-interactions

**Disconnected — balance slider** (the single biggest interaction in this iteration):

- Drag-update is debounced to **next animation frame** (no debounce delay) — feels instant on desktop, smooth on mobile.
- Slider thumb has a tooltip showing the current value formatted as `{N}K ENS` while dragging.
- Below the slider, the **2-line output** swaps with a 120ms crossfade when the resolved tier changes (not on every pixel — only at tier boundaries). The numeric reward value count-ups in 200ms when tier flips, otherwise updates instantly.
- In `TierTableSection` below the fold, the row matching the slider's resolved tier gets the existing `tier.isCurrent` highlight live — same token, same animation, no new visual language. As the user drags, the highlighted row in the tier table flips along.
- Mobile-stepped balance buttons (1K / 10K / 50K / 100K) replace the slider on small screens; each is a chip that toggles tier highlight.
- Slider state persists in URL hash (`#balance=10000`) so deep-links into the landing carry the preview value.

**Connected — recommended voters**:

- Each voter card hover lifts (`translateY(-1px)` + `shadow.soft`, 120ms).
- Whole card is a link to `/voters/{address}` — no nested buttons.
- "Browse all voters →" CTA gets a subtle right-arrow translate on hover (existing pattern in other Thorin CTAs).
- If `apr` fetch fails (rare for connected state), hero degrades gracefully to the Disconnected variant — never block the page.

**Delegated — hero number**:

- Count-up animation on mount for the projected reward number (300ms ease-out, `prefers-reduced-motion` respected).
- Delegate row's last-10 dots tooltip-on-hover (same `ProposalBar` semantics as Dashboard v2 §2.2 and VoterProfile v2 §2.1).
- Round progress bar animates from 0 → `percentComplete` on mount (600ms ease).

**All states — Round status row**:

- LiveDot already pulses; keep. Add a freshness chip "{N}s ago" (computed from `round.computedAt` if exposed; otherwise omit chip — don't fake the timestamp).
- Numbers in the row use mono token (§1.1).

**All states — hero particles**:

- **Remove the 20-particle floating layer.** Audit flagged it as decorative noise; the slider / recommended voters / round-progress moments now carry the page's energy. The hero gradient stays.

#### Empty / degraded states

- **`/tiers/progression` or `/rounds/current` fails** — existing `ErrorMessage` stays. No state-specific hero renders. Don't try to be clever; this is the data the whole page depends on.
- **Disconnected — slider but `tiers.tiers[]` empty** — collapse to the headline + Connect CTA only, no slider. Show a small "Reward tiers loading…" line above the section break.
- **Connected — `apr` fetch returns null/404** (user is connected but not yet eligible) — hero swaps to a tone=`neutral` ToneCallout: *"Wallet connected. Hold any amount of ENS and delegate to an active voter to start earning."* + "Browse voters" CTA. Don't show a fake `~0% APR`.
- **Connected — `/voters/active` returns 0 active voters** — recommended-voters row collapses; hero shows tone=`pending`: *"No active voters in this round's snapshot yet. Check back when round {N} reaches its first vote."*
- **Delegated — delegate fell off active list mid-round** — hero stays Delegated visually (avatar + delegate name remain) but the projected-reward number renders as `0.0` with a tone=`warning` strip below: *"Your delegate hasn't met the 7-of-10 activity threshold this round."* + "Pick another voter →".
- **Round computedAt missing** — omit the "as of N seconds ago" chip silently.

#### DS-consistency notes

- Replace the inline 20-particle `floatUp` animation block with… nothing. The whole `ParticlesLayer` + `Particle` styled components and `PARTICLE_CONFIGS` array are deleted in v2.
- Hero headlines on all three states use `font.size['5xl']` / `'6xl'` (current sizing is fine). The Delegated state's projected-reward number is the only **mono + tabular-nums** spot in any hero — sets it apart visually from disconnected/connected pitch heros.
- All three heros sit on the same `linear-gradient(lightBlue → white)` background. The `border-bottom: 1px solid middleGray` already in `HeroSection` stays as the visual seam between hero and RoundStatusBar.
- `RoundStatusBar` already has the `transform: translateY(-50%)` overlap with the hero — that visual signature is good; keep across all states.
- Recommended-voters cards in Connected state should be visually identical to a future "VoterCard" primitive used on `/voters` page (iteration 4) — coordinate naming so they share a component. Until task 4 lands, render inline.
- Tier highlighting (Disconnected slider + Connected/Delegated balance-derived) uses the **same** `tier.isCurrent` styled-component token in `TierTableSection` — one source of truth. Avoid introducing a second highlight color.

#### Implementation order

1. Refactor `DisconnectedLanding.tsx`, `ConnectedLanding.tsx`, `DelegatedLanding.tsx` to render distinct hero components (`DisconnectedHero`, `ConnectedHero`, `DelegatedHero`), each receiving the same `tierData` + `roundData` + (for connected/delegated) `apr` + (for delegated) `delegateVoter`. Section composition (RoundStatusBar / TierTableSection / HowItWorksSection / Footer) becomes a `<LandingScaffold>` wrapper used by all three.
2. Delete `HeroSection.tsx`'s particle layer + configs (only after the new heros take the visible role).
3. **Disconnected** — build slider + 2-line output + tier highlight sync. URL hash persistence. This is the highest-leverage interaction in the iteration.
4. **Connected** — fetch `apr` via existing `useDashboardData` shape (or inline). Filter `activeVoters` for the 3 recommended voters. Render voter cards (placeholder inline, to be replaced by VoterCard primitive in task 4).
5. **Delegated** — projected-reward hero + delegate row + round-progress mini-bar.
6. Wire `currentTierIndex` / `connectedBalance` URL-state pass-through to `TierTableSection` (small prop addition: `highlightTierIndex?: number`).
7. Compact-mode toggle for `HowItWorksSection` (Delegated state collapses 4 cards into one summary "✓ Steps you've completed").
8. Verify the connected hero degradation path (apr 404 → ToneCallout) against the actual `/apr/{addr}` behavior for non-token-holders.

#### Open backend asks

| Endpoint | Purpose | Notes |
|---|---|---|
| Verify behavior: `/apr/{address}` for connected-but-not-token-holder | Determines whether Connected hero shows `apr.estimatedAprPct` or falls back to balance-derived tier APR | Behavior is a backend reading, not new endpoint. Confirm with `apps/backend/src/api/routes/apr.ts`. |
| `RoundInfoResponse.computedAt` | Powers the "as of N seconds ago" freshness chip | Optional; only add chip if the field exists |
| (joint with VoterProfile §2.1, Dashboard §2.2) `/proposals?last=10` | Delegate last-10-dots tooltip in Delegated hero | Already requested |

---

### 2.4 VotersPage v2 (`/voters`)

> **Iteration 4.** The page already does more than the audit gave it credit for: `SortControls` with direction-toggle pills + Random-as-shuffle, `StatsBar` with three on-brand stats, `VoterCard` with avatar/ENS/ProposalBar/3-stat row, staggered fade-in on the grid. v2 adds the **decision tools** the audit flagged as missing — filters, search, compare drawer, ENS bio snippet — without rebuilding the existing strong scaffolding.

#### Goal

Users come to `/voters` with one of three intents:

1. **"Pick a delegate."** — first-time delegator; needs to narrow from ~N voters to a shortlist quickly.
2. **"Find a specific voter."** — knows the ENS name, wants to navigate to their profile.
3. **"Compare candidates."** — has 2–3 in mind; wants side-by-side facts.

Today the page serves (1) reasonably (sort works), barely serves (3) (no compare), and doesn't serve (2) at all (no search).

#### Anti-pattern guardrail

Per the audit's program-principle list and the forum thread (nick.eth's sybil-caps objection, estmcmxci's mercenary-participation objection): **do NOT add a "top earners" sort or a "most rewarded delegates" filter.** Sorting by VP is fine (legitimate governance signal); sorting by historical payout would surface farming behavior the program is trying to dampen. This v2 explicitly omits earnings-based ordering.

#### Refero references (synthesized)

- **Mailchimp Find-an-Expert directory** (`mailchimp.com/find-an-expert/`) — the canonical filter-sidebar + card-grid pattern for picking a person from a roster. Filters are specialty + availability; the equivalent for our domain is activity-recency + VP-range + delegator-count + accepts-new-delegators.
- **Reown / Polar members table** — clean avatar + status-badge row. Less directly applicable since we're card-grid, but the badge vocabulary (active/inactive/pending) maps to our `last10ProposalsVoted` derivation.
- **Mercury SaaS Magic Number calculator** — bottom-right floating "running calc" panel. Visual fit for the Compare drawer chip.
- **Stocktwits "who to follow"** — list with persistent select / follow checkboxes that don't disrupt the list visual. Fits the Compare checkbox treatment.

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (existing TopSection)                                │
│  Eyebrow + Title + Description (existing copy keeps)        │
│  StatsBar: active voters · ENS delegated · wallets earning  │
├─────────────────────────────────────────────────────────────┤
│ TOOLBAR (replaces the standalone SortControls row)          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🔍 Search ENS or 0x address.....   [×]                │   │ ← search input (new)
│  └──────────────────────────────────────────────────────┘   │
│  Sort:    [Random ↻] [Voting Power ↓] [Activity ↓] [First ↑]│ ← existing pills, keep
│  Filters: [Participation ▾] [VP range ▾] [Delegators ▾]      │ ← new dropdowns
├─────────────────────────────────────────────────────────────┤
│ ACTIVE FILTER STRIP (only when ≥1 filter active)            │
│  [Active in last 10 ≥9 ×] [VP 10K–100K ×]   Showing 12 of 47│
│                                                  [Clear all]│
├─────────────────────────────────────────────────────────────┤
│ GRID (3-col desktop, 1-col mobile — existing Grid styles)   │
│  VoterCard v2 × N (see card spec below)                     │
│  Empty state if filter excludes everyone (see "Empty")      │
├─────────────────────────────────────────────────────────────┤
│ COMPARE DOCK (floating, appears when ≥2 cards selected)     │
│  Bottom-right (desktop) / bottom sheet (mobile)             │
│  "2 selected · [Avatar1] [Avatar2]   Clear   Compare →"     │
└─────────────────────────────────────────────────────────────┘

VoterCard v2 (delta from existing):
┌──────────────────────────────────────────────────┐
│ [☐ Compare]                                ★ NEW │ ← new corner controls
│ ┌──┐ ENS name                                    │
│ │📷│ 0x1234…cdef  · Joined Mar '24               │ ← address + active-since merged
│ └──┘                                             │
│ "Bio snippet from ENS text record description"   │ ← NEW (only if record exists)
│ ──────────────────────────────────────────────── │
│ Last 10 proposals                                │
│ ●●●○●●●●●○   (existing ProposalBar)               │
│ "Last voted 6 days ago · prop #112"              │ ← NEW (subtle, hover-only)
│ ──────────────────────────────────────────────── │
│ VP        Delegators    Participation            │
│ 24.6K     142            9/10                    │ ← Participation replaces "Active since"
│ ──────────────────────────────────────────────── │
│ [ Delegate · Free ]   View profile →             │ ← existing actions
└──────────────────────────────────────────────────┘
```

#### Per-section data sources & status

| Section / control | Field | Source | Status |
|---|---|---|---|
| Header StatsBar (no change) | `stats.activeVoterCount`, `stats.totalDelegatedEns`, `stats.holdersEarning` | `/stats` | ✅ |
| Search input | client-side filter on `voter.ensName` (exact + prefix) and `voter.address` (case-insensitive substring) over `activeVoters.voters` | `/voters/active` | ✅ |
| Search — ENS resolve typed name to address | wagmi `useEnsAddress({ name })` for round-trip when user types something not in current list (jumps directly to profile) | wagmi | ✅ |
| Sort (existing) | already wired | client-side over `activeVoters.voters` | ✅ |
| Filter — Participation (e.g. ≥7/10, ≥9/10, =10/10) | derived from `voter.last10ProposalsVoted.filter(Boolean).length` | `/voters/active` | ✅ |
| Filter — VP range (slider: 0 → max) | derived from `voter.votingPower` (wei → ENS) | `/voters/active` | ✅ |
| Filter — Delegators range (0 / 1–10 / 10+ buckets) | derived from `voter.tokenHolderCount` | `/voters/active` | ✅ |
| Filter — "Active in last 30 days" | requires last-vote timestamp per voter | **[needs endpoint]** — Ponder indexes `VoteCast` per delegate. Propose `/voters/active` to additionally return `lastVoteAt: ISO` per voter. Or use the same `/proposals?last=10` join from VoterProfile §2.1. | ⚠️ ship filter without it; add when endpoint lands |
| Filter — "Accepts new delegators" | ENS text record (e.g. `delegate.accepting`) on the voter's name | viem `getEnsText` | ⚠️ social signal, sparsely populated; ship as an opt-in chip that filters only when set, never as a default |
| Card — bio snippet | ENS text record `description` (same as VoterProfile §2.1) | viem `getEnsText` per visible voter — debounce/batch | ✅ (cache via TanStack Query per `ensName`) |
| Card — "Last voted N days ago · prop #N" | requires last-vote timestamp + proposal ID | **[needs endpoint]** — same as filter | ⚠️ omit until endpoint |
| Card — Participation stat (`{voted}/10`) | derived from `voter.last10ProposalsVoted` | `/voters/active` | ✅ |
| Compare drawer — selected voters' fields | from existing `voter` records held in state — no extra fetch | client-side | ✅ |
| Compare route `/voters/compare?addresses=0x1,0x2,0x3` | state-only, render side-by-side from existing `useVoters()` cache | client-side | ✅ |

#### Micro-interactions

- **Search input** — debounced 150ms; result count updates in the active-filter strip live. If the user types a string that resolves via wagmi `useEnsAddress` and the resolved address matches a voter in the list, scroll that card into view and apply a 1.5s glow (same `tier.isCurrent` highlight motion). If the resolved address is NOT in the active-voters list, show a one-line callout *"{name} isn't an active voter yet — view their profile →"* linking to `/voters/{name}`.
- **Sort pills** — keep current behavior; add a subtle `motion.in-fast` transition on the direction arrow when toggled.
- **Filter dropdowns** — open as a small popover anchored to the chip. Inside: radio set (Participation: ≥6 / ≥7 / ≥9 / =10), slider (VP), buckets (Delegators). Selecting a value collapses the popover and renders the matching chip in the Active Filter Strip.
- **Active filter chip** — `×` icon removes that single filter. Hover the chip → slight `shadow.soft` lift + reveal `×`. "Clear all" link sits at the right end of the strip.
- **Grid empty state under active filters** — friendly tone=`neutral` ToneCallout: *"No active voters match these filters. Try widening Participation, or clear filters."* + a "Clear filters" button. **Don't** show 0 cards in a silent grid.
- **VoterCard hover (new)** — existing border-blue + shadow.md keeps; in addition reveal the "Last voted N days ago · prop #N" line below the ProposalBar (fade in 120ms, fade out 80ms). Pure progressive disclosure — info only when the user hovers. When backend endpoint lands.
- **VoterCard ProposalBar dot hover** — tooltip with proposal title + their vote direction (For/Against/Abstain) + date. Same component shared with VoterProfile §2.1. Tooltip arrow points at the hovered dot.
- **VoterCard compare checkbox** — small (16px) checkbox in top-right corner. Click toggles selection in a `useCompare()` hook keyed by address. Adds card to the Compare Dock. Max 3 selected — fourth click flashes the dock's count chip without selecting.
- **Compare Dock** — slides up from the bottom-right on first selection (`motion.in`, 200ms). Shows up to 3 avatar bubbles in a horizontal stack, the count, and two actions: "Clear" / "Compare →". Click compare → navigate to `/voters/compare?addresses=…`. The dock stays visible while ≥2 voters selected; collapses when count drops below 2.
- **Compare page** (no separate spec — small enough): side-by-side grid, 2-col on tablet, 3-col on desktop. Each column = a VoterCard rendered slightly larger, plus a "Same-vote alignment" row (when proposal data lands) showing how often the selected voters voted the same way on the last 10. All data already in `useVoters()` cache.
- **Card click region** — entire card is click-into-profile **except** the Compare checkbox and Delegate button (event.stopPropagation on both). Replaces today's "click View profile link only" pattern; much better mobile target.
- **Grid stagger** — existing 0.04s × index cascade stays. Cap at 12 (already implemented).

#### Empty / degraded states

- **No voters in `/voters/active`** — entire grid replaced by a tone=`pending` ToneCallout: *"No active voters in this snapshot yet. The first eligible delegates appear here once they vote on 7 of the last 10 proposals."* — addresses bcvfinance's forum concern that the 7/10 threshold may exclude new delegates.
- **Search returns no match in current list AND wagmi can't resolve** — tone=`neutral`: *"Couldn't find anyone matching '{query}'. Try a full ENS name or 0x address."*
- **Filter combo excludes everyone** — see "Grid empty state" above.
- **`activeVoters` API error** — existing `ErrorMessage` keeps. Don't silently hide.
- **ENS text record fetch error** — bio snippet omitted, no error shown. Card layout doesn't collapse (bio sits on its own line; absent → no line).
- **Wallet not connected + Delegate button** — visual stays (existing behavior, integration-gated). Tooltip on hover: "Connect wallet to delegate" (when wallet status is `disconnected`).

#### DS-consistency notes

- The new search input uses `tokens.radius.md` + `1px solid borderLight` + leading 🔍 icon at 16px. Match the visual weight of existing SortControls pills so they read as one toolbar block. Mono token applies inside the input when it shows a resolved address.
- Filter chips in the active strip use the same `radius.pill` + `1px solid darkBlue` from the SortControls pills, but with a slightly lighter fill (`tierHighlight` token) so they read as "applied filter" vs "selectable sort." One visual register, not two.
- ENS text record fetching uses the same query-key pattern proposed in VoterProfile §2.1 (`['ens-text', name, key]`). One TanStack Query cache covers both pages.
- VoterCard's new "Participation" stat displays as `9/10`, not `90%` — match the program's literal vocabulary from the forum ("voted on at least 7 of the last 10 proposals").
- Compare Dock uses `shadow.soft` + `surface.card` over a 1px border — same elevation as a single VoterCard, anchored bottom-right with `position: fixed` and `inset-block-end / inset-inline-end` so it respects safe-area on mobile.
- Compare checkbox visual = the `Checkbox` from `@ensdomains/thorin` if it exists; otherwise a custom 16px square matching `radius.sm`. **Do not invent a new check style.**
- Hover reveal line (last-voted) is **utility-type size** (12–13px per §1.3), color `darkGray`. Don't compete with the ProposalBar.

#### Implementation order

1. Wrap the existing SortControls + (new) search + (new) filter dropdowns into a single `<VotersToolbar>` component. Mobile = horizontal scroll, same affordance.
2. Add the search input + active filter strip without filters first — proves the layout.
3. Add Participation / VP / Delegators dropdowns (all client-side, no backend).
4. Add ENS text record fetch (`description`) per visible voter — debounce reading by intersection-observer (only fetch for cards within ±200px of viewport).
5. Add Compare checkbox + Compare Dock + `useCompare()` hook (lives in `features/voters/useCompare.ts`).
6. Add `/voters/compare` route + page that renders selected addresses side-by-side from `useVoters()` cache. No new fetches.
7. Wire the "Active in last 30 days" filter + "Last voted N days ago" card line **when** the `lastVoteAt` field lands on `/voters/active`.
8. Wire "Accepts new delegators" filter behind a feature flag — only show the chip when at least one voter has the `delegate.accepting` ENS text record set (avoids dead UI for an empty signal).

#### Open backend asks

| Endpoint | Purpose | Notes |
|---|---|---|
| `lastVoteAt: ISO` field on `/voters/active` records | Activity-recency filter + per-card "Last voted N days ago" line | One extra timestamp per record; cheap Ponder query against `VoteCast` |
| (joint with VoterProfile §2.1, Dashboard §2.2) `/proposals?last=10` | Proposal title + vote direction in ProposalBar tooltips on every card | Same endpoint covers three pages |

---

### 2.5 RoundsPage v2 (`/rounds`) and RoundDetailPage v2 (`/rounds/:n`)

> **Iteration 5.** Two pages, paired because they share the address-lookup form, the legacy-endpoint fallback chain, and the program's credibility weight. Stakeholders skeptical of the lottery (nick.eth, estmcmxci, bcvfinance) land on these pages first to inspect. Today both pages dump data accurately but anonymously — facts without narrative. v2 reorders sections to *user outcome → round context → methodology → recipients → transparency*, replaces ad-hoc tone panels with the foundation `<ToneCallout>` primitive, makes the seed verifiable, and adds the BucketSlotGrid visualization so "fairness" is shown, not just claimed.

#### Goal

For **RoundsPage** (`/rounds`):
1. **"What's happening right now?"** — current round state, days/pool/tier at a glance.
2. **"Did I earn anything?"** — connected wallet's per-round history surfaced first.
3. **"Where do I go next?"** — clear jumps into a specific round's detail page.

For **RoundDetailPage** (`/rounds/:n`):
1. **"Did THIS address get a payout from THIS round, and why?"** — the lookup-led insight is the page's primary job.
2. **"How was the result decided?"** — methodology made visible (seed, RANDAO source, bucket-target, algorithm), with on-chain links so a skeptic can verify.
3. **"Who else got paid?"** — searchable recipient tables, address jump-to-row.
4. **"How fair was the lottery, mathematically?"** — slot-grid showing winning entry vs. losing entries by weight.

#### Refero references (synthesized)

- **Cake Equity Audit Log / Navan reports** — clean "transparency dashboard" pattern: top stat strip, then a filtered table with timestamps and verifiable references. Fits the methodology callout + recipients table pair.
- **Brilliant "Lithium League"** — leaderboard card style with rank badge + avatar + amount, gentle entrance. Fits the recipient tables visually (not the spirit — we are NOT a competitive leaderboard).
- **Wise FX modal** — "as of N min ago" freshness + verifiable rate source. Fits the seed-block-link pattern for the lottery methodology card.
- **Weights & Biases run tables** — search-and-jump within a long sortable table. Fits the recipient tables' address search.

---

#### RoundsPage layout

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                      │
│  Eyebrow "ROUNDS"                                           │
│  Title "Round {N}" · Status pill (live/pending/paid/ended)  │
│  Live: LiveDot pulse · "{days} days remaining"              │
├─────────────────────────────────────────────────────────────┤
│ LOOKUP TOOLBAR (promoted from "Inspect Address" section)    │
│  ┌────────────────────────────────────────────────┐         │
│  │ 🔍 Address or ENS........................  [Go] │  [↺]   │ ← clear
│  └────────────────────────────────────────────────┘  Use my │
│   Showing: {Connected wallet | Searched | None}     wallet ↑│
├─────────────────────────────────────────────────────────────┤
│ CURRENT ROUND OVERVIEW (replaces single RoundCard)          │
│  ┌─────────────────────┐ ┌─────────────────────────┐        │
│  │  Pool {N}K ENS      │ │ POOL ALLOCATION         │        │
│  │  Tier {n} · {growth}│ │ ●●●●●○○○○○ {N}% paid    │        │
│  │  {percent}% complete│ │ Distributed: X · Pool: Y│        │
│  │  Progress bar       │ │ (or "Pending — payout   │        │
│  │  Ends {date} UTC    │ │  on round close" if live)│        │
│  └─────────────────────┘ └─────────────────────────┘        │
├─────────────────────────────────────────────────────────────┤
│ ROUND HISTORY (replaces today's table on desktop; cards on  │
│  mobile — fixes the current reflow that loses hierarchy)    │
│                                                             │
│  Desktop table:                                             │
│  Rank · Round · Dates · Pool · VP Growth · Lottery · You    │
│        with a tiny inline VP-growth sparkline column        │
│                                                             │
│  Mobile (each round = a card):                              │
│  ┌─────────────────────────────────────────┐                │
│  │ Round 2 · Feb 2026 · paid               │                │
│  │ You earned: 14.2 ENS (large)            │                │
│  │ Pool: 8K · Growth: +14% · 47 lottery    │                │
│  │ winners · 142 entries                   │                │
│  │                                    →    │                │
│  └─────────────────────────────────────────┘                │
├─────────────────────────────────────────────────────────────┤
│ RIGHT SIDEBAR (≥1024px) — replaces duplicate TierTable      │
│                                                             │
│  LOTTERY SNAPSHOT card                                      │
│  "Round {N} lottery"                                        │
│  ● {bucketCount} pools                                      │
│  ● {entryCount} entries · {participantCount} addresses      │
│  ● {winnerCount} winners so far                             │
│  → Inspect on Lottery page                                  │
│                                                             │
│  TRANSPARENCY CALLOUT                                       │
│  "How is this round computed?"                              │
│  → See methodology                                          │
└─────────────────────────────────────────────────────────────┘
```

#### RoundDetailPage layout (reordered + restructured)

```
┌─────────────────────────────────────────────────────────────┐
│ TOP NAV                                                     │
│  ← Back to rounds          [← Prev round] [Next round →]    │
├─────────────────────────────────────────────────────────────┤
│ HEADER                                                      │
│  Eyebrow "ROUND DETAILS"                                    │
│  Title "Round {N}" · Status pill                            │
│  Lookup toolbar (same as RoundsPage v2)                     │
├─────────────────────────────────────────────────────────────┤
│ 1. YOUR RESULT — the highest-priority panel                 │
│  <ToneCallout tone={success/warning/pending/neutral/error}> │
│     plain-English sentence first, metrics grid second        │
│  Tones with explicit copy (no derived/templated strings):   │
│   • won            → "You won Bucket #14 (8.1% odds)."      │
│   • entered, lost  → "You entered Pool 14 with 3 entries..."│
│   • direct payout  → "Direct payout — 12.3 ENS (>1 ENS,     │
│                       no lottery)."                          │
│   • pending        → "Lottery runs after round close..."    │
│   • neutral        → "No payout this round." + why-link     │
│   • error          → "Invalid address." (per today's check) │
├─────────────────────────────────────────────────────────────┤
│ 2. ROUND OVERVIEW                                           │
│  Summary stat strip (existing 4-up: Dates · Tier · VP       │
│   Growth · Pool) + 2 additions: Distributed · This Round's  │
│   Lottery Prize total                                       │
├─────────────────────────────────────────────────────────────┤
│ 3. HOW IT WAS DECIDED (methodology card)                    │
│  4 short bullets (Eligibility · Balance window · Pool       │
│   sizing · Lottery rule) — re-uses copy from Transparency   │
│  Then a verifiable-seed row:                                │
│   "Seed: 0x9f3a…  ← copy [CopyChip]                         │
│    From Ethereum block #18,234,789 (RANDAO)                 │
│    → View on Etherscan ↗"                                   │
│   "Algorithm: weighted-random-pool · → See source ↗"        │
├─────────────────────────────────────────────────────────────┤
│ 4. RECIPIENTS — searchable, address-jump                    │
│  Tab: Voters ({n})   Token holders ({n})                    │
│  ┌──────────────────────────────────────────────┐           │
│  │ 🔍 Find an address.............             │           │
│  └──────────────────────────────────────────────┘           │
│                                                             │
│  Table (existing rank/address/reward) with:                 │
│   - sticky header                                           │
│   - current-search-or-connected address row highlighted +   │
│     scrolled into view                                      │
│   - row-click expands inline: full address, ENS, role,      │
│     source (direct/lottery/combined), tier                  │
│   - "Show 25 / 100 / all" pagination at table bottom        │
│     (existing rewardLimit query param already supports this)│
├─────────────────────────────────────────────────────────────┤
│ 5. LOTTERY TRANSPARENCY — collapsible, defaults closed      │
│  ▶ Lottery transparency ({bucketCount} pools · {entryCount} │
│    entries)                                                 │
│  Expanded:                                                  │
│  5a. Buckets table (existing) — Bucket # · Winner ·         │
│      Prize · Entries · Chance                               │
│      Row click → reveals BucketSlotGrid below the row       │
│      (slots = entries, winner highlighted with badge)       │
│  5b. Lottery entries table (existing 100-row cap)            │
│      With a search input above to find an address in the    │
│      full server list (NOT just the 100 visible) — fires    │
│      api.round(N, address) on submit to verify              │
└─────────────────────────────────────────────────────────────┘
```

#### Per-section data sources & status

| Page / section | Field | Source | Status |
|---|---|---|---|
| **Rounds** Header | `currentRound.roundNumber`, `.status`, `.daysRemaining` | `/rounds/current` or selected from `/rounds` | ✅ |
| **Rounds** Lookup toolbar | reuses existing `AddressLookupForm` | local state + URL | ✅ |
| **Rounds** Pool allocation card — distributed | `currentRound.totalDistributedEns` | `/rounds/current` | ✅ when round closed; null on `live` → render "Pending" |
| **Rounds** Pool allocation card — pool size | `currentRound.poolSizeEns` | same | ✅ |
| **Rounds** Pool allocation doughnut (visual) | derived `totalDistributed / poolSize` ratio | computed | ✅ |
| **Rounds** History table | `roundList.rounds[]` from `/rounds`, plus per-address from `/distributions?address=…` | existing `useAsync` chain | ✅ |
| **Rounds** Per-round VP-growth sparkline column | each round's `vpGrowthPct` rendered as a tiny 6-point bar | client-side over existing data | ✅ |
| **Rounds** "You earned" cell | `AddressDistributionRound.totalRewardEns` | `/distributions?address=…` | ✅ |
| **Rounds** Lottery snapshot sidebar — bucket/entry/winner counts | `currentRound.lotteryBucketCount`, `lotteryEntryCount`, `lotteryWinnerCount`, `lotteryParticipantCount` | `/rounds/current` | ✅ |
| **RoundDetail** Your Result tone panel | exactly today's `buildAddressLotteryInsight` derivation, lifted into `<ToneCallout>` props | existing logic | ✅ |
| **RoundDetail** Round Overview — Distributed + Lottery Prize | `round.totalDistributedEns`, `round.lotteryPrizeEns` | `/rounds/{N}` | ✅ |
| **RoundDetail** Methodology bullets | static copy, derived from program docs (no API) | static | ✅ |
| **RoundDetail** Seed value + block | `round.lottery.seed.value`, `.blockNumber`, `.label`, `.algorithm` | `/rounds/{N}` | ✅ |
| **RoundDetail** Etherscan seed-block link | `https://etherscan.io/block/{blockNumber}` | static URL pattern | ✅ |
| **RoundDetail** Algorithm "See source" link | static URL to `packages/domain/src/lottery.ts` on GitHub | static | ✅ |
| **RoundDetail** Recipients search — find user in full list | client-side filter against `round.topVoterRewards` / `topTokenHolderRewards` when `rewardLimit=all`; for sparse results fall back to `api.round(N, address)` and surface that single result | `/rounds/{N}?rewardLimit=all` (existing supports `all`) | ✅ |
| **RoundDetail** Recipients pagination | existing `rewardLimit` query parameter on `api.round()` (already accepts `'all' | '${number}'`) | client param | ✅ |
| **RoundDetail** BucketSlotGrid (slots) | `bucket.entries[]` array — each becomes one slot; `bucket.winner` identifies the winning slot | `/rounds/{N}` | ✅ |
| **RoundDetail** Lottery entry search across full server list | none today — backend returns full `bucket.entries[]` so the 100-row UI cap is purely client-side. We can lift the cap or add client-side address filter without backend change | client-side | ✅ |

#### Micro-interactions

**RoundsPage**:

- **Lookup toolbar — "Use my wallet"** chip (new) appears only when `walletState !== 'disconnected'` and the input is empty or doesn't match the connected address. Click → populates input with the connected address + submits. Tiny green check on success.
- **Pool allocation doughnut** — animates from 0 to actual ratio on first paint, 800ms ease-out, respects `prefers-reduced-motion`. Hover any slice → "Distributed {X} ENS" / "Remaining {Y} ENS" tooltip.
- **Round-history rows** — hover lifts via `shadow.soft`; click anywhere on the row goes to `/rounds/{N}?address=...`. Today already navigates but the click target is just the row's `to` prop on the underlying Link.
- **VP-growth sparkline column** — tiny inline bars (6 points = last 6 rounds), bar height proportional to that row's growth %. Hover any bar tooltips the round number and exact %. Removes the need to scan numbers across rows.
- **Mobile reflow** — current `Td[data-label]` pseudo-element pattern is OK for tables with ≤4 cols but our history has 7. Replace mobile rendering with a stack of `RoundHistoryCard` components (each card has a clear hierarchy: round number + dates → big "You earned" → small metadata row). Desktop table stays.
- **Status pills** — already pulse for `live` (keep). Add tiny check icon for `paid` and hourglass for `pending` so status reads at a glance.

**RoundDetailPage**:

- **Your Result ToneCallout** — fade in 200ms with a 1-step vertical translate. If `tone === 'success'`, a single confetti burst when the panel first mounts (gated on `prefers-reduced-motion: no-preference`).
- **Tone copy** — locked verbatim copy per tone (see layout). Today's `buildAddressLotteryInsight` template strings get replaced with the locked sentences; backend-derived counts/buckets stay interpolated. Reduces the "metrics show X" template that the audit flagged.
- **Methodology seed row — Etherscan link** — entire row hover-highlights, the seed value gets a CopyChip (existing pattern in `CopyableAddress`). Click → copy; toast "Seed copied." External link opens new tab.
- **Recipients search input** — debounced 200ms; live filter on the rendered table. If the typed query is a valid address NOT in the current page slice, fires `api.round(N, query)` and prepends a single result row "Found out-of-page: {ENS} · {reward}" with a "Show in context" button that toggles `rewardLimit=all`.
- **Connected wallet auto-highlight** — when the page loads with `activeAddress` set, scroll the recipient row matching that address into view and pulse the row 1.5s (`tier.isCurrent` motion).
- **Row click expansion** — row toggles open inline (no modal). Reveals: full address (mono, copyable), ENS name, role chip (voter/token holder), source chip (direct/lottery/combined — exists on `RewardRank`), tier badge, link to that voter/holder's profile page.
- **Pagination control** — 25 / 100 / All buttons. Default to 25. Persist selection in URL search param `?show=25`.
- **Lottery transparency collapse** — defaults closed. Expand button has a chevron that rotates 90deg on open (`motion.in-fast`). Bucket and entries tables fade in 200ms as the section reveals.
- **Bucket row click — slot grid reveal** — clicking a bucket row toggles an inline `<BucketSlotGrid entries={bucket.entries} winnerIndex={…} />` below it. Slot grid uses the foundation primitive (§1.2). Hover any slot → tooltip "{address} · weight {amount} ENS · {probability}." Winning slot has a 🏆 badge and a permanent 2px border in `status.success.border`.
- **Entries-table address search** — search input above the table. Debounced 200ms. Filters the full `lottery.buckets.flatMap(b => b.entries)` array (server already returns all entries — the 100-row UI cap is client-only). Match jumps the matched entry into the visible 100 and pulses the row.

#### Empty / degraded states

- **RoundsPage — `/rounds` returns 0 rounds** — header collapses to "No rounds configured" (today's empty state, keep). Add: "Rounds appear here once a `ROUND_MONTHS` configuration is set." (cites the operator doc — no fictional explanation.)
- **RoundsPage — legacy 404 fallback path** — already handled (`buildRoundListFromCurrentRound`). Keep but add a tiny dev-only warning chip in the round-history footer when fallback was used, so engineers see it without console digging. Strip in production builds.
- **RoundsPage — `distributionsForAddress` 404** — today shows "Unavailable" per cell. Replace with "Not eligible · {round.status === 'live' ? 'In progress' : 'No history'}" — more honest, matches the `RewardStatus` enum values already in types.
- **RoundDetail — `roundNumber` invalid (≤0 or NaN)** — keep today's ErrorMessage "Unknown round."
- **RoundDetail — `api.round` 404** — falls through to `buildRoundDetailFallback`. Add a single tone=`warning` strip at the top of the page: "Detailed data not available for this round yet. Showing summary only." instead of letting the user wonder why sections are empty.
- **RoundDetail — `round.lottery == null` (round closed but no lottery ran, e.g. all payouts were direct)** — Lottery Transparency section collapsed by default with explainer in the expanded body: "No lottery this round — every payout was ≥1 ENS, so all recipients got direct transfers."
- **RoundDetail — recipients table = 0 rows** — keep today's "No distribution data." but add CTA: "If this round is still live, recipients appear after distribution at round close."
- **RoundDetail — search query is a valid address but matches nothing** — show inline "{ENS or short address} did not earn in this round." Don't error; don't blank the table.

#### DS-consistency notes

- The 5 inline tone-color branches in today's `AddressLotteryPanel` (`if $tone === 'success' return tokens.color.positiveEmphasis`, etc.) get **deleted** and replaced by the `<ToneCallout tone={…}>` primitive (§1.2). Same tone values, single source of truth.
- The summary grid (`SummaryGrid` with 4-col → 2-col responsive) uses identical card padding to the Dashboard stats strip (§2.2). Today they differ by ~4px; unify on `lg` card padding.
- Seed value renders in **mono token** (§1.1) — first place on this page where mono is mandatory. Address values in tables already use `font-variant-numeric: tabular-nums` (existing `AddressText` styled-component); promote to mono token too.
- Status pills on this page share the same styled-component as the StatusBadge on RoundsPage and the Dashboard. Three pages, one component — extract into `<StatusPill tone />` and drop the duplicates.
- BackLink today uses `color: tokens.color.blue` directly; convert to a generic `<BackLink>` primitive used on VoterProfile, Dashboard nav, and elsewhere.
- The `MetaGrid` 4-col layout on RoundDetail mirrors the Dashboard's 3-stat strip; unify on a single `StatStrip` primitive that accepts an arbitrary number of stat children. Today they look 90% alike but are separate components.
- "Distributed", "Pool", "Lottery Prize" labels use the same **eyebrow** style (`SummaryLabel`) — keep, but tighten to 11px per §1.3 (utility-type rule).
- The TierTable that today renders in the RoundsPage right column is the **same** component visible on Landing/Dashboard — in v2 it's removed from RoundsPage (duplicative). Replace with the Lottery Snapshot card defined above. Saves bytes, removes redundancy, opens room for sidebar content that's actually round-specific.

#### Implementation order

1. Extract `<ToneCallout>`, `<CopyChip>`, `<StatusPill>`, `<StatStrip>`, `<BackLink>` primitives into `components/shared/` (cross-cutting, task 9). This unblocks both pages at once.
2. **RoundsPage** — promote lookup toolbar to top with "Use my wallet" affordance. Build new Pool Allocation card (doughnut + distributed/remaining). Replace duplicate TierTable in sidebar with Lottery Snapshot card. Convert mobile reflow to card stack.
3. **RoundsPage** — add VP-growth sparkline column to the history table (small SVG, no library).
4. **RoundDetailPage** — reorder section render in `RoundDetailPage.tsx` to: header → Your Result → Round Overview → Methodology → Recipients → Lottery Transparency (collapsible).
5. **RoundDetailPage** — promote AddressLotteryInsightPanel's inline tone styling into `<ToneCallout>` usage. Lock copy per tone verbatim (cuts the "metrics show X" template).
6. **RoundDetailPage** — Methodology card: seed CopyChip + Etherscan link + algorithm GitHub link. Pure additive; doesn't change layout much.
7. **RoundDetailPage** — Recipients tables: address search input, sticky header, row-click expansion, pagination control wired to existing `rewardLimit` param.
8. **RoundDetailPage** — Lottery Transparency collapsible wrapper. Default closed.
9. **RoundDetailPage** — BucketSlotGrid rendered inline on bucket row click. Foundation primitive (§1.2).
10. **RoundDetailPage** — Entries-table search input (client-side filter over the full `flatMap`).
11. Replace `MetaGrid` and `SummaryGrid` with `<StatStrip>` on both pages.

#### Open backend asks

| Endpoint | Purpose | Notes |
|---|---|---|
| `RoundSummary.computedAt` exposed in history list | Lets the history table show "Computed N min ago" freshness chip per row, matching audit-trail expectations | Already exists on `DistributionMetadata`; needs surfacing on the `/rounds` list endpoint too |
| Confirm: `api.round(N, address, { rewardLimit: 'all' })` actually returns the full recipient list, not a cap-25 default | Required for client-side address search across all recipients without paging | Read `apps/backend/src/api/routes/rounds.ts` to verify (existing param accepted by client) |
| Optional: ETag / Last-Modified on `/rounds/{N}` | Lets the client cache aggressively across navigation between rounds | Nice-to-have; not blocking |

---

### 2.6 LotteryPage v2 (`/lottery`)

> **Iteration 6.** The page is richer than the audit suggested: `AddressStatusPanel` mirrors RoundDetail's 5-tone logic; `RoundAndBucketExplorer` has a real navigator with round and bucket lists; `SelectedBucketDetail` already shows prize/winner/participants/odds + a 3-item Conditions row + an OddsMeter visualization per entry. v2 closes specific gaps: no auto-jump to the user's bucket, no all-winners-in-round view, participant table doesn't reflow on mobile, the lottery's program-defining headline ("Win up to 10 ENS") is never framed, and the page reads as a tool not a story for first-time visitors.

#### Goal

1. **"What is this page for?"** — explainer-led intro answers the bystander question in one breath.
2. **"Did my address win, lose, or skip the lottery — for *this* round and *across* rounds?"** — single status pattern, same shape as RoundDetail's Your Result, plus a cross-round history strip.
3. **"How was the draw decided in *this* bucket?"** — slot-grid view of weighted entries with winner badge.
4. **"Who won everything in *this* round?"** — All-winners tab for round-level scanning without clicking each bucket.

#### Refero references (synthesized)

- **ShareWillow Award Pool / Brilliant Leagues** — clean explainer + status hero on top, then the dense interactive area. Fits the lead-explainer + AddressStatusPanel + RoundAndBucketExplorer layout.
- **Resend audience metrics chart** — large-data visualization inside a card with overlay tooltips. Pattern for the BucketSlotGrid: SVG primitive with hover-scrub.
- **Weights & Biases parallel-coordinates** — visualizing weighted dimensions per entry. Conceptual fit for "every entry is a slot weighted by ENS share."
- **Cake Equity valuations empty state** — friendly illustrated empty state. Fits the "no lottery for this round" case (every payout was ≥1 ENS, no lottery needed).

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER BAND (existing gradient backdrop, keep)              │
│  Eyebrow "LOTTERY"                                          │
│  Title "Lottery buckets"                                    │
│  Description "Sub-1 ENS payouts pool into ~10 ENS buckets.  │
│   RANDAO picks one winner per bucket."                      │
│  Sub-line current-round freshness (existing CurrentRoundNote)│
│  + "Win up to 10 ENS" pill (right-aligned on desktop, below │
│    description on mobile) — links to Transparency methodology│
├─────────────────────────────────────────────────────────────┤
│ TOP GRID (existing 2-col on desktop, stack on mobile)       │
│  ┌─ AddressStatusPanel (existing, port to <ToneCallout>) ─┐ │
│  │  Tone + title + body + 3-metric grid (existing)         │ │
│  │  + Inline "Round {N}" mini-link (jumps the explorer to  │ │
│  │    the bucket where the address entered, if any)        │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─ Inspect Address card (existing AddressLookupForm) ────┐ │
│  │  + "Use connected wallet" affordance (new, same as       │ │
│  │    RoundsPage v2)                                        │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ YOUR LOTTERY HISTORY (cross-round strip, new)               │
│  Eyebrow "YOUR LOTTERY HISTORY"                             │
│  3-card row: total entries · buckets won · ENS won total    │
│  Below: "Round 1: won 9.4 ENS · Round 2: entered 3, didn't  │
│  win · Round 3: pending"                                     │
│  Only renders when activeAddress is set & valid             │
│  ⚠️ NEEDS multi-round per-address aggregation (see §asks)   │
├─────────────────────────────────────────────────────────────┤
│ EXPLORER (existing 2-col grid)                              │
│  ┌─ NavigatorPanel (existing) ────────────────────────────┐ │
│  │  Eyebrow "Lottery"                                       │ │
│  │  Round-breadcrumb (new): "Round 3 ▾ → Pool 14 (yours)" │ │
│  │                                                          │ │
│  │  ─── Rounds list ─── (existing RoundOption x N)         │ │
│  │                                                          │ │
│  │  ─── Buckets in Round N ─── (existing BucketList)        │ │
│  │  When activeAddress matches an entry, that bucket is     │ │
│  │  pinned at top with a "● You" tag and auto-selected on   │ │
│  │  first render.                                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─ Right panel: TABS (new) ─────────────────────────────┐ │
│  │  [Bucket detail] [All winners]                          │ │
│  │                                                          │ │
│  │  Tab 1 — Bucket detail (existing SelectedBucketDetail   │ │
│  │   reorganized):                                          │ │
│  │   - Prize/Winner/Participants/Odds DetailGrid (existing) │ │
│  │   - BucketSlotGrid (new) — slots = entries, winner       │ │
│  │     highlighted with 🏆 badge + permanent 2px border     │ │
│  │   - Conditions row (existing 3-item) — keep              │ │
│  │   - Participants table (existing) + mobile reflow fix    │ │
│  │     (use Td[data-label] pattern from RoundDetail)        │ │
│  │                                                          │ │
│  │  Tab 2 — All winners:                                    │ │
│  │   Searchable table of every winning bucket in the round  │ │
│  │   Bucket # · Winner (avatar+ENS) · Prize · Odds · Block  │ │
│  │   Row click → switches Tab 1 to that bucket              │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Per-section data sources & status

| Section / element | Field | Source | Status |
|---|---|---|---|
| Header description | static, derived from program docs | static | ✅ |
| "Win up to 10 ENS" pill | static program constant — matches the program-doc bucket-target rule | static | ✅ |
| Current-round freshness note (existing) | `currentRound` derived from `data.rounds` find | `/rounds` | ✅ |
| AddressStatusPanel — tone + title + body + 3-metric | exactly today's `buildAddressStatus` logic | `/rounds/{N}?address=…` via `useLottery` | ✅ |
| "Use connected wallet" affordance | `walletState.address` | wagmi | ✅ |
| **Your lottery history strip — total entries** | sum across `api.round(N, address).lottery.buckets[].entries` for every round | requires fetching every round's detail OR a new endpoint | ⚠️ **needs endpoint** |
| **Your lottery history strip — buckets won** | sum of `addressReward.lotteryRewardEns > 0` flags across all rounds | currently only the *one selected round* is in `useLottery` — would need N fetches or new aggregation endpoint | ⚠️ **needs endpoint** |
| **Your lottery history strip — total ENS won** | sum `addressReward.lotteryRewardEns` across rounds | same as above | ⚠️ **needs endpoint** |
| Round-breadcrumb "Round 3 → Pool 14 (yours)" | derives from `searchParams.round`, `searchParams.bucket`, `activeAddress`'s presence in `bucket.entries` | client-side | ✅ |
| Rounds list (NavigatorPanel) | existing `data.rounds` from `useLottery` | `/rounds` | ✅ |
| Buckets list — "● You" pin + auto-select | filter `selectedRound.lottery.buckets[]` for one where `bucket.entries.some(e => sameAddress(e.address, activeAddress))`; pin first, auto-select on first render unless user has explicit `?bucket=N` | client-side | ✅ |
| BucketSlotGrid — slots | `bucket.entries[]` — each entry becomes one slot; `bucket.winner` identifies the winning entry index | `/rounds/{N}` | ✅ |
| BucketSlotGrid — slot weight visualization | `entry.amountEns` mapped to slot width in the grid (so a 0.7 ENS entry is wider than a 0.1 ENS entry) | derived | ✅ |
| Participant table (existing) | `bucket.entries[]` with `ensName`, `amountEns`, `probability` | `/rounds/{N}` | ✅ |
| All-winners tab — table | `selectedRound.lottery.buckets.map(b => ({ bucket: b.bucketIndex, winner: b.winner, prize: b.prizeEns, odds: b.winnerProbability, block: lottery.seed.blockNumber }))` | `/rounds/{N}` | ✅ (already in payload) |
| All-winners tab — search | client-side filter by ENS/address over `selectedRound.lottery.buckets` | client-side | ✅ |
| All-winners tab — block reference | `selectedRound.lottery.seed.blockNumber` (one block per round, not per bucket) | `/rounds/{N}` | ✅ |

#### Micro-interactions

- **"Win up to 10 ENS" pill** — clickable. Tooltip on hover: "Buckets are sized to ≈10 ENS each. Bucket target: {bucketTargetEns} ENS this round." Click → scrolls to Transparency methodology section (or opens `/transparency#lottery` on a new tab if from Lottery page). Static value but accurate per round.
- **AddressStatusPanel → ToneCallout primitive** — convert today's inline `$tone` styled component into `<ToneCallout tone={…} title body metrics />`. Same data, single component shared with RoundDetail v2 §2.5. The `LinkRow` with "Open full round details" stays as a primitive prop slot.
- **"Use connected wallet" affordance** — small chip beside the lookup input. Shows only when `walletState !== 'disconnected'` and the search input is empty or differs from connected wallet. Click → populates + submits. Mirror of RoundsPage v2's pattern.
- **Round breadcrumb** — "Round 3 ▾" opens a small popover of all rounds (alternative to scrolling the existing rounds list — quicker for power users). "Pool 14 (yours)" only when address matches. Both prev/next are reachable via keyboard arrow keys when the breadcrumb has focus.
- **Buckets list "● You" pin** — when `activeAddress` matches a bucket, that bucket renders FIRST in the list with a small green dot + "You" tag. On first mount with `activeAddress` set and no explicit `?bucket=N`, **auto-select that bucket** (push to URL so deep-link is correct). Today's auto-fallback selects bucket 0; we change to "your bucket if any, else 0."
- **BucketSlotGrid** — primary new visualization. Render as an inline SVG (no chart lib needed). Each entry = one rectangular slot with width proportional to `entry.amountEns / sum(entries.amountEns)`. Winning slot has:
  - 2px `status.success.border` on top
  - small 🏆 badge top-right
  - subtle inner glow on first paint (200ms ease)
  - 1.5s pulse on first reveal (`prefers-reduced-motion: no-preference`)
  Hover any slot → tooltip: "{ENS name or short address} · {amountEns} ENS · {probability}." Click any slot → scrolls the Participants table below to that row and pulses it. Keyboard: arrow keys scrub through slots; Enter to scroll-to-row.
- **All-winners tab** — sticky table header; search input above the table with 200ms debounce. Row hover lift; row click navigates to that bucket inside the Bucket Detail tab (same page, no full reload). When the user has an `activeAddress` that won in this round, that row gets the `tier.isCurrent` highlight + auto-scroll into view.
- **Participants table mobile reflow** — replace today's "scroll the table at 360px max-height" with the `Td[data-label]` pseudo-element pattern already proven on RoundDetailPage. Each row becomes a card on mobile: address (full) → ENS share → chance with OddsMeter → result pill.
- **Empty state for round with no lottery** — friendly illustrated empty state: "No lottery this round. Every payout was ≥1 ENS, so all recipients got direct transfers." with a small icon (no need to invent — reuse Thorin's check or similar).
- **Empty state for live/unpaid round** — keep today's "Final buckets are not available for this round yet" but expand: "Round {N} is still {status}. Lottery runs at round close on {endDate}."
- **Confetti when active address won the selected bucket** — same single-burst rule as RoundDetail's Your Result (reduced-motion respected).

#### Empty / degraded states

- **No `activeAddress`** — AddressStatusPanel shows today's `neutral` tone "Inspect an address." Cross-round history strip is hidden (it only renders when address is set & valid).
- **Invalid address** — `error` tone with the existing "Enter a valid Ethereum address." copy. History strip hidden.
- **Round selected has `distributionDataStatus !== 'available'`** — AddressStatusPanel shows `pending` tone (existing). Bucket detail tab shows the "live/pending" expanded empty state. All-winners tab shows: "Final winners appear here after round {N} closes on {endDate}."
- **Round has no lottery (all payouts ≥1 ENS direct)** — `neutral` tone with new explanatory copy: "Every payout was ≥1 ENS this round, so no lottery ran." All-winners tab shows zero-state with the same explanation.
- **Network error fetching lottery data** — keep today's `ErrorCard` with "Try again" button (already wired to `useLottery.execute`).
- **`useLottery` returns null `data`** — keep today's "No rounds are configured yet" empty state. Add a one-liner: "Lottery buckets appear after a round closes and distribution data is finalized."
- **Cross-round history strip — endpoint unavailable** — strip silently hidden until backend lands. No error, no skeleton ghost.

#### DS-consistency notes

- The inline `StatusPanel` styled-component with its `$tone` branch (`if $tone === 'success' return tokens.color.positiveEmphasis`, etc.) **deletes**. Replaced by `<ToneCallout>` (§1.2). Same 5 tones, shared with RoundDetail v2 (§2.5) and Dashboard v2 (§2.2).
- The `ErrorCard` style (`border-color: #FBCDD8; background: #FEE9F0`) — **delete** the raw hex, use `status.danger.{border,bg}` tokens from foundation §1.1.
- The `formatProbability` helper is fine; keep. But the OddsMeter visual is per-row inside the Participants table — when BucketSlotGrid lands, OddsMeter becomes redundant for the same-bucket visualization. Decision: keep OddsMeter in the table column (it's tabular context), keep BucketSlotGrid as the bucket-level summary above the table. Two visuals at different scales, not one replacing the other.
- The `BucketOption` styled `Link` uses `tokens.color.lightBlue` for active. The new `"You"` tag inside a `BucketOption` should use `status.success.bg` (a slightly different green tint than `lightBlue`) so the user can tell their bucket apart from the currently-selected one — even when both apply.
- Tab control: there's no Tabs primitive in the project today. Either:
  - (a) Use Thorin's `Tabs` if available — preferred.
  - (b) Build a minimal 2-button toggle with the same visual register as the existing SortControls pills (active = filled, inactive = bordered). Decision: prefer (a); fall back to (b).
- Mono token applies to: all addresses on the page (existing `AddressIdentity` likely already does this via `font-variant-numeric: tabular-nums`), seed values, block numbers, ENS-amount digits inside SelectedBucketDetail's DetailGrid.
- The Header band's gradient (`linear-gradient(lightBlue, white)`) matches the Landing hero's gradient — keep, but verify it doesn't conflict with the new "Win up to 10 ENS" pill (which uses a tonal background). Visual test required.

#### Implementation order

1. Promote AddressStatusPanel to `<ToneCallout>` (shared with §2.5). Deletes duplicate $tone styling.
2. Add the "Win up to 10 ENS" pill in the header band. Static value; pure additive.
3. "Use connected wallet" affordance on the AddressLookupForm wrapper (shared pattern with RoundsPage v2 §2.5).
4. Buckets-list "● You" pin + auto-select on mount when `activeAddress` matches an entry. Pure client-side logic over existing data.
5. BucketSlotGrid primitive (§1.2) + render inside SelectedBucketDetail above the Participants table.
6. Participants table mobile reflow (copy the `Td[data-label]` pattern from RoundDetail).
7. All-winners tab + Tabs component decision. Row click jumps to Bucket Detail tab + selects bucket.
8. Round breadcrumb on the NavigatorPanel top.
9. **Defer until backend lands**: Your lottery history strip (multi-round per-address aggregation). Stub the slot; render only when the endpoint returns shaped data.
10. Empty-state copy refresh + reduced-motion gating across all animations introduced above.

#### Open backend asks

| Endpoint | Purpose | Notes |
|---|---|---|
| `GET /addresses/{addr}/lottery-history` returning `{ totalEntries, totalBucketsWon, totalLotteryEns, perRound: [{ roundNumber, entered, won, ensWon }] }` | Powers the cross-round "Your lottery history" strip without N round fetches | Server can compute by scanning `lottery.buckets[].entries[]` filtered by address. Could alternatively be a query parameter on `/rounds` (`?lotteryFor=0x…`) returning aggregated info. |
| Confirm: `LotteryBucketDetail.entries[]` is the **full** entry list for the bucket (no server-side cap) | Required so BucketSlotGrid can render every slot truthfully | Reading `apps/backend/src/api/routes/rounds.ts` will confirm. The 100-entry cap on RoundDetail is client-only. |

---

### 2.7 TransparencyPage v2 (`/transparency`)

> **Iteration 7.** Today's page is structurally sound — hero, 3 external verify links, smart-contract cards (with Etherscan + copy-address — already strong), live data stats (4 cards), and a 3-step `StepList` for "how rewards are calculated." But it's the credibility page forum stakeholders (nick.eth's sybil-caps concern, estmcmxci's mercenary critique, clowes's "too complex" objection) will land on first — and three weaknesses undermine that job: live stats fail silently on error, the methodology is text bullets where a diagram would land harder, and there's no worked example with real round numbers. v2 fixes those, adds on-chain liveness probes on contract cards, and adds CSV/JSON downloads for researchers.

#### Goal

This page exists to **make doubt expensive**. A skeptic should leave knowing the rules, the source code, and the math — with enough verifiable hooks (Etherscan, GitHub, raw data downloads) that the next-level question becomes "let me check this myself" instead of "I don't believe you."

1. **"What does the program do?"** — methodology shown as a diagram with clickable nodes that link to source.
2. **"Did it really happen the way you described?"** — worked example using the latest finalized round, real numbers from `/rounds/{N}`.
3. **"Are the contracts real and reachable right now?"** — on-chain liveness probe per contract card.
4. **"Can I download the data and analyze it myself?"** — CSV/JSON exports per round.

#### Refero references (synthesized)

- **Cake Equity audit log / Navan reports** — clean "verifiable change history" pattern. Reinforces the worked-example section.
- **Excalidraw Mermaid modal** — inline rendered flow diagram from text source. Pattern fit for the methodology diagram (render as SVG; we don't need a chart library, just one component).
- **Perplexity "Metacognition Cycle"** — clickable diagram nodes with educational drill-down. Fits the methodology drawer interaction.
- **Wise "as of N min ago" rate freshness** — provenance/freshness chip. Fits the contract-liveness "reachable as of block #X" pattern.

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ HERO + LIVE COUNTERS                                        │
│  Eyebrow "TRANSPARENCY"                                     │
│  Title "Verify everything on-chain"                         │
│  Desc "Contracts, data sources, and reward logic are public │
│   so every round can be checked."                           │
│                                                             │
│  3 hero counters (full-width row, replaces the 2x2 StatGrid │
│   that today sits inside Live Data Stats):                  │
│   ┌────────────────┐ ┌────────────────┐ ┌────────────────┐  │
│   │ ACTIVE VOTERS  │ │ ENS DELEGATED  │ │ DISTRIBUTED    │  │
│   │ 47             │ │ 1.2M ENS       │ │ 23K ENS        │  │
│   │ ◊ sparkline    │ │ ◊ sparkline    │ │ ◊ sparkline    │  │
│   │ (when endpoint │ │ (when endpoint │ │ (across rounds)│  │
│   │  lands)        │ │  lands)        │ │                │  │
│   └────────────────┘ └────────────────┘ └────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│ VERIFY LINKS ROW (existing, keep)                           │
│  GitHub · Anticapture · Dune Analytics                      │
├─────────────────────────────────────────────────────────────┤
│ METHODOLOGY (replaces StepList, full width)                 │
│  Eyebrow "HOW REWARDS ARE CALCULATED"                       │
│  Inline SVG flow:                                           │
│   ┌──Eligibility──┐ → ┌──180d TWAP──┐ → ┌──Tier──┐          │
│         ↓                                  ↓                │
│   ┌──Pool sizing──┐ → ┌──10/90 split──┐ → ┌──Payout──┐      │
│                                            ↓                │
│                                       ┌──Lottery──┐         │
│                                       (if <1 ENS)           │
│  Click any node → side drawer:                              │
│   - 1-paragraph plain-English explanation                   │
│   - The exact formula in a code block                       │
│   - Link to `packages/domain/src/<file>.ts` on GitHub       │
│   - Link to the worked example below (anchor jump)          │
├─────────────────────────────────────────────────────────────┤
│ WORKED EXAMPLE (new, full width)                            │
│  Eyebrow "WORKED EXAMPLE — ROUND {N}"                       │
│  Picks the most recently `paid` round automatically.        │
│  Step-by-step computation with real numbers from the API:   │
│                                                             │
│  Step 1 — Eligibility                                       │
│  "{activeVoterCount} delegates met the 7/10 threshold       │
│   this round. {eligibleTokenHolderCount} addresses          │
│   delegated to one of them."                                │
│                                                             │
│  Step 2 — Pool sizing                                       │
│  "Active VP grew {vpGrowthBps}bps month-over-month, which   │
│   maps to tier {tierIndex} → pool of {poolSizeEns} ENS."    │
│                                                             │
│  Step 3 — Split                                             │
│  "10% ({poolSizeEns × 0.1}) to voters, 90% ({poolSizeEns ×  │
│   0.9}) to delegators."                                     │
│                                                             │
│  Step 4 — Distribution                                      │
│  "{cappedCount} payouts hit the per-recipient cap; excess   │
│   ({cappedEns} ENS) redistributed pro-rata."                │
│                                                             │
│  Step 5 — Lottery                                           │
│  "{lotteryEntryCount} sub-1-ENS payouts pooled into         │
│   {bucketCount} buckets of ~10 ENS each. RANDAO seed:       │
│   {seed} (block #{blockNumber}) ↗"                          │
│                                                             │
│  → "View this round in full →" (links to /rounds/{N})       │
├─────────────────────────────────────────────────────────────┤
│ SMART CONTRACTS (existing 3-card LinkCardStack + liveness)  │
│  Each card adds (new):                                      │
│   ✓ Reachable as of block #{N} · {N}s ago                   │
│   ✗ Not responding                  (on getCode failure)    │
├─────────────────────────────────────────────────────────────┤
│ LIVE DATA (existing 4 StatCards; dynamic round label, error │
│  state, retry button)                                       │
│  Eyebrow "ROUND {N} · PROGRAM DATA"   ← derived, not const  │
│  Active Voters · ENS Delegated · Wallets Earning · Tier     │
├─────────────────────────────────────────────────────────────┤
│ DOWNLOAD ROUND DATA (new, full width)                       │
│  Eyebrow "DOWNLOAD DATA"                                    │
│  Per-round row: Round N · status pill · Date range          │
│   Buttons: [CSV] [JSON]  → client-side serialization of     │
│   api.round(N, undefined, { rewardLimit: 'all' })           │
└─────────────────────────────────────────────────────────────┘
```

#### Per-section data sources & status

| Section / element | Field | Source | Status |
|---|---|---|---|
| Hero — page copy | static | static | ✅ |
| Hero counters — Active Voters | `status.activeVoterCount` | `/stats` | ✅ |
| Hero counters — ENS Delegated | `status.totalDelegatedEns` | `/stats` | ✅ |
| Hero counters — Distributed (all-time) | sum of `rounds[].totalDistributedEns` where `status === 'paid'` | `/rounds` then client-aggregate | ✅ |
| Hero counter sparklines (per-round history) | per-round time series of each metric | **[needs endpoint]** — at minimum, `/stats/history?rounds=all` returning the 3 metrics per round | ⚠️ ship counters without sparklines until endpoint lands |
| Verify Links row | static array `VERIFY_LINKS` | static | ✅ |
| Methodology diagram — nodes + flow | static SVG, derived from program docs (Eligibility, TWAP, Tier, Pool, Split, Payout, Lottery) | static | ✅ |
| Methodology drawer — formula per node | static, quoted from `packages/domain/src/<file>.ts` | static (sourced from code) | ✅ |
| Methodology drawer — GitHub link per node | `https://github.com/blockful-io/delegation-incentives-system/blob/main/packages/domain/src/<file>.ts` (per-node mapping: Eligibility→`active-voters.ts`, TWAP→`time-weighted-balance.ts`, Tier→`pool-sizing.ts`, Split→`combine-rewards.ts`, Distribution→`pipeline.ts`, Lottery→`lottery.ts`) | static URLs | ✅ |
| Worked example — selected round | first `roundList.rounds.find(r => r.status === 'paid')` | `/rounds` | ✅ |
| Worked example — Step 1 (eligibility) | `roundDetail.activeVoterCount`, `roundDetail.eligibleTokenHolderCount` | `/rounds/{N}` | ✅ |
| Worked example — Step 2 (pool sizing) | `roundDetail.vpGrowthPct`, `tierIndex`, `poolSizeEns` | `/rounds/{N}` | ✅ |
| Worked example — Step 3 (split) | derived: `poolSizeEns × 0.1` and `× 0.9` | client-side | ✅ |
| Worked example — Step 4 (caps redistributed) | per-round `capped count` and `excess redistributed` | **[needs endpoint]** — values exist in domain layer (`packages/domain/src/cap-redistribution.ts`) but aren't surfaced in `RoundDetailResponse`. Either surface in `DistributionMetadata` or skip Step 4 until exposed. | ⚠️ render Step 4 only when fields exist; otherwise collapse to Step 5 |
| Worked example — Step 5 (lottery) | `roundDetail.lottery.bucketCount`, `entryCount`, `seed.value`, `seed.blockNumber` | `/rounds/{N}` | ✅ |
| Smart Contracts — Etherscan link + copyAddress | existing `CONTRACT_ENTRIES` | static `contracts` config | ✅ |
| Smart Contracts — on-chain liveness probe | viem `usePublicClient().getCode(address)` → contract has bytecode? + `useBlockNumber()` for "as of" | wagmi/viem | ✅ |
| Live Data — 4 stats | `status.activeVoterCount`, `status.totalDelegatedEns`, `status.holdersEarning`, `tiers.currentTierIndex` | `/stats` + `/tiers/progression` | ✅ |
| Live Data — dynamic round label | `roundList.currentRoundNumber` | `/rounds` | ✅ (replaces today's `CURRENT_ROUND` import) |
| Download Round Data — CSV/JSON of round | `api.round(N, undefined, { rewardLimit: 'all' })` serialized client-side | `/rounds/{N}?rewardLimit=all` | ✅ |

#### Micro-interactions

- **Hero counters — count-up on first paint** — each big number animates from 0 to its real value (300ms ease-out, respects reduced-motion). Stagger: 0ms / 80ms / 160ms across the three counters.
- **Hero counter — sparkline scrub (when endpoint lands)** — hover any sparkline → vertical cursor + tooltip showing "Round {N}: {value}." Mobile = tap-to-show-tooltip, persists until next tap.
- **Methodology diagram node hover** — node gets a `shadow.soft` lift + slight scale (1.02) for 120ms. Downstream nodes in the flow get a subtle highlight (helps the user trace what depends on this step).
- **Methodology node click → side drawer** — drawer slides in from the right (mobile = bottom sheet). Drawer content: plain-English paragraph, code block with the formula (mono font, syntax-highlighted via prism-lite or simply colored spans — no heavy lib), GitHub link to the specific file. Drawer closes on backdrop click, Esc key, or its own close button.
- **Methodology diagram keyboard nav** — diagram is a focusable container; arrow keys move focus between nodes; Enter opens the drawer for the focused node.
- **Worked example — step reveal on scroll** — each step fades in as it scrolls into the viewport (intersection-observer pattern already used elsewhere). 5 steps, each 200ms staggered by their index.
- **Worked example — "View this round in full" CTA** — anchors to `/rounds/{N}`, opens in same tab. If the user has a connected wallet, appends `?address=<wallet>` so they see their own row on arrival.
- **Smart Contracts — liveness chip** — a small inline chip on each contract card. Initial render: gray dot + "Checking..." 200ms after mount. After successful `getCode` returns non-empty: green dot + "Reachable · block #N · {Ns} ago." On failure: red dot + "Not responding · Retry" with retry button. Refresh every 60s while the page is open (idle tab → pause).
- **Live Data — explicit error state** — replaces today's silent skeleton-stay-up failure. When `status.error || tiers.error`, render a tone=`warning` ToneCallout in the section's slot: "Couldn't load live data. [Retry]." Retry button re-runs both `useAsync` hooks via `execute()` (need to expose `execute` from `useAsync` — confirm; today `useAsync` may not expose it. If not: hard refresh as fallback, with a softer "Reload page" suggestion).
- **Download — CSV/JSON button hover** — tooltip shows the expected filename: `round-{N}-{role}.csv`. Click → file downloads via Blob URL. Toast on success: "Downloaded round-{N}.csv." On failure: toast "Couldn't generate download. Try again." Never block the page with an error modal.
- **Download — keyboard accessibility** — each per-round row's CSV/JSON buttons are real `<button>` elements, focusable, Enter triggers.

#### Empty / degraded states

- **`/stats` fails on initial load** — hero counters render as em-dashes with a small "Couldn't load stats. [Retry]" inline link beside the eyebrow. No giant red banner.
- **`/rounds` fails or returns no rounds** — Worked Example section collapses to a single tone=`neutral` ToneCallout: "Worked example will appear here once the first round is paid." Download Data section similarly collapses.
- **No `paid` round yet** — Worked Example renders against the most recent `live` or `ended` round but every step renders projections rather than actuals, with a tone=`pending` banner at the top: "Round {N} is still {status}. Numbers below are projections; finals appear at round close."
- **Contract liveness fetch fails for ALL three contracts** — likely RPC issue. Single tone=`warning` strip above the Smart Contracts section: "Couldn't probe contracts. RPC at {anonymized endpoint} may be unavailable." Per-card chips still render with "Retry" buttons.
- **Backend stats endpoint returns the values but tiers endpoint fails** — render the 3 stats that have data, show em-dash for "Current Tier" with a tooltip "Tier data unavailable."

#### DS-consistency notes

- The today's `CURRENT_ROUND` import from `@/config/round` becomes dead code once the section label uses `roundList.currentRoundNumber`. Delete the import and the constant after rollout.
- The 3 hero counters use the **same `<StatCard>`** primitive currently in `components/shared/StatCard.tsx`. Today's TransparencyPage uses `StatCard` inside `StatGrid`; in v2, the hero counters use the same `StatCard` but with a `size="hero"` prop (added to the primitive in cross-cutting task 9) for the larger number variant.
- Methodology diagram is **the only inline-SVG flow on the project** — keep it minimal: 7 rectangle nodes with rounded corners (`radius.md`), thin lines between them, no fancy curves. Match the visual register of the existing TierTable dot row (small, restrained). Use `tokens.color.darkBlue` for nodes and `tokens.color.borderLight` for edges.
- The new drawer for methodology nodes uses the same component as the future side-drawer for VoterCard compare (§2.4) and lottery bucket detail expansion (§2.5/6) — extract into `<SideDrawer>` primitive in task 9.
- Worked Example step copy is **directly quoted** from the program forum post wherever possible. No paraphrasing of governance language. Voice = plainspoken-functional (audit-style), not aspirational.
- Mono token (§1.1) applies to: seed value in Worked Example Step 5, contract addresses on Smart Contract cards (today they're already in mono via `CopyableAddress` — confirm), block numbers in liveness chips, ENS amounts in stats counters' digit portion.
- All numeric metric cells use `font-variant-numeric: tabular-nums` so the count-up animation doesn't jitter horizontally.
- Side drawer color register: `surface.card` background with a 1px `borderLight` left edge (so it visually attaches to the page edge rather than floating over content).

#### Implementation order

1. Add `<SideDrawer>` primitive (cross-cutting task 9) — also used by VoterCard compare and Lottery bucket detail.
2. Replace the today's `CURRENT_ROUND` import with `roundList.currentRoundNumber` for the Live Data section label.
3. Add explicit error/retry handling for `status` and `tiers` fetches (Live Data section's tone=warning ToneCallout).
4. Hero counter refactor: 4-stat 2x2 grid → 3-stat full-width row with `StatCard size="hero"`. Add count-up animation.
5. Smart Contracts cards — add the on-chain liveness chip (viem `getCode` + `useBlockNumber`). 60s refresh.
6. Methodology section — inline SVG flow + clickable nodes + side drawer with explanations + GitHub links.
7. Worked Example section — fetch latest paid round, render 5-step walkthrough with real numbers from `RoundDetailResponse`.
8. Download Round Data — per-round CSV/JSON serializers (small util in `utils/export.ts`). Buttons + toast feedback.
9. Hero counter sparklines — gated on backend stats-history endpoint.

#### Open backend asks

| Endpoint | Purpose | Notes |
|---|---|---|
| `GET /stats/history` returning `[{ roundNumber, activeVoterCount, totalDelegatedEns, distributedEns }]` | Hero counter sparklines | One read per round; cheap. Could alternatively reuse `/rounds` with the metrics already on each `RoundSummary` (verify shape). |
| Surface `cappedCount` and `excessRedistributedEns` on `DistributionMetadata` or `RoundDetailResponse` | Step 4 of Worked Example | Domain layer (`packages/domain/src/cap-redistribution.ts`) computes these but they're not in the API response. |
| Confirm `useAsync` exposes `execute` for retry buttons | Live Data + Liveness retry | Read `apps/frontend/src/hooks/useAsync.ts`; if not exposed, add it. |

---

### 2.8 Design system consistency audit + token refactor proposal

> **Iteration 8.** Now that every page has a v2 spec, this iteration grounds §1's "Foundation" proposals against the actual `tokens.ts` and `primitives.ts` files, finds where pages bypass the token system, and proposes a concrete refactor with line-item changes. This is the spec the design-system PR should implement first — every page spec above assumes these tokens and primitives exist.

#### 2.8.1 What's in `tokens.ts` today

| Category | Tokens | Notes |
|---|---|---|
| **color** (24 entries) | `blue`, `lightBlue`, `lightBlueOpacity`, `darkBlue`, `darkGray`, `middleGray`, `gray`, `white`, `green`, `magenta`, `yellow`, `darkBrown`, `lightGreen`, `lightMagenta`, `lightYellow`, `midnightBlue`, `text`, `textMuted`, `textFaint`, `border`, `surface`, `surfaceAlt`, `negative`, `positive`, `positiveEmphasis`, `accent`, `orange`, `lightOrange`, `bgSubtle`, `borderLight`, `tierHighlight`, `textSubtle` | Several duplicates (see §2.8.3). No status families. |
| **radius** | `sm`, `card`, `md`, `lg`, `xl` (all `8px`), `pill` (`9999px`) | **Flat — all five "scale" tokens have the same value.** §1.1 proposed `sm 6 / md 10 / lg 16 / pill 9999`. |
| **shadow** | `sm` (0 1px 3px / 0.06), `md` (0 4px 16px / 0.10), `lg` (0 8px 32px / 0.14) | `sm` is so subtle it's effectively invisible on a white surface. No `soft` token (proposed in §1.1). |
| **font** | family = Satoshi system stack; **mono = Satoshi + monospace fallback** (broken — Satoshi is not monospace); sizes `xs` (11) → `6xl` (52); weights `normal` (400) → `black` (900) | Mono token is a no-op today. Required for addresses, hashes, seeds. |
| **spacing** | 4px → 112px (13 steps) | Solid. Keep. |
| **transition** | `fast` (0.15s), `base` (0.2s), `slow` (0.3s) | OK for one-off transitions. No motion token for orchestrated animations (proposed `motion.in / in-fast / out` in §1.1). |
| **maxWidth** | `xs` (360) → `container` (1440), plus `section` (1120) | Solid. Keep. |

#### 2.8.2 What's in `primitives.ts` today

- **Animations:** `fadeInUp`, `fadeIn`. Good baseline.
- **Typography:** `Eyebrow`, `PageTitle`, `SectionHeading`, `SectionSubheading`. Solid.
- **Gradient text:** `gradientTextStyles` (blue→accent). Used.
- **Layout:** `PageContainer` (1120px), `SectionContainer`, `SectionInner`. Solid.
- **Cards:** `cardStyles`, `cardHoverStyles`, `CardLink`. Solid.
- **Labels/stats:** `StatLabel`, `StatValue`, `Chevron`. Solid.
- **Status:** `LoadingWrapper`, `ErrorMessage`. Thin — error message is "centered red text at 6xl padding," which is fine for a fatal failure but every page-spec above wants a tone-coded inline callout. **Missing:** `<ToneCallout>`.

Components in `components/shared/` (per audit's earlier reading): `AddressIdentity`, `CopyableAddress`, `EnsAvatar`, `LinkCard`, `PageSkeletons`, `Skeleton`, `StatCard`, `StepList`, `TierDots`, `ProposalBar`. **Missing for v2:** `<Address>` (lighter version of `CopyableAddress`), `<EnsAmount>`, `<ToneCallout>`, `<Sparkline>`, `<BucketSlotGrid>`, `<CopyChip>`, `<SideDrawer>`, `<StatusPill>`, `<StatStrip>` — all listed in task 14 (micro-interaction library).

#### 2.8.3 Token-level duplicates and contradictions

Concrete bugs in the current token set:

| Issue | Lines in `tokens.ts` | Fix |
|---|---|---|
| `gray` and `middleGray` both `#D0D7DE` | 13, 14 | Keep `middleGray` as the canonical name; alias `gray` → `middleGray` for one release; remove in the next. |
| `green` (`#007C23`) and `positive` (`#007C23`) and `positiveEmphasis` (`#1A7F37`) | 19, 35, 36 | `green` and `positive` are duplicates of the same hex with different role names. Keep `positive`; remove `green`. Keep `positiveEmphasis` as the slightly-darker text-on-light variant. |
| `text` (`#011A25`) vs `darkBlue` (`#1F2328`) — two near-black primary text colors used interchangeably | 11, 28 | Pick one. `text` is the more semantically named token; promote it. Migrate `darkBlue` usages to `text` over a release. (Or: rename `darkBlue` → `textPrimary` since the brand "blue" is `#5298FF` and `darkBlue` is actually near-black.) |
| `textMuted` (`#4A5C63`) vs `darkGray` (`#57606A`) — two muted-gray tokens | 29, 12 | Same problem. Promote `textMuted`. |
| `font.mono` = Satoshi + monospace fallback — Satoshi is **not** monospace | 63 | Replace with a real mono. Add **IBM Plex Mono** (open license, ENS-adjacent web3 feel) via `@fontsource-variable/ibm-plex-mono`. Update token: `mono: "'IBM Plex Mono', 'Geist Mono', monospace"`. |
| `radius` is flat: sm/card/md/lg/xl all `8px` | 47–51 | Establish a real scale: `sm: 6px`, `md: 10px`, `lg: 16px`. Drop `card`/`xl` (redundant). Keep `pill: 9999px`. Migration: most callers use `radius.md` today (8px → 10px is a tiny visual delta), some use `radius.sm` for nested elements (8px → 6px, also tiny). One-line audit per page is enough. |
| `shadow.sm` (0 1px 3px / 0.06) is effectively invisible on white | 56 | Replace with `shadow.soft` (the §1.1 proposal): `'0 1px 0 0 var(--border-light), 0 4px 24px 0 rgba(15, 23, 42, 0.04)'`. Make the 1px border the visible weight and the soft fade the elevation cue. Existing `shadow.md` / `shadow.lg` stay. |
| No status color families | — | Add per §1.1: `status.success`, `status.warning`, `status.pending`, `status.danger`, `status.neutral`, each with `{bg, border, fg}`. Source bg/border from existing tokens where possible (e.g. `success.bg = tierHighlight`, `success.border = positive`, `success.fg = positiveEmphasis`). |
| No surface ladder | — | Today: `surface` (white) + `surfaceAlt` (#f6f6f6). Add `surface.mat` (a slightly warmer page background `#FAFAFC`) so cards on a page can read as elevated. Today everything sits on white-on-white. |
| No motion tokens | — | Add `motion.in: '200ms ease-out'`, `motion.in-fast: '120ms ease-out'`, `motion.out: '160ms ease-in'`. Keep `transition.fast/base/slow` for legacy one-offs but discourage in new code. |

#### 2.8.4 Cross-page inline-token bypasses

Verified by grep for raw hex literals in component code (excluding the `tokens.ts` source itself):

| File | Line region | Inline value(s) | Token to use instead | Status |
|---|---|---|---|---|
| `pages/LotteryPage/index.tsx` | `ErrorCard` (around line 543) | `border-color: #FBCDD8; background: #FEE9F0;` | `status.danger.border` / `status.danger.bg` (new) | Inline once new tokens land |
| `pages/RoundsPage/RoundDetailPage.tsx` | `AddressLotteryPanel` (~line 336) | `background: #FEE9F0;` (in `error` tone branch) | `status.danger.bg` | Same |
| `pages/LandingPage/sections/RoundStatusBar.tsx` | Tagline, ColLabel, ColSub, GrowthLabel, LiveDot (lines ~31–106) | `#1a7f37`, `#d0d7de`, `#f6f8fa`, `#57606a`, `#1f2328`, `#ffffff` | All of these exist as tokens (`positiveEmphasis`, `middleGray`, `bgSubtle`, `darkGray`, `darkBlue`, `white`) — just bypassed inline | Replace inline with token refs |
| `pages/DashboardPage/sections/EarningsStrip.tsx` | `ShareButton` (lines ~131–134) | `color: '#fff'` | `tokens.color.white` (exists) | Replace |
| `pages/DashboardPage/sections/EarningsStrip.tsx` | `ShareButton` `box-shadow` (declared in similar inline blocks) | `box-shadow: 0 4px 12px rgba(82, 152, 255, 0.3)` | `shadow.soft` (new) | After tokens land |
| `components/shared/Skeleton.tsx` | (per grep) | hex literals in shimmer/gradient | Likely OK if scoped to skeleton-only shimmer; review when in scope |
| `app/providers/AppKitProvider.tsx` | (per grep) | hex literals for reown wallet modal theming | Acceptable — third-party SDK config, not project surface |

**Total: 5 project files bypassing tokens.** Small enough to fix in one PR alongside the token additions.

#### 2.8.5 Component-level duplicates

These styled-components are defined inline in 2+ pages with near-identical shape:

| Pattern | Defined in | Consolidation target |
|---|---|---|
| Tone-coded panel with 5 branches (`neutral/success/warning/pending/error`) | `RoundDetailPage.tsx` (`AddressLotteryPanel`), `LotteryPage/index.tsx` (`StatusPanel`) | `<ToneCallout tone title body metrics?>` primitive (task 14) |
| Status pill with status-dependent background/color | `RoundsPage/index.tsx` (`StatusBadge`), `RoundsPage/RoundDetailPage.tsx` (`StatusPill`), `LotteryPage/index.tsx` (`StatusBadge`) | `<StatusPill tone />` primitive (task 14) |
| 4-up stat grid with `SummaryLabel` + `SummaryValue` styling | `RoundDetailPage.tsx` (`SummaryGrid`/`MetaGrid`), `DashboardPage/index.tsx` (`RoundDetailsGrid`), `LotteryPage/index.tsx` (`DetailGrid`), `VotersPage/components/StatsBar.tsx` (`Bar`) | `<StatStrip>` primitive (accepts arbitrary children) — task 14 |
| "Back to X" link | `RoundsPage/RoundDetailPage.tsx` (`BackLink`), `VoterProfilePage/index.tsx` (`BackLink`) | `<BackLink to label>` primitive — task 14 |
| LiveDot with pulse animation | `RoundsPage/index.tsx` (`LiveDot` + `livePulse` keyframe), `LandingPage/sections/RoundStatusBar.tsx` (`LiveDot`) | `<LiveDot tone={status.success.fg}>` (uses the new status tokens) — task 14 |
| Address text (mono / tabular) | `RoundsPage/RoundDetailPage.tsx` (`AddressText`), several inline | `<Address copyable />` — task 14 |
| Reward value (green emphasis, white-space: nowrap) | `RoundsPage/RoundDetailPage.tsx` (`RewardValue`), `LotteryPage/index.tsx` (`RewardValue`) | `<EnsAmount value emphasis />` — task 14 |
| 6-column type scale used inside earnings hero (56px / 68px tabular-nums) | `DashboardPage/sections/EarningsStrip.tsx` (`EarnedValue`) | One-off — keep custom for now; promote into `<StatCard size="hero">` (task 14) |
| `OddsMeter` thin progress bar | `LotteryPage/index.tsx` | Consider promoting if RoundDetail's bucket table reuses it (per §2.5) |

#### 2.8.6 Migration plan

This is a **single PR** with low blast radius — token additions are non-breaking (new tokens), and the inline-bypass replacements are 5-file mechanical search-and-replace.

**Phase 1 — Add new tokens** (no consumer changes; non-breaking)
1. Add `status.{success,warning,pending,danger,neutral}.{bg,border,fg}` (15 new color tokens). Source from existing tokens where possible (`success.bg = tierHighlight`, etc.).
2. Add `surface.mat` (one new color).
3. Add `shadow.soft`.
4. Add `motion.in / in-fast / out`.
5. Add `@fontsource-variable/ibm-plex-mono` dependency. Update `font.mono` token.
6. Add `radius.sm: 6 / md: 10 / lg: 16`. **Note:** changing existing `radius.md` from 8→10 is a 2px visual delta — acceptable, but worth a quick visual scan post-change.

**Phase 2 — Replace inline hex bypasses** (5 files, ~20 lines total)
1. `RoundStatusBar.tsx` — swap inline hex (`#1a7f37`, `#d0d7de`, `#f6f8fa`, `#57606a`, `#1f2328`) for token refs.
2. `EarningsStrip.tsx` — swap `#fff` for `tokens.color.white`; swap inline `box-shadow` for `shadow.soft`.
3. `LotteryPage/index.tsx` — swap `ErrorCard` inline hex for `status.danger.{bg,border}`.
4. `RoundsPage/RoundDetailPage.tsx` — swap `AddressLotteryPanel`'s 5-tone hex branches for `status.{tone}.{bg,border,fg}` refs (still inline — will be replaced by `<ToneCallout>` in task 14, but the token swap is independent).
5. `Skeleton.tsx` — review and convert if appropriate (probably leave the shimmer hex alone).

**Phase 3 — Deduplicate color tokens** (renames + aliases)
1. Add comment markers on `gray`, `green`, `darkBlue`, `darkGray` declaring them deprecated.
2. Run `git grep` for each deprecated token; replace usages with their canonical sibling (`gray → middleGray`, `green → positive`, `darkBlue → text` or `→ textPrimary`, `darkGray → textMuted`).
3. Remove the deprecated tokens in a follow-up PR (one release later).

**Phase 4 — Add the missing primitives** (task 14, not this iteration)
- See §2.9 (next iteration) for the full primitive specs and props.

**Phase 5 — Replace inline duplicates with primitives** (one PR per primitive)
- `<ToneCallout>` lands → `AddressLotteryInsightPanel` (RoundDetail) and `AddressStatusPanel` (Lottery) refactor to use it. Deletes ~80 LOC.
- `<StatusPill>` lands → `StatusBadge` (Rounds), `StatusPill` (RoundDetail), `StatusBadge` (Lottery) all refactor. Deletes ~60 LOC.
- ...etc.

#### 2.8.7 What stays as-is

- `spacing` ladder — keep.
- `font.size` ladder — keep (8 sizes, well-tuned).
- `font.weight` — keep.
- `transition` — keep for legacy, but new code prefers `motion.*`.
- `maxWidth` — keep.
- `PageContainer` / `SectionContainer` / `Eyebrow` / `PageTitle` / `SectionHeading` — all solid; keep.
- `cardStyles` / `cardHoverStyles` — keep, just update `shadow.md` reference in hover to `shadow.soft` if desired (light touch).
- `fadeInUp` / `fadeIn` animations — keep.
- `gradientTextStyles` — keep.

#### 2.8.8 Risk and rollback

- **Risk:** changing `radius.md` from 8 → 10px may shift visual register on cards. **Mitigation:** quick visual diff per page after change; if any page reads worse, override locally via `tokens.radius.sm` (6px) until designer review.
- **Risk:** introducing `font.mono` may shift addresses' visual weight on long pages (RoundDetail entries, Voters cards). **Mitigation:** preview by toggling the token; if the shift is jarring, fall back to `font.family` for non-table addresses (keep mono only for seeds, hashes, block numbers).
- **Risk:** Phase 3 deletions break unrelated code. **Mitigation:** the deprecations are aliases, not deletions, until a follow-up release. Two-step.
- **Rollback:** Phase 1 is purely additive; revertable in one commit. Phase 2 reintroduces the inline hex if needed.

---

### 2.9 Cross-cutting micro-interaction library spec

> **Iteration 9.** Every page spec above declared "use primitive X" without defining X. This section locks the API for those primitives: props, states, motion, a11y, and where each is consumed. After this lands, every page can be implemented in parallel without picking up stylistic drift.

#### 2.9.1 Inventory & consumers

| # | Primitive | New / Extend | Consumed by (page spec §) |
|---|---|---|---|
| P1 | `<Address>` | New | 2.1 hero chip · 2.2 delegate pill · 2.5 recipient rows · 2.6 bucket entries |
| P2 | `<EnsAmount>` | New | 2.2 hero number · 2.5/6 reward cells · 2.4 voter card · 2.7 worked example |
| P3 | `<StatCard>` | **Extend** (existing) | 2.1 stats grid · 2.2 stats strip · 2.7 hero counters |
| P4 | `<Sparkline>` | New | 2.4 (when endpoint lands) · 2.5 history-row growth column · 2.7 hero counter inline |
| P5 | `<ToneCallout>` | New | 2.1 fallback states · 2.2 lottery status · 2.5 Your Result · 2.6 AddressStatus · 2.7 errors |
| P6 | `<BucketSlotGrid>` | New | 2.5 bucket row expansion · 2.6 SelectedBucketDetail |
| P7 | `<CopyChip>` | New | 2.5 seed value · 2.7 contract addresses (replaces inline copy on `CopyableAddress`) |
| P8 | `<ProposalRow>` | New (gated on backend) | 2.1 voting record (when proposal titles land) |
| P9 | `<StatusPill>` | New | 2.5 rounds list · 2.5 RoundDetail header · 2.6 round options |
| P10 | `<StatStrip>` | New | 2.2 round details strip · 2.5 SummaryGrid · 2.6 DetailGrid |
| P11 | `<BackLink>` | New | 2.1 VoterProfile · 2.5 RoundDetail · 2.4 (if we add detail nav) |
| P12 | `<LiveDot>` | New | 2.1 RoundStatusBar · 2.5 Rounds header · 2.6 round options |
| P13 | `<SideDrawer>` | New | 2.4 Compare drawer · 2.5 recipient row expansion · 2.7 methodology drawer |
| P14 | `<TierLadderRow>` | Extract from existing | 2.1 Disconnected hero slider · 2.2 RewardTiers · 2.7 inside methodology drawer |

File layout: each primitive lives at `apps/frontend/src/components/shared/<PrimitiveName>/{<PrimitiveName>.tsx, index.ts}`. The `index.ts` re-exports the component + types so call sites can import via `@/components/shared/Address` etc.

#### 2.9.2 Detailed primitive specs

##### P1 — `<Address>`

Compact ENS+address rendering with optional avatar and copy affordance. Lighter than today's `CopyableAddress`; intended for inline use inside table cells and pills.

**Props:**
- `value: string` — required, 0x address or ENS name; component handles both forms.
- `ensName?: string` — optional override; if provided, skip wagmi `useEnsName` lookup.
- `avatar?: 'show' | 'hide'` (default `hide`) — when `show`, renders the existing `EnsAvatar` to the left at 16px.
- `truncate?: 'auto' | 'never' | 'always'` (default `auto`) — `auto` truncates to `0x1234…cdef` on mobile, full on desktop hover; `never` always full; `always` always truncated.
- `copyable?: boolean` (default `true`) — when true, click anywhere on the component copies the full 0x address and fires a `toast`. Hover reveals a 12px copy glyph at the end.
- `mono?: boolean` (default `true` for 0x addresses, `false` for ENS names) — applies `font.mono` token only when showing the 0x form.
- `linkTo?: string` — when set, wraps in a `<Link>` to that path. `copyable` still works (stopPropagation inside copy region).
- `size?: 'sm' | 'md' | 'lg'` (default `md`) — `sm` = 12px, `md` = 14px, `lg` = 16px. Matches §2.8 type scale.

**States:** idle / hover (reveals copy glyph + tooltip "Click to copy") / focus-visible (2px outline in `accent`) / copied (200ms green flash via `motion.in-fast` then revert).

**a11y:** semantic `<button>` when copyable (without `linkTo`); `<a>` with copy-inside when both copyable + linkTo (use a nested button). `aria-label="Copy address {0x1234…cdef}"` on the copy region. Tooltip uses `aria-describedby`.

**Motion:** copy flash 200ms ease-out, respects reduced-motion (fall back to no flash).

**Replaces:** today's `AddressText` styled-component (RoundDetail), the inline `truncateAddress(addr)` calls scattered in tables, and the `tabular-nums` font-feature usage on those callsites.

##### P2 — `<EnsAmount>`

Renders an ENS wei value with mono digits, regular suffix, smart formatting.

**Props:**
- `value: string | bigint` — required, wei string or bigint.
- `precision?: number` (default `2` for >1 ENS, `4` for sub-1 ENS, `0` for >=1K) — overrideable.
- `compact?: boolean` (default `false`) — when true, format as `12.3K ENS` / `1.2M ENS` for values >=1000.
- `suffix?: 'ENS' | 'none'` (default `'ENS'`).
- `emphasis?: 'positive' | 'neutral'` (default `neutral`) — when `positive`, digit color is `status.success.fg`; otherwise inherits.
- `clickToReveal?: boolean` (default `true`) — when compact display is shown, hovering or clicking reveals the full-precision value in a tooltip / inline expansion.
- `size?: 'sm' | 'md' | 'lg' | 'hero'` (default `md`).

**States:** idle / hover (when `clickToReveal`, tooltip shows full precision) / focus-visible.

**a11y:** the visible text and the full-precision title attribute (or aria-describedby) both available to screen readers.

**Replaces:** the existing inline helpers `formatEnsAmount`, `formatEnsCompact`, `formatEnsWhole` for *display* purposes — those utils stay (still used by the component internally and by sort/filter logic).

##### P3 — `<StatCard>` (extending existing)

Today's `components/shared/StatCard.tsx` accepts `label`, `value`, `sub`. v2 adds:

**New props:**
- `trend?: { delta: string | number, direction: 'up' | 'down' | 'flat' }` — shows a small chip beside or below the value with the delta and a directional arrow. Color from `status.success` for up, `status.danger` for down, `status.neutral` for flat.
- `help?: string` — adds a small `?` icon next to the label with a tooltip.
- `size?: 'sm' | 'md' | 'hero'` (default `md`) — `hero` for §2.7 large counters: 48–56px value, larger padding.
- `sparkline?: { data: number[], height?: number }` — when set, renders `<Sparkline>` (P4) below the value.
- `as?: 'div' | 'a'` — when `'a'` and `linkTo` is set, the whole card is clickable.

**Backwards-compat:** all existing usages keep working (new props are optional).

##### P4 — `<Sparkline>`

Tiny inline trend chart. No chart library; pure inline SVG.

**Props:**
- `data: number[]` — required.
- `width?: number` (default 80) / `height?: number` (default 24).
- `accent?: 'blue' | 'success' | 'warning' | 'danger'` (default `blue`) — stroke color from tokens.
- `fill?: boolean` (default `false`) — when true, fills below the line with a 20%-opacity tint of accent.
- `interactive?: boolean` (default `true`) — when true, scrub on hover/touch reveals a vertical cursor + tooltip with the point's value. Otherwise, render-only.
- `tooltip?: (point: { index: number, value: number }) => string` — formatter for hover tooltip.

**States:** idle / hover (cursor + tooltip).

**Implementation note:** preserves natural aspect ratio of `width:height`; data is normalized to fit the SVG viewbox.

##### P5 — `<ToneCallout>`

Tone-coded callout panel. **Single canonical replacement** for the 5-branch panels currently inlined in `AddressLotteryPanel` (RoundDetail), `StatusPanel` (Lottery), and `ErrorCard` (Lottery).

**Props:**
- `tone: 'success' | 'warning' | 'pending' | 'danger' | 'neutral'` — required.
- `title: ReactNode` — required.
- `body?: ReactNode` — optional supporting paragraph.
- `metrics?: Array<{ label: string, value: ReactNode }>` — optional metrics grid (3-up on desktop, 2-up on mobile). When `metrics` provided, renders below body in a flexible grid.
- `action?: { label: string, onClick?: () => void, to?: string }` — single primary action; renders as inline link if `to`, button if `onClick`.
- `icon?: 'auto' | 'none' | ReactNode` (default `auto`) — `auto` picks an icon per tone (✓ for success, ! for warning, ⏳ for pending, ✕ for danger, ⓘ for neutral). `none` omits.
- `dismissible?: boolean` (default `false`) — when true, an `×` close button appears top-right; calls `onDismiss`.
- `compact?: boolean` (default `false`) — denser variant (smaller padding, smaller title).

**Styling per tone:** uses `status.{tone}.{bg, border, fg}` tokens (per §2.8). `title` color = `status.{tone}.fg`. `body` color = `textMuted`. `border-radius` = `tokens.radius.md`. `padding` = `spacing.2xl` (compact = `lg`).

**Motion:** fade-in 200ms on mount (`motion.in`). If `tone === 'success'` AND first render, fire one confetti burst via shared `useConfetti()` helper (respects reduced-motion).

**a11y:** root element is `role="status"` for `success/warning/pending`, `role="alert"` for `danger`. Dismissible variant focuses the close button on mount.

**Replaces** ~80 LOC of inlined `$tone` styled-components across RoundDetailPage, LotteryPage, ErrorCard.

##### P6 — `<BucketSlotGrid>`

Visualization of a single lottery bucket's entries as proportional slots, winner highlighted. Pure inline SVG.

**Props:**
- `entries: LotteryEntryDetail[]` — required (type imported from `@/api/types`).
- `winnerAddress: string` — required, address of the winning entry; component finds the matching entry.
- `highlightAddress?: string` — optional, the connected user's address; renders that slot with a `2px solid blue` border (separate from the winner's `2px solid success` border).
- `onSlotClick?: (entry: LotteryEntryDetail) => void` — clicking a slot fires; used by §2.5/6 to scroll the participants table to that row.
- `height?: number` (default 64) — SVG height. Slots span the full width, height-uniform.

**Behavior:** total slot widths sum to 100% of the grid width; each slot's width is proportional to `entry.amountEns / sum(entries.amountEns)`. Slots ≥10px wide render their entry label inline (`AddressIdentity` short form); narrower slots render as bare rectangles. All slots have hover tooltip showing ENS name, amount, probability.

**Motion:** slots fade-in left-to-right with 50ms total stagger (5ms per slot, capped). Winner slot gets a 1.5s subtle inner glow on first mount.

##### P7 — `<CopyChip>`

Small inline copyable value. Designed for seed hashes, contract addresses, block numbers — anywhere we want to make "click to copy" obvious without taking a full row.

**Props:**
- `value: string` — required.
- `label?: string` — optional visible prefix (e.g. "Seed:").
- `display?: string` — optional overridden display value (e.g. `0x9f3a…12bc`); falls back to `value`.
- `mono?: boolean` (default `true`).
- `toastMessage?: string` (default `"Copied"`).

**States:** idle / hover (reveals copy glyph in `motion.in-fast`) / focused (outline) / copied (green flash 200ms then revert).

Smaller and more constrained than `<Address>` (no avatar, no ENS resolution, no link).

##### P8 — `<ProposalRow>`

One row of voting-record history. Gated on backend `/proposals?last=10` endpoint.

**Props:**
- `proposalTitle: string`
- `vote: 'For' | 'Against' | 'Abstain'`
- `date: string` (ISO)
- `href?: string` — when present, whole row is a link.
- `compact?: boolean` (default `false`) — denser variant for VotersPage card hover.

**Visual:** vote chip on the left (color per `status.success` / `status.danger` / `status.neutral`), proposal title in the middle (truncate with ellipsis), date on the right (utility type size).

**a11y:** `<a>` when `href` set; `<div>` otherwise. Chip has `aria-label="Voted For" | "Voted Against" | "Abstained"`.

**Fallback for absent backend:** when proposal titles aren't yet exposed, the component renders the existing `ProposalBar` dot row instead. The page spec already declares this fallback.

##### P9 — `<StatusPill>`

Replaces the duplicated `StatusBadge` / `StatusPill` styled-components in 3 files (per §2.8.5).

**Props:**
- `tone: 'live' | 'paid' | 'pending' | 'ended' | RewardStatus` — accepts both `RoundStatus` and `RewardStatus` from `@/api/types`; component maps them to one of the 5 visual tones (`success / warning / pending / danger / neutral`).
- `pulse?: boolean` (default: auto-true when `tone === 'live'`) — toggles the existing `livePulse` keyframe animation.
- `iconLeading?: ReactNode` — optional, defaults to `LiveDot` (P12) when `pulse=true`, hourglass for `pending`, check for `paid/success`, dash for `ended`.

##### P10 — `<StatStrip>`

Flex/grid wrapper that arranges `<StatCard>` children responsively. 4-up on desktop, 2-up on tablet, 1-up on mobile.

**Props:**
- `children: ReactNode` — expects `<StatCard>` children.
- `columns?: number` (default `4`) — desktop column count; mobile/tablet always reflows below.
- `gap?: 'sm' | 'md' | 'lg'` (default `md`).

##### P11 — `<BackLink>`

**Props:**
- `to: string` — required.
- `children: ReactNode` — required (the link label, e.g. "All voters").
- `chevron?: 'left' | 'none'` (default `left`).

**Visual:** `← All voters` with the chevron in `darkGray`, label in `blue`, semibold weight, 14px. Hover underline. Replaces today's inline `BackLink` in RoundDetail and VoterProfile.

##### P12 — `<LiveDot>`

**Props:**
- `tone?: 'success' | 'blue'` (default `success`) — color of the dot.
- `pulse?: boolean` (default `true`) — animates the existing `livePulse` keyframe.
- `size?: number` (default `8`).

##### P13 — `<SideDrawer>`

**Props:**
- `open: boolean` — required.
- `onClose: () => void` — required.
- `title: ReactNode` — required for a11y heading.
- `side?: 'right' | 'bottom'` (default `right` on desktop, `bottom` on mobile via media query).
- `width?: string` (default `'420px'`) — desktop only.
- `children: ReactNode`.

**Behavior:** focus-trap inside drawer; restores focus to opener on close; Esc closes; click on backdrop closes; backdrop is `rgba(0,0,0,0.32)` with 200ms fade. Drawer slides in via `transform: translateX(100%)` → `0` (or `translateY` for bottom variant). Respects reduced-motion.

**a11y:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby={titleId}`.

##### P14 — `<TierLadderRow>`

Extracted from today's `DashboardPage/sections/RewardTiers.tsx`. The dot row + APR pill + lock/check icon pattern is reused in three places (Dashboard, Landing tier slider preview, Transparency methodology drawer).

**Props:**
- `tier: TierEntry` — from `@/api/types`.
- `position: number` — 0-based index used for the filled dots.
- `total: number` — total tier count.
- `isCurrent?: boolean` (default `false`) — applies `tierHighlight` background.
- `isLocked?: boolean` — passed through to opacity dim.
- `showAprLabel?: boolean` (default `true`).
- `compact?: boolean` (default `false`).

#### 2.9.3 Implementation order

Implement the primitives in the order each is needed by the page rollout (see each spec's "Implementation order" section). A practical sequence:

1. **P9 StatusPill** + **P11 BackLink** + **P12 LiveDot** — tiny components, immediate cleanup of duplicates.
2. **P1 Address** + **P2 EnsAmount** + **P7 CopyChip** — the address/amount rendering trio. Drives consistency across every table.
3. **P3 StatCard** extensions — `size="hero"` for Transparency hero, `trend` chip for Dashboard delta.
4. **P10 StatStrip** — consolidates 4 inline stat-grid styles.
5. **P5 ToneCallout** — the big LOC win. Lands the new `status.*` tokens by extension.
6. **P13 SideDrawer** — used by VoterCard compare, Lottery bucket detail, Transparency methodology.
7. **P14 TierLadderRow** — extracted from existing `RewardTiers`. No new visual.
8. **P4 Sparkline** — Dashboard delta sparkline + Transparency hero counters + Rounds history.
9. **P6 BucketSlotGrid** — the marquee visualization for Lottery + RoundDetail.
10. **P8 ProposalRow** — deferred until backend `/proposals` endpoint lands; current `ProposalBar` continues to render until then.

#### 2.9.4 Testing & docs expectations

- Each primitive ships with a Vitest spec covering: props default values, key states (idle/hover/focus/disabled), a11y attributes (role, aria-label), motion gated on `prefers-reduced-motion: reduce`.
- A minimal Storybook-style demo isn't currently set up; instead, add a `/dev/primitives` route (only mounted when `import.meta.env.DEV`) that renders each primitive in idle / hover / disabled / loading states. Saves repeated visual QA when refactoring.
- Type tests via `vitest --typecheck` ensure prop signatures don't drift.

#### 2.9.5 What we explicitly do NOT add

- No new chart library. `Sparkline` and `BucketSlotGrid` are hand-rolled SVG, no Recharts/Visx/Chart.js dependency.
- No new icon library. Use the existing `@ensdomains/thorin` icons (`CheckSVG`, `LockSVG`, `WalletSVG`, `EnsSVG`) when available; inline SVG glyph for the few that aren't (`×` for dismiss, `?` for help).
- No CSS-in-JS framework swap. Keep styled-components; the primitives are styled-components consumers like everything else.
- No animation library (Framer Motion). All motion is CSS keyframes + transitions, respecting `prefers-reduced-motion: no-preference` via media query.

---

## 3. Iteration log

| # | Page / concern | Status |
|---|---|---|
| 1 | VoterProfile v2 | ✅ done |
| 2 | Dashboard v2 | ✅ done |
| 3 | Landing v2 (per wallet state) | ✅ done |
| 4 | Voters list v2 | ✅ done |
| 5 | Rounds + RoundDetail v2 | ✅ done |
| 6 | Lottery v2 | ✅ done |
| 7 | Transparency v2 | ✅ done |
| 8 | DS consistency audit + token refactor | ✅ done |
| 9 | Cross-cutting micro-interaction library | ✅ done |
| 10 | Convergence pass — canonical FE v2 doc | ✅ done |

---

**Document complete.** Total: 10 iterations, 7 page specs, 1 DS audit, 1 primitives library, 1 convergence pass. Every spec is grounded in real API fields or explicitly flagged as needing backend extension. Priority order (§0.0), backend asks (§0.1), and out-of-scope (§0.2) are the top-of-doc summary.

Next steps for the team:
1. Review §0.0 P0 list and confirm sprint 1 scope.
2. Open the backend asks (§0.1) with the backend team — BE-1 (proposals) and BE-3 (lastVoteAt) unblock the most P3 work for the least backend effort.
3. Land §2.8.6 Phase 1 (tokens) as the first PR — non-breaking, unblocks every page work.
4. Land §2.9 P1, P2, P5, P9–P12 primitives next — these get reused on every page implementation.
| 4 | Voters list v2 | pending |
| 5 | Rounds + RoundDetail v2 | pending |
| 6 | Lottery v2 | pending |
| 7 | Transparency v2 | pending |
| 8 | DS consistency audit + token refactor | pending |
| 9 | Cross-cutting micro-interaction library | pending |
| 10 | Convergence — single canonical FE v2 doc | pending |

Each iteration appends a section above this log, then ticks its row.
