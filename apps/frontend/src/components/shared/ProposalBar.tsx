import styled from 'styled-components'

interface ProposalBarProps {
  votes: boolean[]
}

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const Segments = styled.div`
  display: flex;
  gap: 2px;
  flex: 1;
`

const Segment = styled.div<{ $voted: boolean }>`
  height: 6px;
  flex: 1;
  border-radius: 3px;
  background: ${({ $voted }) => ($voted ? '#22C55E' : '#E5E5E5')};
`

const Score = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
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
