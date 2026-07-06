# Incentives v2 — Alignment Matchmaking

Conception, flow, and design decisions for the v2 matchmaking feature. Holders and delegates rank the same 5 protocol values; a similarity score sorts the voters list, drives per-card status lines, and powers a dumbbell comparison on profiles.

This doc covers conception and UX. Backend and algorithm are out of scope.

---

## Unified architecture

**One ranking action. One flow. Role variations are copy-only.**

- The 5-value ranking is a single user action. Holder, delegate, or both — you rank once.
- The flow is the same for everyone. Only the **pitch and confirm modal copy** change by role; the shell, illustration, and mechanics are shared.
- `/voters` is **NOT** gated anymore. Anyone can browse the list — ranked or unranked. Match-related surfaces degrade gracefully when the viewer hasn't ranked or when the displayed delegate hasn't ranked.
- A delegate who hasn't ranked gets layered nudges on top of the same browsable `/voters` — own card highlighted, dashboard callout, own-profile callout.
- The moment they rank, every surface resolves: voter cards switch from placeholder to match chips, the dumbbell comparison appears on profiles, the dashboard switches to post-rank.

The mechanics are unified. The pitch and confirm copy are role-split. Everything else is shared.

---

## The 5 values (strawman, team to finalize)

Each ranked card shows: **name + icon + "even when X" trade-off description.** The "even when" clause forces a real trade-off — a value without an opposing cost is fluff.

1. 🛡️ **Security** — *Audits, slow upgrades, conservative defaults. Even when it means moving slower than the competition.*
2. 💰 **Cost efficiency** — *Spending the treasury frugally, keeping operations lean. Even when bigger investments could pay off.*
3. 🌱 **Growth investment** — *Funding new projects and ecosystem expansion. Even when it draws down the treasury faster.*
4. 🌐 **Decentralization** *(placeholder)* — *Keeping decisions distributed across the community. Even when it slows everything down.*
5. 🏛️ **Public goods funding** *(placeholder)* — *Supporting projects that benefit ENS users broadly. Even when they don't grow protocol revenue.*

Decentralization and Public goods funding are placeholders pending the team workshop. Selection criterion: each value must create a real pairwise tension with at least two others, so ranking forces a meaningful choice.

---

## The ranking modal

**Same shell. Same illustration. Same step indicator. Same Rank and Edit modals.** The only difference between holder and delegate flows is the copy on Pitch and Confirm.

### Pitch — holder context

> **Find delegates who share your priorities**
> Rank 5 protocol values from most to least important to you.
> We'll match you with delegates who align with how you'd vote.
> *~30 seconds. You can change this anytime.*
>
> `[Not now]` `[Rank values]`

### Pitch — delegate context

> **Tell holders what you stand for**
> Holders are looking for delegates who share their priorities. Rank these 5 values from most to least important to you. Your ranking becomes part of your public profile.
> *~30 seconds. You can change this anytime.*
>
> `[Not now]` `[Rank values]`

### Rank (shared)

5 drag-to-reorder cards, pre-shuffled. Each card: rank badge · drag handle · icon · value name · one-line trade-off description. Mobile fallback: up/down arrows. Helper microcopy: *"Drag to reorder. You can change this anytime."*

`[Back]` `[Submit]`

### Confirm — holder context

> ✓ **Your priorities are set**
> Voters list now sorted by your matches.
> *(if score ≥ 80%)* N delegates closely match you.
>
> `[View matches]` `[Done]`

### Confirm — delegate context

> ✓ **You're all set**
> Your values are now on your public profile.
> *(if score ≥ 80%)* N holders match your priorities so far.
>
> `[View my profile]` `[Done]`

The count line is shown only when there's a ≥80% match to report. Below threshold, the line is hidden — no notification promise, no "you're early" message.

### Edit Ranking (shared, role-agnostic)

Same 5-card drag-to-reorder UI, prefilled with the user's saved ranking. Entered from:
- Dashboard "Edit values →" link
- Own profile "Edit values" affordance (when ranked)

`[Cancel]` `[Save]`

---

## /voters list — three states

`/voters` is the matchmaking hub. It always renders. Match-related slots degrade based on viewer state.

### State A — Viewer is ranked (unblocked)

- Cards sorted by match % descending
- Per-card status line uses the **3-variant pattern**:
  - **Strong match** (score ≥ 80%) — green star · "Strong match with your values"
  - **Themed match** (score < 80%, delegate has ranked) — top-value icon · "Prioritizes [top value]"
  - **Didn't rank yet** (delegate has not ranked) — neutral · "Delegate didn't rank priorities" with alignment shown as `—`
- Sort default: match % desc, with unranked cards at the bottom

### State B — Viewer hasn't ranked (degraded, NOT blocked)

This is the new behavior. The hard-lock is gone.

- Page renders fully — all voter cards visible, all stats readable
- **Inline banner** at the top of the page: *"Want to see how delegates match you?"* + `Rank your values →` CTA (matches the Banner / Unlock matchmaking component at `5584:9860`)
- **Match column shows `?`** in the cards' stats area
- **Per-card status line** reads *"Rank to see your match"* on cards where the delegate IS ranked
- **Cards where delegate didn't rank** still show *"Delegate didn't rank priorities"* with `—` alignment
- Sort: voting power desc (default) until the viewer ranks; no match-based sort possible

### State C — Legacy hard-lock (archived)

The hard-lock blocked variant (`5468:12212`) is preserved in the Figma file for reference but is **NOT shipped**. Superseded by State B.

---

## Voter card — 3 status-line variants

Card shell is identical across states. Only the bottom **status line** and the **Match cell** change.

| Card variant | Trigger | Match cell | Status line |
|---|---|---|---|
| Strong match | viewer ranked + delegate ranked + score ≥ 80% | `82%` | ⭐ Strong match with your values |
| Themed match | viewer ranked + delegate ranked + score < 80% | `64%` | 🌱 Prioritizes Growth investment |
| Didn't rank yet | viewer ranked + delegate NOT ranked | `—` | Delegate didn't rank priorities |
| Viewer hasn't ranked | viewer NOT ranked | `?` | Rank to see your match |
| **Own card (delegate viewing /voters, hasn't ranked)** | wallet === card address + own ranking missing | `—` | Set your values → |

The bootstrap data-sparsity problem from v1 is now handled inline on each card, not by gating the whole page.

---

## Delegate profile (Voter Detail)

State depends on (a) whether the viewer is the delegate, (b) whether the viewer has ranked, (c) whether the delegate has ranked.

| Scenario | Header CTA | Values card | Edit affordance |
|---|---|---|---|
| Visitor not logged in | "Connect wallet" | None (delegate ranked) or None (delegate unranked) | none |
| Visitor logged in, viewer NOT ranked, delegate ranked | "Delegate and earn" | Show delegate's ranked list + soft prompt to rank to see comparison | none |
| Visitor logged in, viewer NOT ranked, delegate NOT ranked | "Delegate and earn" | None | none |
| Visitor logged in, viewer ranked, delegate ranked | "Delegate and earn" | **Dumbbell comparison** + "N% match with your priorities" pill | none |
| Visitor logged in, viewer ranked, delegate NOT ranked | "Delegate and earn" | Empty state — "This delegate hasn't ranked their priorities" | none |
| **Own profile, ranked** | (own-profile UI) | Show own ranking | **"Edit values" link** (opens Edit Ranking modal) |
| **Own profile, NOT ranked** | (own-profile UI) | **"Profile is missing values" callout** + Complete profile CTA | (CTA opens Pitch modal) |

The dumbbell comparison shows both rankings on a 1–5 axis with per-row chips: `aligned` (green check), `↑N` (orange up-delta), `↓N` (red down-delta).

**Open design item:** the own-profile "Profile is missing values" callout is documented here but not yet designed as a profile-page surface (the equivalent exists only on the Dashboard at `5534:11513`). New surface needed before handoff.

---

## Dashboard

| State | Node | Content |
|---|---|---|
| Pre-rank (delegate nudge) | `5534:11513` | "Your profile is missing values" callout + "Complete profile" CTA. Delegate-only — holders see no Dashboard matchmaking surface pre-rank. |
| Post-rank (universal) | `5534:10750` | Values card showing the user's ranked 5 + "Edit values →" link (opens Edit Ranking modal). Same UI for holders and delegates. |

Holder rankings are private (visible only to the holder). Delegate rankings are public (appear on their profile).

---

## Direct profile link — soft entry

If someone arrives on `/voters/:address` via a shared URL without having ranked, the profile renders normally per the matrix above. There is no gate.

An inline banner at the top of the page offers the upgrade — same banner component used on the /voters degraded state. Direct-link visitors are research-mode; we don't gate that.

---

## Flow narrative

The decision tree is the same for both roles. Differences are noted inline.

1. **Wallet check.**
   - Not connected → browse-only. /voters and profiles render in State B / "not logged in". No modal trigger.
   - Connected → step 2.
2. **Ranked check.**
   - Ranked → /voters in State A. Dashboard post-rank. Profile shows comparison.
   - Not ranked → Pitch modal opens once per fresh session.
     - Holder context → Pitch (holder copy)
     - Delegate context (wallet is an active delegate) → Pitch (delegate copy)
3. **Path A — "Rank values."**
   - Pitch → Rank → Confirm (matching role) → "View matches" (holder) or "View my profile" (delegate) → resolved state.
4. **Path B — "Not now."**
   - Modal closes. User browses freely in degraded state. Re-engagement nudges:
     - **A.** Re-modal on next fresh session
     - **B.** Inline banner on /voters and on visited profiles
     - **C.** Dashboard pre-rank callout (delegates only)
     - **D.** Own-card "Set your values →" CTA on /voters (delegates only, when own card is in the list)
     - **E.** Own-profile "Profile is missing values" callout (delegates only)
5. **Edit loop (post-rank).**
   - Dashboard "Edit values →" OR own-profile "Edit values" → Edit Ranking modal (prefilled) → Save → back to entry.

---

## Architecture decisions locked

- **Unified single-ranking action** — one ranking serves both roles.
- **Role-split pitch and confirm copy only** — same shells, two copy variants each. Rank and Edit Ranking modals are shared.
- **No /voters gate** — the page always renders. Match surfaces degrade inline.
- **3-variant voter card status line** — Strong match / Themed match / Didn't rank yet, with the additional "Rank to see your match" placeholder when viewer is unranked.
- **Confirm count line threshold: score ≥ 80%** (replaces the earlier "≥ 5 count" rule).
- **Edit-values affordance lives on Dashboard AND own profile** — both entry points open the same Edit Ranking modal.
- **Own-profile "Profile is missing values" callout** — mirrors the Dashboard pre-rank callout when the user views their own profile unranked. *(new surface, not yet designed)*
- **Home page is OUT OF SCOPE** — no matchmaking surfaces on Home.
- **Bootstrap is inline, not gated** — day-one cards will be mostly "Didn't rank yet" / "Rank to see your match"; the list is never locked.

---

## Deliberately deferred

- Match algorithm (backend concern; UX assumes a 0–100% score exists)
- Public last-updated timestamp (defer anti-gaming to v2.5)
- Notification system (confirm copy makes no notification promise)
- Holder ranking visibility (private for v2; public sharing is a future feature)
- Cross-product nudges (Anticapture, etc.)
- Settings page / dedicated edit route
- Unlock animation on /voters (no longer relevant — there's no unlock moment)
- Precise "fresh session" definition for modal retrigger

---

## Open before engineering handoff

1. **Team workshop on the 5 values.** Decentralization and Public goods funding are placeholders. Strawman is design-ready but not team-locked.
2. **Design the own-profile "Profile is missing values" callout.** The Dashboard equivalent (`5534:11513`) is the reference; need a profile-page equivalent.
3. **Design the own-profile "Edit values" affordance** on the ranked state of own profile. Currently only Dashboard exposes Edit.
4. **Voter Detail · Values card direction.** Current is the dumbbell comparison (`5496:317`); four simplification alternatives sit at `5539:318`. Pick one before handoff.
5. **Edit Ranking modal save behavior.** Toast confirmation? Inline refresh? Navigate elsewhere?
6. **Sort order during bootstrap.** When most delegates haven't ranked, ranked-first by match then unranked by voting power?
7. **"Fresh session" definition.** Wallet reconnect? Browser session? 24h TTL?
8. **"Prioritizes [value]" copy template.** Literal value name, or themed phrasing per value?
9. **Stale Figma layer names** — `5463:9854` is labeled "Modal / Pitch (delegate context)" but its copy is the holder pitch. Rename to "Modal / Pitch (holder context)".

---

## Designs in Figma

All surfaces sit in the Thorin Community file (`9h3HrcD5YgkGe37Hw3vAmm`) on the **Incentives Wireframes** page, primarily inside the **Matchmaking Flow** section (`5463:5485`).

| # | Surface | Node | Role / state |
|---|---|---|---|
| 1a | Modal · Pitch (holder context) | `5463:9854` ⚠️ mislabeled in Figma | "Find delegates who share your priorities" |
| 1b | Modal · Pitch (delegate context) | `5585:11010` | "Tell holders what you stand for" |
| 2 | Modal · Rank (drag to reorder) | `5463:9778` | shared |
| 3a | Modal · Confirm (holder context) | `5463:9761` | "Your priorities are set" |
| 3b | Modal · Confirm (delegate context) | `5585:11087` | "You're all set" |
| 4 | Modal · Edit Ranking | `5534:11190` | shared, prefilled |
| 5 | VoterCard (3 status-line variants) | `5334:902` | Strong / Themed / Didn't rank |
| 6 | /voters · Unblocked (ranked viewer) | `5478:3437` | match-sorted |
| 7 | **/voters · Not ranked (dismissible)** | `5579:5369` | NEW — degraded, banner + ? + "Rank to see your match" |
| 8 | /voters · Blocked (legacy) | `5468:12212` | archived, not shipped |
| 9 | Voter Detail (dumbbell comparison) | `5478:3950` (page) · `5496:317` (card) | viewer ranked + delegate ranked |
| 10 | Delegate Profile · Not logged in / Didn't rank | `5479:4305` | shared empty state |
| 11 | Dashboard · pre-rank | `5534:11513` | "Your profile is missing values" |
| 12 | Dashboard · post-rank | `5534:10750` | Values card + "Edit values →" |
| 13 | Banner · Unlock matchmaking | `5584:9860` | inline banner used on /voters degraded + direct profile link |

Mobile mirrors live in Holder Flow Mobile and Delegate Flow Mobile sections.

All designs use Thorin tokens — Satoshi text styles, Blue and Grey paint styles, Button instances, Thorin SVG icon instances. Auto-layout throughout.

---

## References

- Flow diagram in Figma: `https://www.figma.com/design/9h3HrcD5YgkGe37Hw3vAmm/ENS-Incentives?node-id=5463-5485`
- Screen designs (Figma): file `9h3HrcD5YgkGe37Hw3vAmm`, page Incentives Wireframes
- ClickUp task: [86ahm8z6h](https://app.clickup.com/t/86ahm8z6h) — ens: incentives v2 (matchmaking)
- Existing pages this affects:
  - `apps/frontend/src/pages/VoterProfilePage/index.tsx` — adds Values card with dumbbell comparison + own-profile callouts
  - `apps/frontend/src/pages/VotersPage/index.tsx` — adds degraded state (banner + placeholders), 3-variant status lines
  - `apps/frontend/src/pages/DashboardPage/index.tsx` — adds pre-rank callout, post-rank Values card
