import { useCallback, useEffect, useRef, useState } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowUpRightFromSquare,
  faFileLines,
  faClock,
  faChartPie,
  faCoins,
  faWallet,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { api } from '@/api'
import type { RoundSummary } from '@/api/types'
import { useAsync } from '@/hooks/useAsync'
import { tokens } from '@/styles/tokens'
import { formatUtcMonthRange } from '@/utils/format'
import gitIcon from '@/images/github.svg'
import anticaptureIcon from '@/images/anticapture.svg'

/* ─── Page shell ─── */

const Page = styled.div`
  width: 100%;
  max-width: 1120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
`

/* ─── Hero ─── */

const HeaderBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
`

const EyebrowPill = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.48);
  border: 1px solid ${tokens.color.white};
  border-radius: 14px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const PageTitle = styled.h1`
  margin: 0;
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.1;
  text-align: center;
  max-width: 720px;
  text-wrap: balance;

  @media (min-width: 768px) {
    font-size: 68px;
  }
`

const Description = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.lg};
  line-height: 1.6;
  color: ${tokens.color.darkGray};
  text-align: center;
  max-width: 646px;
  text-wrap: pretty;
`

/* ─── Card primitive ─── */

const Card = styled.section`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
  padding: 20px;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
`

const SectionEyebrow = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const SectionTitle = styled.h2`
  margin: 0;
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.1;
`

const SectionLead = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
  max-width: 720px;
`

const SectionHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const Divider = styled.div`
  height: 1px;
  background: ${tokens.color.borderLight};
  width: 100%;
`

/* ─── Methodology — animated staircase ─── */

const StaircaseRow = styled.div`
  display: flex;
  gap: 16px;
  width: 100%;
  align-items: stretch;

  @media (max-width: 767px) {
    flex-direction: column;
  }
`

const growUp = keyframes`
  from { opacity: 0; transform: scaleY(0); }
  to   { opacity: 1; transform: scaleY(1); }
`

const StepColumn = styled.div<{ $offset: number; $delay: number; $tone: 'blue' | 'green'; $visible: boolean }>`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: ${({ $offset }) => $offset}px;
  transform-origin: bottom center;
  opacity: 0;

  ${({ $visible, $delay }) =>
    $visible &&
    css`
      animation: ${growUp} 0.55s cubic-bezier(0.22, 1, 0.36, 1) ${$delay}s forwards;
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
    transform: none;
  }

  @media (max-width: 767px) {
    padding-top: 0;
    transform-origin: left center;
  }
`

const StepBar = styled.div<{ $tone: 'blue' | 'green' }>`
  height: 4px;
  border-radius: 9999px;
  background: ${({ $tone }) => ($tone === 'green' ? tokens.color.positiveEmphasis : tokens.color.blue)};
  flex-shrink: 0;
`

const StepBody = styled.div<{ $tone: 'blue' | 'green' }>`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-radius: 8px;
  background: ${({ $tone }) =>
    $tone === 'green' ? tokens.color.status.success.bg : tokens.color.lightBlueOpacity};
`

const StepLabel = styled.span<{ $tone: 'blue' | 'green' }>`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${({ $tone }) => ($tone === 'green' ? tokens.color.positiveEmphasis : tokens.color.blue)};
  line-height: 20px;
`

const StepText = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
  text-wrap: pretty;
`

const StepHeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const StepIcon = styled.span<{ $tone: 'blue' | 'green' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ $tone }) => ($tone === 'green' ? tokens.color.positiveEmphasis : tokens.color.blue)};

  svg {
    width: 16px;
    height: 16px;
  }
`

/* ─── Guardrails strip ─── */

const GuardrailsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
`

const GuardrailsLabel = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
  margin-right: 4px;
`

const GuardrailChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: ${tokens.color.bgSubtle};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 9999px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const GuardrailValue = styled.strong`
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

/* ─── Verify cards ─── */

const VerifyBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const VerifyRow = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;

  @media (max-width: 767px) {
    flex-direction: column;
  }
`

const VerifyCard = styled.a`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px 12px 12px;
  background: ${tokens.color.bgSubtle};
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition:
    background ${tokens.transition.base},
    transform ${tokens.transition.base};

  &:hover {
    text-decoration: none;
    background: ${tokens.color.borderLight};
    transform: translateY(-2px);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`

const VerifyIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: ${tokens.color.darkBlue};
  overflow: hidden;
  flex-shrink: 0;
  color: ${tokens.color.white};

  img {
    width: 24px;
    height: 24px;
    object-fit: contain;
    display: block;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`

const VerifyMeta = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const VerifyTitle = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
`

const VerifySub = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const VerifyArrow = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.textSecondary};
`

/* ─── Round data table ─── */

const RoundsTable = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
  overflow: hidden;
  background: ${tokens.color.surface};
`

const RoundsHeadRow = styled.div`
  display: flex;
  background: ${tokens.color.bgSubtle};
  border-bottom: 1px solid ${tokens.color.borderLight};

  @media (max-width: 767px) {
    display: none;
  }
`

const RoundsHeadCell = styled.div<{ $width?: string }>`
  padding: 12px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
  ${({ $width }) => ($width ? `width: ${$width}; flex-shrink: 0;` : `flex: 1; min-width: 0;`)}
`

const RoundsRow = styled.div`
  display: flex;

  &:not(:last-child) {
    border-bottom: 1px solid ${tokens.color.borderLight};
  }

  @media (max-width: 767px) {
    flex-direction: column;
    padding: 8px 0;
  }
`

const RoundsCell = styled.div<{ $width?: string; $primary?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
  ${({ $width }) => ($width ? `width: ${$width}; flex-shrink: 0;` : `flex: 1; min-width: 0;`)}

  @media (max-width: 767px) {
    width: 100%;
    flex: none;
    justify-content: space-between;
    padding: 10px 16px;
    ${({ $primary }) =>
      $primary ? `font-weight: ${tokens.font.weight.bold}; color: ${tokens.color.darkBlue};` : ''}
  }
`

const MobileLabel = styled.span`
  display: none;

  @media (max-width: 767px) {
    display: inline-block;
    color: ${tokens.color.darkGray};
    font-weight: ${tokens.font.weight.medium};
  }
`

const StatusPill = styled.span<{ $status: 'paid' | 'live' | 'pending' }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
  background: ${({ $status }) =>
    $status === 'paid'
      ? tokens.color.status.success.bg
      : $status === 'live'
        ? tokens.color.lightBlueOpacity
        : tokens.color.bgSubtle};
  color: ${({ $status }) =>
    $status === 'paid'
      ? tokens.color.positiveEmphasis
      : $status === 'live'
        ? tokens.color.blue
        : tokens.color.darkGray};
  text-transform: capitalize;
`


const TableCaption = styled.p`
  margin: 0;
  padding: 0 4px;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 18px;
`

const RoundsBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

/* ─── Component ─── */

interface MethodStep {
  label: string
  text: string
  offset: number
  tone: 'blue' | 'green'
  icon: IconDefinition
}

const METHOD_STEPS: MethodStep[] = [
  {
    label: '1. Balance check',
    text: "At round end, we snapshot your average ENS balance over the past 180 days. Long-term holders win. Last-minute deposits don't.",
    offset: 120,
    tone: 'blue',
    icon: faClock,
  },
  {
    label: '2. Your share',
    text: "We compare your average to everyone else's. That's your slice of the pool. Bigger balance, bigger slice.",
    offset: 80,
    tone: 'blue',
    icon: faChartPie,
  },
  {
    label: '3. The pool',
    text: 'The pool grows as more ENS gets delegated to active voters. Your reward = your slice × pool size.',
    offset: 40,
    tone: 'blue',
    icon: faCoins,
  },
  {
    label: '4. You earn',
    text: 'Rewards of 1 ENS or more land straight in your wallet. No claiming required. Smaller amounts go into a 10‑ENS lottery, one winner picked randomly each round.',
    offset: 0,
    tone: 'green',
    icon: faWallet,
  },
]

function useInViewOnce(threshold = 0.35) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -10% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [inView, threshold])
  return { ref, inView }
}

interface RoundsRowData {
  number: number
  period: string
  status: RoundSummary['status']
}

function buildRoundRows(rounds: RoundSummary[]): RoundsRowData[] {
  return rounds.slice(0, 8).map((r) => ({
    number: r.roundNumber,
    period: formatUtcMonthRange(r.startDate, r.endDate),
    status: r.status,
  }))
}

export function TransparencyPage() {
  const fetchRounds = useCallback(() => api.rounds(), [])
  const { data: roundList } = useAsync(fetchRounds)

  const { ref: methodologyRef, inView } = useInViewOnce()

  const rows = roundList?.rounds ? buildRoundRows(roundList.rounds) : []

  return (
    <Page>
      <HeaderBlock>
        <EyebrowPill>Transparency &amp; methodology</EyebrowPill>
        <PageTitle>Verify everything onchain</PageTitle>
        <Description>
          Open methodology, open data. Every reward is reproducible from onchain inputs (your delegations and balances) and published outputs. Read the rules below, then download the data to check our math.
        </Description>
      </HeaderBlock>

      {/* ─── Methodology card ─── */}
      <Card>
        <SectionHeader>
          <SectionEyebrow>Methodology</SectionEyebrow>
          <SectionTitle>How rewards are computed</SectionTitle>
          <SectionLead>
            Each round, the pool is split between token holders (90%) and active voters (10%). An active voter is anyone who voted on at least 7 of the last 10 governance proposals.
          </SectionLead>
        </SectionHeader>

        <StaircaseRow ref={methodologyRef}>
          {METHOD_STEPS.map((step, i) => (
            <StepColumn
              key={step.label}
              $offset={step.offset}
              $delay={i * 0.18}
              $tone={step.tone}
              $visible={inView}
            >
              <StepBar $tone={step.tone} />
              <StepBody $tone={step.tone}>
                <StepHeaderRow>
                  <StepIcon $tone={step.tone} aria-hidden>
                    <FontAwesomeIcon icon={step.icon} />
                  </StepIcon>
                  <StepLabel $tone={step.tone}>{step.label}</StepLabel>
                </StepHeaderRow>
                <StepText>{step.text}</StepText>
              </StepBody>
            </StepColumn>
          ))}
        </StaircaseRow>

        {/* Guardrails strip — caps and safeguards */}
        <GuardrailsRow>
          <GuardrailsLabel>Limits &amp; safeguards</GuardrailsLabel>
          <GuardrailChip>
            <GuardrailValue>1%</GuardrailValue> per‑delegate cap
          </GuardrailChip>
          <GuardrailChip>
            <GuardrailValue>5%</GuardrailValue> per‑wallet cap
          </GuardrailChip>
          <GuardrailChip>
            <GuardrailValue>180‑day</GuardrailValue> balance window
          </GuardrailChip>
          <GuardrailChip>
            <GuardrailValue>RANDAO</GuardrailValue> lottery seed
          </GuardrailChip>
        </GuardrailsRow>

        <Divider />

        <VerifyBlock>
          <SectionEyebrow>Verify the data yourself</SectionEyebrow>
          <VerifyRow>
            <VerifyCard
              href="https://github.com/blockful/delegation-incentives-system"
              target="_blank"
              rel="noopener noreferrer"
            >
              <VerifyIcon><img src={gitIcon} alt="" aria-hidden /></VerifyIcon>
              <VerifyMeta>
                <VerifyTitle>GitHub repo</VerifyTitle>
                <VerifySub>Open source, auditable code</VerifySub>
              </VerifyMeta>
              <VerifyArrow aria-hidden><FontAwesomeIcon icon={faArrowUpRightFromSquare} /></VerifyArrow>
            </VerifyCard>
            <VerifyCard
              href="https://app.anticapture.com/ens"
              target="_blank"
              rel="noopener noreferrer"
            >
              <VerifyIcon><img src={anticaptureIcon} alt="" aria-hidden /></VerifyIcon>
              <VerifyMeta>
                <VerifyTitle>Anticapture</VerifyTitle>
                <VerifySub>Live delegation and voting data</VerifySub>
              </VerifyMeta>
              <VerifyArrow aria-hidden><FontAwesomeIcon icon={faArrowUpRightFromSquare} /></VerifyArrow>
            </VerifyCard>
            <VerifyCard
              href="https://discuss.ens.domains/t/rfc-delegation-increase-incentives-system/21546"
              target="_blank"
              rel="noopener noreferrer"
            >
              <VerifyIcon><FontAwesomeIcon icon={faFileLines} aria-hidden /></VerifyIcon>
              <VerifyMeta>
                <VerifyTitle>RFC &amp; specs</VerifyTitle>
                <VerifySub>Detailed rules, formulas, and design notes</VerifySub>
              </VerifyMeta>
              <VerifyArrow aria-hidden><FontAwesomeIcon icon={faArrowUpRightFromSquare} /></VerifyArrow>
            </VerifyCard>
          </VerifyRow>
        </VerifyBlock>
      </Card>

      {/* ─── Round data downloads card ─── */}
      <Card>
        <SectionHeader>
          <SectionEyebrow>Round data</SectionEyebrow>
          <SectionTitle>Download every round</SectionTitle>
          <SectionLead>
            Each round publishes a CSV with the active delegate set, balance snapshots, and final payouts. To re-run the math from scratch, the calculation script lives in the GitHub repo.
          </SectionLead>
        </SectionHeader>

        <RoundsBlock>
        <RoundsTable>
          <RoundsHeadRow>
            <RoundsHeadCell>Round</RoundsHeadCell>
            <RoundsHeadCell $width="280px">Period</RoundsHeadCell>
            <RoundsHeadCell $width="160px">Status</RoundsHeadCell>
          </RoundsHeadRow>

          {rows.length === 0 && (
            <RoundsRow>
              <RoundsCell>Loading round history…</RoundsCell>
            </RoundsRow>
          )}

          {rows.map((row) => (
            <RoundsRow key={row.number}>
              <RoundsCell $primary>
                <MobileLabel>Round</MobileLabel>
                <span>Round {row.number}</span>
              </RoundsCell>
              <RoundsCell $width="280px">
                <MobileLabel>Period</MobileLabel>
                <span>{row.period}</span>
              </RoundsCell>
              <RoundsCell $width="160px">
                <MobileLabel>Status</MobileLabel>
                <StatusPill $status={row.status === 'paid' ? 'paid' : row.status === 'live' ? 'live' : 'pending'}>
                  {row.status}
                </StatusPill>
              </RoundsCell>
            </RoundsRow>
          ))}
        </RoundsTable>

        <TableCaption>
          {/* BACKEND-NEEDS: per-round CSV export endpoint. When it lands, restore the
              Download column and the "CSV exports arrive after each round closes." copy.
              Tracking in project_dis_backend_needs.md. */}
          For now, use the GitHub repo to re-run the math; per-round CSV exports are coming.
        </TableCaption>
        </RoundsBlock>
      </Card>
    </Page>
  )
}
