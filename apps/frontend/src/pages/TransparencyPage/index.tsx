import { useCallback } from 'react'
import styled from 'styled-components'
import { Spinner } from '@ensdomains/thorin'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { contracts } from '@/config/contracts'
import { truncateAddress } from '@/utils/format'
import { tokens } from '@/styles/tokens'
import { Eyebrow, PageContainer } from '@/styles/primitives'
import { LinkCardRow, LinkCardStack, type LinkCardItem } from '@/components/shared/LinkCard'
import gitIcon from '@/images/git.png'
import anticaptureIcon from '@/images/anticapture.png'
import duneIcon from '@/images/dune.png'
import { StatCard } from '@/components/shared/StatCard'
import { StepList } from '@/components/shared/StepList'

import { CURRENT_ROUND } from '@/config/round'

/* ─── Page wrapper ─── */

const Page = styled(PageContainer)``

/* ─── Hero ─── */

const HeroBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
`

const HeroTitle = styled.h1`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.darkBlue};
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin: 0;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['5xl']};
  }
`

const HeroDesc = styled.p`
  font-size: ${tokens.font.size.xl};
  color: ${tokens.color.darkGray};
  line-height: 1.6;
  margin: 0;
  max-width: 600px;
`


/* ─── Two-column grid ─── */

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing['3xl']};

  @media (min-width: 768px) {
    grid-template-columns: 2fr 1fr;
  }
`

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
`

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
`

/* ─── Section labels (small-caps style) ─── */

const SectionLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${tokens.color.darkGray};
`


/* ─── Stat grid ─── */

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${tokens.spacing.md};
`


/* ─── Loading ─── */

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`

/* ─── Data ─── */

const VERIFY_LINKS: LinkCardItem[] = [
  {
    iconSrc: gitIcon,
    title: 'GitHub',
    desc: 'Open source contracts & scripts',
    href: 'https://github.com/blockful-io/delegation-incentives-system',
  },
  {
    iconSrc: anticaptureIcon,
    title: 'Anticapture',
    desc: 'Delegate activity & governance health',
    href: 'https://anticapture.xyz',
  },
  {
    iconSrc: duneIcon,
    title: 'Dune Analytics',
    desc: 'Live round data & payout breakdown',
    href: 'https://dune.com',
  },
]

const CONTRACT_ENTRIES: LinkCardItem[] = [
  {
    title: 'ENS Incentives',
    desc: truncateAddress(contracts.ensIncentives),
    href: `https://etherscan.io/address/${contracts.ensIncentives}`,
    tag: 'Verified',
  },
  {
    title: 'Delegate By Sig',
    desc: truncateAddress(contracts.delegateBySig),
    href: `https://etherscan.io/address/${contracts.delegateBySig}`,
    tag: 'Verified',
  },
  {
    title: 'Reward Distributor',
    desc: truncateAddress(contracts.rewardDistributor),
    href: `https://etherscan.io/address/${contracts.rewardDistributor}`,
    tag: 'Verified',
  },
]

const HOW_REWARDS_STEPS = [
  {
    title: 'Balance snapshot',
    desc: 'Your share is based on the average of your daily ENS balance over the last 180 days — not just your current balance.',
  },
  {
    title: 'Tier assignment',
    desc: 'Tiers unlock as total delegated VP grows. Your tier is set at round start and determines your APY for the full 30-day round.',
  },
  {
    title: 'Payout at round end',
    desc: 'ENS is sent directly to your wallet. No claiming needed. Sub-1 ENS amounts enter the lottery pool instead.',
  },
]

/* ─── Component ─── */

export function TransparencyPage() {
  const fetchStatus = useCallback(() => api.status(), [])
  const fetchTiers = useCallback(() => api.tierProgression(), [])
  const status = useAsync(fetchStatus)
  const tiers = useAsync(fetchTiers)

  const loading = status.loading || tiers.loading

  return (
    <Page>
      {/* Hero */}
      <HeroBlock>
        <Eyebrow>Transparency</Eyebrow>
        <HeroTitle>Verify everything on-chain</HeroTitle>
        <HeroDesc>
          Every calculation is public. Every payout is verifiable. No trust
          required, check it yourself.
        </HeroDesc>
      </HeroBlock>

      {/* Link cards row */}
      <LinkCardRow items={VERIFY_LINKS} />

      {/* Two-column grid */}
      <Grid>
        {/* Left column */}
        <LeftColumn>
          {/* Smart Contracts */}
          <Section>
            <SectionLabel>Smart Contracts</SectionLabel>
            <LinkCardStack items={CONTRACT_ENTRIES} />
          </Section>

          {/* Live data stats */}
          {loading ? (
            <LoadingWrapper>
              <Spinner />
            </LoadingWrapper>
          ) : (
            status.data &&
            tiers.data && (
              <Section>
                <SectionLabel>
                  Round {CURRENT_ROUND} · Live Data
                </SectionLabel>
                <StatGrid>
                  <StatCard label="Snapshot Block" value="—" />
                  <StatCard label="Total Delegated" value={status.data.activeDelegateCount} />
                  <StatCard label="Eligible Holders" value={status.data.proposalCount} />
                  <StatCard label="Reward Pool" value={`Tier ${tiers.data.currentTierIndex + 1}`} />
                </StatGrid>
              </Section>
            )
          )}
        </LeftColumn>

        {/* Right column */}
        <Section>
          <SectionLabel>How rewards are calculated</SectionLabel>
          <StepList steps={HOW_REWARDS_STEPS} />
        </Section>
      </Grid>
    </Page>
  )
}
