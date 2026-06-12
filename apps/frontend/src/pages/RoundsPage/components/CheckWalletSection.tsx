import styled from 'styled-components'
import { isAddress } from 'viem'
import { useEnsName } from 'wagmi'
import { Button } from '@ensdomains/thorin'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheckToSlot,
  faCircleCheck,
  faCircleInfo,
  faCoins,
  faHourglassHalf,
  faMagnifyingGlass,
  faTicket,
  faWallet,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import type {
  LotteryDetail,
  RoundDetailResponse,
} from '@/api/types'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { tokens } from '@/styles'
import { formatEnsAmount, truncateAddress } from '@/utils/format'

/* ─── View model ───────────────────────────────────────────────────────────
 *
 * Check-wallet card v2 (DEV-769). One derived view per render:
 *
 *  - empty        → no inspected address (only reachable when disconnected,
 *                   since a connected wallet is pre-searched by the page).
 *  - pending      → address inspected but the round hasn't closed yet.
 *  - earned       → the wallet was paid; conditional role rows + total.
 *  - lottery-lost → the wallet earned < 1 ENS, entered a lottery pool and
 *                   didn't win. Own state with odds + entry breakdown.
 *  - no-reward    → the wallet earned nothing and had no lottery entry.
 */

export interface EarnedRow {
  key: 'delegate' | 'holder' | 'lottery'
  label: string
  amountEns: string
}

export interface LostLotteryEntry {
  /** "6.2" — percentage with one decimal, no % sign. */
  oddsPct: string
  entryAmountEns: string
  poolNumber: number
  poolPrizeEns: string
}

export type CheckWalletView =
  | { kind: 'empty' }
  | { kind: 'pending' }
  | { kind: 'no-reward' }
  | { kind: 'earned'; rows: EarnedRow[]; totalEns: string }
  | { kind: 'lottery-lost'; entry: LostLotteryEntry }

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
      poolNumber: bucket.bucketIndex + 1,
      poolPrizeEns: bucket.prizeEns,
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
    const rows: EarnedRow[] = []
    if (Number(reward.voterRewardEns) > 0) {
      rows.push({ key: 'delegate', label: 'As delegate', amountEns: reward.voterRewardEns })
    }
    if (Number(reward.tokenHolderRewardEns) > 0) {
      rows.push({ key: 'holder', label: 'As token holder', amountEns: reward.tokenHolderRewardEns })
    }
    if (Number(reward.lotteryRewardEns) > 0) {
      rows.push({ key: 'lottery', label: 'Lottery prize', amountEns: reward.lotteryRewardEns })
    }
    return { kind: 'earned', rows, totalEns: reward.totalRewardEns }
  }

  const lostEntry = findLostLotteryEntry(round.lottery, activeAddress)
  if (lostEntry) return { kind: 'lottery-lost', entry: lostEntry }

  return { kind: 'no-reward' }
}

/* ─── Layout ─── */

// Two cards side by side on desktop; the empty state keeps both so the
// section never shrinks. Mobile stacks them (and hides the explainer when
// the state is empty — see ExplainerCard).
const SectionGrid = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${tokens.spacing.lg};
  width: 100%;
  align-items: stretch;

  @media (min-width: 768px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
`

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
  padding: ${tokens.spacing['2xl']};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 16px;

  @media (max-width: 767px) {
    padding: ${tokens.spacing.lg};
  }
`

// The right card of the empty state is desktop-only: on mobile the section
// collapses to the single "Check your own wallet" card.
const ExplainerCard = styled(Card)<{ $hideOnMobile: boolean }>`
  @media (max-width: 767px) {
    display: ${({ $hideOnMobile }) => ($hideOnMobile ? 'none' : 'flex')};
  }
`

const CardHeader = styled.div`
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
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.25;
`

const CardBody = styled.p`
  margin: ${tokens.spacing.xs} 0 0;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

/* ─── Search form ─── */

const SearchBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
`

const SearchRow = styled.div`
  display: flex;
  gap: ${tokens.spacing.sm};
  align-items: center;

  @media (max-width: 560px) {
    flex-wrap: wrap;
  }
`

const SearchInputWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 200px;
`

const SearchIcon = styled.span`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${tokens.color.textSubtle};
  pointer-events: none;

  svg {
    width: 12px;
    height: 12px;
  }
`

const SearchInput = styled.input<{ $hasError: boolean }>`
  width: 100%;
  min-width: 0;
  border: 1px solid
    ${({ $hasError }) => ($hasError ? tokens.color.negative : tokens.color.middleGray)};
  border-radius: ${tokens.radius.sm};
  padding: 10px ${tokens.spacing.md} 10px 32px;
  font-family: inherit;
  font-size: ${tokens.font.size.base};
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

const InputError = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.negative};
`

/* ─── Empty-state action ─── */

const EmptyAction = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
`

const OrDivider = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.textSubtle};
`

/* ─── Inspected wallet identity ─── */

const IdentityRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  min-width: 0;
`

const IdentityText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`

const IdentityName = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const IdentitySub = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 16px;
`

const YourWalletPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  padding: 3px 10px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.lightBlueOpacity};
  color: ${tokens.color.blue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
  white-space: nowrap;
  flex-shrink: 0;

  svg {
    width: 10px;
    height: 10px;
  }
`

/* ─── Status strip ─── */

type StatusTone = 'success' | 'neutral' | 'pending'

const StatusStrip = styled.div<{ $tone: StatusTone }>`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
  margin-top: auto;
  padding: ${tokens.spacing.lg};
  border-radius: 12px;
  background: ${({ $tone }) =>
    $tone === 'success'
      ? tokens.color.status.success.bg
      : $tone === 'pending'
        ? tokens.color.lightBlueOpacity
        : tokens.color.bgSubtle};
  border: 1px solid
    ${({ $tone }) =>
      $tone === 'success'
        ? tokens.color.status.success.border
        : $tone === 'pending'
          ? tokens.color.lightBlue
          : tokens.color.borderLight};
`

const StatusIcon = styled.span<{ $tone: StatusTone }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${tokens.radius.pill};
  flex-shrink: 0;
  background: ${({ $tone }) =>
    $tone === 'success'
      ? tokens.color.status.success.border
      : $tone === 'pending'
        ? tokens.color.lightBlue
        : tokens.color.borderLight};
  color: ${({ $tone }) =>
    $tone === 'success'
      ? tokens.color.white
      : $tone === 'pending'
        ? tokens.color.blue
        : tokens.color.darkGray};

  svg {
    width: 16px;
    height: 16px;
  }
`

const StatusText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const StatusTitle = styled.span<{ $tone: StatusTone }>`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  color: ${({ $tone }) =>
    $tone === 'success'
      ? tokens.color.status.success.fg
      : $tone === 'pending'
        ? tokens.color.blue
        : tokens.color.darkBlue};
`

const StatusBody = styled.span`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkBlue};
  line-height: 1.5;
`

/* ─── Breakdown (right card, earned / lottery-lost) ─── */

const BreakdownList = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 10px;
  overflow: hidden;
`

const BreakdownRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
  padding: 11px 14px;

  &:not(:last-child) {
    border-bottom: 1px solid ${tokens.color.borderLight};
  }
`

const RowLabel = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const RowValue = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`

const TotalRow = styled(BreakdownRow)`
  background: ${tokens.color.bgSubtle};
`

const TotalLabel = styled(RowLabel)`
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

const TotalValue = styled(RowValue)`
  color: ${tokens.color.positiveEmphasis};
`

/* ─── Explainer (right card, empty / no-reward / pending) ─── */

const ExplainerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
`

const ExplainerItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${tokens.spacing.md};
`

const ExplainerIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${tokens.radius.pill};
  flex-shrink: 0;
  background: ${tokens.color.lightBlueOpacity};
  color: ${tokens.color.blue};

  svg {
    width: 14px;
    height: 14px;
  }
`

const ExplainerText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const ExplainerTitle = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
`

const ExplainerBody = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

/* ─── Helpers ─── */

// Same lazy-open idiom as the header: AppKit is only pulled in when the
// user actually asks to connect.
async function openWalletModal() {
  const { appKit } = await import('@/app/providers/AppKitProvider')
  appKit.open()
}

interface StatusContent {
  tone: StatusTone
  icon: typeof faCircleCheck
  title: string
  body: string
}

function statusContent(view: CheckWalletView, round: RoundDetailResponse): StatusContent | null {
  switch (view.kind) {
    case 'earned':
      return {
        tone: 'success',
        icon: faCircleCheck,
        title: `Earned ${formatEnsFixed(view.totalEns)} ENS this round`,
        body: 'Paid directly to this wallet in a single transfer.',
      }
    case 'lottery-lost':
      return {
        tone: 'neutral',
        icon: faTicket,
        title: `Entered the lottery with ${view.entry.oddsPct}% odds, didn't win this round`,
        body: 'Rewards under 1 ENS become lottery entries instead of direct payouts.',
      }
    case 'no-reward':
      return {
        tone: 'neutral',
        icon: faCircleInfo,
        title: 'No reward this round',
        body: 'This wallet didn’t earn as a delegate or token holder in this round.',
      }
    case 'pending':
      return {
        tone: 'pending',
        icon: faHourglassHalf,
        title: 'This round hasn’t finished yet',
        body: `Round ${round.roundNumber} is still ${round.status}. Results show up the moment it closes.`,
      }
    default:
      return null
  }
}

function TwoWaysExplainer({ hideOnMobile }: { hideOnMobile: boolean }) {
  return (
    <ExplainerCard $hideOnMobile={hideOnMobile} data-testid="check-wallet-explainer">
      <CardHeader>
        <CardTitle>Two ways a wallet earns</CardTitle>
      </CardHeader>
      <ExplainerList>
        <ExplainerItem>
          <ExplainerIcon aria-hidden>
            <FontAwesomeIcon icon={faCheckToSlot} />
          </ExplainerIcon>
          <ExplainerText>
            <ExplainerTitle>As a delegate</ExplainerTitle>
            <ExplainerBody>
              Vote on at least 7 of the last 10 on-chain proposals to earn from
              the delegate slice of the pool.
            </ExplainerBody>
          </ExplainerText>
        </ExplainerItem>
        <ExplainerItem>
          <ExplainerIcon aria-hidden>
            <FontAwesomeIcon icon={faCoins} />
          </ExplainerIcon>
          <ExplainerText>
            <ExplainerTitle>As a token holder</ExplainerTitle>
            <ExplainerBody>
              Delegate ENS to an active delegate. Shares of 1 ENS or more pay
              out directly; smaller shares enter the lottery.
            </ExplainerBody>
          </ExplainerText>
        </ExplainerItem>
      </ExplainerList>
    </ExplainerCard>
  )
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
 * connected one pre-searched — and see what the round paid it. Desktop is
 * always two cards (lookup + result) so the layout footprint never changes;
 * mobile stacks them and drops the explainer card in the empty state.
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

  function handleUseConnected() {
    if (connectedAddress) {
      onInputChange(connectedAddress)
      onSubmit(connectedAddress)
      return
    }
    void openWalletModal()
  }

  const status = statusContent(view, round)

  return (
    <SectionGrid aria-label="Check a wallet" data-testid="check-wallet-section">
      <Card>
        <CardHeader>
          <Eyebrow>Check a wallet</Eyebrow>
          <CardTitle>
            {view.kind === 'empty'
              ? 'Check your own wallet'
              : 'See what this round paid a wallet'}
          </CardTitle>
          {view.kind === 'empty' ? (
            <CardBody>
              Connect your wallet, or search any ENS name or 0x address, to see
              what it earned this round.
            </CardBody>
          ) : null}
        </CardHeader>

        <SearchBlock>
          <SearchRow>
            <SearchInputWrap>
              <SearchIcon aria-hidden>
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </SearchIcon>
              <SearchInput
                type="text"
                aria-label="Search by ENS name or address"
                placeholder="Search by ENS name or 0x address…"
                value={addressInput}
                $hasError={Boolean(error)}
                onChange={(event) => onInputChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onSubmit()
                }}
              />
            </SearchInputWrap>
            <Button
              size="small"
              width="max"
              colorStyle="bluePrimary"
              onClick={() => onSubmit()}
              prefix={<FontAwesomeIcon icon={faMagnifyingGlass} />}
            >
              Search
            </Button>
            {addressInput || activeAddress ? (
              <Button
                size="small"
                width="max"
                colorStyle="blueSecondary"
                onClick={onClear}
                prefix={<FontAwesomeIcon icon={faXmark} />}
              >
                Clear
              </Button>
            ) : null}
          </SearchRow>
          {error ? <InputError role="alert">{error}</InputError> : null}
        </SearchBlock>

        {view.kind === 'empty' ? (
          <EmptyAction>
            <OrDivider>or</OrDivider>
            <Button
              size="small"
              width="max"
              colorStyle="blueSecondary"
              onClick={handleUseConnected}
              prefix={<FontAwesomeIcon icon={faWallet} />}
            >
              Use my connected wallet
            </Button>
          </EmptyAction>
        ) : (
          <>
            <IdentityRow data-testid="check-wallet-identity">
              <EnsAvatar
                address={activeAddress}
                name={displayName ?? undefined}
                size={32}
                resolveName={false}
              />
              <IdentityText>
                <IdentityName>
                  {displayName ?? truncateAddress(activeAddress)}
                </IdentityName>
                {displayName ? (
                  <IdentitySub>{truncateAddress(activeAddress)}</IdentitySub>
                ) : null}
              </IdentityText>
              {isOwnWallet ? (
                <YourWalletPill>
                  <FontAwesomeIcon icon={faWallet} />
                  Your wallet
                </YourWalletPill>
              ) : null}
            </IdentityRow>
            {status ? (
              <StatusStrip
                $tone={status.tone}
                role="status"
                data-testid="check-wallet-status"
              >
                <StatusIcon $tone={status.tone} aria-hidden>
                  <FontAwesomeIcon icon={status.icon} />
                </StatusIcon>
                <StatusText>
                  <StatusTitle $tone={status.tone}>{status.title}</StatusTitle>
                  <StatusBody>{status.body}</StatusBody>
                </StatusText>
              </StatusStrip>
            ) : null}
          </>
        )}
      </Card>

      {view.kind === 'earned' ? (
        <Card data-testid="check-wallet-breakdown">
          <CardHeader>
            <CardTitle>Reward breakdown</CardTitle>
          </CardHeader>
          <BreakdownList>
            {view.rows.map((row) => (
              <BreakdownRow key={row.key}>
                <RowLabel>{row.label}</RowLabel>
                <RowValue>{formatEnsFixed(row.amountEns)} ENS</RowValue>
              </BreakdownRow>
            ))}
            <TotalRow>
              <TotalLabel>Total</TotalLabel>
              <TotalValue>{formatEnsFixed(view.totalEns)} ENS</TotalValue>
            </TotalRow>
          </BreakdownList>
        </Card>
      ) : view.kind === 'lottery-lost' ? (
        <Card data-testid="check-wallet-lottery-entry">
          <CardHeader>
            <CardTitle>Your lottery entry</CardTitle>
          </CardHeader>
          <BreakdownList>
            <BreakdownRow>
              <RowLabel>Entry</RowLabel>
              <RowValue>{formatEnsFixed(view.entry.entryAmountEns)} ENS</RowValue>
            </BreakdownRow>
            <BreakdownRow>
              <RowLabel>Pool</RowLabel>
              <RowValue>Pool #{view.entry.poolNumber}</RowValue>
            </BreakdownRow>
            <BreakdownRow>
              <RowLabel>Winning odds</RowLabel>
              <RowValue>{view.entry.oddsPct}%</RowValue>
            </BreakdownRow>
            <BreakdownRow>
              <RowLabel>Pool prize</RowLabel>
              <RowValue>{formatEnsFixed(view.entry.poolPrizeEns)} ENS</RowValue>
            </BreakdownRow>
          </BreakdownList>
        </Card>
      ) : (
        <TwoWaysExplainer hideOnMobile={view.kind === 'empty'} />
      )}
    </SectionGrid>
  )
}
