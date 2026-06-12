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
 * Why the connected wallet doesn't qualify for sponsored gas:
 * - `no-ens`: the wallet holds no ENS at all.
 * - `below-minimum`: the wallet holds some ENS, but less than the
 *   sponsorship threshold.
 *
 * A third case — wallet not connected — never reaches this modal: the
 * Delegate trigger opens the wallet-connect (AppKit) modal instead.
 */
export type DelegationEligibilityReason = 'no-ens' | 'below-minimum'

export interface DelegationEligibilityModalProps {
  open: boolean
  reason: DelegationEligibilityReason
  onClose: () => void
  /** Continue with the regular delegation flow, paying the network fee. */
  onDelegateAnyway: () => void
}

/**
 * Shown when a connected wallet clicks Delegate but doesn't qualify for
 * sponsored (free) gas — its ENS balance is below the sponsorship threshold,
 * or it holds no ENS at all. Explains why gas isn't covered and lets the
 * user either buy ENS on Uniswap or continue delegating while paying the
 * network fee themselves.
 *
 * Important copy constraint: the threshold gates GAS SPONSORSHIP ONLY.
 * Earning rewards never requires the threshold — don't imply otherwise.
 */
export function DelegationEligibilityModal({
  open,
  reason,
  onClose,
  onDelegateAnyway,
}: DelegationEligibilityModalProps) {
  const minEns = useGasSponsorshipMinEns()

  return (
    <Dialog
      open={open}
      variant="closable"
      title="Delegation isn't gas-free for this wallet"
      onDismiss={onClose}
      onClose={onClose}
    >
      <Body>
        {reason === 'no-ens' ? (
          <>
            <Paragraph>
              This wallet doesn&apos;t hold any ENS, so the network fee
              isn&apos;t sponsored — free delegation is reserved for wallets
              holding at least {minEns} ENS — and without ENS there&apos;s
              nothing to earn rewards on yet.
            </Paragraph>
            <Paragraph>
              You can still delegate now and pay the network fee yourself.
              Your choice is saved on-chain and applies automatically to any
              ENS this wallet receives later.
            </Paragraph>
          </>
        ) : (
          <>
            <Paragraph>
              Free delegation is sponsored for wallets holding at least{' '}
              {minEns} ENS. This wallet holds less than that, so the network
              fee isn&apos;t covered.
            </Paragraph>
            <Paragraph>
              You can still delegate now and pay the network fee yourself —
              this only affects gas, not your reward eligibility.
            </Paragraph>
          </>
        )}

        <Actions>
          <Button
            as="a"
            href={UNISWAP_BUY_ENS_URL}
            target="_blank"
            rel="noopener noreferrer"
            colorStyle="bluePrimary"
          >
            Buy ENS
          </Button>
          <Button colorStyle="blueSecondary" onClick={onDelegateAnyway}>
            Delegate and pay gas
          </Button>
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
  max-width: 480px;
`

const Paragraph = styled.p`
  margin: 0;
  color: ${tokens.color.textMuted};
  font-size: ${tokens.font.size.base};
  line-height: 1.5;
  text-align: center;
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  width: 100%;
  margin-top: ${tokens.spacing.sm};
`
