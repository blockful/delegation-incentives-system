import { useCallback, useMemo, useState } from 'react'
import styled from 'styled-components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faShieldHalved,
  faTriangleExclamation,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons'
import { api } from '@/api'
import type { RewardRank, RoundDetailResponse, RoundSummary } from '@/api/types'
import { TransparencyStatsSkeleton } from '@/components/shared/PageSkeletons'
import { ToneCallout } from '@/components/shared/ToneCallout'
import { useAsync } from '@/hooks/useAsync'
import { contracts } from '@/config/contracts'
import { tokens } from '@/styles/tokens'
import { fadeInUp } from '@/styles/primitives'
import { LinkCard, LinkCardRow, type LinkCardItem } from '@/components/shared/LinkCard'
import { ContractLiveness } from '@/components/shared/ContractLiveness'
import gitIcon from '@/images/github.svg'
import anticaptureIcon from '@/images/anticapture.svg'
import duneIcon from '@/images/dune.svg'
import { StatStrip } from '@/components/shared/StatStrip'
import { MethodologyDiagram } from '@/components/shared/MethodologyDiagram'
import { SideDrawer } from '@/components/shared/SideDrawer'
import { formatEnsAmount, formatEnsCompact } from '@/utils/format'

import { CURRENT_ROUND } from '@/config/round'

const Page = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  padding: ${tokens.spacing.xl} ${tokens.spacing.xl} ${tokens.spacing['6xl']};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};
  animation: ${fadeInUp} 0.4s ease both;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['3xl']} ${tokens.spacing['2xl']} ${tokens.spacing['7xl']};
    gap: ${tokens.spacing['3xl']};
  }
`

/* ─── Hero ─── */

const Hero = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
`

const HeroEyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 4px 12px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.status.success.bg};
  border: 1px solid ${tokens.color.status.success.border};
  color: ${tokens.color.status.success.fg};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
`

const HeroTitle = styled.h1`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.darkBlue};
  line-height: 1.15;
  letter-spacing: -0.01em;
  margin: 0;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['4xl']};
  }
`

const HeroDesc = styled.p`
  font-size: ${tokens.font.size.lg};
  color: ${tokens.color.darkGray};
  line-height: 1.6;
  margin: 0;
  max-width: 640px;
`

/* ─── Hero counters ─── */

const HeroCountersWrap = styled.div`
  margin-top: ${tokens.spacing.md};
`

const HeroStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: ${tokens.spacing.md} ${tokens.spacing.lg};
  border-left: 2px solid ${tokens.color.borderLight};
  min-width: 0;
`

const HeroStatLabel = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkGray};
`

const HeroStatValue = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.darkBlue};
  font-variant-numeric: tabular-nums;
  line-height: 1.1;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['4xl']};
  }
`

const HeroStatSub = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
`

/* ─── Sections grid ─── */

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing['2xl']};

  @media (min-width: 768px) {
    grid-template-columns: 2fr 1fr;
    gap: ${tokens.spacing['3xl']};
  }
`

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};
`

const Section = styled.section`
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.md};
  box-shadow: ${tokens.shadow.soft};
  padding: ${tokens.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
`

const SectionEyebrow = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkGray};
`

const SectionTitle = styled.h2`
  margin: 0;
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.25;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['2xl']};
  }
`

const WorkedExampleSteps = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing.md};
  align-items: stretch;

  @media (min-width: 640px) {
    grid-template-columns: 1fr auto 1fr auto 1fr;
    align-items: center;
    gap: ${tokens.spacing.sm};
  }
`

const WorkedExampleSteps4 = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing.md};
  align-items: stretch;

  @media (min-width: 640px) {
    grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
    align-items: center;
    gap: ${tokens.spacing.sm};
  }
`

const ContractStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
`

const ContractItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const WorkedStep = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: ${tokens.spacing.md} ${tokens.spacing.lg};
  background: ${tokens.color.bgSubtle};
  border-radius: ${tokens.radius.sm};
  border: 1px solid ${tokens.color.borderLight};
`

const WorkedStepLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkGray};
`

const WorkedStepValue = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
`

const WorkedStepSub = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
`

const WorkedArrow = styled.span`
  display: none;
  color: ${tokens.color.textFaint};
  font-size: ${tokens.font.size.lg};
  justify-self: center;

  @media (min-width: 640px) {
    display: inline-flex;
  }
`

const WorkedExampleNote = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
  line-height: 1.5;
`

/* ─── Methodology drawer body ─── */

const DrawerBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xl};
  text-align: left;
`

const DrawerSummary = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkBlue};
  line-height: 1.6;
`

const DrawerIORow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const DrawerIOLabel = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkGray};
`

const DrawerIOValue = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkBlue};
  font-family: ${tokens.font.mono};
  line-height: 1.4;
`

const DrawerFooter = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.spacing.md};
  margin-top: ${tokens.spacing.sm};
`

const DrawerLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.blue};
  text-decoration: none;
  transition: color 150ms ease;

  &:hover {
    color: ${tokens.color.accent};
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
    border-radius: ${tokens.radius.sm};
  }
`

/* ─── Data ─── */

const VERIFY_LINKS: LinkCardItem[] = [
  {
    iconSrc: gitIcon,
    title: 'GitHub',
    desc: 'Source code and reward scripts',
    href: 'https://github.com/blockful-io/delegation-incentives-system',
  },
  {
    iconSrc: anticaptureIcon,
    title: 'Anticapture',
    desc: 'Delegate activity and governance data',
    href: 'https://anticapture.xyz',
  },
  {
    iconSrc: duneIcon,
    title: 'Dune Analytics',
    desc: 'Round and payout dashboards',
    href: 'https://dune.com',
  },
]

interface ContractEntry {
  card: LinkCardItem
  address: string
}

const CONTRACT_ENTRIES: ContractEntry[] = [
  {
    address: contracts.ensIncentives,
    card: {
      title: 'ENS Incentives',
      desc: 'Verified contract',
      href: `https://etherscan.io/address/${contracts.ensIncentives}`,
      copyAddress: contracts.ensIncentives,
      tag: 'Verified',
    },
  },
  {
    address: contracts.delegateBySig,
    card: {
      title: 'Delegate By Sig',
      desc: 'Verified contract',
      href: `https://etherscan.io/address/${contracts.delegateBySig}`,
      copyAddress: contracts.delegateBySig,
      tag: 'Verified',
    },
  },
  {
    address: contracts.rewardDistributor,
    card: {
      title: 'Reward Distributor',
      desc: 'Verified contract',
      href: `https://etherscan.io/address/${contracts.rewardDistributor}`,
      copyAddress: contracts.rewardDistributor,
      tag: 'Verified',
    },
  },
]

interface MethodologyStepData {
  id: string
  title: string
  subtitle: string
  detail: {
    summary: string
    githubUrl: string
    inputs: string
    output: string
    etherscanUrl: string | null
  }
}

const METHODOLOGY_STEPS: MethodologyStepData[] = [
  {
    id: 'snapshot',
    title: 'Snapshot balances',
    subtitle: '180d',
    detail: {
      summary:
        "At each round end, the program snapshots every ENS holder's balance — averaged over the prior 180 days, not the spot balance — to discourage gaming.",
      githubUrl:
        'https://github.com/blockful-io/delegation-incentives-system/blob/main/apps/backend/src/round/snapshot.ts',
      inputs: 'Holder address + balance history (every block)',
      output: 'balance180dAvgEns per holder',
      etherscanUrl: null,
    },
  },
  {
    id: 'compute-shares',
    title: 'Compute shares',
    subtitle: 'P / total',
    detail: {
      summary:
        "Each holder's 180-day average balance is divided by the program's total active VP to compute their share of the round's reward pool.",
      githubUrl:
        'https://github.com/blockful-io/delegation-incentives-system/blob/main/apps/backend/src/round/shares.ts',
      inputs: 'balance180dAvgEns per holder',
      output: 'share (decimal 0–1) per holder',
      etherscanUrl: null,
    },
  },
  {
    id: 'apply-tier',
    title: 'Apply tier APR',
    subtitle: '+ caps',
    detail: {
      summary:
        "The active tier at round start determines the APR. Each holder's reward is share × poolSize. Per-holder caps prevent any single wallet from claiming an outsized portion.",
      githubUrl:
        'https://github.com/blockful-io/delegation-incentives-system/blob/main/apps/backend/src/round/tier.ts',
      inputs: 'share + active tier index + per-holder cap',
      output: 'rewardEns per holder',
      etherscanUrl: null,
    },
  },
  {
    id: 'distribute',
    title: 'Distribute',
    subtitle: '+ lottery < 1 ENS',
    detail: {
      summary:
        'Rewards ≥ 1 ENS go directly to wallets via the Reward Distributor contract. Sub-1-ENS rewards pool into ~10-ENS lottery buckets, drawn at round close using RANDAO.',
      githubUrl:
        'https://github.com/blockful-io/delegation-incentives-system/blob/main/apps/backend/src/round/distribute.ts',
      etherscanUrl: 'CONTRACT:rewardDistributor',
      inputs: 'rewardEns per holder',
      output: 'On-chain transfer OR lottery bucket entry',
    },
  },
]

function pickRepresentativeRecipient(detail: RoundDetailResponse): RewardRank | null {
  const pool: RewardRank[] = [
    ...(detail.topVoterRewards ?? []),
    ...(detail.topTokenHolderRewards ?? []),
  ]
  const eligible = pool.filter(
    (r) => r.source === 'direct' && Number(r.rewardEns) > 1,
  )
  if (eligible.length === 0) return null
  const withEns = eligible.find((r) => r.ensName)
  return withEns ?? eligible[0]
}

async function fetchLatestPaidRound(): Promise<{
  summary: RoundSummary
  detail: RoundDetailResponse
} | null> {
  const list = await api.rounds()
  const paid = list.rounds
    .filter((r) => r.status === 'paid')
    .sort((a, b) => b.roundNumber - a.roundNumber)
  if (paid.length === 0) return null
  const summary = paid[0]
  const detail = await api.round(summary.roundNumber, undefined, { rewardLimit: '25' })
  return { summary, detail }
}

function formatMonthYear(month: string): string {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return month
  const date = new Date(Date.UTC(y, m - 1, 1))
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatSharePercent(rewardWei: string, totalWei: string | null): string {
  if (!totalWei) return '—'
  const reward = Number(rewardWei)
  const total = Number(totalWei)
  if (!Number.isFinite(reward) || !Number.isFinite(total) || total <= 0) return '—'
  const pct = (reward / total) * 100
  if (pct < 0.0001) return '<0.0001%'
  return `${pct.toFixed(4)}%`
}

export function TransparencyPage() {
  const fetchStatus = useCallback(() => api.status(), [])
  const fetchTiers = useCallback(() => api.tierProgression(), [])
  const fetchPaidRound = useCallback(() => fetchLatestPaidRound(), [])
  const status = useAsync(fetchStatus)
  const tiers = useAsync(fetchTiers)
  const paidRound = useAsync(fetchPaidRound)
  const [activeStep, setActiveStep] = useState<string | null>(null)
  const currentStep = useMemo(
    () => METHODOLOGY_STEPS.find((s) => s.id === activeStep) ?? null,
    [activeStep],
  )
  const currentEtherscanUrl =
    currentStep?.detail.etherscanUrl === 'CONTRACT:rewardDistributor'
      ? `https://etherscan.io/address/${contracts.rewardDistributor}`
      : currentStep?.detail.etherscanUrl ?? null

  const loading = status.loading || tiers.loading
  const dataError = status.error || tiers.error

  const retry = () => {
    if (status.error) status.execute()
    if (tiers.error) tiers.execute()
  }

  const currentTier =
    tiers.data && tiers.data.tiers[tiers.data.currentTierIndex]
      ? tiers.data.tiers[tiers.data.currentTierIndex]
      : null

  const representative = useMemo(() => {
    if (!paidRound.data) return null
    const recipient = pickRepresentativeRecipient(paidRound.data.detail)
    if (!recipient) return null
    return { round: paidRound.data.summary, recipient }
  }, [paidRound.data])

  return (
    <Page>
        <Hero>
          <HeroEyebrow>
            <FontAwesomeIcon icon={faShieldHalved} />
            Transparency
          </HeroEyebrow>
          <HeroTitle>Verify everything on-chain</HeroTitle>
          <HeroDesc>
            Contracts, data sources, and reward logic are public so every round can be checked. Below: live program metrics, verified contracts, and the algorithm in plain English.
          </HeroDesc>

          <HeroCountersWrap>
            {loading ? (
              <TransparencyStatsSkeleton />
            ) : dataError ? (
              <ToneCallout
                tone="danger"
                title="Live metrics unavailable"
                body="The backend didn't respond. The program contracts and source code links below are still verifiable on-chain."
                action={{ label: 'Try again', onClick: retry }}
                icon={<FontAwesomeIcon icon={faTriangleExclamation} />}
              />
            ) : status.data && tiers.data ? (
              <StatStrip columns={4} gap="md">
                <HeroStat>
                  <HeroStatLabel>Active Voters</HeroStatLabel>
                  <HeroStatValue>{status.data.activeVoterCount}</HeroStatValue>
                  <HeroStatSub>delegates voting 7/10+</HeroStatSub>
                </HeroStat>
                <HeroStat>
                  <HeroStatLabel>ENS Delegated</HeroStatLabel>
                  <HeroStatValue>{formatEnsCompact(status.data.totalDelegatedEns)}</HeroStatValue>
                  <HeroStatSub>across all active voters</HeroStatSub>
                </HeroStat>
                <HeroStat>
                  <HeroStatLabel>Wallets Earning</HeroStatLabel>
                  <HeroStatValue>{status.data.holdersEarning}</HeroStatValue>
                  <HeroStatSub>holders this round</HeroStatSub>
                </HeroStat>
                <HeroStat>
                  <HeroStatLabel>Current Tier</HeroStatLabel>
                  <HeroStatValue>{tiers.data.currentTierIndex + 1}</HeroStatValue>
                  <HeroStatSub>round {CURRENT_ROUND}</HeroStatSub>
                </HeroStat>
              </StatStrip>
            ) : null}
          </HeroCountersWrap>
        </Hero>

        <LinkCardRow items={VERIFY_LINKS} />

        <Grid>
          <LeftColumn>
            <Section>
              <SectionEyebrow>Smart Contracts</SectionEyebrow>
              <SectionTitle>Verified on Etherscan</SectionTitle>
              <ContractStack>
                {CONTRACT_ENTRIES.map((entry) => (
                  <ContractItem key={entry.card.title}>
                    <LinkCard item={entry.card} />
                    <ContractLiveness address={entry.address} />
                  </ContractItem>
                ))}
              </ContractStack>
            </Section>

            {representative ? (
              <Section>
                <SectionEyebrow>Worked Example</SectionEyebrow>
                <SectionTitle>How a payout was computed</SectionTitle>
                <WorkedExampleNote>
                  Round {representative.round.roundNumber} ({formatMonthYear(representative.round.month)}) · representative recipient: {representative.recipient.ensName ?? representative.recipient.address}
                </WorkedExampleNote>
                <WorkedExampleSteps4>
                  <WorkedStep>
                    <WorkedStepLabel>1. Balance snapshot</WorkedStepLabel>
                    <WorkedStepValue>
                      {representative.recipient.votingPower
                        ? `${formatEnsAmount(representative.recipient.votingPower, { maximumFractionDigits: 2 })} ENS`
                        : '—'}
                    </WorkedStepValue>
                    <WorkedStepSub>180-day moving average</WorkedStepSub>
                  </WorkedStep>
                  <WorkedArrow aria-hidden><FontAwesomeIcon icon={faArrowRight} /></WorkedArrow>
                  <WorkedStep>
                    <WorkedStepLabel>2. Share</WorkedStepLabel>
                    <WorkedStepValue>
                      {formatSharePercent(
                        representative.recipient.reward,
                        representative.round.totalDistributed,
                      )}
                    </WorkedStepValue>
                    <WorkedStepSub>of round distribution</WorkedStepSub>
                  </WorkedStep>
                  <WorkedArrow aria-hidden><FontAwesomeIcon icon={faArrowRight} /></WorkedArrow>
                  <WorkedStep>
                    <WorkedStepLabel>3. Tier</WorkedStepLabel>
                    <WorkedStepValue>
                      {representative.round.tierIndex != null
                        ? representative.round.tierIndex + 1
                        : '—'}
                    </WorkedStepValue>
                    <WorkedStepSub>at month start</WorkedStepSub>
                  </WorkedStep>
                  <WorkedArrow aria-hidden><FontAwesomeIcon icon={faArrowRight} /></WorkedArrow>
                  <WorkedStep>
                    <WorkedStepLabel>4. Payout</WorkedStepLabel>
                    <WorkedStepValue>
                      {formatEnsAmount(representative.recipient.rewardEns, {
                        maximumFractionDigits: 4,
                      })} ENS
                    </WorkedStepValue>
                    <WorkedStepSub>direct payout</WorkedStepSub>
                  </WorkedStep>
                </WorkedExampleSteps4>
                <WorkedExampleNote>
                  Payouts under 1 ENS pool into lottery buckets. Above 1 ENS, the reward is sent directly to the holder's wallet at round close.
                </WorkedExampleNote>
              </Section>
            ) : currentTier ? (
              <Section>
                <SectionEyebrow>Worked Example</SectionEyebrow>
                <SectionTitle>How a payout is computed this round</SectionTitle>
                <WorkedExampleNote>
                  Illustration only — uses Tier {tiers.data ? tiers.data.currentTierIndex + 1 : '—'}'s actual APR for an example 5 ENS holder.
                </WorkedExampleNote>
                <WorkedExampleSteps>
                  <WorkedStep>
                    <WorkedStepLabel>1. Balance snapshot</WorkedStepLabel>
                    <WorkedStepValue>5.00 ENS</WorkedStepValue>
                    <WorkedStepSub>180-day moving average</WorkedStepSub>
                  </WorkedStep>
                  <WorkedArrow aria-hidden><FontAwesomeIcon icon={faArrowRight} /></WorkedArrow>
                  <WorkedStep>
                    <WorkedStepLabel>2. Tier APR</WorkedStepLabel>
                    <WorkedStepValue>
                      {currentTier.estimatedAprPct != null ? `${currentTier.estimatedAprPct}%` : '—'}
                    </WorkedStepValue>
                    <WorkedStepSub>tier {tiers.data ? tiers.data.currentTierIndex + 1 : '—'} this round</WorkedStepSub>
                  </WorkedStep>
                  <WorkedArrow aria-hidden><FontAwesomeIcon icon={faArrowRight} /></WorkedArrow>
                  <WorkedStep>
                    <WorkedStepLabel>3. Monthly reward</WorkedStepLabel>
                    <WorkedStepValue>
                      {currentTier.estimatedAprPct != null
                        ? `${((5 * Number(currentTier.estimatedAprPct)) / 100 / 12).toFixed(4)} ENS`
                        : '—'}
                    </WorkedStepValue>
                    <WorkedStepSub>balance × APR ÷ 12</WorkedStepSub>
                  </WorkedStep>
                </WorkedExampleSteps>
                <WorkedExampleNote>
                  Payouts under 1 ENS pool into ~10-ENS lottery buckets. Above 1 ENS, the reward is sent directly to the holder's wallet at round close.
                </WorkedExampleNote>
              </Section>
            ) : null}
          </LeftColumn>

          <Section>
            <SectionEyebrow>How Rewards Are Calculated</SectionEyebrow>
            <SectionTitle>Algorithm</SectionTitle>
            <WorkedExampleNote>
              Same code runs every round. Click any step for the source.
            </WorkedExampleNote>
            <MethodologyDiagram
              steps={METHODOLOGY_STEPS.map(({ id, title, subtitle }) => ({
                id,
                title,
                subtitle,
              }))}
              activeId={activeStep}
              onStepClick={setActiveStep}
            />
          </Section>
        </Grid>

        <SideDrawer
          open={currentStep !== null}
          onClose={() => setActiveStep(null)}
          title={currentStep?.title ?? ''}
          side="right"
        >
          {currentStep ? (
            <DrawerBody>
              <DrawerSummary>{currentStep.detail.summary}</DrawerSummary>
              <DrawerIORow>
                <DrawerIOLabel>Inputs</DrawerIOLabel>
                <DrawerIOValue>{currentStep.detail.inputs}</DrawerIOValue>
              </DrawerIORow>
              <DrawerIORow>
                <DrawerIOLabel>Output</DrawerIOLabel>
                <DrawerIOValue>{currentStep.detail.output}</DrawerIOValue>
              </DrawerIORow>
              <DrawerFooter>
                <DrawerLink
                  href={currentStep.detail.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View source ↗
                </DrawerLink>
                {currentEtherscanUrl ? (
                  <DrawerLink
                    href={currentEtherscanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View contract ↗
                  </DrawerLink>
                ) : null}
              </DrawerFooter>
            </DrawerBody>
          ) : null}
        </SideDrawer>
    </Page>
  )
}
