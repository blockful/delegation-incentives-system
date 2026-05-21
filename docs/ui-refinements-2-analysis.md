# UI Refinements — Deep UX Analysis

**Branch:** `ui-refinements-2`
**Scope:** Full frontend of the ENS Delegation Incentives Program. Layout, content, interaction, micro-state.
**References:** ens.domains, app.ens.domains, Thorin design system, ENS forum temp-check (#21824), Refero patterns (governance dashboards, rewards, distribution UIs, lottery, address-status).
**Skill applied:** `frontend-design` (interactive-first, no placeholders, brevity, tokens-only, ENS brand discipline).

---

## 0. North star — what the user actually wants on each page

Before per-page work, agree on the four user questions this product answers. Every section, copy line, and micro-interaction should answer one of these, or it shouldn't be on the page.

1. **"Am I earning, and how much?"** — concrete ENS this month, projected APR, tier I'm in, days left.
2. **"What do I need to do?"** — single next action: delegate, switch delegate, hold, claim, watch.
3. **"Why should I trust the numbers?"** — methodology made visible, contracts linkable, every figure traceable.
4. **"Did the lottery treat me fairly?"** — entry visible, odds visible, seed visible, outcome explained in plain English.

Pages today answer (1) partially, (3) abstractly, and (2) and (4) poorly. Most of the report below is closing those gaps.

---

## 1. Brand & system — match ENS without imitating

ENS landing is **navy/charcoal + electric blue + Inter, copy-led, aspirational**. ENS app (Thorin DS) is **light, generous whitespace, rounded soft shadows, accessible-first**.

Current project is closer to the app: light gradient hero, Satoshi, `#5298FF` accent, 8px radius. That's the right zone — keep the app pose, sharpen the discipline.

**Token-level changes:**

- `radius`: the current scheme is `8px` for sm/md/lg, which collapses hierarchy. Reintroduce a 3-step scale: `sm 6px / md 10px / lg 16px / pill 9999px`. Stat cards = `lg`, buttons = `pill` or `md`, pills/badges = `pill`. ENS app uses radius as a primary signal of "this is interactive" vs "this is static surface."
- `shadow`: today's `sm` (1px 3px) is invisible on light bg; `lg` is heavy. Replace with the Thorin pattern: a near-flat 1px border + a *very* soft 0 4px 24px shadow on hover/elevation. Borders carry hierarchy, shadows carry interaction.
- `color/surface` family: add a second neutral surface (e.g. `#FAFAFC` and `#F4F5F7`) so cards can sit on a recessed mat instead of pure white-on-white. Today every card is `#fff` on `#fff`, which kills depth.
- `color/status`: define `success / warning / pending / danger / neutral` as full token families (bg, border, fg) so the `tone-coded` panels stop being one-offs. Today `RoundDetailPage` already implements this ad-hoc with 6 tones — promote to tokens.
- `font/mono`: introduce one mono token (e.g. IBM Plex Mono or Geist Mono) used **only** for addresses, tx hashes, seeds, block numbers, ENS amounts in compact tables. This is how Thorin signals "machine value, copyable, verifiable" and matches the credibility move ENS apps make.
- `type-scale`: too wide today (14–52px in 12 steps). Cap to 8 sizes; reserve 44px+ for hero only. Footer/metadata should drop to `12–13px` (skill rule). Today the footer reads at body weight, competing with headings.

**Voice:**
ENS landing is aspirational ("Welcome to the New Internet"); ENS app is plainspoken-functional ("Your web3 username"). The incentives program sits in DAO-internal/serious territory — closer to the app than the landing. **Adopt plainspoken-functional, drop aspirational.** "Earn ENS by holding ENS" is more honest than "Your ENS could be earning X% APR." Forum stakeholders (nick.eth, clowes.eth) are skeptical of marketing framings — the UI shouldn't sound like it's selling them.

---

## 2. Page-by-page critique

### 2.1 LandingPage (`/`)

**What it tries to do today:** Pitch the program, show current round, show tiers, and link into the app.

**What's wrong:**

1. **Three wallet states render identically** (`DisconnectedLanding`, `ConnectedLanding`, `DelegatedLanding` are copies). This is the single biggest waste in the project — the user's most important context (am I connected? am I earning?) is invisible. A delegated user lands on a marketing page selling them something they already bought.
2. **Hero is generic gradient + 20 floating ENS particles.** Decorative noise. Particles are the canonical "this site doesn't know what to show, so it animates." A hero should carry one fact and one action; today it carries an aspirational claim and a particle storm.
3. **RoundStatusBar is a horizontal data-dump strip.** Pool size, VP growth, end date — laid out as four equal labels. No emphasis, no narrative ("we're in week 2 of round 3"), no urgency.
4. **TierTableSection is the entire reward model presented as a static 5-row table.** The user can't see themselves in it. No "you'd be here." No "you'd earn X."
5. **HowItWorksSection is unlabeled in the audit but very likely placeholder copy.** ENS forum stakeholders are confused about the mechanism; this section *has* to do real work and it's the weakest one.
6. **CtaSection is a final "Ready to delegate?" repeat.** Footer-CTA pattern works on marketing landings; here it shows up after the user has already seen two CTAs above, and points back to `/voters`. Cuttable.

**What the user wants here (by state):**

- **Disconnected** — "Show me the program in one breath, show me what I'd earn at my balance, get me to connect." Hero answers (1) and (4): *"Earn ~6.4% APR on idle ENS by delegating to active voters. Round 3 ends in 11 days."* + Connect Wallet CTA. Below the fold: the program in 3 cards (eligibility → tier → payout), the 5-tier table with a slider that previews "if you held X ENS, you'd earn Y this round," then a "How we calculate it" link to Transparency. **No second "ready to delegate?" CTA.** The slider IS the CTA.
- **Connected, not delegated** — Hero swaps to *"You hold 4,200 ENS. Delegate to start earning ~270 ENS / year."* + "Choose a delegate" primary action. Skip the entire pitch — you're past it. Below the fold: 5–8 recommended delegates (most-active, highest-VP, longest-track-record), each with a "Delegate" button (the same one that will live on VoterProfilePage). The landing becomes a delegate-picker for the user's specific balance.
- **Delegated** — Hero swaps to *"You're delegated to {ENS}. Estimated ~12.3 ENS this round."* + "Open dashboard" primary action. Below: round progress strip, next payout date, link to *their* delegate's voting record. The landing becomes a mini-dashboard.

This is the most leveraged change in the report. The current "one page, three identical bodies" pattern is throwing away the wallet state you spent code wiring up.

**Micro-interactions to add:**
- Tier table: **balance slider** at top (1k–100k ENS). As the user drags, current tier row glows and APR label updates live. Mobile = stepped buttons (1k, 10k, 50k, 100k). The number on the hero updates with the slider — single source of truth.
- Round status: **subtle progress ring around "Round 3 ends in 11 days"** that fills as the round progresses. Tooltip on hover: exact start/end UTC. Pulse only when <48h remain.
- Particles → remove. Replace with a single static brandmark or, if you want motion, a slow VP-growth-line that crawls left-to-right behind the hero (real data, real metaphor).

---

### 2.2 DashboardPage (`/dashboard`)

**What it tries to do today:** Show the connected user their estimated reward, round status, lottery banner, and reward tiers.

**What's wrong:**

1. **EarningsStrip leads with two big numbers (monthly ENS + APR) but no story.** No "this is +1.2 ENS from last round" or "you're in tier 3 of 5." A number without a comparator is hard to interpret.
2. **Delegate avatar in EarningsStrip has no "why am I seeing this?" context.** A new user sees a face and doesn't know if that's them, their delegate, or a random voter.
3. **Lottery banner only appears if `qualifiesForLottery`.** Users who don't qualify see no explanation. They might be a tier-2 user wondering why they're not in the lottery — the answer ("your payout is above the 1 ENS threshold, you get direct payout") should be in the dashboard, not hidden behind a flag.
4. **RewardTiers section is the same static 5-row table from the landing.** No personalization here either. The dashboard is the one place where the user's tier should be obvious and animate.
5. **No "what changes next" panel.** The user sees a current state but no forecast: "if you held this until next round, you'd be in tier 4." That's the reason to *not sell* their ENS, and it should be prominent.
6. **No recent history.** Dashboard skips past rounds; the user has to navigate to Rounds to see what they earned last time. A 3-card horizontal scroll of past rounds with mini-payouts answers (1) much better than the round-progress card alone.

**What the user wants here:**

- **Hero strip**: "You earned X ENS this round (so far)." Plus a delta to last round. Plus the projected end-of-round number (with a tooltip explaining estimation).
- **Tier progress**: Not a 5-row table — a horizontal **tier ladder** with the user's tier highlighted and an indicator showing how much more ENS they'd need to delegate/hold to climb one rung. ("+1,800 ENS to tier 4 — ~+34 ENS / round.")
- **Delegate card**: The avatar + name + VP + their last-10 voting record (the proposal bars used on VoterProfilePage). Plus "Change delegate" secondary link. A user can't trust someone they can't see vote.
- **Round status panel** (single card, replacing the 3×1 stat grid): days remaining + a fat progress bar + the next payout date + a tiny "What happens on payout day?" inline help link.
- **Lottery panel** (always present): if qualifying, "You're in pool #4 with 3.2% odds of winning ~10 ENS." If not, "Your payout is direct (>1 ENS), no lottery." Reframes lottery from "either visible or not" to "everyone sees their relationship to it." Removes user confusion.
- **Past rounds strip**: horizontal cards. "Round 1: 12.4 ENS · Round 2: 14.1 ENS · Round 3: (in progress)." Click → RoundDetail.

**Micro-interactions:**
- EarningsStrip number: **count-up animation** from 0 on mount (300ms, `prefers-reduced-motion` respected). Anchors the moment.
- Tier ladder: hover/tap any tier to preview that tier's APR overlaid on the hero. Releasing snaps back to your tier.
- Delegate card: hover their avatar → tooltip with their address + a "Open profile" link. Whole card clickable to `/voters/:address`.
- "Change delegate" link: opens a soft modal with the 5 highest-activity voters and a "Search all" link. Don't make the user navigate away to swap.
- Past-rounds strip: scroll-snap, with a tiny "+ N more" tail card that scrolls to `/rounds`.

---

### 2.3 VotersPage (`/voters`)

**What it tries to do today:** Help a user pick a delegate. Sort by Random/VP/Activity/Active-Since, with a Shuffle button.

**What's wrong:**

1. **Default sort is Random + a Shuffle button.** Random is fine as a fairness default, but shuffle is redundant — every reload reshuffles. It also signals indecision: the page can't decide what to recommend. Remove the shuffle button, keep random as default, add a small "fairness: order randomized" note.
2. **VoterCard shows raw stats (VP, votes, active-since) but NOT the most important thing: how much would I earn if I delegated to them.** The whole product is about rewards. Every card should show: "Delegate ~6.1% APR · earns lottery-bucket / direct payouts."
3. **No filters for the actual decision the user is making.** Filters they need: "active in last 30 days," "voted yes on proposal X," "Brazilian/EU/US," "low VP (long-tail candidates)," "small delegate count (you'd be a meaningful delegator)." Sort alone is too thin.
4. **No comparison.** Pick-3-and-compare is the canonical pattern for delegate-picker UIs. Add a "compare" multi-select that opens a side-by-side drawer.
5. **StatsBar shows 3 numbers (active voters, total delegated, holders earning) but they're not actionable.** They're trivia. Either tie them to the user ("you'd join 1,247 holders earning this round") or shrink them dramatically.

**What the user wants here:**

- **Header strip** with one sentence: *"Pick a voter who shows up. Active = 7 of last 10 proposals."*
- **Filter rail** (left on desktop, top sheet on mobile): activity recency, language/region (if data exists), VP range, accepts-new-delegators flag.
- **Card content**: avatar + ENS · last 10 proposals (proposal bars) · "you'd earn ~X ENS / round if you delegate now" computed from the connected user's balance (or a placeholder of "delegate to see your APR" if disconnected) · "delegate" button (live or "connect wallet first").
- **Compare drawer**: 2–3 selected voters side-by-side with the same fields, plus a side-by-side proposal bar grid so you can see vote alignment.

**Micro-interactions:**
- Cards: stagger fade-in (already implemented) — keep, but reduce stagger to 0.02s, not 0.04s, and cap at 6 cards. Stagger is most effective for hero moments, not for a 100-card list.
- Proposal bars: hover any bar → tooltip with proposal title, vote (For/Against/Abstain), date. This was likely intended but not implemented.
- Filter chips: animated count-down beside each ("Active in last 30 days · 47" → "23" as you add more filters). Live feedback proves the filter did something.
- "You'd earn" number: recomputes when the user changes balance via the slider on the landing (carried in URL state).

---

### 2.4 VoterProfilePage (`/voters/:address`)

**What it tries to do today:** Show a voter's profile (avatar, VP, holders, last-10, active-since) and offer a "Delegate" button.

**What's wrong:**

1. **The "Delegate" button is a stub — it has no handler.** This is the single most important conversion action in the product. The skill (`frontend-design`) is explicit: "no dummy buttons that do nothing." Either wire it (gas-sponsored relayer call) or hide the button and link out to `app.ens.domains` with the delegate parameter pre-filled.
2. **"Gas sponsored" copy is in the button.** Powerful trust signal — but unverifiable today. If the relayer exists, surface the gas-sponsorship in a tooltip with the relayer contract address.
3. **Voting Record shows yes/no/abstain on 10 proposals but no titles, no dates, no themes.** "They voted on proposals" answers a yes/no question; the user wants "what did they vote ON." Pull proposal title + date + their vote, link to Snapshot/Tally/Anticapture.
4. **"Active Since" card disappears if data missing.** Cards shouldn't disappear silently — show "Joined ENS governance: unknown" or hide the slot entirely without leaving a layout gap.
5. **External "Anticapture" link is buried at the bottom.** Anticapture *is* the governance profile reference; promote it above the fold as a secondary action ("Full governance profile ↗") or eat the data via API.
6. **No "people who delegate to them" or "delegated supply growth" chart.** Both signal quality. Most active delegate UIs (Tally, Boardroom) show a small VP-over-time sparkline.

**What the user wants here:**

- **Hero card**: avatar + ENS/address + the one-line voting credo (if the delegate publishes one — many do on Tally/Boardroom). Big "Delegate to {name}" button with the projected APR baked into the button copy.
- **Voting record card**: not 10 anonymous bars — a vertical mini-list of the last 10 proposals: title (truncated), their vote (For/Against/Abstain with color), date. Click any → external proposal link. The proposal bars become labeled and clickable, not decorative.
- **Stats grid**: VP, # of delegators, time-weighted VP last 30 days (more meaningful than "active since"), participation %.
- **VP over time**: a 14-day sparkline. Source from the same balance/delegation events the backend already indexes.
- **Risk/note panel** (small): "1.0% delegate cap applies in current pool. Excess redistributed pro-rata." Just so a power user delegating to a top-VP delegate isn't surprised by their projection.

**Micro-interactions:**
- "Delegate" button: hover → preview tooltip *"Estimated APR for your balance: 6.1%."* Click → wagmi-driven transaction (or relayer post). Loading state. Success state: button morphs to "Delegated · 6.1% APR" with a check icon, and the page redirects to dashboard after 1.5s with a celebration toast.
- Avatar: copy-to-clipboard the address on click of the address text. Toast: "Copied 0x1234…cdef."
- Proposal bars: each is a button focusable on tab; pressing enter opens the proposal page.
- VP sparkline: hover to scrub, value+date in a follow-cursor tooltip.

---

### 2.5 RoundsPage (`/rounds`)

**What it tries to do today:** Show the current round, history table, tier table, and address-lookup form.

**What's wrong:**

1. **Address lookup is the page's primary action but lives below the title with no onboarding.** What should a first-time user type? Their address? An ENS name? "Try `nick.eth`" or "Use your connected wallet" should be inline. Connect-and-lookup should be a *single* button if the user is connected.
2. **History table has a `VP Growth` column with no context.** "8.3%" means very different things to a forum reader vs. a new user. Add a footnote chip ("vs. previous round") and a sparkline visualization of growth across all rounds shown.
3. **"Your Rewards" column shows "Unavailable" for addresses with no history.** Easy to misread as broken. Replace with "Not eligible this round" or "0 ENS — held below threshold" with a contextual tooltip.
4. **Right-column tier table is identical to landing/dashboard.** Cut it here — Rounds is the wrong page for static tier data. Replace with a "Lottery snapshot" card (this round's pool count, total winners so far, link to LotteryPage).
5. **Mobile reflow uses `Td[data-label]` pseudo-element pattern** (clever) **but loses the rank/round-number visual hierarchy.** Round cards on mobile, not reflowed table.

**What the user wants here:**

- **Header**: "Round 3 in progress" with a fat status pill, days-remaining, and a tiny pool-fill mini-bar showing distributed vs. remaining.
- **Lookup card**: full-width, prominent. Default value = connected wallet. Search button → lookup, Clear button → revert to connected wallet. Inline error text below the input, not in a popup.
- **Current round panel**: pool size with mini doughnut (distributed/lottery/remaining), tier breakdown of recipients (how many in tier 1, 2, 3, etc.), live count of "wallets currently earning."
- **History list** (rounds 1 → current, newest first): each row is **two-tier**: round number + dates + status + your reward in big number ON TOP; pool size + VP growth + winners count in small under-stats. Click → RoundDetail.
- **Lottery snapshot** (sidebar or below history): "Round 3 lottery: 47 pools · 12 winners drawn so far." Link to LotteryPage filtered to current round.

**Micro-interactions:**
- Lookup: paste an ENS name → resolve animation (subtle spinner inside input), then chip appears with the resolved 0x address. Tab-completion-like behavior.
- Round row hover: faintly elevate, show a "View details →" hint on right. Click anywhere on the row.
- Status pill: `live` should pulse subtly (already implemented); `paid` should show a tiny check icon; `pending` should show an hourglass. The visual gives status without reading the word.
- Doughnut on current-round panel: slow rotation on mount (300ms ease), then static. Hover any slice → label + amount tooltip.

---

### 2.6 RoundDetailPage (`/rounds/:roundNumber`)

**What it tries to do today:** Show round summary, address lottery insight, lottery results, buckets table, entries table, top 25 voter rewards, top 25 token holder rewards.

This is the densest page and the one with the most stakeholder-facing reputation risk (forum stakeholders skeptical of the lottery's fairness will land here to inspect). Treat it like an audit page — facts, methodology, sources.

**What's wrong:**

1. **Section ordering optimizes for engineers, not users.** Today: summary → address lottery → lottery metadata → buckets → entries → voter rewards → token holder rewards. **A user wants:** my outcome → why this outcome → the broader round → verification. Reorder to: "Your result" (the insight panel) → "Round overview" (summary + total payouts) → "How it was decided" (lottery methodology + seed) → "All recipients" (the two reward tables) → "Lottery transparency" (buckets + entries, collapsible).
2. **AddressLotteryInsightPanel uses 6 distinct tones (neutral/success/warning/pending/error) but the copy patterns repeat.** The 6 tones imply 6 distinct user states; today the copy says "metrics show X" in slightly different wording. Define explicit user-facing wording per state — verbatim, in design copy, not derived in code.
3. **Lottery seed is a 64-char hex with no plain-English explanation.** The skill rule (verify, then explain): "Seed: 0x9f3a... · Source: Ethereum block 18,234,789 RANDAO · [Verify on Etherscan ↗]." Without that line, the seed reads like decoration.
4. **Top 25 reward tables stop at 25.** A user not in the top 25 has no path to find themselves. Either expand to "show all" (paginated) or add a "Find me / find an address" jump above the table. Address lookup at the top of the page should also scroll this table to the matching row.
5. **Bucket table doesn't communicate the *odds* visually.** A column says "Winner's chance 4.2%" — that's a fact, not a story. Show the bucket as a 100-slot grid or a horizontal stacked bar where slots ≈ proportional entries; highlight the winner's slot. That's what makes the lottery feel fair.
6. **Entries table is capped at 100 rows with a note "use address inspector for exact wallet participation."** That's an admission of incompleteness. Add a search input above the entries table that searches the full server-side list, not just the 100 loaded.
7. **"Algorithm" field shows up as a string.** It should be a link to the on-chain function or the source file in `packages/domain/src/lottery.ts`. The forum thread specifically asks for verifiability — surface it.

**What the user wants here:**

- **Your result card** (top of page when address present): plain-English sentence first, then metrics. "*You entered Pool #14 with 3 entries (8.1% odds). You did not win this round. Better odds next round if your balance stays the same.*" The same panel covers all 6 tones with copy explicitly written per state.
- **Round overview**: distributed total, # of recipients in each category (voters / delegators / token holders), how the pool was sized (with a "+18% VP growth tier" badge and a tooltip linking to the tier table).
- **Methodology card**: 4 short bullets — eligibility, balance window (180 days), pool sizing rule, lottery rule — plus the seed line with Etherscan link.
- **Recipients tables**: searchable by ENS/address, with the connected wallet auto-highlighted if present. "Show 25 / 100 / all" pagination control. Copy buttons on every address.
- **Lottery transparency** (collapsed by default): bucket list + entries. Open one bucket → see the slot grid, the winning slot highlighted, RANDAO-seeded jump animation on first view.

**Micro-interactions:**
- "Your result" tone panel: on first mount, the tone color washes in (200ms), and if `won`, a single confetti burst (respect `prefers-reduced-motion`).
- Bucket slot grid: hovering any slot shows "Address X · weight Y." Winning slot has a small "🏆" badge (or a check) and a permanent border.
- Seed: click to copy. Tiny check animation on copy. Hover → "RANDAO from block #..." tooltip.
- Recipient table rows: click to expand inline detail (their address, their delegator count, their tier, link to their VoterProfile). No navigation away.
- Previous/Next round arrows: keyboard accessible (left/right arrow keys), animate slide transition between rounds.

---

### 2.7 LotteryPage (`/lottery`)

**What it tries to do today:** Address status + round/bucket explorer. Pick a round, pick a bucket, inspect.

**What's wrong:**

1. **The page is a tool, not a story.** A first-time visitor sees a navigator and a status panel with no clear "what is this page for." Add a one-line lead: *"Sub-1-ENS payouts get pooled and won by lottery. Inspect any round here."*
2. **Bucket selector is a scrollable list (max 340px) with no auto-jump.** A round can have ~47 buckets; users land and don't know which one matters. Auto-select the connected wallet's bucket (if any). Pin the user's bucket at top of the list with a "you" tag.
3. **No "all winners this round" view.** The page forces drilling into one bucket at a time. Add a "Winners summary" tab that lists every winner in the round (bucket #, ENS prize, address, ENS name). This is what most users actually want.
4. **Participant table per bucket: scrolls at 360px, no mobile reflow.** Other pages reflowed; this one didn't. Inconsistent.
5. **No graphic representation of the lottery itself.** A spinning wheel is a cliché but works — even a static "slot strip" with the winner highlighted communicates 10× faster than a chance percentage.
6. **No notion of "you could win up to 10 ENS."** That's the program's headline incentive for tier-1 holders and it's missing from the dedicated lottery page.

**What the user wants here:**

- **Lead paragraph**: 2 short sentences. What it does. Why it exists (gas vs. micro-payouts trade-off).
- **Address status card**: same shape as RoundDetail's "Your result" — but here it shows the user's lottery history across all rounds. "You've entered 3 lotteries. Won 1 (Round 1: 9.4 ENS). Total entries: 7."
- **Round + Bucket selector**: combine into one breadcrumb at the top. "Round 3 → Pool 14 (yours)" with quick-prev/quick-next. Bucket list still available below for browsing.
- **Bucket detail**: slot grid (the visual recommendation from RoundDetail), winner badge, methodology recap, link to "see all winners this round."
- **All winners view** (a second tab): table of every winning bucket in the round.

**Micro-interactions:**
- Slot grid: on bucket open, slots fade in with a sequential left-to-right cascade (50ms total, 5ms per slot). On larger buckets, only 100 slot indicators rendered with "+ N more" tail.
- "You" tag on user's bucket: small chip on the bucket row with a soft glow. Tooltip on hover: "You entered this pool with N entries."
- "Previous/next round" arrows: keyboard nav. State persists in URL.
- Search within entries: live filter, debounced 200ms.
- Empty state ("no lottery data for round"): not silent — render an illustration + explainer (e.g. "Round 3 lottery runs after the round ends. Check back in 4 days.").

---

### 2.8 TransparencyPage (`/transparency`)

**What it tries to do today:** Link to GitHub/Anticapture/Dune, list smart contracts, show live data stats, explain the reward calculation.

**What's wrong:**

1. **"Live data stats" silently fails on error.** No retry, no fallback copy, just a permanent skeleton. A transparency page that can't load data damages the credibility it's trying to build. Add an error state with retry + a status-page-style banner.
2. **Smart contract section is 3 link cards.** Useful, but cold. Add the contract source code expansion (read-only diff or read-only call?) inline, or at minimum a "Last deployed block" + "Last upgrade" line so the user knows the contracts are alive.
3. **StepList for "How rewards are calculated" is text, no visuals.** This is the section that exists to satisfy forum stakeholders' "we don't understand the mechanism" objection — and it's three text bullets. Should be: a diagram (input → snapshot → tier → pool → distribution → lottery) with a worked example anchored to a specific round.
4. **The 180-day moving average is mentioned but not shown.** Could be a sparkline of total delegated supply over the last 180 days. That answers the most common skeptic question ("are we even measuring growth or just snapshotting the peak?").
5. **Section title `Round X · Program Data` is hardcoded to a `CURRENT_ROUND` constant, not dynamic.** Silently misleading after round changes.

**What the user wants here:**

- **Hero**: "Verify the program." Three live counters (active voters, ENS delegated, ENS distributed all-time) with sparklines.
- **Methodology section**: a real diagram. SVG or Mermaid-rendered. Eligibility → 180-day TWAP → tier assignment → pool sizing → split (10/90) → distribution → lottery. Each node clickable for "see the code" (links to `packages/domain/src/<file>.ts` on GitHub).
- **Contracts**: 3 cards as today, but with on-chain liveness (read a public view function, show its value live: e.g. `currentRoundNumber()` returns `3`). Proves the contracts aren't just deployed but reachable.
- **Worked example**: pick a real round, walk through the math with real numbers. "Round 2: pool sized at 8,000 ENS (10–20% growth tier). 800 ENS to delegates (10%), 7,200 to delegators (90%). 1,247 delegators eligible. After caps, top recipient got 76 ENS. Lottery pooled 142 sub-1-ENS amounts into 15 buckets of ~9.5 ENS each."
- **Data downloads**: CSV / JSON download links for every round's raw data. Power users (researchers, the forum critics) will appreciate this.

**Micro-interactions:**
- Live counters: count-up on first scroll into view.
- Diagram: hover each node → highlight downstream nodes + show inline definition. Click node → opens a side drawer with the formula and the GitHub link.
- Worked example: scroll-snap card carousel showing each step's calculation.

---

## 3. Cross-cutting micro-interaction list

Apply across the app, not page-by-page:

- **Address rendering**: one component, `<Address value={...} truncate ens copyable />`. Truncates as `0x1234…cdef` on mobile, full on desktop hover. Click → copy + toast. ENS resolution inline with a tiny ENS leaf icon when available.
- **ENS amount rendering**: one component, `<EnsAmount value={...} />`. Always formats to 3 sig figs ≤999, "1.2K" / "1.2M" beyond. Mono font for the digit, regular for the "ENS" suffix. Click → toggle full precision.
- **Loading states**: replace generic spinners with content-aware skeletons (existing `PageSkeletons.tsx` is a good start). Keep them lit ≥600ms even if the API is fast — avoids skeleton flicker.
- **Empty states**: always include an illustration (or icon) + a one-line explainer + a one-action CTA. Never a bare "No data."
- **Error states**: always have a retry. Always identify *which* call failed (don't conflate "couldn't load round" with "couldn't load wallet status").
- **Toasts**: top-right, auto-dismiss 3s, click-to-dismiss. Use for copy-to-clipboard, transaction submitted, delegation confirmed, errors.
- **Wallet state changes**: animate transitions between disconnected/connected/delegated states in the header (avatar fade-in, chip transform). The connection moment is the most important event in the product — it should feel like a moment.
- **Focus-visible**: every interactive element. Test by tabbing through every page; if you lose your focus indicator, that's the bug.
- **Reduced motion**: every count-up, every confetti, every slide — gated on `prefers-reduced-motion: no-preference`.
- **Mono for machine values only**: addresses, hashes, seeds, block numbers, exact ENS amounts in tables. Not for body text, not for headings.
- **Tooltips**: every metric label with a definition. "VP Growth" → "Change in total delegated voting power vs. previous round." Don't make the user navigate to Transparency just to understand a column header.
- **Sticky table headers**: on history tables, lottery tables, recipient tables. Long scrolls without sticky headers lose the user.

---

## 4. Prioritized roadmap

If we can only do half of this in `ui-refinements-2`, do these:

**P0 — visible from the landing in 5 seconds:**
1. Differentiate Landing's 3 wallet states. (Section 2.1.)
2. Wire or hide the "Delegate" button on VoterProfile. (Section 2.4.1.) — dummy buttons violate the skill's strictest rule.
3. Personalize the tier table (slider on landing + ladder on dashboard). (Sections 2.1, 2.2.)
4. Show every user their lottery status (qualified or not). (Section 2.2.3.)

**P1 — credibility and the "fair / not fair" lottery story:**
5. Reorder RoundDetailPage and rewrite the 6 tone copies. (Section 2.6.)
6. Add seed verification line with Etherscan link. (Section 2.6.3.)
7. Add bucket slot-grid visualization. (Section 2.6.5.)
8. Replace TransparencyPage's StepList with a real diagram + worked example. (Section 2.8.)

**P2 — picker quality:**
9. Add filters to VotersPage + "you'd earn ~X" on every VoterCard. (Section 2.3.)
10. Add proposal titles and dates to VoterProfile's voting record. (Section 2.4.3.)
11. Add search/jump within RoundDetail recipient tables. (Section 2.6.4.)

**P3 — polish:**
12. Token-level shadow/radius/surface refactor. (Section 1.)
13. Mono token + global `<Address>` / `<EnsAmount>` components. (Section 3.)
14. Cross-cutting micro-interaction pass (focus, reduced-motion, sticky headers, toasts).

---

## 5. What NOT to do

A few directions that feel intuitive but would hurt the project:

- **Don't add a leaderboard of top earners.** The forum thread explicitly flags "mercenary participation" as a risk. Surfacing top earners encourages farming and signals the wrong incentive. Show *typical* earnings (median), not max.
- **Don't gamify the lottery.** A "spin the wheel" interaction is tempting, but the program is being defended on the forum as serious governance infrastructure. Visualize odds clearly, don't theatricalize them.
- **Don't auto-promote "Change delegate" CTAs aggressively.** The program's success metric includes *stickiness*. Don't engineer a delegate-swapping pattern that churns the metric you're trying to grow.
- **Don't replicate the ENS landing's aspirational voice ("Welcome to the new internet").** Wrong audience. This is governance infrastructure for a skeptical forum. Plainspoken-functional only.
- **Don't add a dark mode in this branch.** Out of scope, doubles design QA. If you must, do it after P0/P1 ship.

---

## 6. Open questions for product / design alignment

1. **Is there a relayer for gas-sponsored delegation?** Drives whether the VoterProfile button is real or a deep link to `app.ens.domains`.
2. **Does the API expose proposal titles + dates?** If not, we need an Anticapture or Snapshot fallback.
3. **What's the canonical balance value at any moment** — current on-chain, 180-day TWAP, or the most recent snapshot? UI numbers should be labeled with their freshness.
4. **Is "Holders Earning" the same metric as "Wallets in this round's distribution"?** If yes, rename consistently. If no, the dashboard needs both.
5. **Can the dashboard show *forecasted* APR for "if you don't change anything"?** That's the strongest "hold" signal, but it requires a forecast endpoint.
6. **Pilot end-of-program UX?** What happens to this UI after round 3 if Snapshot vote doesn't approve continuation? Plan a graceful "pilot complete" surface, even if it's "we'll add it later."
