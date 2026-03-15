import styled from 'styled-components'

export type SortOption = 'votingPower' | 'activity' | 'random'

interface SortControlsProps {
  value: SortOption
  onChange: (v: SortOption) => void
}

const options: { value: SortOption; label: string }[] = [
  { value: 'votingPower', label: 'Voting Power' },
  { value: 'activity', label: 'Activity' },
  { value: 'random', label: 'Random' },
]

const Wrapper = styled.div`
  display: flex;
  gap: 8px;
`

const Pill = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.text : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.background : theme.colors.text};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    opacity: 0.8;
  }
`

export function SortControls({ value, onChange }: SortControlsProps) {
  return (
    <Wrapper>
      {options.map((opt) => (
        <Pill
          key={opt.value}
          $active={value === opt.value}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </Pill>
      ))}
    </Wrapper>
  )
}
