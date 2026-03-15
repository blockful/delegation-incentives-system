import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { TierDots } from '@/components/shared/TierDots'
import type { TierEntry } from '@/api/types'

interface TierTableSectionProps {
  tiers: TierEntry[]
}

const Section = styled.section`
  padding: 48px 20px;

  @media (min-width: 768px) {
    padding: 80px 40px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    align-items: start;
    max-width: 1200px;
    margin: 0 auto;
  }
`

const CopyBlock = styled.div``

const Eyebrow = styled.p`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #4A5C63;
  margin: 0 0 12px;
`

const Heading = styled.h2`
  font-size: 28px;
  font-weight: 800;
  line-height: 1.15;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 16px;

  @media (min-width: 768px) {
    font-size: 36px;
  }
`

const Description = styled.p`
  font-size: 15px;
  line-height: 1.6;
  color: #4A5C63;
  margin: 0 0 28px;
`

const ShareButton = styled(Button)`
  margin-bottom: 32px;

  @media (min-width: 768px) {
    margin-bottom: 0;
  }
`

const Table = styled.div`
  display: flex;
  flex-direction: column;
`

const TierRow = styled.div<{ $isCurrent: boolean }>`
  display: grid;
  grid-template-columns: 80px 1fr auto;
  align-items: center;
  padding: 14px 16px;
  gap: 12px;
  border-bottom: 1px solid #E5E5E5;
  background: ${({ $isCurrent }) =>
    $isCurrent ? 'rgba(0, 124, 35, 0.08)' : 'transparent'};
  border-radius: ${({ $isCurrent }) => ($isCurrent ? '10px' : '0')};
  opacity: ${({ $isCurrent }) => ($isCurrent ? 1 : 0.85)};
`

const TierLabel = styled.span<{ $isCurrent: boolean }>`
  font-size: 14px;
  font-weight: ${({ $isCurrent }) => ($isCurrent ? 700 : 500)};
  color: ${({ theme }) => theme.colors.text};
`

const ApyInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
`

const StatusIcon = styled.span<{ $unlocked: boolean }>`
  font-size: 14px;
  color: ${({ $unlocked }) => ($unlocked ? '#007C23' : '#4A5C63')};
`

export function TierTableSection({ tiers }: TierTableSectionProps) {
  return (
    <Section>
      <CopyBlock>
        <Eyebrow>The more people join, the more you earn</Eyebrow>
        <Heading>
          Your APY grows when others delegate too
        </Heading>
        <Description>
          This isn&rsquo;t a fixed yield. The reward pool unlocks higher tiers as
          more ENS gets delegated to active voters &mdash; so every person you
          bring in increases everyone&rsquo;s earnings.
        </Description>
        <ShareButton colorStyle="bluePrimary" width="max">
          Share &amp; Grow the Pool
        </ShareButton>
      </CopyBlock>

      <Table data-testid="tier-table">
        {tiers.map((tier) => (
          <TierRow key={tier.index} $isCurrent={tier.isCurrent}>
            <TierLabel $isCurrent={tier.isCurrent}>
              Tier #{tier.index + 1}
            </TierLabel>
            <TierDots tierIndex={tier.index} totalTiers={tiers.length} />
            <ApyInfo>
              ~{tier.estimatedApyPct ?? '—'}% APY
              <StatusIcon $unlocked={tier.isUnlocked}>
                {tier.isUnlocked ? '\u2705' : '\uD83D\uDD12'}
              </StatusIcon>
            </ApyInfo>
          </TierRow>
        ))}
      </Table>
    </Section>
  )
}
