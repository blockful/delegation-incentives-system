import { useCallback, useEffect, useRef, useState } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowUpRightFromSquare, faDownload } from '@fortawesome/free-solid-svg-icons'
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

const StepEmoji = styled.span`
  font-size: ${tokens.font.size['3xl']};
  line-height: 1.1;
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

  img {
    width: 24px;
    height: 24px;
    object-fit: contain;
    display: block;
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

/* ─── Eligibility ─── */

const ConditionGrid = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`

const ConditionChip = styled.div<{ $tone: 'success' | 'warning' }>`
  flex: 1;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 8px;
  background: ${({ $tone }) =>
    $tone === 'success' ? tokens.color.status.success.bg : tokens.color.lightOrange};
`

const ConditionTitle = styled.span<{ $tone: 'success' | 'warning' }>`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${({ $tone }) =>
    $tone === 'success' ? tokens.color.positiveEmphasis : tokens.color.orange};
  line-height: 20px;
`

const ConditionBody = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
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

const DownloadGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const DownloadLink = styled.a<{ $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 9999px;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  color: ${tokens.color.blue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
  text-decoration: none;
  transition: background ${tokens.transition.fast}, border-color ${tokens.transition.fast};

  &:hover {
    text-decoration: none;
    border-color: ${tokens.color.blue};
    background: ${tokens.color.lightBlueOpacity};
  }

  ${({ $disabled }) =>
    $disabled &&
    css`
      pointer-events: none;
      color: ${tokens.color.textSubtle};
      background: ${tokens.color.bgSubtle};
    `}
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
  showEmoji?: boolean
}

const METHOD_STEPS: MethodStep[] = [
  {
    label: '1. Balance check',
    text: "At round end, we snapshot your average ENS balance over the past 180 days. Long-term holders win. Last-minute deposits don't.",
    offset: 120,
    tone: 'blue',
  },
  {
    label: '2. Your share',
    text: "We compare your average to everyone else's. That's your slice of the pool. Bigger balance, bigger slice.",
    offset: 80,
    tone: 'blue',
  },
  {
    label: '3. The pool',
    text: 'The pool grows as more ENS gets delegated to active voters. Your reward = your slice × pool size.',
    offset: 40,
    tone: 'blue',
  },
  {
    label: '4. You earn',
    text: 'Rewards of 1 ENS or more land straight in your wallet. No claiming required. Smaller amounts go into a 10‑ENS lottery, one winner picked randomly each round.',
    offset: 0,
    tone: 'green',
    showEmoji: true,
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
  /** TODO(backend): real CSV/JSON download endpoints once exports land. */
  csvUrl: string | null
  jsonUrl: string | null
}

function buildRoundRows(rounds: RoundSummary[]): RoundsRowData[] {
  return rounds
    .slice(0, 8)
    .map((r) => {
      const isPaid = r.status === 'paid'
      // BACKEND-NEEDS: per-round CSV/JSON export endpoints. Until they land,
      // we expose the existing detail endpoint as a JSON fallback for paid rounds.
      const jsonUrl = isPaid ? `/api/rounds/${r.roundNumber}` : null
      return {
        number: r.roundNumber,
        period: formatUtcMonthRange(r.startDate, r.endDate),
        status: r.status,
        csvUrl: null,
        jsonUrl,
      }
    })
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
                <StepLabel $tone={step.tone}>{step.label}</StepLabel>
                <StepText>{step.text}</StepText>
                {step.showEmoji && <StepEmoji aria-hidden>🎉</StepEmoji>}
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
          </VerifyRow>
        </VerifyBlock>
      </Card>

      {/* ─── Eligibility card ─── */}
      <Card>
        <SectionHeader>
          <SectionEyebrow>Eligibility</SectionEyebrow>
          <SectionTitle>Who counts as &lsquo;active&rsquo;?</SectionTitle>
        </SectionHeader>
        <ConditionGrid>
          <ConditionChip $tone="success">
            <ConditionTitle $tone="success">Token holder</ConditionTitle>
            <ConditionBody>You&apos;ve held ENS for at least 180 days, averaged daily.</ConditionBody>
          </ConditionChip>
          <ConditionChip $tone="success">
            <ConditionTitle $tone="success">Delegated to an active voter</ConditionTitle>
            <ConditionBody>Your delegate voted on at least 7 of the last 10 proposals.</ConditionBody>
          </ConditionChip>
          <ConditionChip $tone="warning">
            <ConditionTitle $tone="warning">Above the 1 ENS minimum</ConditionTitle>
            <ConditionBody>Smaller rewards go into the lottery pool instead of a direct payout.</ConditionBody>
          </ConditionChip>
        </ConditionGrid>
      </Card>

      {/* ─── Round data downloads card ─── */}
      <Card>
        <SectionHeader>
          <SectionEyebrow>Round data</SectionEyebrow>
          <SectionTitle>Reproduce any round&apos;s math</SectionTitle>
          <SectionLead>
            Every round publishes its inputs (the active delegate set, delegation snapshots, 180&#8209;day balance averages) and its outputs (payouts and lottery results). Download a round, run the script in the GitHub repo, and you should get the same numbers we did.
          </SectionLead>
        </SectionHeader>

        <RoundsBlock>
        <RoundsTable>
          <RoundsHeadRow>
            <RoundsHeadCell>Round</RoundsHeadCell>
            <RoundsHeadCell $width="200px">Period</RoundsHeadCell>
            <RoundsHeadCell $width="140px">Status</RoundsHeadCell>
            <RoundsHeadCell $width="200px">Download</RoundsHeadCell>
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
              <RoundsCell $width="200px">
                <MobileLabel>Period</MobileLabel>
                <span>{row.period}</span>
              </RoundsCell>
              <RoundsCell $width="140px">
                <MobileLabel>Status</MobileLabel>
                <StatusPill $status={row.status === 'paid' ? 'paid' : row.status === 'live' ? 'live' : 'pending'}>
                  {row.status}
                </StatusPill>
              </RoundsCell>
              <RoundsCell $width="200px">
                <MobileLabel>Download</MobileLabel>
                <DownloadGroup>
                  <DownloadLink $disabled={!row.csvUrl} href={row.csvUrl ?? undefined} aria-label={`Download round ${row.number} CSV`}>
                    <FontAwesomeIcon icon={faDownload} />
                    CSV
                  </DownloadLink>
                  <DownloadLink
                    $disabled={!row.jsonUrl}
                    href={row.jsonUrl ?? undefined}
                    target={row.jsonUrl ? '_blank' : undefined}
                    rel={row.jsonUrl ? 'noopener noreferrer' : undefined}
                    aria-label={`View round ${row.number} JSON`}
                  >
                    <FontAwesomeIcon icon={faDownload} />
                    JSON
                  </DownloadLink>
                </DownloadGroup>
              </RoundsCell>
            </RoundsRow>
          ))}
        </RoundsTable>

        <TableCaption>
          CSV exports arrive after each round closes. The JSON endpoint is live now for paid rounds.{' '}
          {/* BACKEND-NEEDS: per-round CSV export endpoint. Tracking in project_dis_backend_needs.md. */}
        </TableCaption>
        </RoundsBlock>
      </Card>
    </Page>
  )
}
