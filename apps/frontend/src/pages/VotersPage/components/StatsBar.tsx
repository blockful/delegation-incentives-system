import styled from 'styled-components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faHandshake, faWallet } from '@fortawesome/free-solid-svg-icons'
import { tokens } from '@/styles'
import { formatEnsCompact } from '@/utils/format'

interface StatsBarProps {
  activeVoterCount?: number
  totalDelegatedEns?: string
  holdersEarning?: number
}

const Bar = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${tokens.spacing.md};
  width: 100%;
`

const Cell = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
  padding: ${tokens.spacing.xl};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
`

const ValueRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
`

const CellValue = styled.span`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.1;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`

const IconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: ${tokens.color.textSubtle};
  font-size: 18px;
`

const CellLabel = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  white-space: nowrap;
`

export function StatsBar({
  activeVoterCount,
  totalDelegatedEns,
  holdersEarning,
}: StatsBarProps) {
  return (
    <Bar>
      <Cell>
        <ValueRow>
          <CellValue>{activeVoterCount ?? '—'}</CellValue>
          <IconWrap aria-hidden>
            <FontAwesomeIcon icon={faUsers} />
          </IconWrap>
        </ValueRow>
        <CellLabel>active voters</CellLabel>
      </Cell>
      <Cell>
        <ValueRow>
          <CellValue>{totalDelegatedEns ? formatEnsCompact(totalDelegatedEns) : '—'}</CellValue>
          <IconWrap aria-hidden>
            <FontAwesomeIcon icon={faHandshake} />
          </IconWrap>
        </ValueRow>
        <CellLabel>ENS delegated to active wallets</CellLabel>
      </Cell>
      <Cell>
        <ValueRow>
          <CellValue>{holdersEarning?.toLocaleString('en-US') ?? '—'}</CellValue>
          <IconWrap aria-hidden>
            <FontAwesomeIcon icon={faWallet} />
          </IconWrap>
        </ValueRow>
        <CellLabel>wallets earning</CellLabel>
      </Cell>
    </Bar>
  )
}
