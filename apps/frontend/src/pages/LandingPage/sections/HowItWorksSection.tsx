import React, { useEffect, useRef, useState } from 'react'
import styled, { css } from 'styled-components'
import { Button, Card } from '@ensdomains/thorin'
import { Link } from 'react-router-dom'
import { tokens } from '@/styles/tokens'
import { fadeInUp } from '@/styles/primitives'

const Section = styled.section`
  padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl};
  background: ${tokens.color.surfaceAlt};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['7xl']} ${tokens.spacing['4xl']};
  }
`

const Inner = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
`

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
  margin-bottom: ${tokens.spacing['4xl']};
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

const StepsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing.md};

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`

const StepCardWrapper = styled.div<{ $index: number; $visible: boolean; $desktopOnly?: boolean }>`
  opacity: 0;
  ${({ $visible, $index }) =>
    $visible &&
    css`
      animation: ${fadeInUp} 0.5s ease both;
      animation-delay: ${$index * 0.12}s;
    `}

  ${({ $desktopOnly }) =>
    $desktopOnly &&
    css`
      display: none;

      @media (min-width: 768px) {
        display: block;
      }
    `}
`

const MobileOnlyWrapper = styled.div<{ $index: number; $visible: boolean }>`
  opacity: 0;
  ${({ $visible, $index }) =>
    $visible &&
    css`
      animation: ${fadeInUp} 0.5s ease both;
      animation-delay: ${$index * 0.12}s;
    `}

  @media (min-width: 768px) {
    display: none;
  }
`

const StepCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.lg};
  position: relative;
  box-shadow: ${tokens.shadow.sm};

  @media (min-width: 768px) {
    min-height: 260px;
  }
`

const IconBox = styled.div<{ $bg: string }>`
  width: 40px;
  height: 40px;
  border-radius: ${tokens.radius.card};
  background: ${({ $bg }) => $bg};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const StepNumber = styled.span`
  position: absolute;
  top: ${tokens.spacing.lg};
  right: ${tokens.spacing.lg};
  font-size: 40px;
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.middleGray};
  line-height: 1;
`

const StepTitle = styled.h3`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  margin: 0;
`

const StepDesc = styled.p`
  font-size: ${tokens.font.size.base};
  line-height: 1.5;
  color: ${tokens.color.darkGray};
  margin: 0;
  flex: 1;
`

const TagPill = styled.span<{ $bg: string; $color: string }>`
  display: inline-flex;
  align-self: flex-start;
  border-radius: ${tokens.radius.pill};
  padding: 4px 10px;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`

const OrDivider = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.sm} 0 0;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.gray};
  text-transform: uppercase;
  letter-spacing: 0.08em;

  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${tokens.color.borderLight};
  }
`

const CtaRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
  margin-top: ${tokens.spacing['2xl']};

  a {
    text-decoration: none;
    display: block;

    button {
      width: 100%;
      justify-content: center;
    }
  }

  @media (min-width: 768px) {
    flex-direction: row;

    a {
      display: inline-flex;

      button {
        width: auto;
      }
    }
  }
`

type Step = {
  number: string
  iconBg: string
  iconColor: string
  tagBg: string
  tagColor: string
  title: string
  desc: string
  tag: string
  svgPath: string
  viewBox: string
}

const steps: Step[] = [
  {
    number: '1',
    iconBg: tokens.color.tierHighlight,
    iconColor: tokens.color.positiveEmphasis,
    tagBg: tokens.color.tierHighlight,
    tagColor: tokens.color.positiveEmphasis,
    title: 'Delegate to an active voter',
    desc: 'Pick a delegate who consistently votes on ENS proposals. You keep your tokens.',
    tag: 'Gas sponsored — free to delegate',
    viewBox: '0 0 640 640',
    svgPath:
      'M311.6 95C297.5 75.5 274.9 64 250.9 64C209.5 64 176 97.5 176 138.9L176 141.3C176 205.7 258 274.7 298.2 304.6C311.2 314.3 328.7 314.3 341.7 304.6C381.9 274.6 463.9 205.7 463.9 141.3L463.9 138.9C463.9 97.5 430.4 64 389 64C365 64 342.4 75.5 328.3 95L320 106.7L311.6 95zM141.3 405.5L98.7 448L64 448C46.3 448 32 462.3 32 480L32 544C32 561.7 46.3 576 64 576L384.5 576C413.5 576 441.8 566.7 465.2 549.5L591.8 456.2C609.6 443.1 613.4 418.1 600.3 400.3C587.2 382.5 562.2 378.7 544.4 391.8L424.6 480L312 480C298.7 480 288 469.3 288 456C288 442.7 298.7 432 312 432L384 432C401.7 432 416 417.7 416 400C416 382.3 401.7 368 384 368L231.8 368C197.9 368 165.3 381.5 141.3 405.5z',
  },
  {
    number: '2',
    iconBg: tokens.color.lightBlue,
    iconColor: tokens.color.blue,
    tagBg: tokens.color.lightBlue,
    tagColor: tokens.color.blue,
    title: 'Your share grows with time',
    desc: 'Rewards are based on your average ENS balance over the last 180 days, not just your current balance. Longer holding means a bigger share.',
    tag: 'No claiming needed',
    viewBox: '0 0 640 640',
    svgPath:
      'M160 96C142.3 96 128 110.3 128 128C128 145.7 142.3 160 160 160L178.7 160L73.4 265.4C60.9 277.9 60.9 298.2 73.4 310.7C85.9 323.2 106.2 323.2 118.7 310.7L224 205.3L224 224C224 241.7 238.3 256 256 256C273.7 256 288 241.7 288 224L288 128C288 110.3 273.7 96 256 96L160 96zM467.8 134.1C467.8 155.1 484.9 172.2 505.9 172.2C526.9 172.2 544 155.1 544 134.1C544 113.1 526.9 96 505.9 96C484.9 96 467.8 113.1 467.8 134.1zM343.7 258.2C343.7 279.2 360.8 296.3 381.8 296.3C402.8 296.3 419.9 279.2 419.9 258.2C419.9 237.2 402.8 220.1 381.8 220.1C360.8 220.1 343.7 237.2 343.7 258.2zM505.9 220.1C484.9 220.1 467.8 237.2 467.8 258.2C467.8 279.2 484.9 296.3 505.9 296.3C526.9 296.3 544 279.2 544 258.2C544 237.2 526.9 220.1 505.9 220.1zM220.2 381.8C220.2 402.8 237.3 419.9 258.3 419.9C279.3 419.9 296.4 402.8 296.4 381.8C296.4 360.8 279.3 343.7 258.3 343.7C237.3 343.7 220.2 360.8 220.2 381.8zM381.8 343.7C360.8 343.7 343.7 360.8 343.7 381.8C343.7 402.8 360.8 419.9 381.8 419.9C402.8 419.9 419.9 402.8 419.9 381.8C419.9 360.8 402.8 343.7 381.8 343.7zM467.9 381.8C467.9 402.8 485 419.9 506 419.9C527 419.9 544.1 402.8 544.1 381.8C544.1 360.8 527 343.7 506 343.7C485 343.7 467.9 360.8 467.9 381.8zM134.1 467.8C113.1 467.8 96 484.9 96 505.9C96 526.9 113.1 544 134.1 544C155.1 544 172.2 526.9 172.2 505.9C172.2 484.9 155.1 467.8 134.1 467.8zM220.2 505.9C220.2 526.9 237.3 544 258.3 544C279.3 544 296.4 526.9 296.4 505.9C296.4 484.9 279.3 467.8 258.3 467.8C237.3 467.8 220.2 484.9 220.2 505.9zM381.8 467.8C360.8 467.8 343.7 484.9 343.7 505.9C343.7 526.9 360.8 544 381.8 544C402.8 544 419.9 526.9 419.9 505.9C419.9 484.9 402.8 467.8 381.8 467.8zM467.9 505.9C467.9 526.9 485 544 506 544C527 544 544.1 526.9 544.1 505.9C544.1 484.9 527 467.8 506 467.8C485 467.8 467.9 484.9 467.9 505.9z',
  },
  {
    number: '3a',
    iconBg: tokens.color.lightOrange,
    iconColor: tokens.color.orange,
    tagBg: tokens.color.lightOrange,
    tagColor: tokens.color.orange,
    title: 'Receive ENS at round end',
    desc: 'If your share is 1 ENS or more, it\'s sent directly to your wallet at the end of each monthly round.',
    tag: 'Currently earning ~5.75% APR',
    viewBox: '0 0 640 640',
    svgPath:
      'M128 288C128 182 214 96 320 96C426 96 512 182 512 288C512 394 426 480 320 480C214 480 128 394 128 288zM304 196L304 200C275.2 200.3 252 223.7 252 252.5C252 278.2 270.5 300.1 295.9 304.3L337.6 311.3C343.6 312.3 348 317.5 348 323.6C348 330.5 342.4 336.1 335.5 336.1L280 336C269 336 260 345 260 356C260 367 269 376 280 376L304 376L304 380C304 391 313 400 324 400C335 400 344 391 344 380L344 375.3C369 371.2 388 349.6 388 323.5C388 297.8 369.5 275.9 344.1 271.7L302.4 264.7C296.4 263.7 292 258.5 292 252.4C292 245.5 297.6 239.9 304.5 239.9L352 239.9C363 239.9 372 230.9 372 219.9C372 208.9 363 199.9 352 199.9L344 199.9L344 195.9C344 184.9 335 175.9 324 175.9C313 175.9 304 184.9 304 195.9zM80 408L80 512C80 520.8 87.2 528 96 528L544 528C552.8 528 560 520.8 560 512L560 408C560 394.7 570.7 384 584 384C597.3 384 608 394.7 608 408L608 512C608 547.3 579.3 576 544 576L96 576C60.7 576 32 547.3 32 512L32 408C32 394.7 42.7 384 56 384C69.3 384 80 394.7 80 408z',
  },
  {
    number: '3b',
    iconBg: tokens.color.lightOrange,
    iconColor: tokens.color.orange,
    tagBg: tokens.color.lightOrange,
    tagColor: tokens.color.orange,
    title: 'Small balance? Enter the lottery',
    desc: 'Payouts under 1 ENS pool together until they reach 10 ENS — one winner takes the full prize.',
    tag: 'Lottery prize: 10 ENS',
    viewBox: '0 0 640 640',
    svgPath:
      'M208.3 64L432.3 64C458.8 64 480.4 85.8 479.4 112.2C479.2 117.5 479 122.8 478.7 128L528.3 128C554.4 128 577.4 149.6 575.4 177.8C567.9 281.5 514.9 338.5 457.4 368.3C441.6 376.5 425.5 382.6 410.2 387.1C390 415.7 369 430.8 352.3 438.9L352.3 512L416.3 512C434 512 448.3 526.3 448.3 544C448.3 561.7 434 576 416.3 576L224.3 576C206.6 576 192.3 561.7 192.3 544C192.3 526.3 206.6 512 224.3 512L288.3 512L288.3 438.9C272.3 431.2 252.4 416.9 233 390.6C214.6 385.8 194.6 378.5 175.1 367.5C121 337.2 72.2 280.1 65.2 177.6C63.3 149.5 86.2 127.9 112.3 127.9L161.9 127.9C161.6 122.7 161.4 117.5 161.2 112.1C160.2 85.6 181.8 63.9 208.3 63.9zM165.5 176L113.1 176C119.3 260.7 158.2 303.1 198.3 325.6C183.9 288.3 172 239.6 165.5 176zM444 320.8C484.5 297 521.1 254.7 527.3 176L475 176C468.8 236.9 457.6 284.2 444 320.8z',
  },
]

const step3a = steps[2]
const step3b = steps[3]

function StepIcon({ step }: { step: Step }) {
  return (
    <IconBox $bg={step.iconBg}>
      <svg width="24" height="24" viewBox={step.viewBox} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d={step.svgPath} fill={step.iconColor} />
      </svg>
    </IconBox>
  )
}

export function HowItWorksSection() {
  const gridRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = gridRef.current
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
        <Header>
          <Eyebrow>HOW IT WORKS</Eyebrow>
          <Heading>
            Simple to join. <br />
            Better when more people do.
          </Heading>
          <Description>
            ENS governance is only as strong as its participation. This program makes it worth your while.
          </Description>
        </Header>

        <StepsGrid ref={gridRef}>
          {/* Steps 1 and 2 — always visible */}
          {steps.slice(0, 2).map((step, i) => (
            <StepCardWrapper key={step.number} $index={i} $visible={visible}>
              <StepCard>
                <StepIcon step={step} />
                <StepNumber>{step.number}</StepNumber>
                <StepTitle>{step.title}</StepTitle>
                <StepDesc>{step.desc}</StepDesc>
                <TagPill $bg={step.tagBg} $color={step.tagColor}>{step.tag}</TagPill>
              </StepCard>
            </StepCardWrapper>
          ))}

          {/* Steps 3a and 3b — desktop only, shown as separate cards */}
          {steps.slice(2).map((step, i) => (
            <StepCardWrapper key={step.number} $index={i + 2} $visible={visible} $desktopOnly>
              <StepCard>
                <StepIcon step={step} />
                <StepNumber>{step.number}</StepNumber>
                <StepTitle>{step.title}</StepTitle>
                <StepDesc>{step.desc}</StepDesc>
                <TagPill $bg={step.tagBg} $color={step.tagColor}>{step.tag}</TagPill>
              </StepCard>
            </StepCardWrapper>
          ))}

          {/* Step 3 combined — mobile only */}
          <MobileOnlyWrapper $index={2} $visible={visible}>
            <StepCard>
              <StepIcon step={step3a} />
              <StepNumber>3</StepNumber>
              <StepTitle>{step3a.title}</StepTitle>
              <StepDesc>{step3a.desc}</StepDesc>
              <TagPill $bg={step3a.tagBg} $color={step3a.tagColor}>{step3a.tag}</TagPill>

              <OrDivider>OR</OrDivider>

              <StepTitle>{step3b.title}</StepTitle>
              <StepDesc>{step3b.desc}</StepDesc>
              <TagPill $bg={step3b.tagBg} $color={step3b.tagColor}>{step3b.tag}</TagPill>
            </StepCard>
          </MobileOnlyWrapper>
        </StepsGrid>

        <CtaRow>
          <Link to="/rounds">
            <Button colorStyle="bluePrimary">Round breakdown &rarr;</Button>
          </Link>
          <Link to="/lottery">
            <Button colorStyle="blueSecondary">Check lottery status</Button>
          </Link>
        </CtaRow>
      </Inner>
    </Section>
  )
}
