import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

interface RoundDetailsSectionProps {
  balanceEns: string
  roundEnds: string
  roundEndDate: string
  nextTierApyPct?: string
  nextTierVpNeeded?: string
  currentTierIndex: number
  totalTiers: number
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: ${tokens.color.border};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.lg};
  overflow: hidden;
`

const StatCell = styled.div`
  background: ${tokens.color.surface};
  padding: ${tokens.spacing.xl} ${tokens.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const StatLabel = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${tokens.color.textMuted};
`

const StatValue = styled.span`
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
`

const StatHint = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textFaint};
`

const AccentHint = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.accent};
  font-weight: ${tokens.font.weight.medium};
`

function formatVpNeeded(vpWei: string): string {
  const num = Number(vpWei) / 1e18
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  }
  if (num >= 1_000) {
    return `${Math.round(num / 1_000)}K`
  }
  return Math.round(num).toString()
}

export function RoundDetailsSection({
  balanceEns,
  roundEnds,
  roundEndDate,
  nextTierApyPct,
  nextTierVpNeeded,
  currentTierIndex,
  totalTiers,
}: RoundDetailsSectionProps) {
  const isMaxTier = currentTierIndex >= totalTiers - 1
  const hasNextTierData = nextTierApyPct && nextTierVpNeeded

  return (
    <Grid>
      <StatCell>
        <StatLabel>Balance</StatLabel>
        <StatValue>{balanceEns} ENS</StatValue>
        <StatHint>180-day avg</StatHint>
      </StatCell>
      <StatCell>
        <StatLabel>Round Ends</StatLabel>
        <StatValue>{roundEnds}</StatValue>
        <StatHint>{roundEndDate}</StatHint>
      </StatCell>
      <StatCell>
        <StatLabel>Next Tier</StatLabel>
        {isMaxTier ? (
          <>
            <StatValue>Max</StatValue>
            <AccentHint>Tier {totalTiers} reached</AccentHint>
          </>
        ) : hasNextTierData ? (
          <>
            <StatValue>{nextTierApyPct}%</StatValue>
            <AccentHint>+{formatVpNeeded(nextTierVpNeeded)} VP needed</AccentHint>
          </>
        ) : (
          <>
            <StatValue>Tier {currentTierIndex + 2}</StatValue>
            <StatHint>Delegate more to unlock</StatHint>
          </>
        )}
      </StatCell>
    </Grid>
  )
}
