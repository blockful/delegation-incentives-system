import { useCallback } from 'react'
import styled from 'styled-components'
import { Spinner, Tag } from '@ensdomains/thorin'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { contracts } from '@/config/contracts'
import { truncateAddress } from '@/utils/format'
import { tokens } from '@/styles/tokens'
import {
  Eyebrow,
  PageContainer,
  cardStyles,
  cardHoverStyles,
} from '@/styles/primitives'

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

/* ─── Link cards row ─── */

const LinkCardsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing.md};

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

const LinkCard = styled.a`
  ${cardStyles}
  ${cardHoverStyles}
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
  text-decoration: none;
  color: inherit;
  box-shadow: ${tokens.shadow.sm};
`

const LinkIconBox = styled.span`
  width: 40px;
  height: 40px;
  border-radius: ${tokens.radius.md};
  background: ${tokens.color.darkBlue};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
`

const LinkContent = styled.span`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const LinkTitle = styled.span`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const LinkDesc = styled.span`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkGray};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ChevronIcon = styled.span`
  font-size: ${tokens.font.size.xl};
  color: ${tokens.color.textFaint};
  flex-shrink: 0;
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

/* ─── Contract rows ─── */

const ContractRow = styled.div`
  ${cardStyles}
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
`

const ContractInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const ContractName = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

const ContractAddress = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
  font-family: ${tokens.font.mono};
`

const ExternalLink = styled.a`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.accent};
  text-decoration: none;
  flex-shrink: 0;

  &:hover {
    text-decoration: underline;
  }
`

/* ─── Stat grid ─── */

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${tokens.spacing.md};
`

const StatCard = styled.div`
  border-radius: ${tokens.radius.md};
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.gray};
  padding: ${tokens.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const StatLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${tokens.color.darkGray};
`

const StatValue = styled.span`
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

/* ─── Right column: how rewards steps ─── */

const StepList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xl};
`

const Step = styled.div`
  display: flex;
  gap: ${tokens.spacing.md};
  align-items: flex-start;
`

const StepNumber = styled.div`
  width: 28px;
  height: 28px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.blue};
  color: ${tokens.color.surface};
  font-weight: ${tokens.font.weight.bold};
  font-size: ${tokens.font.size.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
`

const StepBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const StepTitle = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.4;
`

const StepDesc = styled.p`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkGray};
  margin: 0;
  line-height: 1.55;
`

/* ─── Loading ─── */

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`

/* ─── Data ─── */

const VERIFY_LINKS = [
  {
    icon: '📂',
    title: 'GitHub',
    desc: 'Open source contracts & scripts',
    href: 'https://github.com/blockful-io/delegation-incentives-system',
  },
  {
    icon: '🛡️',
    title: 'Anticapture',
    desc: 'Delegate activity & governance health',
    href: 'https://anticapture.xyz',
  },
  {
    icon: '📊',
    title: 'Dune Analytics',
    desc: 'Live round data & payout breakdown',
    href: 'https://dune.com',
  },
]

const CONTRACT_ENTRIES = [
  { name: 'ENS Incentives', address: contracts.ensIncentives },
  { name: 'Delegate By Sig', address: contracts.delegateBySig },
  { name: 'Reward Distributor', address: contracts.rewardDistributor },
] as const

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

      {/* 3-column link cards row */}
      <LinkCardsRow>
        {VERIFY_LINKS.map((link) => (
          <LinkCard
            key={link.title}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <LinkIconBox aria-hidden>{link.icon}</LinkIconBox>
            <LinkContent>
              <LinkTitle>{link.title}</LinkTitle>
              <LinkDesc>{link.desc}</LinkDesc>
            </LinkContent>
            <ChevronIcon aria-hidden>›</ChevronIcon>
          </LinkCard>
        ))}
      </LinkCardsRow>

      {/* Two-column grid */}
      <Grid>
        {/* Left column */}
        <LeftColumn>
          {/* Smart Contracts */}
          <Section>
            <SectionLabel>Smart Contracts</SectionLabel>
            {CONTRACT_ENTRIES.map((contract) => (
              <ContractRow key={contract.name}>
                <ContractInfo>
                  <ContractName>{contract.name}</ContractName>
                  <ContractAddress>
                    {truncateAddress(contract.address)}
                  </ContractAddress>
                </ContractInfo>
                <Tag colorStyle="greenSecondary">Verified</Tag>
                <ExternalLink
                  href={`https://etherscan.io/address/${contract.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ↗
                </ExternalLink>
              </ContractRow>
            ))}
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
                  <StatCard>
                    <StatLabel>Snapshot Block</StatLabel>
                    <StatValue>—</StatValue>
                  </StatCard>
                  <StatCard>
                    <StatLabel>Total Delegated</StatLabel>
                    <StatValue>{status.data.activeDelegateCount}</StatValue>
                  </StatCard>
                  <StatCard>
                    <StatLabel>Eligible Holders</StatLabel>
                    <StatValue>{status.data.proposalCount}</StatValue>
                  </StatCard>
                  <StatCard>
                    <StatLabel>Reward Pool</StatLabel>
                    <StatValue>
                      Tier {tiers.data.currentTierIndex + 1}
                    </StatValue>
                  </StatCard>
                </StatGrid>
              </Section>
            )
          )}
        </LeftColumn>

        {/* Right column */}
        <Section>
          <SectionLabel>How rewards are calculated</SectionLabel>
          <StepList>
            {HOW_REWARDS_STEPS.map((step, i) => (
              <Step key={i}>
                <StepNumber>{i + 1}</StepNumber>
                <StepBody>
                  <StepTitle>{step.title}</StepTitle>
                  <StepDesc>{step.desc}</StepDesc>
                </StepBody>
              </Step>
            ))}
          </StepList>
        </Section>
      </Grid>
    </Page>
  )
}
