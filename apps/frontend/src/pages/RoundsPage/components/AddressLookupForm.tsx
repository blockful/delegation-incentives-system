import type { FormEvent } from 'react'
import styled from 'styled-components'
import { tokens } from '@/styles'

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
  border: 1px solid ${tokens.color.borderLight};
  background: ${tokens.color.bgSubtle};
  color: ${tokens.color.darkGray};
  padding: 4px 10px;
  border-radius: ${tokens.radius.pill};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  cursor: pointer;
  line-height: 1.2;
  transition: border-color ${tokens.transition.fast}, color ${tokens.transition.fast};

  &:hover {
    border-color: ${tokens.color.blue};
    color: ${tokens.color.blue};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
  }
`

const ChipGlyph = styled.span`
  font-size: ${tokens.font.size.sm};
  line-height: 1;
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
  const showUseConnectedChip = Boolean(
    connectedAddress &&
      (trimmedValue === '' || trimmedValue.toLowerCase() !== connectedAddress.toLowerCase()),
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
      {showUseConnectedChip ? (
        <AffordanceRow>
          <ConnectedWalletChip
            type="button"
            onClick={handleUseConnected}
            aria-label="Use connected wallet address"
          >
            <ChipGlyph aria-hidden>↩</ChipGlyph>
            Use connected wallet
          </ConnectedWalletChip>
        </AffordanceRow>
      ) : null}
      <Meta>
        <span>{activeAddress ? sourceLabel : 'No address selected'}</span>
        {error ? <ErrorText>{error}</ErrorText> : null}
      </Meta>
    </Form>
  )
}
