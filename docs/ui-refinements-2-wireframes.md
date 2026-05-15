# UI Refinements v2 — Section-by-section wireframes

> **Process** (per the ClickUp task brief): for each section on each page → name the UX pattern → research how other products solve it on Refero → critique the current rendering → propose a wireframe → list components to reuse or create. **Wireframes first, implementation only after the whole set is approved.**
>
> One file per page would scatter context; this single doc is the planning surface. Implementation lives on the branch `ui-refinements-2`.

---

## 0. Cross-cutting principles

These apply to every section below. If any wireframe contradicts one, the wireframe is wrong.

### 0.1 Minimal & clean elevation

- Borders carry surface. Shadows are a *hint* of lift, not a marketing flourish.
- Default card: `1px solid borderLight` + `shadow.soft` (hairline + 4% ambient).
- Hover: shift `border-color`, do not stack shadows. If a card needs depth on hover, raise it max one elevation step.
- Reserve `shadow.lg` for **modals / drawers / popovers only**.
- Tokens were tuned: `shadow.sm` 4%, `shadow.md` 6%, `shadow.lg` 8% — every consumer pulled down with the foundation.

### 0.2 No repeated information

Before any section is done, scan it top-to-bottom and ask: *is any data point shown twice in the same viewport?* If yes, pick the most informative location and drop the other.

Known repeat shapes to watch for:
- Same name in `Avatar+name` block AND in `<h1>` next to it
- Same value in a progress bar fill AND in an adjacent label
- Same external link in a hero chip AND in a section caption
- Same metric in a `RoundPill` near the title AND in the stats grid below

### 0.3 No content reinvention without permission

Per the task: *"I don't want you to go too far like you did before with the home hero section, changing its content to a calculator."* UI / visual / interaction can change heavily. **Content can only change slightly**, and only when needed to reduce repetition or clarify the meaning.

### 0.4 Sectional creativity, system cohesion

Every section can be visually distinct, but the page should still read as **one system**. Shared scaffolding:
- Hero pattern: `Eyebrow` (semibold sm gray, no uppercase) → `PageTitle` → `SectionSubheading` paragraph → optional inline pill/chip. Flat — no `HeroCard` wrap.
- Section pattern: `SectionEyebrow` + `SectionTitle` + content. Border-style cards, soft shadow, never card-in-card.
- Stat strip: `<StatStrip>` with 2–4 `<StatCard>` children. Mono digits, semibold sm labels, no uppercase.
- Tone callouts: `<ToneCallout>` for the 5 status tones. Never re-invent the `$tone` styled-component branch.

### 0.5 Refero method

Per section, the loop is:
1. **Pattern name** — one short noun phrase (e.g. *"weighted-allocation strip"*).
2. **Refero search** — `search_screens` with that pattern + the platform's vocabulary.
3. **2–3 references** — capture URL + the specific takeaway (not "looks nice", but *"uses a vertical separator + tabular nums for stat-strip cards"*).
4. **Critique** of the current rendering: what's the gap?
5. **Wireframe** — text+ASCII description of the new layout.
6. **Components** — reuse-first; create only if no existing primitive fits.

When the Refero search returns generic results (verification screens, AI chat dashboards), broaden the query OR fall back to documented design-system references (Linear, Stripe, Resend, ShareWillow — these recur across our patterns).

---

## 1. LandingPage

Current order: Hero → RoundStatusBar (overlap card) → HowItWorks → TierTable → CTA → Footer.

### 1.1 Hero

- **Pattern:** marketing landing hero with inline value highlight + dual CTA.
- **Question to ask:** *Is "Your ENS **could be** earning X% APR" the strongest framing? Or do we lead with the concrete number?*
- **Refero refs:**
  - Coinbase `/learning-rewards` ([screen](https://refero.design/pages/5fd39e06-e2bd-4f53-99c9-902efef4d166)) — direct verb-first headline ("Learn and earn"), illustration carries the metaphor.
  - Contra `/refer-clients` ([screen](https://refero.design/pages/08900047-769c-4368-b4e1-306b037f1afb)) — large central hero text + 3D illustration + dense CTA / FAQ stack.
  - Discord Nitro ([screen](https://refero.design/pages/af778fe0-a683-4901-a653-f89fa9f8e4f7)) — strong gradient + product-mock anchor + tier comparison directly below.
- **Critique of today:**
  - "Could be earning" hedges. Competitors lead with the action verb + concrete number.
  - Floating ENS particles read as decorative, not narrative — they don't communicate the *program* (governance, delegation, ENS-as-stake).
  - Eyebrow "ENS Governance · 90-Day Pilot" foregrounds *pilot* (signals uncertainty) over *live* (signals credibility).
- **Wireframe:**
  ```
  ┌──────────────────────────────────────────────────┐
  │ ▌LiveDot Round N · ends in M days                │  ← live eyebrow (replaces static pilot copy)
  │                                                  │
  │   Earn [X% APR] on your ENS,                     │  ← verb-first, APR inline pill (kept)
  │   automatically.                                 │
  │                                                  │
  │   Delegate to an active voter — gas is on us.   │  ← subtitle, tighter (kept ~2 lines)
  │                                                  │
  │   [Delegate now · Free]  [See how it works ↓]    │  ← primary + scroll-to-section secondary
  │                                                  │
  │  ────────── faint cluster of ENS glyphs ─────    │  ← particles → curated cluster, less Brownian
  └──────────────────────────────────────────────────┘
  ```
- **Components:** reuse `Eyebrow`, `PageTitle` (here as Hero h1), `LiveDot`, `Button`. Replace `<HeroEyebrow>` styled with shared `Eyebrow` + a `LiveDot` prefix when a round is open.
- **Data:** eyebrow live-round info from `/rounds/current`. APR from `/tiers/progression`.

### 1.2 RoundStatusBar (overlap card)

- **Pattern:** trust-anchor stat strip pulled into the hero's bottom edge (overlap-card pattern).
- **Refero refs:**
  - Kraken markets header ([screen](https://refero.design/pages/6e2f91c2-7e81-44de-a87c-2167a9583234)) — compact stat row with live dot, tabular nums, 3 metrics.
  - Linear changelog hero — single metric + status pill (lighter; comparable mood).
  - Resend status page — live indicator + stat strip + monospace digits.
- **Critique of today:**
  - Three metrics (Round N, growth %, Tier N+pool) are good but the centering hides the tagline "No tokens locked · Gas sponsored · Rewards auto-sent" inside the same card — that tagline is doing trust-signaling work and should be its own row above OR moved into the hero subtitle.
  - LiveDot is positionally next to "Round N" — fine, but it doesn't pulse (it should — that's what makes it read as *live*).
  - The card uses `shadow.sm` + `border` — already restrained. Keep.
- **Wireframe:**
  ```
  ┌──────────────────────────────────────────────────┐
  │  ✓ No tokens locked  ✓ Gas sponsored  ✓ Auto    │  ← trust tagline ROW (separated)
  │  ──────────────────────────────────────────────  │
  │  ● Round N        │  +X.X%       │  Tier N      │  ← stat row with vertical dividers
  │  M days left      │  VP growth   │  K ENS pool  │
  └──────────────────────────────────────────────────┘
  ```
- **Components:** reuse `StatStrip` skeleton + add a shared `<LiveDot pulse>` (now defined in primitives, currently inlined in RoundStatusBar — replace).

### 1.3 HowItWorks

- **Pattern:** numbered process explainer (3–4 steps).
- **Refero refs:**
  - Wise `/send-money` ([screen](https://refero.design/pages/cb721d66-e2c9-458c-8bbd-05d1be0fa7e9)) — 3-step horizontal flow with bold numbers, lime accent.
  - Stripe billing process steps — vertical timeline with connector lines and inline icons.
  - Coinbase /learn — illustrated step cards (illustration > numbered icon for warmth).
- **Critique of today:**
  - Three steps are correct shape, but each is text-heavy. Real products use one short verb phrase + supporting line + small icon.
  - Numbers (1/2/3) currently appear in plain rounded badges; the connector between them is missing — feels like 3 stacked cards, not a *flow*.
- **Wireframe:**
  ```
  ┌──────────────────────────────────────────────────┐
  │                                                  │
  │   [1]──────[2]──────[3]                          │  ← horizontal connector on desktop
  │    │        │        │                           │
  │   Pick      Sit      Earn                        │
  │   a voter   back     monthly                     │
  │   ─────     ─────    ─────                       │
  │   Browse    Gas is   180-day                     │
  │   active    on us;   avg snap-                   │
  │   delegates rewards  shotted at                  │
  │   on Voters auto-    each round                  │
  │   page.     credited.close.                      │
  │                                                  │
  └──────────────────────────────────────────────────┘
  ```
- **Components:** create `<ProcessSteps>` primitive (numbered horizontal flow with connectors). Reuse `Eyebrow`, `SectionHeading`.

### 1.4 TierTable

- **Pattern:** tier ladder / pricing table.
- **Refero refs:**
  - Discord Nitro ([screen](https://refero.design/pages/af778fe0-a683-4901-a653-f89fa9f8e4f7)) — tier cards with check-list of perks per tier.
  - ShareWillow distribution formula ([screen](https://refero.design/pages/38ee8608-a4b4-454d-98a9-42989ce0641b)) — weighted-allocation rows with sliders, percentage pills, mono digits.
  - Linear pricing — tier cards with the currently-selected one elevated.
- **Critique of today:**
  - Tier rows render correctly but the *current tier* doesn't visually pop — user can't scan to "where am I now?" in one beat.
  - APR labels use `~X% APR` which de-emphasizes the number; on a landing page the number IS the headline.
  - Locked vs unlocked tiers use opacity dim — works but no semantic icon (lock vs check).
- **Wireframe:**
  ```
  ┌──────────────────────────────────────────────────┐
  │   Tier 1   ●●●●○○○○○○      ~3% APR    50K pool   │
  │   Tier 2   ●●●●●●○○○○      ~6% APR    75K pool   │
  │ ▌ Tier 3   ●●●●●●●●○○     ~12% APR   120K pool   │  ← current: left border + bg accent
  │   Tier 4   ●●●●●●●●●●○    ~18% APR   160K pool  🔒 │  ← locked: lock glyph
  │   Tier 5   ●●●●●●●●●●●    ~24% APR   200K pool  🔒 │
  └──────────────────────────────────────────────────┘
  ```
- **Components:** reuse `TierDots`. Extract `<TierLadderRow>` (per design doc §2.9 P14) — shared with Dashboard RewardTiers + Transparency methodology.

### 1.5 CTA section + Footer

- **Pattern:** closing CTA + minimal footer.
- **Refero refs:**
  - Linear footer — single brand line + 3-col link grid + copyright. Restrained.
  - Resend close — single sentence "Email for developers" + 1 CTA + minimal links.
- **Critique of today:** Footer is fine; CTA section currently re-states the hero — that's a *repeat* between hero and footer-CTA on the same page. Either drop the CTA section OR make it a different message (e.g. "Read the methodology →" pointing to Transparency).
- **Wireframe:**
  ```
  ┌──────────────────────────────────────────────────┐
  │     Want the math? See the methodology →         │  ← redirects skeptics, not re-CTA the action
  │                                                  │
  │   ENS Incentives    Docs   GitHub   Anticapture  │  ← single footer row
  │   © 2026 Blockful · Built for ENS DAO            │
  └──────────────────────────────────────────────────┘
  ```
- **Components:** reuse existing `Footer.tsx`. Replace `CtaSection` content with a Transparency-bridge instead of repeating the delegate CTA.

---

## 2. VotersPage

Sections today: header (PageTitle), StatsBar, search + filter chips + Sort by, VoterCard grid, empty/error states.

### 2.1 Header + page intro

- **Pattern:** directory page intro with title + 1-line value prop.
- **Refero refs:**
  - Homerun candidates ([screen](https://refero.design/pages/bbeedb75-72bc-43c1-b6dc-18485b9863a2)) — top toolbar with `[count] candidates` + filter chips + sort.
  - Linear contributors directory — title + filter row + total count chip.
- **Critique of today:** title "Delegate to someone who shows up" works as a value prop. Missing: a count next to the title (`N delegates active this round`) — that's the credibility hook.
- **Wireframe:**
  ```
  Delegate to someone who shows up   · N delegates active
  Active voters from the last 10 governance proposals.
  ```
- **Components:** reuse `PageTitle`. Add a small inline count chip via `<StatusPill tone="neutral">`.

### 2.2 StatsBar

- **Pattern:** top-of-list aggregate stat strip.
- **Refero refs:**
  - Kraken markets ([screen](https://refero.design/pages/6e2f91c2-7e81-44de-a87c-2167a9583234)) — 4 compact stat cards with mono digits.
  - Mercury user-activity ([screen](https://refero.design/pages/da0ff7bb-32ed-4295-a044-4edbcc3b0745)) — restrained stat row above audit table.
- **Critique of today:** StatsBar exists but visually similar to VoterCard — needs to read as *meta-info above the list*, not as another row. Use a flatter style: no card border, just labels + values inline.
- **Wireframe:**
  ```
  Total active voters: N   │   Total VP: X.X M ENS   │   Median participation: 7/10
  ```
- **Components:** reuse `StatStrip`. Restyle to `appearance="flat"` (transparent bg, no border) — minor extension.

### 2.3 Search + filters + Sort by

- **Pattern:** list-toolbar with search input + filter chips + sort dropdown.
- **Refero refs:**
  - Homerun filtering ([screen](https://refero.design/pages/46d1254d-30e9-4c5f-b13d-be244685ca8b)) — clean filter row + chip group + dropdown right-aligned.
  - Linear filter row — chip + sort + view-toggle.
- **Critique of today:** already shipped and validated by user feedback ("Good things you did: search bar + participation filter"). Open issue: "Participation" filter label was styled differently than "Sort by" — fixed in audit pass. Keep current; refine spacing alignment to match toolbar height across all controls.
- **Wireframe:**
  ```
  [🔍 Search address or ENS]   Participation [▸ All|7+|9+]   Sort by [VP ▾]
  ```
- **Components:** keep current. Add small "X results" line below the toolbar when filters are active (so empty state isn't surprising).

### 2.4 VoterCard

- **Pattern:** delegate card with avatar + name + key metrics + action.
- **Refero refs:**
  - Homerun candidate cards ([screen](https://refero.design/pages/f3c3e295-8db1-435b-82b5-e48b19f7e1b2)) — avatar + name + tags + delegate-style CTA.
  - Mercury user activity ([screen](https://refero.design/pages/da0ff7bb-32ed-4295-a044-4edbcc3b0745)) — avatar + name + utility metadata, low chrome.
- **Critique of today:** the audit pass committed `02e108f` (VotersPage section pass — card hover scale + filter chip parity) already added gradient-on-hover + transition. Per user feedback, that landed well. Two gaps remain:
  - Card hover lifts using `shadow.md` — now softened in tokens, should read minimal. Re-verify visually.
  - Voter ENS bio not surfaced (P2 spec). When `useEnsText('description')` returns, render 1-line truncated bio under name.
- **Wireframe:**
  ```
  ┌─ Card ──────────────────────────────────────────────────────┐
  │ [Avatar 56px]  vitalik.eth                                  │
  │                builds & breaks ethereum                     │  ← ENS bio (P2)
  │                                                             │
  │   VP 2.4M  ·  Delegators 12  ·  Active since Jan 2023      │
  │   ●●●●●●●●○○ Last 10 proposals                              │  ← ProposalBar (compact)
  │                                                             │
  │                                  [Delegate · Free]          │
  └─────────────────────────────────────────────────────────────┘
  ```
- **Components:** reuse `EnsAvatar`, `ProposalBar`, `AddressIdentity` (avatar-only mode via `EnsAvatar` directly to match the VoterProfile dedup), `Button`. New: `useEnsText` hook + 1-line bio rendering.

### 2.5 Compare drawer (P2, new)

- **Pattern:** floating dock + side-drawer for multi-select compare.
- **Refero refs:**
  - Linear compare-issues drawer — slide-from-right panel with selected items pinned at top.
  - Resend audience compare — 2-col side-by-side metric matrix.
- **Critique of today:** doesn't exist. Spec from §2.4. Defer to implementation phase; wireframe only.
- **Wireframe:**
  ```
  Bottom dock (sticky, appears when ≥1 voter selected):
  ┌───────────────────────────────────────────────────────────┐
  │ [avatar][avatar]+0 more   ·  Compare 2 voters →           │
  └───────────────────────────────────────────────────────────┘
  Click → right-side drawer:
  ┌────────────── Compare voters (2) ──────── × ──┐
  │ vitalik.eth          │ slobo.eth              │
  │ VP 2.4M              │ VP 230K                │
  │ Participation 8/10   │ Participation 10/10    │
  │ ProposalBar          │ ProposalBar            │
  │ [Delegate]           │ [Delegate]             │
  └────────────────────────────────────────────────┘
  ```
- **Components:** create `<SideDrawer>` primitive (§2.9 P13). Create `useCompare()` hook (URL-state-driven set of addresses, max 4).

---

## 3. VoterProfilePage

Sections today: BackLink, hero billboard (avatar + name + chips), stats strip (4 cards), voting record (ProposalBar), rewards history (3 cards).

### 3.1 Hero billboard

- **Pattern:** profile billboard hero with avatar + identity + verified chips + primary CTA.
- **Refero refs:**
  - Pinterest profile ([screen](https://refero.design/pages/1a2d47ab-e9fb-4d6e-9701-a2f163120c20)) — cover photo + circular avatar overlap + name + handle + stats line.
  - Spotify community profile ([screen](https://refero.design/pages/d0ce94d3-060e-4218-9a1f-26114eab342a)) — gradient header + breadcrumb + content area.
  - GitHub profile — flat hero, avatar + name + bio + links cluster + follow CTA.
- **Critique of today (post-audit):**
  - **ENS name was rendered twice** (AddressIdentity primary + HeroName) — fixed in audit pass (AddressIdentity → EnsAvatar).
  - **Anticapture link appeared in hero chip AND voting-record caption** — fixed (caption removed).
  - Hero still uses a radial-gradient `::before` for visual interest + soft shadow — fine, but verify it doesn't compete with the bg of the page.
- **Wireframe:**
  ```
  ← All voters

  [Avatar 80px]   vitalik.eth                       [Delegate · Earn ~12% APR]
                  0x1234…cdef (click to copy)        Gas sponsored

                  builds & breaks ethereum.          ← ENS bio (description record)

                  𝕏 @VitalikButerin   🌐 vitalik.ca   ↗ Anticapture   ↗ Etherscan   ↗ ENS profile
  ```
- **Components:** reuse `EnsAvatar`, `BackLink`, `ToneCallout` (for delegated state), `Button`, `Chip`. No `AddressIdentity` in the hero — the avatar carries identity, HeroName + AddressChip carry name + address.

### 3.2 Stats strip (4 cards)

- **Pattern:** stat strip with 4 KPI cards.
- **Refero refs:**
  - Kraken markets ([screen](https://refero.design/pages/6e2f91c2-7e81-44de-a87c-2167a9583234)) — flat stat cards with mono digits + tabular nums.
  - Resend audience metrics — 4-up stat row with optional sparkline.
- **Critique of today:**
  - Active Since stat shows `primary` (Month Year) + `secondary` (X mo ago) — borderline duplicate. The secondary is the useful one (relative); the absolute Month Year is rarely needed. Drop primary, just show "2y 3mo ago" + tooltip with absolute date.
  - Voting Power uses `formatVotingPower` → "2.4M" — good. Sub-label "ENS delegated to them" is doing work, keep.
- **Wireframe:**
  ```
  ┌ Voting Power ┐  ┌ Delegators ┐  ┌ Participation ┐  ┌ Active since ┐
  │ 2.4M         │  │ 12         │  │ 8/10 → 80%    │  │ 2y 3mo       │
  │ ENS delegated│  │ token holders │ recent activity│  │ ago          │
  └──────────────┘  └────────────┘  └───────────────┘  └──────────────┘
                                       ▲ ⚠️ DECISION: "8/10 → 80%" vs just "80%" — the prior fix dropped /10 explicitly per task; KEEP just 80% and let ProposalBar carry the fraction visually
  ```
- **Components:** reuse `StatCard`. Drop the primary/secondary split on Active Since.

### 3.3 Voting record (ProposalBar)

- **Pattern:** binary-status dot row for last-N events.
- **Refero refs:**
  - Urban Outfitters /rewards/activity ([screen](https://refero.design/pages/3f0300cb-e77d-409b-aaf3-e1e7d139811c)) — timeline + history pattern (heavier).
  - GitHub contribution dot grid — closest fit; dots colored by intensity.
- **Critique of today:**
  - ProposalBar exists and reads correctly. The "Hover any segment for the proposal it represents" caption is useful but verbose — tighten to "Hover for proposal · Filled = voted."
  - Tooltips currently say nothing about the proposal title (backend gap — `BE-1 /proposals?last=10`). Caption explicitly acknowledges that fallback. Keep until backend lands.
- **Wireframe:**
  ```
  Voting record
  Last 10 governance proposals

  ●●●●●●●●○○

  Hover for proposal · Filled = voted
  ```
- **Components:** reuse `ProposalBar`. When BE-1 lands, swap fallback rendering for `<ProposalRow>` (§2.9 P8).

### 3.4 Rewards history

- **Pattern:** small horizontal card strip of recent rounds.
- **Refero refs:**
  - Urban Outfitters /rewards/activity ([screen](https://refero.design/pages/3f0300cb-e77d-409b-aaf3-e1e7d139811c)) — points history in a table with date + delta.
  - Stripe Connect payouts row — date + amount + state badge.
- **Critique of today:** 3 round cards work, but each card is its own border-shadow surface — heavy. Per "minimal & clean", switch to a flat strip with vertical dividers.
- **Wireframe:**
  ```
  Earnings history
  Share of each round's 10% voter pool

  Round 4         │  Round 3        │  Round 2
  Apr 2026        │  Mar 2026       │  Feb 2026
  +0.45 ENS       │  +0.21 ENS      │  0 ENS (—)
  ```
- **Components:** create `<DataStrip>` (flat row with dividers) OR reuse `StatStrip` with custom child layout. Drop per-card border + shadow.

---

## 4. DashboardPage

Sections today: GreetingRow (greeting + round meta) → MainGrid 2-col [Earnings strip · Round details + This Round] → PastRoundsStrip → RewardTiers.

### 4.1 Greeting strip

- **Pattern:** personal page intro / soft welcome.
- **Refero refs:**
  - Wealthsimple accounts ([screen](https://refero.design/pages/8a1adb56-9e86-49c3-9daf-72500aed3ac1)) — top-of-dashboard greeting / context line.
  - Linear my-issues — "Hi, X" + secondary state line.
- **Critique of today:**
  - Uses "GM/GN/GA/GE" crypto-Twitter shorthand — fits the audience.
  - Round meta is right-aligned text — could be a small inline status pill instead.
- **Wireframe:**
  ```
  GM, vitalik.eth                                        ● Round 5 · 22 days left
  ```
- **Components:** reuse current `Greeting` + add `LiveDot` to `RoundMeta`.

### 4.2 Earnings strip (large hero card)

- **Pattern:** personalized earnings hero with primary KPI + secondary stats + share affordance.
- **Refero refs:**
  - Wealthsimple total-balance card ([screen](https://refero.design/pages/8a1adb56-9e86-49c3-9daf-72500aed3ac1)) — large balance number top, change %, action buttons below.
  - Stripe payouts upcoming card — big amount + countdown + breakdown link.
  - Coinbase portfolio summary — value + delta chip + sparkline.
- **Critique of today:**
  - EarningsStrip exists with APR label and projected reward. Strong.
  - Sub-info ("Tier N", "delegated to X") could be tighter — currently a paragraph. Use chips inline with the number.
  - Share message string lives inside the component — extract to a tested utility.
- **Wireframe:**
  ```
  Your Rewards
  ┌──────────────────────────────────────────────────────────┐
  │ Earning at  3.95% APR                                    │
  │                                                          │
  │ 0.045 ENS                                                │  ← projected monthly reward (hero number)
  │ projected at round close (Oct 31)                        │
  │                                                          │
  │ [Tier 3]  [Delegated to vitalik.eth ↗]  [Share APR ↗]    │
  └──────────────────────────────────────────────────────────┘
  ```
- **Components:** reuse `EarningsStrip`. Internal: replace paragraph metadata with `<Chip>` row.

### 4.3 Round details stat strip (3 cards)

- **Pattern:** secondary KPI strip — supporting context for the hero.
- **Refero refs:** Stripe payouts page — secondary stat row under hero card; Linear cycle small-stat row.
- **Critique of today:** StatStrip with 3 StatCards (Balance / Round Ends / Pool). Compact, clean. No card-in-card.
- **Wireframe:** keep current.
- **Components:** reuse `StatStrip`, `StatCard`.

### 4.4 This Round (progress card + lottery/payout callout)

- **Pattern:** round-progress visual + status callout depending on lottery eligibility.
- **Refero refs:**
  - Linear cycle progress bar — % complete + day count.
  - Stripe billing-cycle countdown card — large progress + days-left.
- **Critique of today:**
  - RoundProgressCard exists with percentComplete + roundNumber.
  - ToneCallout renders one of two messages (qualifiesForLottery → lottery message, else direct payout). Good — always visible, not conditional.
  - The callout body repeats the projected reward number — but the hero EarningsStrip already shows it. **REPEAT**: 0.045 ENS in hero + "Your projected 0.045 ENS payout..." in callout body. Fix: drop the number from callout body, keep the explanation only.
- **Wireframe:**
  ```
  This Round
  ┌────────────────────────────────────────┐
  │ Round 5         ████████░░ 80%         │
  │ 22 days left · Ends Oct 31             │
  └────────────────────────────────────────┘

  • You're in the lottery pool                   ← ToneCallout, NO duplicated number
  Sub-1-ENS rewards pool into ~10 ENS buckets.
  RANDAO picks one winner per bucket at round close.
  [See your bucket on Lottery →]
  ```
- **Components:** reuse `RoundProgressCard`, `ToneCallout`. Edit body copy to remove duplicated reward number.

### 4.5 Past rounds strip

- **Pattern:** horizontal recent-history strip (recap cards).
- **Refero refs:**
  - Urban Outfitters /rewards/activity ([screen](https://refero.design/pages/3f0300cb-e77d-409b-aaf3-e1e7d139811c)) — points history.
  - Stripe past payouts — date + amount + state row.
- **Critique of today:**
  - PastRoundsStrip exists, uses `shadow.soft`. Audit pass softened the token. Good.
  - Letter-spacing removed (audit pass).
  - Each round card shows Round N + reward + month — clean.
- **Wireframe:** keep current, verify hover transitions feel minimal.
- **Components:** reuse `PastRoundsStrip`.

### 4.6 Reward tiers

- **Pattern:** tier ladder with current-tier highlight.
- **Refero refs:** Discord Nitro tier-table; ShareWillow weighted allocation; Linear pricing.
- **Critique of today:** RewardTiers component exists with `TierDots` showing fill state per tier. The current tier has `tierHighlight` bg. Locked tiers dim. Add lock icon + check icon for clarity (semantic > opacity).
- **Wireframe:**
  ```
  Reward Tiers
  Tier 1   ●●●●○○○○○○      ~3% APR    50K pool      ✓
  Tier 2   ●●●●●●○○○○      ~6% APR    75K pool      ✓
  ▌ Tier 3 ●●●●●●●●○○     ~12% APR   120K pool     ★ (current)
  Tier 4   ●●●●●●●●●●○    ~18% APR   160K pool     🔒 needs +14% VP growth
  Tier 5   ●●●●●●●●●●●    ~24% APR   200K pool     🔒
  ```
- **Components:** reuse `RewardTiers`. Extract `<TierLadderRow>` for cross-page reuse (Landing + Transparency methodology drawer).

---

## 5. RoundsPage

Sections today: hero (PageTitle), CurrentRound summary, AddressLookupForm, RoundHistoryTable, lottery snapshot sidebar.

### 5.1 Hero + current round summary

- **Pattern:** dashboard-style page intro with current-period summary card.
- **Refero refs:**
  - ShareWillow distribution ([screen](https://refero.design/pages/cf4678c4-c669-4e29-9300-9613cb565e8a)) — review distribution with status + sidebar.
  - Linear current cycle — title + cycle progress + key stats.
- **Critique of today:** title + summary cluster works. SnapshotEyebrow uses bold + xs — fine now without letter-spacing (audit pass). The Eyebrow over "Round 5 in progress" could be a `<LiveDot>` instead of static text — makes it read as live.
- **Wireframe:**
  ```
  All rounds

  ● Round 5 · in progress       ← LiveDot eyebrow
  Distributing 75K ENS to active delegates · ends Oct 31
  ```
- **Components:** reuse `PageTitle`, `LiveDot`.

### 5.2 Lottery snapshot (sidebar)

- **Pattern:** secondary-info sidebar card with key counters.
- **Refero refs:** Linear cycle sidebar; Stripe payout summary card.
- **Critique of today:** lottery snapshot already replaced duplicate TierTable sidebar (per design doc §0.0 P0). Use `shadow.soft` and a single border — no card-in-card. Currently uses `shadow.soft` which post-token-soften is even lighter. Good.
- **Wireframe:**
  ```
  ┌ Lottery snapshot ─────────────────┐
  │ Round 4 (March 2026)              │
  │ 13 buckets · 410 entries          │
  │ 130 ENS distributed via lottery   │
  │ [See lottery breakdown →]         │
  └───────────────────────────────────┘
  ```
- **Components:** reuse `SectionCard`, `StatStrip`.

### 5.3 Address lookup

- **Pattern:** inline address search with "use connected wallet" affordance.
- **Refero refs:** Stripe address bar in dashboard; Coinbase wallet lookup.
- **Critique of today:** already exists. Promotion in the page layout: surface this above the round history table, not buried after it. Add "Use connected wallet" affordance (shared with Lottery).
- **Wireframe:**
  ```
  Look up rewards for any address
  ┌──────────────────────────────────┐
  │ [vitalik.eth | 0x… ] [Look up]   │
  │ [↩︎ Use connected wallet]         │
  └──────────────────────────────────┘
  ```
- **Components:** reuse `AddressLookupForm`. Extend with `connectedAddress` prop.

### 5.4 Round history table

- **Pattern:** chronological table with status pills + per-row CTA.
- **Refero refs:**
  - Mercury user-activity ([screen](https://refero.design/pages/da0ff7bb-32ed-4295-a044-4edbcc3b0745)) — audit log with status badges + dates + search.
  - Stripe payouts table — status pill column + amount mono + date.
- **Critique of today (post-audit):**
  - Th now no uppercase, semibold sm (audit pass). Good.
  - StatusBadge consistency: round status uses {paid|live|pending|ended} — should map to `<StatusPill tone={...}>` shared with Lottery/RoundDetail.
  - Missing per-row "VP growth" sparkline (P2 spec §2.5 step 3) — defer until BE-2 sparkline backend ready.
- **Wireframe:**
  ```
  Round │ Period            │ Pool      │ Recipients │ Status      │ →
  5     │ Oct 2026          │ 75K ENS   │ —          │ ● Live      │ ↗
  4     │ Mar – Mar 2026    │ 75K ENS   │ 312        │ ✓ Paid      │ ↗
  3     │ Feb – Feb 2026    │ 50K ENS   │ 284        │ ✓ Paid      │ ↗
  ```
- **Components:** reuse `StatusPill`, `Th`, `Td`. Defer sparkline column.

---

## 6. RoundDetailPage

Sections today: BackLink, header (PageTitle + Eyebrow + status badge), Your Result (tone callout), round overview stats, recipients table, lottery transparency callout, methodology (NEW per spec).

### 6.1 BackLink + header

- **Pattern:** detail-page header with back nav + title + status pill.
- **Refero refs:** GitHub issue header; Linear issue detail; ShareWillow plan detail.
- **Critique of today:** `BackLink` shared primitive in use. Title + status pill exists. Order in JSX (existing top-down): Your Result → Round Overview → Methodology → Recipients → Lottery Transparency — per spec §2.5. Audit if today's order matches.
- **Wireframe:**
  ```
  ← Back to rounds

  Round 4 · March 2026     ✓ Paid
  Distributed 75K ENS to 312 recipients.
  ```
- **Components:** reuse `BackLink`, `PageTitle`, `StatusPill`.

### 6.2 Your Result

- **Pattern:** tone-coded personal status panel.
- **Refero refs:** Stripe my-balance card; Linear my-issues callout.
- **Critique of today:** uses `<ToneCallout>` (shared). Good. Verify: when activeAddress matches a recipient — show the actual reward; when not in recipients — show "not eligible this round"; when lottery only — show "in lottery bucket #N, didn't win" with link.
- **Wireframe (3 states):**
  ```
  CONNECTED + WON:
  ✓ You earned 0.45 ENS this round
  Direct payout · sent to your wallet on Apr 1

  CONNECTED + LOTTERY-DIDN'T-WIN:
  • You entered the lottery but didn't win
  Bucket #14 · 22.4% odds · See bucket details ↗

  CONNECTED + NOT ELIGIBLE:
  — Not eligible this round
  Your delegate didn't meet the activity threshold (7/10 proposals).
  ```
- **Components:** reuse `ToneCallout`.

### 6.3 Round overview stats

- **Pattern:** 4-up stat strip with round-level metrics.
- **Refero refs:** Linear cycle overview; Stripe charges summary.
- **Critique of today:** SummaryGrid exists. Verify `<StatStrip>` reuse. Confirm no card-in-card.
- **Wireframe:**
  ```
  ┌ Pool ──┐  ┌ Recipients ┐  ┌ Total paid ┐  ┌ Lottery share ┐
  │ 75K    │  │ 312        │  │ 18.4K ENS  │  │ 130 ENS · 17% │
  │ ENS    │  │ unique     │  │ direct     │  │ via 13 buckets│
  └────────┘  └────────────┘  └────────────┘  └───────────────┘
  ```
- **Components:** reuse `StatStrip`, `StatCard`.

### 6.4 Methodology card (P1 — high credibility, low engineering)

- **Pattern:** transparency anchor block with copyable seed + code link + algorithm link.
- **Refero refs:**
  - ShareWillow distribution formula ([screen](https://refero.design/pages/e0674231-9bf4-48e8-b87c-18c6b6bf48a0)) — formula breakdown with weight rows + transparency.
  - Stripe API key cards — copy-on-click + external doc link.
- **Critique of today:** missing. Spec §2.5 (6) is one of the highest credibility-to-effort wins.
- **Wireframe:**
  ```
  Methodology
  Same code that ran for Round 4 ran for every other round.

  RANDAO seed      [0x9f3a…12bc][copy]   View on Etherscan ↗
  Algorithm        github.com/blockful-io/delegation-incentives-system/round.ts ↗
  Snapshot block   #22,304,581                          ↗ Etherscan
  ```
- **Components:** create `<CopyChip>` (§2.9 P7). Reuse `LinkCardStack`.

### 6.5 Recipients table

- **Pattern:** large data table with search + auto-highlight + pagination.
- **Refero refs:**
  - ShareWillow review distribution ([screen](https://refero.design/pages/cf4678c4-c669-4e29-9300-9613cb565e8a)) — recipients with search + status indicators.
  - Linear roadmap items table — search + auto-highlight active row.
- **Critique of today:** AddressRewardsTable exists with mobile reflow (audit-passed Th/Td styling). Missing:
  - Search input above table (spec §2.5 step 7)
  - Auto-highlight + scroll-to row when connected/searched address is in the recipients
  - Pagination control if rewardLimit < total
- **Wireframe:**
  ```
  Recipients (312)
  [🔍 Search address or ENS]                        [↑ 1/4] [page 1 of 4 ▾]

  Rank │ Address                  │ Reward      │ Type
  1    │ vitalik.eth              │ 4.21 ENS    │ Direct
  ...
  47   │ ▌slobo.eth (you)         │ 0.45 ENS    │ Direct     ← auto-highlighted + scrolled
  ...
  ```
- **Components:** reuse `AddressRewardsTable`. Add `<SearchInput>` above + `usePagination()` hook (URL-driven).

### 6.6 Lottery transparency (recap card)

- **Pattern:** terminal card linking back to a sibling page.
- **Refero refs:** Linear "see also" footer; Stripe related-docs strip.
- **Critique of today:** if a round has a lottery, link to `/lottery?round=N`. Don't render this card when lottery doesn't apply.
- **Wireframe:**
  ```
  Lottery transparency
  Round 4 had 13 buckets distributing 130 ENS. See per-bucket results,
  RANDAO seed, and winning entries.

  [See lottery details →]
  ```
- **Components:** reuse `Section`, `Button`.

---

## 7. LotteryPage

Sections today: hero (eyebrow + title + prize-pill + description + current-round note), AddressStatusPanel + AddressLookupForm (top-grid), RoundAndBucketExplorer (NavigatorPanel left + SelectedBucketDetail right), participant table, empty/error states.

### 7.1 Hero

- **Pattern:** explainer-led hero with a value pill anchored right.
- **Refero refs:**
  - Coinbase /learning-rewards ([screen](https://refero.design/pages/5fd39e06-e2bd-4f53-99c9-902efef4d166)) — rewards landing with clear value prop top + illustration.
  - Linear changelog hero — title + 1 sentence sub + status pill on the right.
- **Critique of today (post-audit):**
  - Now uses shared `PageTitle` + `Eyebrow` (audit pass). Good.
  - Trophy `PrizePill` "Win up to 10 ENS" still uses `bold` weight + sm size — softens to `semibold` for the cleaner pass.
  - `CurrentRoundNote` is a separate paragraph below description — fine as second line, but mark the **current** round inline with a `LiveDot` instead of plain text.
- **Wireframe:**
  ```
  Lottery
  Lottery buckets                                       🏆 Win up to 10 ENS
  Sub-1-ENS payouts pool into ~10 ENS buckets.
  RANDAO seeds a weighted draw at round close.
  ● Round 5 · Oct 2026 (current)
  ```
- **Components:** reuse `PageTitle`, `Eyebrow`, `LiveDot`. No new components.

### 7.2 AddressStatusPanel + AddressLookupForm (top grid)

- **Pattern:** dual-column "your state" + "look up another address" layout.
- **Refero refs:**
  - Stripe /payments — your-payouts callout left, search/filter right.
  - Linear my-issues — personal state card + global filter row.
- **Critique of today:**
  - AddressStatusPanel migrated to `<ToneCallout>` (audit pass). Reuse is clean.
  - AddressLookupForm needs a "Use connected wallet" affordance per spec §2.6 (3) — chip beside input.
- **Wireframe:**
  ```
  ┌ Your lottery state ──┐   ┌ Inspect another ────────────┐
  │ ⏳ Round 5 not closed │  │ [vitalik.eth | 0x… ]  [Look up]│
  │ Bucket: yours auto-  │   │ [↩︎ Use connected wallet]    │
  │ selected when round  │   │                              │
  │ closes               │   │                              │
  └──────────────────────┘   └──────────────────────────────┘
  ```
- **Components:** reuse `ToneCallout`. Extend `AddressLookupForm` to accept `connectedAddress` prop + render the affordance chip.

### 7.3 NavigatorPanel (rounds list + buckets list)

- **Pattern:** master list pane with hierarchical breadcrumbing.
- **Refero refs:**
  - Acne Studios dual-pane ([screen](https://refero.design/pages/0271470f-fefc-4f43-b38e-52c60e3749ae)) — list + detail.
  - X/Twitter three-column settings ([screen](https://refero.design/pages/34171413-66a9-4731-8d75-d6a04399ae9f)) — list with active highlight.
- **Critique of today:**
  - The "● You" pin + auto-select user bucket landed (audit pass).
  - Round breadcrumb (spec §2.6 8) not present — adds keyboard-nav between rounds.
  - RoundOption + BucketOption now have hover transitions + focus-visible + reduced-motion (audit pass).
- **Wireframe:**
  ```
  Choose lottery
  Round 5 ▾  →  Pool 14 (yours)                  ← breadcrumb (clickable popover)

  ── Rounds ──
  [● Round 5 · live]  ← active
  Round 4 · paid
  Round 3 · paid
  ...

  ── Buckets in Round 5 ──
  ▌Bucket #14   ● You   Winner: vitalik.eth     ← user's, pinned + auto-selected
  Bucket #1     Winner: nick.eth
  Bucket #2     Winner: slobo.eth
  ...
  ```
- **Components:** reuse `LiveDot`, `StatusPill`, `YouPin` (already created). New: tiny `<RoundBreadcrumb>` (popover-driven).

### 7.4 SelectedBucketDetail

- **Pattern:** detail pane with stat-grid + visualization + conditions + table.
- **Refero refs:**
  - Weights & Biases parallel-coordinates ([screen](https://refero.design/pages/1ff391d4-ba59-4433-baa2-080dfc71fb50)) — multi-dim visualization above table.
  - ShareWillow distribution ([screen](https://refero.design/pages/38ee8608-a4b4-454d-98a9-42989ce0641b)) — weighted-allocation rows.
  - Brilliant data-viz modal ([screen](https://refero.design/pages/92288c24-8cc5-41a0-a1f2-9249196c648a)) — chart with explanation inline.
- **Critique of today (post-audit):**
  - **`RoundPill "X ENS prize"` removed from PanelHeader** (audit pass) — prize now lives only in DetailGrid. Good.
  - `BucketSlotGrid` primitive shipped (audit pass) — proportional slot widths, click-to-scroll-row, winner glow. Good.
  - Participants table mobile reflow still uses default scrollable behaviour, not the `Td[data-label]` card pattern from RoundDetailPage. Add the pattern.
  - "All-winners tab" (spec §2.6 7) not present — adds round-level scanning.
- **Wireframe:**
  ```
  Round 5 · Bucket #14 details
  Every participant below had a final payout under 1 ENS.

  ┌ Prize ─┐  ┌ Winner ──┐  ┌ Participants ┐  ┌ Winner's odds ┐
  │ 10 ENS │  │ vitalik  │  │ 47 unique    │  │ 22.4%         │
  └────────┘  └──────────┘  └──────────────┘  └───────────────┘

  Entry · Chance · Draw     (existing conditions row — keep)

  [BucketSlotGrid — proportional slots, winner green, you blue]
   ▐▐▐▐▐▐▐▐██▐▐▐▐▐                                          (★ = winner)

  [tabs:] [Bucket detail] [All winners (round)]
  ─ Bucket detail (default) ─
  Participants table — Td[data-label] mobile cards (NEW)

  ─ All winners (round) ─
  Searchable table: Bucket # · Winner · Prize · Odds · Block
  Row click → switches Bucket detail tab to that bucket
  ```
- **Components:** reuse `BucketSlotGrid`, `ToneCallout`, `StatCard`. New: lightweight `<Tabs>` (Thorin if available) + Td[data-label] mobile reflow port from RoundDetailPage.

### 7.5 Empty / degraded states

- **Pattern:** friendly empty state with illustration + 1-line cause.
- **Refero refs:**
  - Cake Equity empty ([screen](https://refero.design/pages/a14a6a0d-b2ef-438a-b0cb-c5d16f96666e)) — illustrated empty state with single CTA.
  - Linear empty inbox — 1 sentence + small illustration.
- **Critique of today:** EmptyState renders for "no rounds configured" only. Two cases missing per spec §2.6:
  - Round with no lottery (all payouts ≥1 ENS): explanatory copy.
  - Round live / pending: "Final winners appear after Round N closes on {endDate}."
- **Wireframe:**
  ```
  ┌─────────────────────────────────────────┐
  │  [icon]                                 │
  │  No lottery this round                  │
  │  Every payout was ≥1 ENS, so all        │
  │  recipients got direct transfers.       │
  └─────────────────────────────────────────┘
  ```
- **Components:** reuse `EmptyState`. Add lightweight font-awesome icon variant.

---

## 8. TransparencyPage

Sections today: hero (eyebrow pill + title + desc + 4 hero counters), VERIFY_LINKS row, smart-contracts column, how-rewards-calculated column, **Worked Example** column (audit-pass new).

### 8.1 Hero + counters

- **Pattern:** credibility hero with status-success pill + live program metrics.
- **Refero refs:**
  - Resend status page — live metrics + uptime indicator.
  - Stripe status — shield icon + headline + live counters.
- **Critique of today (post-audit):**
  - HeroCard wrapper removed → flat layout (audit pass). Good.
  - Status-success eyebrow pill with shield icon — keep.
  - Error+retry callout now renders when status/tiers fail (audit pass). Good.
  - Counter strip uses left-border separators (no card-in-card). Good.
- **Wireframe:** keep current — sound after audit.
- **Components:** keep. Replace `HeroEyebrow` styled with a shared `<Chip tone="success" icon={...} />` if it becomes used elsewhere (Lottery prize pill is similar — possible primitive).

### 8.2 VERIFY_LINKS row

- **Pattern:** 3-link card row pointing to external authoritative sources.
- **Refero refs:** Coinbase resource cards row; Linear footer link strip.
- **Critique of today:** works. Each LinkCard has icon + label + 1-line desc. Keep.
- **Components:** reuse `LinkCardRow`.

### 8.3 Smart contracts column

- **Pattern:** contract card stack with verified badge + copy address + Etherscan link.
- **Refero refs:** Stripe /developers contracts list; Linear API keys.
- **Critique of today:** strong. Each contract has tag "Verified" + copyable address. Add **liveness probe** per spec §2.7 (5): viem `getCode` returns non-zero → render small dot + "Reachable @ block N" line.
- **Wireframe:**
  ```
  ┌──────────────────────────────────────────────┐
  │ ENS Incentives                  [Verified]   │
  │ 0xabcd…1234 [copy]              [Etherscan↗] │
  │ ● Reachable as of block 22,304,581           │  ← NEW liveness probe
  └──────────────────────────────────────────────┘
  ```
- **Components:** reuse `LinkCardStack`. Create `<ContractLiveness address={x} />` (calls `getCode` via wagmi/viem, renders dot + block).

### 8.4 Methodology diagram (P1 marquee, new)

- **Pattern:** algorithm flow diagram with clickable steps drilling to code.
- **Refero refs:**
  - FlowMapp user flow ([screen](https://refero.design/pages/18ec8b5e-566a-49de-81d6-09f7ca90a2ac)) — rectangle + diamond nodes, thin arrows, sans labels.
  - Perplexity metacognition cycle ([screen](https://refero.design/pages/3a8509f9-7391-49ba-8ee8-67a5a5581e9c)) — circular flow with arrows + clickable nodes.
  - Excalidraw mermaid modal ([screen](https://refero.design/pages/8e6e1e7c-077a-4481-b4ff-cbec4240a81c)) — code-renders-to-flow pattern.
- **Critique of today:** current StepList is text bullets. The credibility skeptics (nick.eth, estmcmxci, clowes) land here first — a diagram lands harder than 3 bullets.
- **Wireframe:**
  ```
  Algorithm
  Same code runs every round. Click any step for the source.

  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │ Snapshot │ →  │ Compute  │ →  │ Apply    │ →  │ Distribute│
  │ balances │    │ shares   │    │ tier APR │    │ + lottery │
  │ (180d)   │    │ (P/total)│    │ + caps   │    │ < 1 ENS  │
  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
       │ ↗ source       │ ↗ source       │ ↗ source       │ ↗ source

  Click a step → SideDrawer opens with:
  - GitHub deep-link to that function
  - Plain-English explanation (longer than the diagram label)
  - Inputs + outputs example
  - "Open in Etherscan" if the step touches a contract
  ```
- **Components:** create `<MethodologyDiagram>` (inline SVG, 4 nodes + arrows + click handlers). Create `<SideDrawer>` (§2.9 P13). Reuse `Chip` for "↗ source" links.

### 8.5 Worked Example (audit pass — verify + extend)

- **Pattern:** step-by-step computation with arrows.
- **Refero refs:**
  - Brilliant explanation modal ([screen](https://refero.design/pages/92288c24-8cc5-41a0-a1f2-9249196c648a)) — bar chart with inline explanation.
  - Stripe pricing calculator — input + arrow + output.
- **Critique of today (post-audit):**
  - Audit pass shipped a 3-step Worked Example using real current-tier APR. Good first cut.
  - Spec §2.7 (7) wants the example tied to a **real round** (latest paid), with one real recipient's actual numbers. Today's version uses an "illustration only: 5 ENS holder" — fictional balance. Mark this as needing replacement: pull from `api.round(latestPaidN, anonymizedHolder)`.
  - Step 4 (caps redistributed) blocked on BE-5.
- **Wireframe:**
  ```
  Worked Example
  Round 4 (March 2026) · sample recipient

  ┌──────────┐  →  ┌──────────┐  →  ┌──────────┐  →  ┌──────────┐
  │ Snapshot │     │ Share    │     │ Tier 3   │     │ Payout   │
  │ 5.00 ENS │     │ 0.0042%  │     │ 12% APR  │     │ 0.21 ENS │
  └──────────┘     └──────────┘     └──────────┘     └──────────┘
  Sub: 180-d avg   Sub: of voter   Sub: at month   Sub: < 1 ENS →
                   pool             start          lottery bucket
  ```
- **Components:** keep `WorkedExampleSteps` styled-components. Wire data: `api.round(latestPaidN)` to fetch one recipient's numbers (anonymized or pick by ENS).

---

## 9. Implementation order (after approval)

Order chosen so each step **unblocks** later ones and ships **visible wins first**. Each step lists its key sections from §1–§8.

### 9.0 Confirmed audit baseline (committed `f36ab1a` on `ui-refinements-2`)

These items already shipped before the wireframe pass — don't redo:
- Uppercase killed at foundation + every live styled-component.
- Hero pattern unified across Lottery / Transparency / Voters / Rounds.
- `BucketSlotGrid` + "● You" pin + auto-select on Lottery.
- Worked Example + error+retry on Transparency.
- Letter-spacing residue removed from lowercase eyebrows.
- Drop shadows softened globally (sm/md/lg/soft tokens tuned for *minimal & clean*).
- VoterProfile hero dedup (ENS name once, not twice) + duplicate Anticapture link removed + Lottery PanelHeader prize pill removed.

### 9.1 Tier A — primitive additions (1.5 d)

Land before page work so page edits become small.

| Primitive | Specs | Consumers |
|---|---|---|
| `<LiveDot pulse>` shared | §1.1, §4.1, §5.1, §7.1 | Hero eyebrows, round meta |
| `<CopyChip>` (§2.9 P7) | §6.4 | RoundDetail methodology, Transparency contracts |
| `<SideDrawer>` (§2.9 P13) | §2.5, §8.4 | Voters Compare drawer, Transparency methodology drill |
| `<TierLadderRow>` extract | §1.4, §4.6 | Landing, Dashboard, Transparency drawer |
| `<ProcessSteps>` | §1.3 | Landing HowItWorks |
| `<DataStrip>` (flat row, no card) | §3.4 | VoterProfile rewards history |
| `<ContractLiveness>` | §8.3 | Transparency contracts |

### 9.2 Tier B — high-leverage page edits (3 d)

| Item | Section | Notes |
|---|---|---|
| Landing hero copy + LiveDot eyebrow | §1.1 | "Earn X% APR" verb-first; LiveDot replaces pilot eyebrow |
| Landing How It Works → `<ProcessSteps>` | §1.3 | One primitive change replaces 3 stacked cards |
| Landing CTA section: bridge to Transparency, not repeat hero | §1.5 | Drops the page-repeat |
| VoterProfile Active Since: drop primary, keep "Xy Ymo" only | §3.2 | Removes near-duplicate inside stat |
| Dashboard "This Round" callout: drop duplicated reward number | §4.4 | Per repeated-info audit |
| RoundsPage: surface address lookup above table + connected-wallet chip | §5.3 | Shared with Lottery affordance |
| Lottery hero: add LiveDot to current-round note | §7.1 | Tiny but signals *live* |
| Lottery AddressLookupForm: "Use connected wallet" chip | §7.2 | Shared affordance |
| Lottery NavigatorPanel: round breadcrumb | §7.3 | Faster keyboard nav |
| Lottery participants table: mobile Td[data-label] reflow | §7.4 | Port from RoundDetail |
| Lottery empty states: no-lottery + live-round variants | §7.5 | Reuse `EmptyState` |
| Transparency contract liveness probes | §8.3 | Pure viem `getCode` |
| Transparency Worked Example → real round data | §8.5 | api.round(latestPaidN) |

### 9.3 Tier C — RoundDetailPage methodology + recipients search (2 d)

Highest credibility-to-effort ratio (forum skeptics land here).

| Item | Section |
|---|---|
| Section reorder: Your Result → Overview → Methodology → Recipients → Lottery | §6.1, §6.5 |
| Methodology card (RANDAO seed CopyChip + Etherscan + GitHub) | §6.4 |
| Recipients-table search + auto-highlight + pagination | §6.5 |

### 9.4 Tier D — Tabs + All Winners + Compare drawer (3 d)

| Item | Section |
|---|---|
| Lottery: lightweight `<Tabs>` (Thorin or 2-button toggle fallback) | §7.4 |
| Lottery: All Winners tab table | §7.4 |
| Voters Compare drawer (bottom dock + side drawer + `useCompare()` URL hook + `/voters/compare` route) | §2.5 |
| Transparency methodology diagram (inline SVG, 4 nodes, click → SideDrawer with code link) | §8.4 |

### 9.5 Tier E — Deferred (backend gates)

Items blocked on BE asks per design doc §0.1.

| Item | Backend ask | Section |
|---|---|---|
| ProposalRow with title + vote on hover | BE-1 `/proposals?last=10` | §3.3 |
| VP / earnings sparklines | BE-2 `/voting-power-history` | §4.2 |
| Active-in-last-30d filter | BE-3 `lastVoteAt` on voters | §2.3 |
| Transparency hero sparklines | BE-4 `/stats/history` | §8.1 |
| Worked Example step 4 (caps redistributed) | BE-5 metadata | §8.5 |
| Lottery cross-round "Your lottery history" | BE-6 `/addresses/{addr}/lottery-history` | §7.2 |
| Recipients full search | BE-7 verify `rewardLimit=all` | §6.5 |

### 9.6 Estimated total

~9.5 days of FE work after primitives land. Phased so any phase can ship independently and the page is *strictly better* at each phase boundary.

---

## 10. Open questions for review

Before kicking off implementation, please confirm or redirect:

1. **Landing hero copy** — moving from "Your ENS could be earning X% APR" → "Earn X% APR on your ENS, automatically." Acceptable content tweak?
2. **CtaSection swap** — current bottom CTA repeats the hero. Replace with a Transparency bridge ("Want the math? See the methodology →") or delete the section entirely?
3. **VoterProfile Active Since** — keep only "Xy Ymo ago" + tooltip with absolute date, OR keep both lines?
4. **Lottery navigator round breadcrumb** — popover or inline dropdown? Or skip (rounds list does the same job)?
5. **All-winners tab on Lottery** — ship Tabs primitive, or first-pass with a `<SortControl>`-style toggle?
6. **Methodology diagram on Transparency** — invest in the inline-SVG + SideDrawer, or first-pass with an enhanced `StepList` + per-step "View source →" chips? (Diagram is the bigger lift but reads stronger to skeptics.)
7. **Worked Example** — pull a real recipient's numbers from `api.round(latestPaidN)`? Concerned about surfacing one person's payout publicly — acceptable if it's an ENS-named voter, or always anonymize to "Sample recipient"?
8. **Compare drawer for Voters** — confirm we want this in this iteration vs. defer? It's a new route + new primitive (`<SideDrawer>`).
