import { useEffect, useId, useState } from 'react'
import styled from 'styled-components'
import { isAddress } from 'viem'
import { useEnsName } from 'wagmi'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronRight,
  faDollarSign,
  faMagnifyingGlass,
  faUser,
  faWallet,
} from '@fortawesome/free-solid-svg-icons'
import type {
  LotteryDetail,
  RoundDetailResponse,
} from '@/api/types'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { tokens } from '@/styles'
import { formatEnsAmount, truncateAddress } from '@/utils/format'
import { integerSharePct, readProvenance } from './provenance'
import { ProvenanceMath, type ProvenanceLotteryOutcome } from './ProvenanceMath'

/* ─── View model ───────────────────────────────────────────────────────────
 *
 * Check-wallet card v2 (DEV-769), conformed to the Figma boards
 * (9h3HrcD5YgkGe37Hw3vAmm · 5735:239 desktop / 5739:239 mobile).
 * One derived view per render:
 *
 *  - empty        → no inspected address (only reachable when disconnected,
 *                   since a connected wallet is pre-searched by the page).
 *  - pending      → address inspected but the round hasn't closed yet.
 *  - earned       → the wallet was paid; conditional role rows + total.
 *  - lottery-lost → the wallet earned < 1 ENS, entered a lottery pool and
 *                   didn't win. Odds line + entry breakdown.
 *  - no-reward    → the wallet earned nothing and had no lottery entry.
 */

export interface EarnedRow {
  key: 'delegate' | 'holder' | 'lottery'
  label: string
  amountEns: string
  /** Integer % of the wallet total ("17") — null when not displayable. */
  sharePct: string | null
}

export interface LostLotteryEntry {
  /** "6.2" — percentage with one decimal, no % sign. */
  oddsPct: string
  entryAmountEns: string
}

export interface WonLotteryPool {
  prizeEns: string
  /** "6.0" — percentage with one decimal, no % sign. */
  oddsPct: string
  entryAmountEns: string
  /** Bucket target size, for the "shared pool of about X ENS" narrative. */
  poolTargetEns: string | null
}

export type CheckWalletView =
  | { kind: 'empty' }
  | { kind: 'pending' }
  | { kind: 'no-reward' }
  | {
      kind: 'earned'
      rows: EarnedRow[]
      totalEns: string
      /** Single-role explainer (DEV-764 boards) — null for dual-role wallets. */
      note: string | null
      /** Set when the total includes a lottery pool the wallet won. */
      lotteryWin: WonLotteryPool | null
    }
  | { kind: 'lottery-lost'; entry: LostLotteryEntry }

export const SHOW_PROVENANCE_MATH: boolean = false // DEV-944: flip to true to restore

function sameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  return a.toLowerCase() === b.toLowerCase()
}

/** 0-1 fraction → "6.2" (one decimal, matching the lottery section's odds). */
function formatOddsPct(fraction: number): string {
  return (fraction * 100).toFixed(1)
}

/** Two decimals with thousands separators — "35.00", "1,234.50". */
function formatEnsFixed(value: string): string {
  return formatEnsAmount(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Find the inspected address inside a lottery pool it did not win. Odds come
 * from the API's per-entry probability when present; otherwise they fall back
 * to entry amount / bucket total, which is how the draw weights entries.
 */
export function findLostLotteryEntry(
  lottery: LotteryDetail | null,
  address: string,
): LostLotteryEntry | null {
  if (!lottery) return null

  for (const bucket of lottery.buckets) {
    if (sameAddress(bucket.winner, address)) continue
    const entry = bucket.entries.find((candidate) =>
      sameAddress(candidate.address, address),
    )
    if (!entry) continue

    const apiProbability = Number(entry.probability)
    let fraction: number
    if (entry.probability && Number.isFinite(apiProbability) && apiProbability > 0) {
      fraction = apiProbability
    } else {
      const bucketTotal = bucket.entries.reduce(
        (sum, candidate) => sum + Number(candidate.amountEns),
        0,
      )
      fraction = bucketTotal > 0 ? Number(entry.amountEns) / bucketTotal : 0
    }

    return {
      oddsPct: formatOddsPct(fraction),
      entryAmountEns: entry.amountEns,
    }
  }

  return null
}

/**
 * Find the lottery pool the inspected address won, for the lottery-win
 * detail (DEV-764 board 5623:218). Odds follow the same fallback chain as
 * the losing entry: bucket winner probability → entry amount / bucket total.
 */
export function findWonLotteryPool(
  lottery: LotteryDetail | null,
  address: string,
): WonLotteryPool | null {
  if (!lottery) return null

  for (const bucket of lottery.buckets) {
    if (!sameAddress(bucket.winner, address)) continue

    // An address can hold several entries in the same bucket; sum them.
    const ownEntries = bucket.entries.filter((candidate) =>
      sameAddress(candidate.address, address),
    )
    const entryAmount = ownEntries.reduce(
      (sum, candidate) => sum + Number(candidate.amountEns),
      0,
    )

    const apiProbability = Number(bucket.winnerProbability)
    let fraction: number
    if (
      bucket.winnerProbability &&
      Number.isFinite(apiProbability) &&
      apiProbability > 0
    ) {
      fraction = apiProbability
    } else {
      const bucketTotal = bucket.entries.reduce(
        (sum, candidate) => sum + Number(candidate.amountEns),
        0,
      )
      fraction = bucketTotal > 0 ? entryAmount / bucketTotal : 0
    }

    return {
      prizeEns: bucket.prizeEns,
      oddsPct: formatOddsPct(fraction),
      entryAmountEns: String(entryAmount),
      poolTargetEns: lottery.bucketTargetEns || null,
    }
  }

  return null
}

export function deriveCheckWalletView(
  round: RoundDetailResponse,
  activeAddress: string,
): CheckWalletView {
  if (!activeAddress) return { kind: 'empty' }
  if (round.distributionDataStatus !== 'available') return { kind: 'pending' }

  const reward = round.addressReward
  if (reward && Number(reward.totalRewardEns) > 0) {
    // Conditional role rows — only the roles that actually paid are listed.
    // Role percentages come from the wei strings (BigInt) so they always
    // describe the share of the recorded total.
    const rows: EarnedRow[] = []
    if (Number(reward.voterRewardEns) > 0) {
      rows.push({
        key: 'delegate',
        label: 'As delegate (voting)',
        amountEns: reward.voterRewardEns,
        sharePct: integerSharePct(reward.voterReward, reward.totalReward),
      })
    }
    if (Number(reward.tokenHolderRewardEns) > 0) {
      rows.push({
        key: 'holder',
        label: 'As token holder',
        amountEns: reward.tokenHolderRewardEns,
        sharePct: integerSharePct(reward.tokenHolderReward, reward.totalReward),
      })
    }
    const hasLottery = Number(reward.lotteryRewardEns) > 0
    if (hasLottery) {
      // The boards' lottery-won card shows no % column on entry rows.
      rows.push({
        key: 'lottery',
        label: 'Lottery prize',
        amountEns: reward.lotteryRewardEns,
        sharePct: null,
      })
    }

    const lotteryWin = hasLottery
      ? findWonLotteryPool(round.lottery, activeAddress)
      : null

    // Generic single-role copy from the DEV-764 boards. The API does not
    // say WHY the other role paid nothing (no delegation vs. delegate that
    // skipped voting), so the boards' generic phrasing is used as-is.
    const hasDelegateRow = rows.some((row) => row.key === 'delegate')
    const hasHolderRow = rows.some((row) => row.key === 'holder')
    let note: string | null = null
    if (!hasLottery && hasDelegateRow && !hasHolderRow) {
      note = 'You earned only by voting this round. No tokens were delegated to you.'
    } else if (!hasLottery && hasHolderRow && !hasDelegateRow) {
      note = 'You earned only as a token holder. You did not vote as a delegate this round.'
    }

    return { kind: 'earned', rows, totalEns: reward.totalRewardEns, note, lotteryWin }
  }

  const lostEntry = findLostLotteryEntry(round.lottery, activeAddress)
  if (lostEntry) return { kind: 'lottery-lost', entry: lostEntry }

  return { kind: 'no-reward' }
}

/* ─── Palette (board values not yet in tokens.ts) ─── */

// Figma "Light/Green/Bright" — the celebratory earned amount.
const BRIGHT_GREEN = '#1eb789'

const DOT_COLOR: Record<EarnedRow['key'], string> = {
  delegate: tokens.color.blue,
  holder: tokens.color.green,
  // Lottery is orange across the app (see RewardTags); the boards draw no
  // lottery-won breakdown row, so this follows the existing convention.
  lottery: tokens.color.orange,
}

/* ─── Layout ───
 *
 * One card: lookup column (title + search + identity panel) on the left,
 * result panel on the right (~58/42 like the board's 626/430 split). Mobile
 * stacks them; the empty state drops the result panel entirely on mobile.
 * The "Show the math" expansion (DEV-764) renders full width below the row.
 */

const SectionCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xl};
  width: 100%;
  padding: ${tokens.spacing.xl};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
`

const CardRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  width: 100%;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: stretch;
    gap: ${tokens.spacing['2xl']};
  }
`

const LookupColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};
  min-width: 0;

  @media (min-width: 768px) {
    flex: 1 1 58%;
  }
`

const HeaderBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
`

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const Eyebrow = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.textSubtle};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 16px;
`

const CardTitle = styled.h3`
  margin: 0;
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 26px;
`

/* ─── Search form ─── */

const SearchBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
`

const SearchInputWrap = styled.div`
  position: relative;
  width: 100%;
  min-width: 0;

  @media (min-width: 768px) {
    flex: 1;
    width: auto;
  }
`

const SearchIcon = styled.span`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: ${tokens.color.textSubtle};
  pointer-events: none;

  svg {
    width: 14px;
    height: 14px;
  }
`

const SearchInput = styled.input<{ $hasError: boolean }>`
  width: 100%;
  min-width: 0;
  border: 1px solid
    ${({ $hasError }) => ($hasError ? tokens.color.negative : tokens.color.borderLight)};
  border-radius: ${tokens.radius.sm};
  padding: 11px ${tokens.spacing.lg} 11px 42px;
  font-family: inherit;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  line-height: 20px;
  color: ${tokens.color.darkBlue};
  background: ${tokens.color.white};

  &::placeholder {
    color: ${tokens.color.textSubtle};
  }

  &:focus {
    outline: 2px solid ${tokens.color.lightBlue};
    border-color: ${tokens.color.blue};
  }
`

const ButtonRow = styled.div`
  display: flex;
  gap: ${tokens.spacing.sm};
  width: 100%;

  @media (min-width: 768px) {
    width: auto;
    flex-shrink: 0;
  }
`

const SearchButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${tokens.spacing.sm};
  padding: 10px ${tokens.spacing.lg};
  border: none;
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.blue};
  color: ${tokens.color.white};
  font-family: inherit;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  cursor: pointer;
  white-space: nowrap;
  flex: 1;
  transition: opacity ${tokens.transition.fast};

  svg {
    width: 12px;
    height: 12px;
  }

  &:hover {
    opacity: 0.9;
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
  }

  @media (min-width: 768px) {
    flex: 0 0 auto;
  }
`

const ClearButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${tokens.spacing.sm};
  padding: 10px ${tokens.spacing.lg};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.white};
  color: ${tokens.color.darkGray};
  font-family: inherit;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  cursor: pointer;
  white-space: nowrap;
  flex: 1;
  transition: border-color ${tokens.transition.fast}, color ${tokens.transition.fast};

  &:hover {
    border-color: ${tokens.color.blue};
    color: ${tokens.color.blue};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
  }

  @media (min-width: 768px) {
    flex: 0 0 auto;
  }
`

const InputError = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.negative};
`

/* ─── Identity panel (grey, below the search) ─── */

const IdentityPanel = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.lg};
  flex: 1;
  min-width: 0;
  padding: ${tokens.spacing.xl};
  background: ${tokens.color.surfaceAlt};
  border-radius: 12px;
`

const EmptyAvatarCircle = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: ${tokens.radius.pill};
  flex-shrink: 0;
  background: ${tokens.color.borderLight};
  border: 1px solid ${tokens.color.borderLight};
  color: ${tokens.color.darkGray};

  svg {
    width: 22px;
    height: 22px;
  }
`

const IdentityText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${tokens.spacing.xs};
  min-width: 0;
`

const IdentityName = styled.span`
  font-size: 22px;
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 30px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const IdentityHint = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
`

const TagPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px ${tokens.spacing.md};
  border-radius: ${tokens.radius.pill};
  border: 1px solid ${tokens.color.borderLight};
  background: ${tokens.color.tierHighlight};
  color: ${tokens.color.green};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
  white-space: nowrap;

  svg {
    width: 12px;
    height: 12px;
  }
`

const ConnectedWalletTag = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px ${tokens.spacing.md};
  border-radius: ${tokens.radius.pill};
  border: 1px solid ${tokens.color.borderLight};
  background: ${tokens.color.lightBlue};
  color: ${tokens.color.blue};
  font-family: inherit;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color ${tokens.transition.fast};

  svg {
    width: 12px;
    height: 12px;
  }

  &:hover {
    border-color: ${tokens.color.blue};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
  }
`

/* ─── Result panel (right column) ─── */

const ResultPanel = styled.div<{ $earned: boolean; $hideOnMobile?: boolean }>`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: ${tokens.spacing['2xl']};
  min-width: 0;
  padding: ${tokens.spacing.xl};
  border-radius: 12px;
  background: ${({ $earned }) =>
    $earned ? tokens.color.tierHighlight : tokens.color.surfaceAlt};

  @media (max-width: 767px) {
    display: ${({ $hideOnMobile }) => ($hideOnMobile ? 'none' : 'flex')};
  }

  @media (min-width: 768px) {
    flex: 1 1 42%;
  }
`

const PanelHeadGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const PanelHeading = styled.span`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
`

const PanelValue = styled.span<{ $earned: boolean }>`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${({ $earned }) => ($earned ? BRIGHT_GREEN : tokens.color.darkBlue)};
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
`

const PanelSub = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const PanelList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
`

const PanelListTitle = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
`

const RoleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
  width: 100%;
`

const Dot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 5px;
  flex-shrink: 0;
  background: ${({ $color }) => $color};
`

const RoleLabel = styled.span`
  flex: 1;
  min-width: 0;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const RoleValue = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`

const RolePct = styled.span`
  min-width: 36px;
  text-align: right;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.textSubtle};
  line-height: 20px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background: ${tokens.color.borderLight};
`

const TotalRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
  width: 100%;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
`

const TotalLabel = styled.span`
  flex: 1;
  min-width: 0;
`

const TotalValue = styled.span`
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`

const ExplainerFootnote = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.textSubtle};
  line-height: 20px;
`

// Title + dot rows grouped at the top of the empty panel; the footnote is
// pushed to the bottom by the panel's space-between.
const ExplainerTop = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
`

/* ─── Provenance additions (DEV-764) ─── */

// Bottom block of the result panel: explainer notes + the math affordance.
const PanelFoot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${tokens.spacing.sm};
`

// "Lottery win · 10.00 ENS · 6.0% odds" — green detail under the amount.
const LotteryWinSub = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.green};
  line-height: 20px;
`

const MathToggle = styled.button<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: ${tokens.color.blue};
  font-family: inherit;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  transition: opacity ${tokens.transition.fast};

  svg {
    width: 10px;
    height: 10px;
    transition: transform ${tokens.transition.fast};
    transform: rotate(${({ $open }) => ($open ? '90deg' : '0deg')});
  }

  &:hover {
    opacity: 0.8;
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
    border-radius: 4px;
  }
`

// Upgraded no-reward small state (board 5625:167) — icon + title + reason.
const NoRewardCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: ${tokens.spacing.lg};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 14px;
`

const NoRewardIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${tokens.radius.pill};
  flex-shrink: 0;
  background: ${tokens.color.borderLight};
  color: ${tokens.color.darkGray};

  svg {
    width: 16px;
    height: 16px;
  }
`

const NoRewardText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`

const NoRewardTitle = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
`

const NoRewardSub = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 16px;
`

/* ─── Helpers ─── */

// Same lazy-open idiom as the header: AppKit is only pulled in when the
// user actually asks to connect.
async function openWalletModal() {
  const { appKit } = await import('@/app/providers/AppKitProvider')
  appKit.open()
}

/* ─── Component ─── */

interface CheckWalletSectionProps {
  round: RoundDetailResponse
  /** Validated inspected address — '' when nothing is being inspected. */
  activeAddress: string
  /** Raw search input value (page state, synced with the URL). */
  addressInput: string
  /** Lookup error — invalid input or a failed ENS resolution. */
  error: string | null
  /** 0x… of the connected wallet, if any. */
  connectedAddress?: string
  onInputChange: (value: string) => void
  /**
   * Submit the lookup. Called with no args for a normal search (parent reads
   * its own state) or with an explicit override from "Use my connected
   * wallet", which avoids reading stale state in the same tick.
   */
  onSubmit: (addressOverride?: string) => void
  onClear: () => void
}

/**
 * Check-wallet card v2 (DEV-769): search a wallet — or land with the
 * connected one pre-searched — and see what the round paid it. One card:
 * lookup + identity on the left, "This wallet reward" panel on the right.
 * Mobile stacks them and drops the explainer panel in the empty state.
 *
 * DEV-764 layers the provenance on top: % per role, single-role notes,
 * lottery won/lost detail, and a "Show the math" expansion (per-role math,
 * cap ledger, round inputs, reconciliation) fed by the `provenance` block.
 */
export function CheckWalletSection({
  round,
  activeAddress,
  addressInput,
  error,
  connectedAddress,
  onInputChange,
  onSubmit,
  onClear,
}: CheckWalletSectionProps) {
  const view = deriveCheckWalletView(round, activeAddress)

  const { data: resolvedName } = useEnsName({
    address: activeAddress as `0x${string}`,
    query: { enabled: isAddress(activeAddress) },
  })
  const displayName = resolvedName ?? null
  const isOwnWallet = sameAddress(activeAddress, connectedAddress)

  // "Show the math" expansion (DEV-764). Collapses again whenever the
  // inspected wallet or the viewed round changes.
  const [showMath, setShowMath] = useState(false)
  const mathRegionId = useId()
  useEffect(() => {
    setShowMath(false)
  }, [activeAddress, round.roundNumber])

  const provenance = readProvenance(round.addressReward)
  const canShowMath =
    provenance != null &&
    round.addressReward != null &&
    (view.kind === 'earned' || view.kind === 'lottery-lost')

  const lotteryOutcome: ProvenanceLotteryOutcome | null =
    view.kind === 'earned' && view.lotteryWin
      ? {
          kind: 'won',
          oddsPct: view.lotteryWin.oddsPct,
          entryAmountEns: view.lotteryWin.entryAmountEns,
          prizeEns: view.lotteryWin.prizeEns,
        }
      : view.kind === 'lottery-lost'
        ? {
            kind: 'lost',
            oddsPct: view.entry.oddsPct,
            entryAmountEns: view.entry.entryAmountEns,
            prizeEns: null,
          }
        : null

  // Affordance (or the degraded note) on the states that have math to show.
  // DEV-944: gated off for now — hides the "Show the math" toggle AND its
  // "Math not available for this round." degraded sibling (same panel slot).
  const mathFoot =
    SHOW_PROVENANCE_MATH &&
    (view.kind === 'earned' || view.kind === 'lottery-lost') ? (
      canShowMath ? (
        <MathToggle
          type="button"
          $open={showMath}
          aria-expanded={showMath}
          aria-controls={mathRegionId}
          data-testid="check-wallet-show-math"
          onClick={() => setShowMath((open) => !open)}
        >
          <FontAwesomeIcon icon={faChevronRight} />
          {showMath ? 'Hide the math' : 'Show the math'}
        </MathToggle>
      ) : (
        <ExplainerFootnote data-testid="check-wallet-math-unavailable">
          Math not available for this round.
        </ExplainerFootnote>
      )
    ) : null

  function handleUseConnected() {
    if (connectedAddress) {
      onInputChange(connectedAddress)
      onSubmit(connectedAddress)
      return
    }
    void openWalletModal()
  }

  return (
    <SectionCard aria-label="Check a wallet" data-testid="check-wallet-section">
      <CardRow>
      <LookupColumn>
        <HeaderBlock>
          <TitleGroup>
            <Eyebrow>Check a wallet</Eyebrow>
            <CardTitle>See what this round paid an address</CardTitle>
          </TitleGroup>
          <SearchBlock>
            <SearchInputWrap>
              <SearchIcon aria-hidden>
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </SearchIcon>
              <SearchInput
                type="text"
                aria-label="Search by ENS name or address"
                placeholder="Search an address or ENS name"
                value={addressInput}
                $hasError={Boolean(error)}
                onChange={(event) => onInputChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onSubmit()
                }}
              />
            </SearchInputWrap>
            <ButtonRow>
              <SearchButton type="button" onClick={() => onSubmit()}>
                <FontAwesomeIcon icon={faMagnifyingGlass} />
                Search
              </SearchButton>
              <ClearButton type="button" onClick={onClear}>
                Clear
              </ClearButton>
            </ButtonRow>
          </SearchBlock>
          {error ? <InputError role="alert">{error}</InputError> : null}
        </HeaderBlock>

        <IdentityPanel data-testid="check-wallet-identity">
          {view.kind === 'empty' ? (
            <>
              <EmptyAvatarCircle aria-hidden>
                <FontAwesomeIcon icon={faUser} />
              </EmptyAvatarCircle>
              <IdentityText>
                <IdentityHint>
                  Search an address or ENS name above to see what it earned
                  this round
                </IdentityHint>
                <ConnectedWalletTag type="button" onClick={handleUseConnected}>
                  <FontAwesomeIcon icon={faWallet} />
                  Use my connected wallet
                </ConnectedWalletTag>
              </IdentityText>
            </>
          ) : (
            <>
              <EnsAvatar
                address={activeAddress}
                name={displayName ?? undefined}
                size={56}
                resolveName={false}
              />
              <IdentityText>
                <IdentityName>
                  {displayName ?? truncateAddress(activeAddress)}
                </IdentityName>
                {isOwnWallet ? (
                  <TagPill>
                    <FontAwesomeIcon icon={faWallet} />
                    Inspecting your wallet
                  </TagPill>
                ) : null}
              </IdentityText>
            </>
          )}
        </IdentityPanel>
      </LookupColumn>

      {view.kind === 'earned' ? (
        <ResultPanel $earned data-testid="check-wallet-breakdown">
          <PanelHeadGroup>
            <PanelHeading>This wallet reward</PanelHeading>
            <PanelValue $earned data-testid="check-wallet-reward-value">
              {formatEnsFixed(view.totalEns)} ENS <span aria-hidden>🎉</span>
            </PanelValue>
            {view.lotteryWin ? (
              <LotteryWinSub data-testid="check-wallet-lottery-win">
                Lottery win · {formatEnsFixed(view.lotteryWin.prizeEns)} ENS ·{' '}
                {view.lotteryWin.oddsPct}% odds
              </LotteryWinSub>
            ) : null}
          </PanelHeadGroup>
          <PanelList>
            <PanelListTitle>Reward breakdown</PanelListTitle>
            {view.rows.map((row) => (
              <RoleRow key={row.key}>
                <Dot $color={DOT_COLOR[row.key]} aria-hidden />
                <RoleLabel>{row.label}</RoleLabel>
                <RoleValue>{formatEnsFixed(row.amountEns)} ENS</RoleValue>
                {row.sharePct != null ? <RolePct>{row.sharePct}%</RolePct> : null}
              </RoleRow>
            ))}
            <Divider aria-hidden />
            <TotalRow>
              <TotalLabel>Total earned</TotalLabel>
              <TotalValue data-testid="check-wallet-total-value">
                {formatEnsFixed(view.totalEns)} ENS
              </TotalValue>
            </TotalRow>
          </PanelList>
          <PanelFoot>
            {view.note ? (
              <ExplainerFootnote>{view.note}</ExplainerFootnote>
            ) : null}
            {view.lotteryWin ? (
              <ExplainerFootnote>
                Your reward was under 1 ENS, so it entered a shared pool of
                about{' '}
                {formatEnsAmount(
                  view.lotteryWin.poolTargetEns ?? view.lotteryWin.prizeEns,
                  { maximumFractionDigits: 0 },
                )}{' '}
                ENS. Your pool drew you as the winner, so you took the whole{' '}
                {formatEnsFixed(view.lotteryWin.prizeEns)} ENS.
              </ExplainerFootnote>
            ) : SHOW_PROVENANCE_MATH ? (
              // DEV-944: caption temporarily hidden (PRD 86aj53bjc §6).
              <ExplainerFootnote>
                Paid directly in one transfer (1 ENS or more).
              </ExplainerFootnote>
            ) : null}
            {mathFoot}
          </PanelFoot>
        </ResultPanel>
      ) : view.kind === 'lottery-lost' ? (
        <ResultPanel $earned={false} data-testid="check-wallet-lottery-entry">
          <PanelHeadGroup>
            <PanelHeading>This wallet reward</PanelHeading>
            <PanelValue $earned={false} data-testid="check-wallet-reward-value">
              0 ENS
            </PanelValue>
            <PanelSub>
              Entered the lottery with {view.entry.oddsPct}% odds, didn&apos;t
              win this round.
            </PanelSub>
          </PanelHeadGroup>
          <PanelList>
            <PanelListTitle>Your lottery entry</PanelListTitle>
            <RoleRow>
              <Dot $color={tokens.color.green} aria-hidden />
              <RoleLabel>As token holder</RoleLabel>
              <RoleValue>{formatEnsFixed(view.entry.entryAmountEns)} ENS</RoleValue>
            </RoleRow>
            <Divider aria-hidden />
            <TotalRow>
              <TotalLabel>Entry total</TotalLabel>
              <TotalValue>{formatEnsFixed(view.entry.entryAmountEns)} ENS</TotalValue>
            </TotalRow>
          </PanelList>
          <PanelFoot>
            <ExplainerFootnote>
              Rewards under 1 ENS go into a pool draw instead of a direct
              payout. Nothing landed this round.
            </ExplainerFootnote>
            {mathFoot}
          </PanelFoot>
        </ResultPanel>
      ) : view.kind === 'no-reward' ? (
        <ResultPanel $earned={false} data-testid="check-wallet-no-reward">
          <PanelHeadGroup>
            <PanelHeading>This wallet reward</PanelHeading>
            <PanelValue $earned={false} data-testid="check-wallet-reward-value">
              0 ENS
            </PanelValue>
          </PanelHeadGroup>
          <NoRewardCard>
            <NoRewardIcon aria-hidden>
              <FontAwesomeIcon icon={faDollarSign} />
            </NoRewardIcon>
            <NoRewardText>
              <NoRewardTitle>No reward this round</NoRewardTitle>
              <NoRewardSub>
                This wallet didn&apos;t earn anything in this round.
              </NoRewardSub>
            </NoRewardText>
          </NoRewardCard>
        </ResultPanel>
      ) : view.kind === 'pending' ? (
        <ResultPanel $earned={false} data-testid="check-wallet-pending">
          <PanelHeadGroup>
            <PanelHeading>This wallet reward</PanelHeading>
            <PanelValue $earned={false} data-testid="check-wallet-reward-value">
              —
            </PanelValue>
            <PanelSub>This round hasn’t finished yet.</PanelSub>
          </PanelHeadGroup>
          <PanelListTitle>
            Round {round.roundNumber} is still {round.status}. Results show up
            the moment it closes.
          </PanelListTitle>
        </ResultPanel>
      ) : (
        <ResultPanel
          $earned={false}
          $hideOnMobile
          data-testid="check-wallet-explainer"
        >
          <ExplainerTop>
            <PanelHeading>Two ways a wallet earns</PanelHeading>
            <PanelList>
              <RoleRow>
                <Dot $color={tokens.color.blue} aria-hidden />
                <RoleLabel>As a delegate, for voting on proposals</RoleLabel>
              </RoleRow>
              <RoleRow>
                <Dot $color={tokens.color.green} aria-hidden />
                <RoleLabel>
                  As a token holder, for delegating to an active voter
                </RoleLabel>
              </RoleRow>
            </PanelList>
          </ExplainerTop>
          <ExplainerFootnote>Search a wallet to see its split.</ExplainerFootnote>
        </ResultPanel>
      )}
      </CardRow>

      {/* DEV-944: expansion hidden with its toggle; flag-gated so a single
          flip restores both. showMath can't be set without the toggle, but
          gating here keeps the revival self-evidently complete. */}
      {SHOW_PROVENANCE_MATH && showMath && canShowMath && provenance && round.addressReward ? (
        <div
          id={mathRegionId}
          role="region"
          aria-label="The math behind this reward"
          data-testid="check-wallet-math"
        >
          <ProvenanceMath
            round={round}
            reward={round.addressReward}
            provenance={provenance}
            lotteryOutcome={lotteryOutcome}
          />
        </div>
      ) : null}
    </SectionCard>
  )
}
