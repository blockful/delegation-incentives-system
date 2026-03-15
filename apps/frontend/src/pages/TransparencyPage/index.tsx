import { useCallback } from 'react'
import styled from 'styled-components'
import { Spinner, Tag } from '@ensdomains/thorin'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { contracts } from '@/config/contracts'
import { truncateAddress } from '@/utils/format'

const Page = styled.div`
  max-width: 1120px;
  margin: 0 auto;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  gap: 32px;
`

const Heading = styled.h1`
  font-size: 32px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  line-height: 1.2;

  @media (min-width: 768px) {
    font-size: 40px;
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;

  @media (min-width: 768px) {
    grid-template-columns: 2fr 1fr;
  }
`

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
`

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const SectionLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #3889ff;
`

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`

const LinkCard = styled.a`
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: ${({ theme }) => theme.colors.background};
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.textTertiary};
  }
`

const LinkIcon = styled.span`
  font-size: 20px;
  flex-shrink: 0;
`

const LinkTitle = styled.span`
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`

const Chevron = styled.span`
  font-size: 18px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const ContractRow = styled.div`
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: ${({ theme }) => theme.colors.background};
`

const ContractInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ContractName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`

const ContractAddress = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-family: monospace;
`

const ExternalLink = styled.a`
  font-size: 14px;
  color: #3889ff;
  text-decoration: none;
  flex-shrink: 0;

  &:hover {
    text-decoration: underline;
  }
`

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`

const StatCard = styled.div`
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.02);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const StatLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const StatValue = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`

const StepList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const Step = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
`

const StepNumber = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #3889ff;
  color: white;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const StepText = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
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
      <Heading>Verify everything on-chain</Heading>

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
