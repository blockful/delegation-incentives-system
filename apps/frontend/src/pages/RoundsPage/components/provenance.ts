import type { AddressRoundReward } from '@/api/types'

/* ─── DEV-764 provenance contract ──────────────────────────────────────────
 *
 * `GET /api/rounds/{roundNumber}?address=0x…` gains a nullable `provenance`
 * block on the address reward object. The backend half (DEV-764) is built
 * against this exact shape, but it is not yet part of the generated OpenAPI
 * types — these local types + the `readProvenance` adapter bridge the gap.
 * Once the backend PR merges and `schema.gen.ts` is regenerated, the types
 * here can be swapped for the generated ones (trivial follow-up).
 */

export type CapStatus =
  | 'not_affected'
  | 'received_redistribution'
  | 'reached_cap'

/** Deduped delegation kinds backing a token-holder reward. */
export type HolderSourceKind = 'direct' | 'multidelegate' | 'hedgey'

interface RoleProvenanceBase {
  /** "% of the pool, 2dp string" — e.g. "3.21". */
  poolSharePct: string
  /** Pre-cap allocation, wei string. */
  rawReward: string
  rawRewardEns: string
  /** Post-cap; equals the role's reward on `AddressRoundReward`. */
  finalReward: string
  finalRewardEns: string
  /** Resolved cap for the round (1% voter / 5% holder of the pool), wei. */
  cap: string
  capEns: string
  capStatus: CapStatus
  redistributionReceived: string
  redistributionReceivedEns: string
}

export interface VoterProvenance extends RoleProvenanceBase {
  /** TWAP over the round month, wei string. */
  avgVotingPower: string
  avgVotingPowerEns: string
}

export interface TokenHolderProvenance extends RoleProvenanceBase {
  /** Time-weighted balance over the trailing 180 days, wei string. */
  avgBalance: string
  avgBalanceEns: string
  /** Deduped source kinds; null when delegation sources are untracked. */
  sources: string[] | null
}

export interface AddressRewardProvenance {
  /** null → the wallet earned no delegate reward. */
  voter: VoterProvenance | null
  /** null → the wallet earned no token-holder reward. */
  tokenHolder: TokenHolderProvenance | null
}

/* ─── Safe adapter ─── */

const CAP_STATUSES: readonly CapStatus[] = [
  'not_affected',
  'received_redistribution',
  'reached_cap',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasStringFields(value: Record<string, unknown>, fields: string[]): boolean {
  return fields.every((field) => typeof value[field] === 'string')
}

const BASE_FIELDS = [
  'poolSharePct',
  'rawReward',
  'rawRewardEns',
  'finalReward',
  'finalRewardEns',
  'cap',
  'capEns',
  'redistributionReceived',
  'redistributionReceivedEns',
]

function readRoleBase(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null
  if (!hasStringFields(value, BASE_FIELDS)) return null
  if (!CAP_STATUSES.includes(value.capStatus as CapStatus)) return null
  return value
}

function readVoter(value: unknown): VoterProvenance | null {
  const base = readRoleBase(value)
  if (!base || !hasStringFields(base, ['avgVotingPower', 'avgVotingPowerEns'])) {
    return null
  }
  return base as unknown as VoterProvenance
}

function readTokenHolder(value: unknown): TokenHolderProvenance | null {
  const base = readRoleBase(value)
  if (!base || !hasStringFields(base, ['avgBalance', 'avgBalanceEns'])) return null

  const rawSources = base.sources
  const sources = Array.isArray(rawSources)
    ? rawSources.filter((entry): entry is string => typeof entry === 'string')
    : null

  return { ...(base as unknown as TokenHolderProvenance), sources }
}

/**
 * Read the DEV-764 `provenance` block off an address reward object. The field
 * is not in the generated schema types yet, so this is the single cast point.
 * A present-but-malformed role degrades the whole block to null ("math not
 * available") rather than misreporting it as "no reward in that role".
 */
export function readProvenance(
  reward: AddressRoundReward | null,
): AddressRewardProvenance | null {
  if (!reward) return null
  const raw = (reward as AddressRoundReward & { provenance?: unknown }).provenance
  if (!isRecord(raw)) return null

  const voter = raw.voter == null ? null : readVoter(raw.voter)
  const tokenHolder = raw.tokenHolder == null ? null : readTokenHolder(raw.tokenHolder)

  // Malformed role payload → treat the math as unavailable for the round.
  if (raw.voter != null && voter === null) return null
  if (raw.tokenHolder != null && tokenHolder === null) return null

  return { voter, tokenHolder }
}

/* ─── Wei math (BigInt — never floats for reconciliation) ─── */

const WEI_PER_ENS = 10n ** 18n

export function parseWei(value: string | null | undefined): bigint | null {
  if (value == null || value === '') return null
  try {
    return BigInt(value)
  } catch {
    return null
  }
}

/** Wei → "1,234.56" (rounded half-up to `fractionDigits`). */
export function formatWeiToEns(wei: bigint, fractionDigits = 2): string {
  const negative = wei < 0n
  const abs = negative ? -wei : wei
  const scale = 10n ** BigInt(fractionDigits)
  const scaled = (abs * scale + WEI_PER_ENS / 2n) / WEI_PER_ENS
  const whole = scaled / scale
  const fraction = scaled % scale
  const wholeText = whole.toLocaleString('en-US')
  const text =
    fractionDigits > 0
      ? `${wholeText}.${fraction.toString().padStart(fractionDigits, '0')}`
      : wholeText
  return negative ? `-${text}` : text
}

/** Integer percentage of `partWei` over `totalWei` — "17"; null when undefined. */
export function integerSharePct(
  partWei: string | null | undefined,
  totalWei: string | null | undefined,
): string | null {
  const part = parseWei(partWei)
  const total = parseWei(totalWei)
  if (part == null || total == null || total <= 0n || part < 0n) return null
  return ((part * 100n + total / 2n) / total).toString()
}

/* ─── Cap ledger view model ───
 *
 * The contract exposes raw/final/cap/redistribution only (no per-iteration
 * trail), so the boards' "Iteration N" rows are reconstructed as a single
 * pass: raw share → redistribution received → cap clamp → final.
 */

export type ProvenanceRole = 'delegate' | 'token holder'

export interface CapLedgerStep {
  label: string
  tag: { text: string; tone: 'success' | 'danger' } | null
  /** Signed delta, 2dp — "+0.80" / "-0.44". */
  deltaEns: string
  /** Running amount after this step, 2dp. */
  runningEns: string
}

export type CapLedgerView =
  | { variant: 'not-affected'; role: ProvenanceRole }
  | {
      variant: 'redistributed' | 'capped'
      role: ProvenanceRole
      capPct: string
      capEns: string
      rawEns: string
      finalLabel: string
      finalEns: string
      steps: CapLedgerStep[]
      footnote: { text: string; tone: 'success' | 'danger' }
    }

export function buildCapLedger(
  role: ProvenanceRole,
  provenance: VoterProvenance | TokenHolderProvenance,
): CapLedgerView | null {
  if (provenance.capStatus === 'not_affected') {
    return { variant: 'not-affected', role }
  }

  const raw = parseWei(provenance.rawReward)
  const final = parseWei(provenance.finalReward)
  const received = parseWei(provenance.redistributionReceived) ?? 0n
  if (raw == null || final == null) return null

  // Nominal per-role cap from the round rules (1% voter / 5% holder of the
  // role pool). `round.poolSize` is the WHOLE pool, so the percentage cannot
  // be derived from `cap / poolSize` without mislabeling it.
  const capPct = role === 'delegate' ? '1' : '5'
  const capEns = formatWeiToEns(parseWei(provenance.cap) ?? 0n)
  const rawEns = formatWeiToEns(raw)

  const steps: CapLedgerStep[] = []
  if (received > 0n) {
    steps.push({
      label: 'Redistribution received',
      tag: { text: 'under cap', tone: 'success' },
      deltaEns: `+${formatWeiToEns(received)}`,
      runningEns: formatWeiToEns(raw + received),
    })
  }

  if (provenance.capStatus === 'reached_cap') {
    const shed = raw + received - final
    steps.push({
      label: 'Cap applied',
      tag: { text: 'reached cap', tone: 'danger' },
      deltaEns: `-${formatWeiToEns(shed)}`,
      runningEns: formatWeiToEns(final),
    })
    return {
      variant: 'capped',
      role,
      capPct,
      capEns,
      rawEns,
      finalLabel: 'Final (clamped)',
      finalEns: formatWeiToEns(final),
      steps,
      footnote: {
        text: `-${formatWeiToEns(shed)} ENS shed to other wallets after reaching the cap.`,
        tone: 'danger',
      },
    }
  }

  return {
    variant: 'redistributed',
    role,
    capPct,
    capEns,
    rawEns,
    finalLabel: 'Final',
    finalEns: formatWeiToEns(final),
    steps,
    footnote: {
      text: `+${formatWeiToEns(received)} ENS received from wallets that hit their cap.`,
      tone: 'success',
    },
  }
}

/* ─── Reconciliation ───
 *
 * voter.finalReward + tokenHolder.finalReward + lotteryReward must equal
 * totalReward — computed here from the wei strings with BigInt.
 */

export interface ReconciliationView {
  /** 2dp ENS terms, in display order. */
  termsEns: string[]
  /** Sum of the terms, 2dp ENS. */
  sumEns: string
  /** Whether the BigInt sum matches `totalReward` exactly. */
  matches: boolean
  /** The recorded total, 2dp ENS (for the mismatch note). */
  totalEns: string
}

export function reconcileProvenance(
  reward: AddressRoundReward,
  provenance: AddressRewardProvenance,
): ReconciliationView | null {
  const total = parseWei(reward.totalReward)
  if (total == null || total <= 0n) return null

  const termWeis: bigint[] = []
  if (provenance.voter) {
    termWeis.push(parseWei(provenance.voter.finalReward) ?? 0n)
  }
  if (provenance.tokenHolder) {
    termWeis.push(parseWei(provenance.tokenHolder.finalReward) ?? 0n)
  }
  const lottery = parseWei(reward.lotteryReward) ?? 0n
  if (lottery > 0n) termWeis.push(lottery)

  if (termWeis.length === 0) return null

  const sum = termWeis.reduce((acc, wei) => acc + wei, 0n)
  return {
    termsEns: termWeis.map((wei) => formatWeiToEns(wei)),
    sumEns: formatWeiToEns(sum),
    matches: sum === total,
    totalEns: formatWeiToEns(total),
  }
}

/* ─── Source labels ───
 *
 * The contract only exposes deduped source kinds (no amounts or delegate
 * names), so the boards' "1,200 ENS delegated directly to vitalik.eth" rows
 * degrade to generic per-kind copy until the backend tracks the detail.
 */

const SOURCE_LABELS: Record<string, string> = {
  direct: 'Delegated directly from this wallet',
  multidelegate: 'Via the ERC20MultiDelegate contract',
  hedgey: 'Via a Hedgey vesting plan',
}

export function sourceLabel(kind: string): string {
  return SOURCE_LABELS[kind] ?? `Via ${kind}`
}
