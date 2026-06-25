import { Button, Dialog } from '@ensdomains/thorin'
import styled from 'styled-components'

import { tokens } from '@/styles'

import {
  useGasSponsorshipMinEns,
  type SponsorshipBlockReason,
} from '../hooks/useGaslessRelayer'

/**
 * Uniswap swap page pre-filled with the ENS token as the output currency.
 * Opened in a new tab by the "Buy ENS" primary action.
 */
export const UNISWAP_BUY_ENS_URL =
  'https://app.uniswap.org/swap?outputCurrency=0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72'

/**
 * Why this delegation won't get sponsored gas. Mirrors the relayer's
 * {@link SponsorshipBlockReason} 1:1:
 * - `no-ens`: the wallet holds no ENS and the relayer requires a minimum.
 * - `below-minimum`: the wallet holds some ENS, but less than the
 *   sponsorship threshold.
 * - `rate-limited`: the wallet has no sponsored delegations left this month.
 * - `relayer-paused`: the relayer can't sponsor anyone right now (global),
 *   regardless of the wallet's balance.
 *
 * The wallet-not-connected case never reaches this modal: the Delegate
 * trigger opens the wallet-connect (AppKit) modal instead.
 */
export type DelegationEligibilityReason = SponsorshipBlockReason

export interface DelegationEligibilityModalProps {
  open: boolean
  reason: DelegationEligibilityReason
  /**
   * ISO timestamp when the monthly relay quota resets, from the relayer's
   * `resetsAt`. Used only by the `rate-limited` state to tell the user when
   * their free allowance comes back.
   */
  resetsAt?: string | null
  onClose: () => void
  /** Continue with the regular delegation flow, paying the network fee. */
  onDelegateAnyway: () => void
}

/**
 * Relative, human-friendly countdown to the relayer's monthly quota reset
 * ("in 6 days" / "tomorrow"). The reset is always a UTC month boundary, so
 * the granularity is days — never minutes/seconds. Falls back to the generic
 * "next month" when the timestamp is missing or unparseable.
 */
export function formatResetCountdown(
  resetsAt: string | null | undefined,
): string {
  if (!resetsAt) return 'next month'
  const resetMs = new Date(resetsAt).getTime()
  if (Number.isNaN(resetMs)) return 'next month'
  const diffMs = resetMs - Date.now()
  if (diffMs <= 0) return 'soon'
  const days = Math.ceil(diffMs / 86_400_000)
  if (days === 1) return 'tomorrow'
  return `in ${days} days`
}

/**
 * Title + body copy per reason, straight from the Figma frames
 * ("Delegation modal — not free (states)", nodes 5685:153 / 5723:239).
 *
 * The `below-minimum` state isn't drawn in Figma (only the 0-ENS state is);
 * its copy follows the same voice but interpolates the relayer's dynamic
 * threshold — never hardcode the minimum.
 *
 * Important copy constraint: the threshold gates GAS SPONSORSHIP ONLY.
 * Earning rewards never requires the threshold — don't imply otherwise.
 */
function getCopy(
  reason: DelegationEligibilityReason,
  minEns: string,
  resetLabel: string,
) {
  switch (reason) {
    case 'no-ens':
      return {
        title: 'You need some ENS first',
        body: 'Your wallet holds 0 ENS, so gas is not sponsored and nothing is earning yet. Add some ENS to delegate with sponsored gas and start earning. You can still delegate now and pay the fee yourself, about $2. Your choice sticks and applies once you hold ENS.',
      }
    case 'below-minimum':
      return {
        title: 'You need more ENS for free gas',
        body: `Free gas covers wallets holding at least ${minEns} ENS and yours holds less than that. Add some ENS to delegate with sponsored gas. You can still delegate now and pay the fee yourself, about $2. Gas is the only difference and your rewards stay the same.`,
      }
    case 'rate-limited':
      return {
        title: 'No free delegations left this month',
        body: `You've used all your sponsored delegations for this month, so this one needs the network fee, about $2. Your free allowance resets ${resetLabel} and your rewards are unaffected.`,
      }
    case 'relayer-paused':
      return {
        title: 'Sponsored gas is paused',
        body: 'Sponsored gas is paused right now, so this delegation needs the network fee, about $2. Nothing else changes and your rewards are unaffected.',
      }
  }
}

/**
 * Reasons where buying ENS would not unlock free gas (the block isn't a
 * balance shortfall), so the modal offers "Maybe later" instead of "Buy ENS".
 */
const NON_BALANCE_REASONS: ReadonlySet<DelegationEligibilityReason> = new Set([
  'rate-limited',
  'relayer-paused',
])

/**
 * Shown when a connected wallet clicks Delegate but this delegation won't
 * get sponsored (free) gas — the wallet's ENS balance is below the
 * sponsorship threshold, it holds no ENS at all, or the relayer is paused.
 * Explains why gas isn't covered and lets the user continue delegating
 * while paying the network fee themselves (and, for the balance-gated
 * states, buy ENS on Uniswap).
 *
 * Layout per Figma: stacked full-width actions on every viewport, with the
 * secondary action on top and the primary action at the bottom.
 */
export function DelegationEligibilityModal({
  open,
  reason,
  resetsAt,
  onClose,
  onDelegateAnyway,
}: DelegationEligibilityModalProps) {
  const minEns = useGasSponsorshipMinEns()
  const { title, body } = getCopy(reason, minEns, formatResetCountdown(resetsAt))

  return (
    <Dialog
      open={open}
      variant="closable"
      title={title}
      onDismiss={onClose}
      onClose={onClose}
    >
      <Body>
        <Paragraph>{body}</Paragraph>

        <Actions>
          {NON_BALANCE_REASONS.has(reason) ? (
            <>
              <Button colorStyle="blueSecondary" onClick={onClose}>
                Maybe later
              </Button>
              <Button colorStyle="bluePrimary" onClick={onDelegateAnyway}>
                Delegate and pay gas
              </Button>
            </>
          ) : (
            <>
              <Button colorStyle="blueSecondary" onClick={onDelegateAnyway}>
                Delegate and pay gas
              </Button>
              <Button
                as="a"
                href={UNISWAP_BUY_ENS_URL}
                target="_blank"
                rel="noopener noreferrer"
                colorStyle="bluePrimary"
              >
                Buy ENS
              </Button>
            </>
          )}
        </Actions>
      </Body>
    </Dialog>
  )
}

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
  /* Thorin's Dialog hugs its content, so width: 100% collapses to the
     buttons' intrinsic width. The Figma card is 360px wide; the Dialog
     adds ~24px padding per side, so the body owns the remaining 312px. */
  width: min(312px, calc(100vw - 6rem));
`

const Paragraph = styled.p`
  margin: 0;
  color: ${tokens.color.text};
  font-size: ${tokens.font.size.lg};
  line-height: 1.56;
  text-align: center;
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  width: 100%;
`
