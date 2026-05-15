import { useCallback } from 'react'
import styled from 'styled-components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faShieldHalved,
  faTriangleExclamation,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons'
import { api } from '@/api'
import { TransparencyStatsSkeleton } from '@/components/shared/PageSkeletons'
import { ToneCallout } from '@/components/shared/ToneCallout'
import { useAsync } from '@/hooks/useAsync'
import { contracts } from '@/config/contracts'
import { tokens } from '@/styles/tokens'
import { fadeInUp } from '@/styles/primitives'
import { LinkCardRow, LinkCardStack, type LinkCardItem } from '@/components/shared/LinkCard'
import gitIcon from '@/images/github.svg'
import anticaptureIcon from '@/images/anticapture.svg'
import duneIcon from '@/images/dune.svg'
import { StatStrip } from '@/components/shared/StatStrip'
import { StepList } from '@/components/shared/StepList'
import { formatEnsCompact } from '@/utils/format'

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

const CONTRACT_ENTRIES: LinkCardItem[] = [
  {
    title: 'ENS Incentives',
    desc: 'Verified contract',
    href: `https://etherscan.io/address/${contracts.ensIncentives}`,
    copyAddress: contracts.ensIncentives,
    tag: 'Verified',
  },
  {
    title: 'Delegate By Sig',
    desc: 'Verified contract',
    href: `https://etherscan.io/address/${contracts.delegateBySig}`,
    copyAddress: contracts.delegateBySig,
    tag: 'Verified',
  },
  {
    title: 'Reward Distributor',
    desc: 'Verified contract',
    href: `https://etherscan.io/address/${contracts.rewardDistributor}`,
    copyAddress: contracts.rewardDistributor,
    tag: 'Verified',
  },
]

const HOW_REWARDS_STEPS = [
  {
    title: 'Balance snapshot',
    desc: 'Your share uses a 180-day moving average of your ENS balance, not just your current balance.',
  },
  {
    title: 'Tier assignment',
    desc: 'Month-over-month growth in delegated VP unlocks tiers. Your tier is set at round start and determines APR.',
  },
  {
    title: 'Payout at round end',
    desc: 'Payouts are proportional to your share and sent directly to your wallet. Sub-1 ENS amounts enter the lottery pool.',
  },
]

export function TransparencyPage() {
  const fetchStatus = useCallback(() => api.status(), [])
  const fetchTiers = useCallback(() => api.tierProgression(), [])
  const status = useAsync(fetchStatus)
  const tiers = useAsync(fetchTiers)

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
              <LinkCardStack items={CONTRACT_ENTRIES} />
            </Section>

            {currentTier && (
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
            )}
          </LeftColumn>

          <Section>
            <SectionEyebrow>How Rewards Are Calculated</SectionEyebrow>
            <SectionTitle>Three steps, monthly</SectionTitle>
            <StepList steps={HOW_REWARDS_STEPS} />
          </Section>
        </Grid>
    </Page>
  )
}
