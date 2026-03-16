import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

interface ProposalBarProps {
  votes: boolean[]
}

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
`

const Segments = styled.div`
  display: flex;
  gap: 2px;
  flex: 1;
`

const Segment = styled.div<{ $voted: boolean }>`
  height: 6px;
  flex: 1;
  border-radius: 4px;
  background: ${({ $voted }) => ($voted ? tokens.color.positive : tokens.color.border)};
`

const Score = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.text};
  white-space: nowrap;
`

export function ProposalBar({ votes }: ProposalBarProps) {
  const voted = votes.filter(Boolean).length
  const total = votes.length

  return (
    <Wrapper>
      <Segments>
        {votes.map((v, i) => (
          <Segment
            key={i}
            $voted={v}
            data-segment
            data-voted={v}
          />
        ))}
      </Segments>
      <Score>
        {voted}/{total}
      </Score>
    </Wrapper>
  )
}
