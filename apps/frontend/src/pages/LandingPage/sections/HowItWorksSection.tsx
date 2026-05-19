import { useEffect, useRef, useState } from 'react'
import styled, { css } from 'styled-components'
import { tokens } from '@/styles/tokens'
import { fadeInUp } from '@/styles/primitives'

const Section = styled.section`
  background: ${tokens.color.surfaceAlt};
  position: relative;
  scroll-margin-top: 96px;

  /* Mobile: just flow normally, no scroll lock. */
  padding: ${tokens.spacing['3xl']} ${tokens.spacing.xl} ${tokens.spacing['2xl']};

  @media (min-width: 768px) {
    /* Desktop: extra height creates the scroll-lock arc. */
    min-height: 200vh;
    padding: 0;
  }
`

const STICKY_TOP_OFFSET = 80 // breathing room above the pinned section

const Sticky = styled.div`
  @media (min-width: 768px) {
    position: sticky;
    top: ${STICKY_TOP_OFFSET}px;
    min-height: calc(100vh - ${STICKY_TOP_OFFSET}px);
    padding: ${tokens.spacing['6xl']} ${tokens.spacing['4xl']} ${tokens.spacing['4xl']};
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
`

const Inner = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  width: 100%;
`

const Header = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: ${tokens.spacing.md};
  margin: 0 auto ${tokens.spacing['5xl']};
  max-width: 800px;

  @media (min-width: 768px) {
    margin: 0 auto ${tokens.spacing['7xl']};
  }
`

const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  padding: 6px 14px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.status.neutral.bg};
  border: 1px solid ${tokens.color.status.neutral.border};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkGray};
`

const Heading = styled.h2`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.bold};
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

const STEP_OFFSET = 180 // px each next column pushes down on desktop
const STEP_BLOCK_HEIGHT = 200 // approx height of one step's content
const STEPS_COUNT = 4
const STAIRCASE_HEIGHT = (STEPS_COUNT - 1) * STEP_OFFSET + STEP_BLOCK_HEIGHT

const StepsRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};

  @media (min-width: 768px) {
    position: relative;
    display: grid;
    grid-template-columns: repeat(${STEPS_COUNT}, 1fr);
    column-gap: 0;
    min-height: ${STAIRCASE_HEIGHT}px;
    gap: 0;
  }
`

const StepCol = styled.div<{
  $index: number
  $animated: boolean
  $visible: boolean
}>`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: ${tokens.spacing.md};
  will-change: transform, opacity;

  /* Mobile: each step is a self-contained card. */
  padding: ${tokens.spacing.xl};
  background: ${tokens.color.white};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.md};

  ${({ $animated, $visible, $index }) =>
    $animated &&
    css`
      opacity: 0;
      ${$visible &&
      css`
        animation: ${fadeInUp} 0.9s cubic-bezier(0.22, 1, 0.36, 1)
          ${$index * 0.55}s both;
      `}
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }

  @media (min-width: 768px) {
    background: transparent;
    border: none;
    border-radius: 0;
    position: relative;
    padding: ${({ $index }) => $index * STEP_OFFSET}px
      ${tokens.spacing.lg} 0 ${tokens.spacing.lg};

    &:not(:first-child)::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 1px;
      background-image: repeating-linear-gradient(
        to bottom,
        ${tokens.color.darkGray} 0 4px,
        transparent 4px 10px
      );
      -webkit-mask-image: linear-gradient(
        to bottom,
        transparent 0%,
        black 18%,
        black 82%,
        transparent 100%
      );
      mask-image: linear-gradient(
        to bottom,
        transparent 0%,
        black 18%,
        black 82%,
        transparent 100%
      );
      opacity: 0.2;
    }

    &:first-child {
      padding-left: 0;
    }
  }
`

const NumberBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: ${tokens.color.white};
  border: 1px solid ${tokens.color.borderLight};
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  box-shadow: ${tokens.shadow.sm};
`

const StepTitle = styled.h3`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  margin: 0;
`

const StepDesc = styled.p`
  font-size: ${tokens.font.size.base};
  line-height: 1.55;
  color: ${tokens.color.darkGray};
  margin: 0;

  @media (min-width: 768px) {
    max-width: 260px;
  }
`

const TagPill = styled.span<{ $bg: string; $color: string }>`
  display: inline-flex;
  border-radius: ${tokens.radius.pill};
  padding: 4px 10px;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`

type Step = {
  number: string
  title: string
  desc: string
  tag: string
  tagBg: string
  tagColor: string
}

function buildSteps(currentAprPct: string | null): Step[] {
  const aprTag = currentAprPct
    ? `Currently earning ~${currentAprPct}% APR`
    : 'Earn APR on your ENS'
  return [
    {
      number: '1',
      title: 'Delegate to an active voter',
      desc: 'Pick a delegate who consistently votes on ENS proposals. You keep your tokens, and gas is sponsored.',
      tag: 'Gas sponsored. Free to delegate.',
      tagBg: tokens.color.tierHighlight,
      tagColor: tokens.color.positiveEmphasis,
    },
    {
      number: '2',
      title: 'Your share grows with time',
      desc: 'Rewards are based on your average ENS balance over the last 180 days. Longer holding means a bigger share.',
      tag: 'No claiming needed',
      tagBg: tokens.color.lightBlue,
      tagColor: tokens.color.blue,
    },
    {
      number: '3',
      title: 'Receive ENS at round end',
      desc: 'If your share is 1 ENS or more, it’s sent directly to your wallet at the end of each monthly round.',
      tag: aprTag,
      tagBg: tokens.color.lightOrange,
      tagColor: tokens.color.orange,
    },
    {
      number: '4',
      title: 'Small balance? Enter the lottery',
      desc: 'Payouts under 1 ENS pool together until they reach 10 ENS, and one winner takes the full prize.',
      tag: 'Lottery prize: 10 ENS',
      tagBg: tokens.color.lightOrange,
      tagColor: tokens.color.orange,
    },
  ]
}

// Reveal arc inside the section's scroll-lock range (0..1):
// Steps stagger across [STEP_REVEAL_START, STEP_REVEAL_END].
const STEP_REVEAL_START = 0.08
const STEP_REVEAL_END = 0.78
const RISE_PX = 80

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

interface HowItWorksSectionProps {
  currentAprPct?: string | null
}

export function HowItWorksSection({ currentAprPct = null }: HowItWorksSectionProps = {}) {
  const sectionRef = useRef<HTMLElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(1)
  const [enabled, setEnabled] = useState(false)
  const [stepsVisible, setStepsVisible] = useState(false)
  const steps = buildSteps(currentAprPct)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const desktop = window.matchMedia('(min-width: 768px)').matches
    setEnabled(!reduce && desktop)
    if (reduce || !desktop) setProgress(1)
    else setProgress(0)
    if (reduce) {
      setStepsVisible(true)
    }
  }, [])

  // Mobile (and any non-scroll-lock context): when the steps row enters the
  // viewport, flip a single flag — each card animates in with an index-based
  // delay (CSS keyframe with stagger), so the reveal feels orchestrated.
  useEffect(() => {
    if (enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const el = stepsRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStepsVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -5% 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const el = sectionRef.current
    if (!el) return

    let raf = 0
    const update = () => {
      raf = 0
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      // Lock range: from when the section's top hits viewport top, until its
      // bottom hits viewport bottom. During this window the sticky child is
      // pinned and we drive the reveal.
      const range = rect.height - vh
      if (range <= 0) {
        setProgress(1)
        return
      }
      setProgress(clamp01(-rect.top / range))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [enabled])

  const stepSpan = (STEP_REVEAL_END - STEP_REVEAL_START) / STEPS_COUNT

  return (
    <Section id="how-it-works" ref={sectionRef}>
      <Sticky>
        <Inner>
          <Header>
            <Eyebrow>How it works</Eyebrow>
            <Heading>
              Simple to join. <br />
              Better when more people do.
            </Heading>
            <Description>
              ENS governance is only as strong as its participation.
              <br />
              This program makes it worth your while.
            </Description>
          </Header>

          <StepsRow ref={stepsRef}>
            {steps.map((step, i) => {
              const desktopStyle = enabled
                ? (() => {
                    const start = STEP_REVEAL_START + i * stepSpan
                    const end = start + stepSpan * 1.5 // overlap with next step
                    const local = clamp01((progress - start) / (end - start))
                    const eased = easeOutCubic(local)
                    const ty = (1 - eased) * RISE_PX
                    return {
                      transform: `translate3d(0, ${ty}px, 0)`,
                      opacity: eased,
                    }
                  })()
                : undefined
              return (
                <StepCol
                  key={step.number}
                  $index={i}
                  $animated={!enabled}
                  $visible={stepsVisible}
                  style={desktopStyle}
                >
                  <NumberBadge>{step.number}</NumberBadge>
                  <StepTitle>{step.title}</StepTitle>
                  <StepDesc>{step.desc}</StepDesc>
                  <TagPill $bg={step.tagBg} $color={step.tagColor}>
                    {step.tag}
                  </TagPill>
                </StepCol>
              )
            })}
          </StepsRow>
        </Inner>
      </Sticky>
    </Section>
  )
}
