import { useCallback } from 'react'
import styled from 'styled-components'
import { Spinner, Tag, Heading as ThorinHeading } from '@ensdomains/thorin'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { contracts } from '@/config/contracts'
import { truncateAddress } from '@/utils/format'
import { tokens } from '@/styles/tokens'

const Page = styled.div`
  max-width: 1120px;
  margin: 0 auto;
  padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
`


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

const SectionLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${tokens.color.accent};
`

const SectionTitle = styled.h2`
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
  margin: 0;
`

const LinkCard = styled.a`
  border-radius: ${tokens.radius.lg};
  border: 1px solid ${tokens.color.border};
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
  background: ${tokens.color.surface};
  text-decoration: none;
  color: inherit;
  transition: border-color ${tokens.transition.fast};

  &:hover {
    border-color: ${tokens.color.textMuted};
  }
`

const LinkIcon = styled.span`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${tokens.color.lightBlue};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${tokens.font.size.lg};
  flex-shrink: 0;
`

const LinkTitle = styled.span`
  flex: 1;
  font-size: ${tokens.font.size.md};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.text};
`

const Chevron = styled.span`
  font-size: ${tokens.font.size.xl};
  color: ${tokens.color.textMuted};
`

const ContractRow = styled.div`
  border-radius: ${tokens.radius.lg};
  border: 1px solid ${tokens.color.border};
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
  background: ${tokens.color.surface};
`

const ContractInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ContractName = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.text};
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

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${tokens.spacing.md};
`

const StatCard = styled.div`
  border-radius: ${tokens.radius.md};
  background: ${tokens.color.surfaceAlt};
  padding: ${tokens.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const StatLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${tokens.color.textMuted};
`

const StatValue = styled.span`
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
`

const StepList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
`

const Step = styled.div`
  display: flex;
  gap: ${tokens.spacing.md};
  align-items: flex-start;
`

const StepNumber = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${tokens.color.midnightBlue};
  color: ${tokens.color.surface};
  font-weight: ${tokens.font.weight.bold};
  font-size: ${tokens.font.size.base};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const StepText = styled.p`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.text};
  margin: 0;
  line-height: 1.5;
  padding-top: 3px;
`

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`

const VERIFY_LINKS = [
  {
    icon: '📂',
    title: 'GitHub',
    href: 'https://github.com/blockful-io/delegation-incentives-system',
  },
  {
    icon: '🛡️',
    title: 'Anticapture',
    href: 'https://anticapture.xyz',
  },
  {
    icon: '📊',
    title: 'Dune Analytics',
    href: 'https://dune.com',
  },
]

const CONTRACT_ENTRIES = [
  { name: 'ENS Incentives', address: contracts.ensIncentives },
  { name: 'Delegate By Sig', address: contracts.delegateBySig },
  { name: 'Reward Distributor', address: contracts.rewardDistributor },
] as const

const HOW_REWARDS_STEPS = [
  'We measure the aggregate voting power delegated to active delegates over a 180-day moving average.',
  'Month-over-month growth determines the reward tier — higher growth unlocks larger reward pools.',
  'Individual rewards are proportional to your share of the pool, capped per-address to ensure fair distribution.',
]

import { CURRENT_ROUND } from '@/config/round'

export function TransparencyPage() {
  const fetchStatus = useCallback(() => api.status(), [])
  const fetchTiers = useCallback(() => api.tierProgression(), [])
  const status = useAsync(fetchStatus)
  const tiers = useAsync(fetchTiers)

  const loading = status.loading || tiers.loading

  return (
    <Page>
      <ThorinHeading level="1" responsive>Verify everything on-chain</ThorinHeading>

      <Grid>
        <LeftColumn>
          <Section>
            <SectionLabel>Verify Yourself</SectionLabel>
            {VERIFY_LINKS.map((link) => (
              <LinkCard
                key={link.title}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <LinkIcon aria-hidden>{link.icon}</LinkIcon>
                <LinkTitle>{link.title}</LinkTitle>
                <Chevron aria-hidden>›</Chevron>
              </LinkCard>
            ))}
          </Section>

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
                <Tag colorStyle="greenPrimary">Verified</Tag>
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
                    <StatLabel>Active Delegates</StatLabel>
                    <StatValue>{status.data.activeDelegateCount}</StatValue>
                  </StatCard>
                  <StatCard>
                    <StatLabel>Proposals</StatLabel>
                    <StatValue>{status.data.proposalCount}</StatValue>
                  </StatCard>
                  <StatCard>
                    <StatLabel>Current Tier</StatLabel>
                    <StatValue>
                      Tier {tiers.data.currentTierIndex + 1}
                    </StatValue>
                  </StatCard>
                  <StatCard>
                    <StatLabel>Growth</StatLabel>
                    <StatValue>{tiers.data.currentGrowthPct}%</StatValue>
                  </StatCard>
                </StatGrid>
              </Section>
            )
          )}
        </LeftColumn>

        <Section>
          <SectionTitle>How rewards are calculated</SectionTitle>
          <StepList>
            {HOW_REWARDS_STEPS.map((text, i) => (
              <Step key={i}>
                <StepNumber>{i + 1}</StepNumber>
                <StepText>{text}</StepText>
              </Step>
            ))}
          </StepList>
        </Section>
      </Grid>
    </Page>
  )
}
