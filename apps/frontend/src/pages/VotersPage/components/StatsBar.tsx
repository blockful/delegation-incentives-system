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

/**
 * Outer wrapper — on mobile, breaks out of the page's 16px horizontal
 * padding so its inner scroll surface can reach the viewport edges.
 * Desktop keeps the normal 100% width (cards stay inside the page container).
 */
const BarOverflowWrap = styled.div`
  width: 100%;

  @media (max-width: 767px) {
    margin-left: -${tokens.spacing.lg};
    margin-right: -${tokens.spacing.lg};
    width: auto;
  }
`

/**
 * Inner wrapper — flex row with horizontal scroll for the cards.
 * Padding on mobile keeps the first card visually aligned with the rest
 * of the page content at scroll origin (matches the parent's 16px padding).
 */
const Bar = styled.div`
  display: flex;
  gap: ${tokens.spacing.md};
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 767px) {
    padding: 0 ${tokens.spacing.lg};
  }
`

const Cell = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
  padding: ${tokens.spacing.xl};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
  flex: 1 0 280px;
  min-width: 280px;
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
    <BarOverflowWrap>
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
        <CellLabel>ENS delegated to active voters</CellLabel>
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
    </BarOverflowWrap>
  )
}
