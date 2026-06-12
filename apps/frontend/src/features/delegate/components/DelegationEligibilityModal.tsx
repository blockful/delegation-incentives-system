import { Button, Dialog } from '@ensdomains/thorin'
import styled from 'styled-components'

import { tokens } from '@/styles'

import { useGasSponsorshipMinEns } from '../hooks/useGaslessRelayer'

/**
 * Uniswap swap page pre-filled with the ENS token as the output currency.
 * Opened in a new tab by the "Buy ENS" primary action.
 */
export const UNISWAP_BUY_ENS_URL =
  'https://app.uniswap.org/swap?outputCurrency=0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72'

/**
 * Why this delegation won't get sponsored gas:
 * - `no-ens`: the wallet holds no ENS at all.
 * - `below-minimum`: the wallet holds some ENS, but less than the
 *   sponsorship threshold.
 * - `relayer-paused`: the relayer can't sponsor anyone right now (global),
 *   regardless of the wallet's balance.
 *
 * A fourth case — wallet not connected — never reaches this modal: the
 * Delegate trigger opens the wallet-connect (AppKit) modal instead.
 */
export type DelegationEligibilityReason =
  | 'no-ens'
  | 'below-minimum'
  | 'relayer-paused'

export interface DelegationEligibilityModalProps {
  open: boolean
  reason: DelegationEligibilityReason
  onClose: () => void
  /** Continue with the regular delegation flow, paying the network fee. */
  onDelegateAnyway: () => void
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
function getCopy(reason: DelegationEligibilityReason, minEns: string) {
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
    case 'relayer-paused':
      return {
        title: 'Sponsored gas is paused',
        body: 'Sponsored gas is paused right now, so this delegation needs the network fee, about $2. Nothing else changes and your rewards are unaffected.',
      }
  }
}

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
  onClose,
  onDelegateAnyway,
}: DelegationEligibilityModalProps) {
  const minEns = useGasSponsorshipMinEns()
  const { title, body } = getCopy(reason, minEns)

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
          {reason === 'relayer-paused' ? (
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
  width: 100%;
  max-width: ${tokens.maxWidth.xs};
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
