import React, { useEffect, useRef, useState } from 'react'
import styled, { css } from 'styled-components'
import { Button } from '@ensdomains/thorin'
import type { TierEntry } from '@/api/types'
import { tokens } from '@/styles/tokens'
import { fadeInUp } from '@/styles/primitives'
import { TierLadderRow } from '@/components/shared/TierLadderRow'

interface TierTableSectionProps {
  tiers: TierEntry[]
}

const Section = styled.section`
  padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl};
  border-bottom: 1px solid ${tokens.color.borderLight};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['7xl']} ${tokens.spacing['4xl']};
  }
    @media (max-width: 480px) {
    padding-top: 0;
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
    @media (max-width: 480px) {
      gap: ${tokens.spacing['3xl']};
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
  font-weight: ${tokens.font.weight.semibold};
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

const TierCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
  width: 100%;
  min-width: 0;
  box-shadow: ${tokens.shadow.sm};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.card};
  background: ${tokens.color.surface};
  padding: ${tokens.spacing.md};
  overflow: hidden;

    @media (max-width: 480px) {
      border: 1px solid transparent;
      background: transparent;
       border-radius: none;
       box-shadow: none;
       padding: 0;
  }
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

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }
`

const CtaWrap = styled.div`
  display: block;
  width: 100%;

  button {
    width: 100%;
    justify-content: center;
  }

  @media (min-width: 768px) {
    display: inline-flex;
    width: auto;

    button {
      width: auto;
    }
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

  const currentIndex = tiers.findIndex((t) => t.isCurrent)

  return (
    <Section>
      <Inner>
      <CopyBlock>
        <TitleBlock>
          <Eyebrow>The more people join, the more you earn</Eyebrow>
          <Heading>Your APR grows when others delegate too</Heading>
          <Description>
            This isn't a fixed yield. The reward pool unlocks higher tiers as
            more ENS gets delegated to active voters — so every person you
            bring in increases everyone's earnings.
          </Description>
        </TitleBlock>
        <CtaWrap>
          <Button colorStyle="bluePrimary">Share &amp; Grow the Pool</Button>
        </CtaWrap>
      </CopyBlock>

      <div ref={cardRef} style={{ flex: 1, minWidth: 0 }}>
      <TierCard data-testid="tier-table">
        {tiers.map((tier, i) => (
          <React.Fragment key={tier.index}>
            {i > 0 && <Separator />}
            <AnimatedRow $index={i} $visible={visible}>
              <TierLadderRow
                tier={tier}
                total={tiers.length}
                isCurrent={i === currentIndex}
              />
            </AnimatedRow>
          </React.Fragment>
        ))}
      </TierCard>
      </div>
      </Inner>
    </Section>
  )
}
