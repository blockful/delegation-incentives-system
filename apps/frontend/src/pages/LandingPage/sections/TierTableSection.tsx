import styled from 'styled-components'
import { CheckSVG, LockSVG } from '@ensdomains/thorin'
import type { TierEntry } from '@/api/types'

interface TierTableSectionProps {
  tiers: TierEntry[]
}

const Section = styled.section`
  padding: 64px 20px;
  border-bottom: 1px solid #E5E5E5;

  @media (min-width: 768px) {
    padding: 96px 40px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: center;
    max-width: 1120px;
    margin: 0 auto;
  }
`

const CopyBlock = styled.div`
  margin-bottom: 40px;

  @media (min-width: 768px) {
    margin-bottom: 0;
  }
`

const Eyebrow = styled.span`
  display: block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #0080BC;
  margin-bottom: 16px;
`

const Heading = styled.h2`
  font-size: 28px;
  font-weight: 800;
  color: #011A25;
  line-height: 1.2;
  margin: 0 0 16px;

  @media (min-width: 768px) {
    font-size: 36px;
  }
`

const Description = styled.p`
  font-family: 'EB Garamond', 'Georgia', serif;
  font-size: 17px;
  line-height: 1.6;
  color: #4A5C63;
  margin: 0;
`

const Table = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const TierRow = styled.div<{ $isCurrent: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 12px;
  background: ${({ $isCurrent }) =>
    $isCurrent ? '#C5DDCC' : '#f6f6f6'};
  transition: background 0.15s;
`

const TierLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const TierLabel = styled.span<{ $isCurrent: boolean }>`
  font-size: 14px;
  font-weight: ${({ $isCurrent }) => ($isCurrent ? 700 : 500)};
  color: #011A25;
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
  background: ${({ $filled }) => ($filled ? '#011A25' : '#E5E5E5')};
  transition: background 0.2s ease;
`

const TierRight = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const ApyText = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #011A25;
  font-variant-numeric: tabular-nums;
`

const StatusIcon = styled.span<{ $unlocked: boolean }>`
  display: flex;
  align-items: center;
  color: ${({ $unlocked }) => ($unlocked ? '#007C23' : '#C4C7C8')};

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
