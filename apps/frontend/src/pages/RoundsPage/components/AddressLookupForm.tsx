import type { FormEvent } from 'react'
import styled from 'styled-components'
import { tokens } from '@/styles'

interface AddressLookupFormProps {
  value: string
  activeAddress: string
  sourceLabel: string
  error: string | null
  onChange: (value: string) => void
  onSubmit: () => void
  onClear: () => void
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

export function AddressLookupForm({
  value,
  activeAddress,
  sourceLabel,
  error,
  onChange,
  onSubmit,
  onClear,
}: AddressLookupFormProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
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
      <Meta>
        <span>{activeAddress ? sourceLabel : 'No address selected'}</span>
        {error ? <ErrorText>{error}</ErrorText> : null}
      </Meta>
    </Form>
  )
}
