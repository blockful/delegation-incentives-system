import type { FormEvent } from 'react'
import styled from 'styled-components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWallet } from '@fortawesome/free-solid-svg-icons'
import { tokens } from '@/styles'
import { truncateAddress } from '@/utils/format'

interface AddressLookupFormProps {
  value: string
  activeAddress: string
  sourceLabel: string
  error: string | null
  onChange: (value: string) => void
  /**
   * Submit the lookup. Called with no args for normal form submit (parent reads state).
   * Called with an explicit address override from the "Use connected wallet" chip,
   * which bypasses stale-state read after onChange in the same event tick.
   */
  onSubmit: (addressOverride?: string) => void
  onClear: () => void
  /** 0x... of the connected wallet, if any. Surfaces the "Use connected wallet" chip. */
  connectedAddress?: string
}

const Form = styled.form`
  display: grid;
  gap: ${tokens.spacing.sm};
  min-width: 0;
`

const Row = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: ${tokens.spacing.sm};

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const Input = styled.input`
  min-width: 0;
  width: 100%;
  border: 1px solid ${tokens.color.middleGray};
  border-radius: ${tokens.radius.sm};
  padding: 10px ${tokens.spacing.md};
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkBlue};
  background: ${tokens.color.white};

  &:focus {
    outline: 2px solid ${tokens.color.lightBlue};
    border-color: ${tokens.color.blue};
  }
`

const Button = styled.button<{ $secondary?: boolean }>`
  border: 1px solid ${({ $secondary }) => ($secondary ? tokens.color.middleGray : tokens.color.blue)};
  border-radius: ${tokens.radius.sm};
  padding: 10px ${tokens.spacing.md};
  background: ${({ $secondary }) => ($secondary ? tokens.color.white : tokens.color.blue)};
  color: ${({ $secondary }) => ($secondary ? tokens.color.darkBlue : tokens.color.white)};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    border-color: ${tokens.color.blue};
  }
`

const Meta = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
  flex-wrap: wrap;
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
`

const ErrorText = styled.span`
  color: ${tokens.color.negative};
`

const AffordanceRow = styled.div`
  display: flex;
  gap: ${tokens.spacing.sm};
  flex-wrap: wrap;
`

const ConnectedWalletChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: ${tokens.color.lightBlueOpacity};
  border: 1px solid ${tokens.color.blue};
  border-radius: 9999px;
  color: ${tokens.color.blue};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
  cursor: pointer;
  transition: background ${tokens.transition.fast};

  &:hover {
    background: ${tokens.color.lightBlue};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
  }
`

const ActiveWalletPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: ${tokens.color.status.success.bg};
  border-radius: 9999px;
  color: ${tokens.color.status.success.fg};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
`

export function AddressLookupForm({
  value,
  activeAddress,
  sourceLabel,
  error,
  onChange,
  onSubmit,
  onClear,
  connectedAddress,
}: AddressLookupFormProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
  }

  const trimmedValue = value.trim()
  const connectedLower = connectedAddress?.toLowerCase() ?? ''
  const activeMatchesConnected =
    Boolean(connectedAddress) &&
    activeAddress.toLowerCase() === connectedLower
  const showUseConnectedChip = Boolean(
    connectedAddress &&
      !activeMatchesConnected &&
      (trimmedValue === '' || trimmedValue.toLowerCase() !== connectedLower),
  )

  function handleUseConnected() {
    if (!connectedAddress) return
    onChange(connectedAddress)
    onSubmit(connectedAddress)
  }

  return (
    <Form onSubmit={handleSubmit} aria-label="Inspect address rewards">
      <Row>
        <Input
          aria-label="Wallet address"
          placeholder="0x..."
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button type="submit">Inspect</Button>
        <Button type="button" $secondary onClick={onClear}>Clear</Button>
      </Row>
      {(showUseConnectedChip || activeMatchesConnected) ? (
        <AffordanceRow>
          {showUseConnectedChip ? (
            <ConnectedWalletChip
              type="button"
              onClick={handleUseConnected}
              aria-label="Use my connected wallet address"
            >
              <FontAwesomeIcon icon={faWallet} />
              Use my connected wallet
            </ConnectedWalletChip>
          ) : null}
          {activeMatchesConnected && connectedAddress ? (
            <ActiveWalletPill>
              <FontAwesomeIcon icon={faWallet} />
              Inspecting your wallet · {truncateAddress(connectedAddress)}
            </ActiveWalletPill>
          ) : null}
        </AffordanceRow>
      ) : null}
      {(activeAddress && !activeMatchesConnected) || error ? (
        <Meta>
          {activeAddress && !activeMatchesConnected ? <span>{sourceLabel}</span> : null}
          {error ? <ErrorText>{error}</ErrorText> : null}
        </Meta>
      ) : null}
    </Form>
  )
}
