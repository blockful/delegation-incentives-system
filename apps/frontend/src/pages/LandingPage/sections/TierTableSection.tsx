import styled from 'styled-components'
import { CheckSVG, LockSVG } from '@ensdomains/thorin'
import type { TierEntry } from '@/api/types'
import { tokens } from '@/styles/tokens'

interface TierTableSectionProps {
  tiers: TierEntry[]
}

const Section = styled.section`
  padding: ${tokens.spacing['6xl']} ${tokens.spacing.xl};
  border-bottom: 1px solid ${tokens.color.border};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['8xl']} ${tokens.spacing['4xl']};
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: ${tokens.spacing['7xl']};
    align-items: center;
    max-width: 1120px;
    margin: 0 auto;
  }
`

const CopyBlock = styled.div`
  margin-bottom: ${tokens.spacing['4xl']};

  @media (min-width: 768px) {
    margin-bottom: 0;
  }
`

const Eyebrow = styled.span`
  display: block;
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: ${tokens.color.accent};
  margin-bottom: ${tokens.spacing.lg};
`

const Heading = styled.h2`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.extrabold};
  color: ${tokens.color.text};
  line-height: 1.2;
  margin: 0 0 ${tokens.spacing.lg};

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['4xl']};
  }
`

const Description = styled.p`
  font-family: ${tokens.font.serif};
  font-size: 17px;
  line-height: 1.6;
  color: ${tokens.color.textMuted};
  margin: 0;
`

const Table = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const TierRow = styled.div<{ $isCurrent: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px ${tokens.spacing.lg};
  border-radius: ${tokens.radius.md};
  background: ${({ $isCurrent }) =>
    $isCurrent ? '#C5DDCC' : tokens.color.surfaceAlt};
  transition: background ${tokens.transition.fast};
`

const TierLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
`

const TierLabel = styled.span<{ $isCurrent: boolean }>`
  font-size: ${tokens.font.size.base};
  font-weight: ${({ $isCurrent }) => ($isCurrent ? tokens.font.weight.bold : tokens.font.weight.medium)};
  color: ${tokens.color.text};
  min-width: 52px;
`

const TierBar = styled.div`
  display: flex;
  gap: 3px;
  align-items: center;
`

const BarSegment = styled.div<{ $filled: boolean }>`
  width: 16px;
  height: 3px;
  border-radius: 1.5px;
  background: ${({ $filled }) => ($filled ? tokens.color.text : tokens.color.border)};
  transition: background ${tokens.transition.base};

  @media (max-width: 767px) {
    width: ${tokens.spacing.xl};
  }
`

const TierRight = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const ApyText = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.text};
  font-variant-numeric: tabular-nums;
`

const StatusIcon = styled.span<{ $unlocked: boolean }>`
  display: flex;
  align-items: center;
  color: ${({ $unlocked }) => ($unlocked ? tokens.color.positive : tokens.color.textFaint)};

  svg {
    width: 14px;
    height: 14px;
  }
`

export function TierTableSection({ tiers }: TierTableSectionProps) {
  return (
    <Section>
      <CopyBlock>
        <Eyebrow>Reward Tiers</Eyebrow>
        <Heading>
          Your APY grows when others delegate too
        </Heading>
        <Description>
          The reward pool unlocks higher tiers as more ENS gets delegated
          to active voters — every person you bring in increases
          everyone's earnings.
        </Description>
      </CopyBlock>

      <Table data-testid="tier-table">
        {tiers.map((tier) => (
          <TierRow key={tier.index} $isCurrent={tier.isCurrent}>
            <TierLeft>
              <TierLabel $isCurrent={tier.isCurrent}>
                Tier {tier.index + 1}
              </TierLabel>
              <TierBar>
                {Array.from({ length: tiers.length }, (_, i) => (
                  <BarSegment key={i} $filled={i <= tier.index} />
                ))}
              </TierBar>
            </TierLeft>
            <TierRight>
              <ApyText>
                {tier.estimatedApyPct ?? '—'}%
              </ApyText>
              <StatusIcon $unlocked={tier.isUnlocked}>
                {tier.isUnlocked ? <CheckSVG /> : <LockSVG />}
              </StatusIcon>
            </TierRight>
          </TierRow>
        ))}
      </Table>
    </Section>
  )
}
