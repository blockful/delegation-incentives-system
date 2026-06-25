# Front mirrors the relayer for gas-sponsorship eligibility

**Date:** 2026-06-25
**Status:** Approved (design)

## Problem

The frontend decides gas-sponsorship eligibility with its **own business rules**
instead of mirroring the relayer. Two symptoms a user hit:

1. The voter card shows a **"Free"** badge (gated only on `relayerHasGas`), but
   clicking **Delegate** opens a *"You need some ENS first"* modal — the two
   disagree.
2. With the live relayer config `minVotingPower = 0` (i.e. everyone qualifies),
   a 0-ENS wallet is still told it is **not** sponsored.

Root cause in `useGaslessRelayer.ts`:

- `useGasSponsorshipBalanceStatus` short-circuits `balance === 0n → "no-ens"`
  **unconditionally**, ignoring the relayer's `minVotingPower`.
- It falls back to a hardcoded `DEFAULT_GAS_SPONSORSHIP_MIN_ENS = "100"` ENS.

The sponsorship rule belongs to the relayer (gateful), not the front.

## Principle

Sponsorship eligibility derives **only** from relayer-published signals:
`minVotingPower` (config) + `hasEnoughBalance` (funding) +
`rate-limit.delegation.remaining`, compared against the wallet's on-chain
balance. No hardcoded thresholds, no invented per-wallet rules.

## Decision

Front-only change (Option B). We do **not** add a per-address eligibility
endpoint to gateful in this PR.

## Design

### 1. Single source of truth — `useGaslessEligibility`

Already computes the correct gate
(`hasEnoughBalance && userBalance >= minVotingPower && delegationRemaining > 0`).
Extend its return with a `reason` so consumers don't re-derive anything:

```ts
type SponsorshipBlockReason =
  | 'relayer-paused' | 'no-ens' | 'below-minimum' | 'rate-limited'

{ isEligible: boolean; reason: SponsorshipBlockReason | null;
  remaining: number | null; isLoading: boolean }
```

Reason precedence (only when `!isLoading` and an address is connected):

1. `hasEnoughBalance === false` → `relayer-paused` (global, wins)
2. `userBalance < minVotingPower` → `no-ens` if balance is `0` else `below-minimum`
3. `delegationRemaining <= 0` → `rate-limited`
4. otherwise eligible → `reason = null`

With `minVotingPower = 0`, a 0-ENS wallet is **not** below minimum → eligible.
`no-ens` can therefore only appear when the relayer actually gates
(`minVotingPower > 0`).

### 2. Remove the invented-rule hook

Delete `useGasSponsorshipBalanceStatus`, its `GasSponsorshipBalanceStatus`
type, and its tests. Its only consumers (VoterCard, VoterProfilePage) move to
`useGaslessEligibility`.

### 3. VoterCard + VoterProfilePage

- **Free badge:** `connected ? isEligible : relayerHasGas === true`
  (disconnected keeps the program-level promise; connected tells the truth).
- **Delegate click:** disconnected → wallet modal; else `reason` → eligibility
  modal; else → delegation modal.

### 4. Modal

Add the `rate-limited` reason + copy. `no-ens` / `below-minimum` /
`relayer-paused` unchanged. The threshold in copy still comes from
`useGasSponsorshipMinEns` (live `minVotingPower`); the balance-gated reasons
only fire when `minVotingPower > 0`, so the displayed number is always real.

### Out of scope (follow-up)

Marketing copy (`Hero`, `HowItWorks`, `Dashboard`, `FAQ`) still reads
`useGasSponsorshipMinEns`, which keeps a `100` *display* fallback while config
loads / when `minVotingPower <= 0`. De-hardcoding that wording is a separate,
copy-sensitive change (DEV-760/761 territory) and is deferred. Flag in PR.

Also note (not fixed here): the front's `RelayerConfigResponse` /
`RelayerRateLimitResponse` type shapes drift from the live API
(`maxRelayPerAddressPerDay` vs `limits.{vote,delegation}`). `minVotingPower`
matches, so the gate is unaffected.

## Manual verification

- `minVotingPower=0` + 0-ENS connected wallet → Free badge, click delegates
  directly (no eligibility modal). **(regression test for the report)**
- `minVotingPower=100e18` + balance < 100 → `below-minimum` modal; badge hidden
  when connected.
- balance `0` + `minVotingPower>0` → `no-ens` modal.
- `hasEnoughBalance=false` → `relayer-paused` modal.
- balance ≥ min but `delegation.remaining=0` → `rate-limited` modal.
