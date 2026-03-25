import React, { useEffect, useRef, useState } from 'react'
import styled, { css } from 'styled-components'
import { Button, Card, CheckSVG, LockSVG } from '@ensdomains/thorin'
import type { TierEntry } from '@/api/types'
import { tokens } from '@/styles/tokens'
import { fadeInUp } from '@/styles/primitives'

interface TierTableSectionProps {
  tiers: TierEntry[]
}

const Section = styled.section`
  padding: ${tokens.spacing['7xl']} ${tokens.spacing.xl};
  border-bottom: 1px solid ${tokens.color.borderLight};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['7xl']} ${tokens.spacing['4xl']};
  }
`

const Inner = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['6xl']};

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    gap: ${tokens.spacing['4xl']};
  }
`

const CopyBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${tokens.spacing.lg};
  flex-shrink: 0;

  @media (min-width: 768px) {
    flex: 1;
  }
`

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
  margin-bottom: ${tokens.spacing.sm};
`

const Eyebrow = styled.span`
  display: block;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${tokens.color.darkGray};
`

const Heading = styled.h2`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.darkBlue};
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 0;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['5xl']};
  }
`

const Description = styled.p`
  font-size: ${tokens.font.size.lg};
  line-height: 1.5;
  color: ${tokens.color.darkGray};
  margin: 0;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size.xl};
  }
`

const TierCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
  width: 100%;
  min-width: 0;
  box-shadow: ${tokens.shadow.sm};
`

const Separator = styled.div`
  width: 100%;
  height: 1px;
  background: ${tokens.color.borderLight};
  flex-shrink: 0;
`

const AnimatedRow = styled.div<{ $index: number; $visible: boolean }>`
  opacity: 0;
  ${({ $visible, $index }) =>
    $visible &&
    css`
      animation: ${fadeInUp} 0.4s ease both;
      animation-delay: ${$index * 0.08}s;
    `}
`

const TierRow = styled.div<{ $isCurrent: boolean; $isLocked: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${tokens.spacing['2xl']};
  padding: 6px ${tokens.spacing.sm};
  border-radius: ${tokens.radius.sm};
  background: ${({ $isCurrent }) => ($isCurrent ? tokens.color.tierHighlight : 'transparent')};
  opacity: ${({ $isLocked }) => ($isLocked ? 0.5 : 1)};
`

const TierLabel = styled.span`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
  flex-shrink: 0;
`

const TierRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
`

const Dots = styled.div`
  display: flex;
  gap: ${tokens.spacing.xs};
  align-items: center;
`

const Dot = styled.div<{ $filled: boolean; $isUnlocked: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $filled, $isUnlocked }) =>
    $filled
      ? ($isUnlocked ? tokens.color.positiveEmphasis : tokens.color.darkBlue)
      : tokens.color.middleGray};
`

const ApyText = styled.span<{ $isUnlocked: boolean }>`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.medium};
  color: ${({ $isUnlocked }) => ($isUnlocked ? tokens.color.positiveEmphasis : tokens.color.darkBlue)};
  width: 120px;
  text-align: right;
  flex-shrink: 0;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`

const StatusIcon = styled.span`
  display: flex;
  align-items: center;
  flex-shrink: 0;

  svg {
    width: 14px;
    height: 14px;
  }
`

export function TierTableSection({ tiers }: TierTableSectionProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <Section>
      <Inner>
      <CopyBlock>
        <TitleBlock>
          <Eyebrow>The more people join, the more you earn</Eyebrow>
          <Heading>Your APY grows when others delegate too</Heading>
          <Description>
            This isn't a fixed yield. The reward pool unlocks higher tiers as
            more ENS gets delegated to active voters — so every person you
            bring in increases everyone's earnings.
          </Description>
        </TitleBlock>
        <div style={{ display: 'inline-flex' }}>
          <Button colorStyle="bluePrimary">Share &amp; Grow the Pool</Button>
        </div>
      </CopyBlock>

      <div ref={cardRef} style={{ flex: 1, minWidth: 0 }}>
      <TierCard data-testid="tier-table">
        {tiers.map((tier, i) => {
          const isLocked = !tier.isUnlocked
          const apyLabel = tier.estimatedApyPct != null
            ? `~${tier.estimatedApyPct}% APY`
            : '—'
          return (
            <React.Fragment key={tier.index}>
              {i > 0 && <Separator />}
              <AnimatedRow $index={i} $visible={visible}>
              <TierRow $isCurrent={tier.isCurrent} $isLocked={isLocked}>
                <TierLabel>Tier #{tier.index + 1}</TierLabel>
                <TierRight>
                  <Dots>
                    {Array.from({ length: tiers.length }, (_, j) => (
                      <Dot
                        key={j}
                        $filled={j <= tier.index}
                        $isUnlocked={tier.isUnlocked}
                      />
                    ))}
                  </Dots>
                  <ApyText $isUnlocked={tier.isUnlocked}>{apyLabel}</ApyText>
                  <StatusIcon>
                    {tier.isUnlocked ? (
                      <CheckSVG style={{ color: tokens.color.positiveEmphasis }} />
                    ) : (
                      <LockSVG style={{ color: tokens.color.darkBlue }} />
                    )}
                  </StatusIcon>
                </TierRight>
              </TierRow>
              </AnimatedRow>
            </React.Fragment>
          )
        })}
      </TierCard>
      </div>
      </Inner>
    </Section>
  )
}
