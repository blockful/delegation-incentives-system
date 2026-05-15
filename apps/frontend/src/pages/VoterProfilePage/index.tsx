import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy, faCheck, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons'
import { faXTwitter } from '@fortawesome/free-brands-svg-icons'
import { useEnsName, useEnsAddress, useEnsText } from 'wagmi'
import { api } from '@/api'
import { MOCK_ENS_PROFILES, MOCK_ENS_TO_ADDRESS } from '@/api/mock'
import { env } from '@/config/env'
import { DelegateProfileSkeleton } from '@/components/shared/PageSkeletons'
import { useAsync } from '@/hooks/useAsync'
import { useVoter } from '@/features/voters/useVoter'
import { useWalletState } from '@/features/wallet/useWalletState'
import { AddressIdentity } from '@/components/shared/AddressIdentity'
import { ProposalBar } from '@/components/shared/ProposalBar'
import { BackLink } from '@/components/shared/BackLink'
import { StatStrip } from '@/components/shared/StatStrip'
import { ToneCallout } from '@/components/shared/ToneCallout'
import { tokens, fadeInUp, ErrorMessage } from '@/styles'
import { getAnticaptureDelegateUrl } from '@/utils/delegation'
import { formatEnsAmount, truncateAddress } from '@/utils/format'
import type { RoundSummary } from '@/api/types'

interface RewardHistoryEntry {
  roundNumber: number
  month: string
  totalRewardEns: string
  rewardStatus: 'paid' | 'no_reward' | 'not_eligible' | 'pending' | 'unavailable'
}

function formatVotingPower(vpWei: string): string {
  const ens = Number(vpWei) / 1e18
  if (ens >= 1_000_000) {
    const m = ens / 1_000_000
    const rounded = Math.round(m * 10) / 10
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}M`
  }
  if (ens >= 1_000) {
    const k = ens / 1_000
    const rounded = Math.round(k * 10) / 10
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}K`
  }
  return formatEnsAmount(ens)
}

function formatActiveSince(iso: string): { primary: string; secondary: string } {
  const date = new Date(iso)
  const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  const now = new Date()
  const months = Math.max(
    0,
    (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth())
  )
  const years = Math.floor(months / 12)
  const remMonths = months % 12
  let secondary = ''
  if (years > 0 && remMonths > 0) secondary = `${years}y ${remMonths}mo ago`
  else if (years > 0) secondary = `${years}y ago`
  else if (remMonths > 0) secondary = `${remMonths}mo ago`
  else secondary = 'this month'
  return { primary: monthYear, secondary }
}

function formatMonthLabel(month: string): string {
  // month format from API is `YYYY-MM`
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return month
  const date = new Date(Date.UTC(y, m - 1, 1))
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function isAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value)
}

async function fetchRewardHistory(voterAddress: string, limit = 3): Promise<RewardHistoryEntry[]> {
  const { rounds } = await api.rounds()
  const paid: RoundSummary[] = rounds
    .filter((r) => r.status === 'paid')
    .sort((a, b) => b.roundNumber - a.roundNumber)
    .slice(0, limit)
  if (paid.length === 0) return []
  const details = await Promise.all(
    paid.map((r) => api.round(r.roundNumber, voterAddress, { rewardLimit: '25' }).catch(() => null))
  )
  return details
    .map((d, i) => {
      const r = paid[i]
      const ar = d?.addressReward
      return {
        roundNumber: r.roundNumber,
        month: r.month,
        totalRewardEns: ar?.voterRewardEns ?? '0',
        rewardStatus: ar?.rewardStatus ?? 'unavailable',
      }
    })
}

/* ─── Animations ─── */

const heroScaleIn = keyframes`
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
`

const subtleBreathe = keyframes`
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%      { opacity: 0.85; transform: scale(1.05); }
`

/* ─── Layout ─── */

const Page = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl} ${tokens.spacing['6xl']};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};
  animation: ${fadeInUp} 0.4s ease both;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['3xl']} ${tokens.spacing['2xl']} ${tokens.spacing['7xl']};
    gap: ${tokens.spacing['3xl']};
  }
`

/* ─── Hero billboard ─── */

const HeroCard = styled.section`
  position: relative;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.md};
  box-shadow: ${tokens.shadow.soft};
  padding: ${tokens.spacing['2xl']} ${tokens.spacing.xl};
  display: grid;
  gap: ${tokens.spacing.xl};
  overflow: hidden;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['4xl']} ${tokens.spacing['3xl']};
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: ${tokens.spacing['4xl']};
  }

  /* Decorative radial gradient — visual interest without noise */
  &::before {
    content: '';
    position: absolute;
    top: -120px;
    right: -120px;
    width: 360px;
    height: 360px;
    background: radial-gradient(circle, ${tokens.color.lightBlueOpacity} 0%, transparent 65%);
    pointer-events: none;
    animation: ${subtleBreathe} 6s ease-in-out infinite;
    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }
`

const HeroIdentity = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
  min-width: 0;
`

const HeroTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.lg};
  animation: ${heroScaleIn} 0.35s ease both;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const AvatarWrap = styled.div`
  flex-shrink: 0;
`

const NameStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

const HeroName = styled.h1`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.darkBlue};
  line-height: 1.1;
  letter-spacing: -0.01em;
  margin: 0;
  word-break: break-word;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['4xl']};
  }
`

const AddressChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 4px 10px;
  border-radius: ${tokens.radius.pill};
  border: 1px solid ${tokens.color.borderLight};
  background: ${tokens.color.surfaceMat};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
  cursor: pointer;
  transition: all ${tokens.transition.fast};

  &:hover {
    border-color: ${tokens.color.blue};
    color: ${tokens.color.blue};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.accent};
    outline-offset: 2px;
  }
`

const CopiedFlash = styled.span`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.status.success.fg};
  letter-spacing: 0.04em;
`

const Bio = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.base};
  line-height: 1.6;
  color: ${tokens.color.darkGray};
  max-width: 560px;
`

const VerifiedChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.spacing.sm};
`

const Chip = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: ${tokens.radius.pill};
  border: 1px solid ${tokens.color.borderLight};
  background: ${tokens.color.surface};
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  text-decoration: none;
  transition: all ${tokens.transition.fast};

  &:hover {
    border-color: ${tokens.color.blue};
    color: ${tokens.color.blue};
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.accent};
    outline-offset: 2px;
  }
`

const ChipMark = styled.span`
  font-weight: ${tokens.font.weight.bold};
`

/* ─── Hero CTA ─── */

const HeroCta = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  min-width: 240px;
  width: 100%;

  @media (min-width: 768px) {
    width: auto;
    max-width: 280px;
  }
`

const DelegateButton = styled.button`
  width: 100%;
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  border-radius: ${tokens.radius.md};
  border: none;
  background: ${tokens.color.blue};
  color: ${tokens.color.white};
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  cursor: pointer;
  box-shadow: ${tokens.shadow.soft};
  transition:
    background ${tokens.transition.base},
    box-shadow ${tokens.transition.base},
    transform ${tokens.transition.fast};

  &:hover {
    background: ${tokens.color.accent};
    box-shadow: ${tokens.shadow.md};
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.accent};
    outline-offset: 2px;
  }
`

const FreeTag = styled.span.attrs({ 'aria-hidden': true })`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: ${tokens.radius.pill};
  background: rgba(255, 255, 255, 0.2);
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  letter-spacing: 0.04em;
  margin-left: ${tokens.spacing.sm};
`

const Hint = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
  text-align: center;
`

/* ─── Stat cards ─── */

const StatCardSurface = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: ${tokens.spacing.lg};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.md};
  box-shadow: ${tokens.shadow.soft};
  transition: all ${tokens.transition.fast};
  min-width: 0;

  &:hover {
    border-color: ${tokens.color.middleGray};
    transform: translateY(-1px);
  }
`

const StatValue = styled.span`
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.darkBlue};
  line-height: 1.1;
  font-variant-numeric: tabular-nums;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['3xl']};
  }
`

const StatLabel = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  letter-spacing: 0.04em;
  color: ${tokens.color.darkGray};
`

const StatSub = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
  margin-top: 2px;
`

/* ─── Section cards ─── */

const SectionCard = styled.section`
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.md};
  box-shadow: ${tokens.shadow.soft};
  padding: ${tokens.spacing.xl} ${tokens.spacing.xl} ${tokens.spacing['2xl']};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
`

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: ${tokens.spacing.md};
`

const SectionEyebrow = styled.span`
  display: block;
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  letter-spacing: 0.06em;
  color: ${tokens.color.darkGray};
`

const SectionTitle = styled.h2`
  margin: 4px 0 0;
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.25;
`

const SectionMeta = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
`

const InlineExternalLink = styled.a`
  color: ${tokens.color.blue};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`

/* ─── Rewards strip ─── */

const RewardsStrip = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing.md};

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

const RewardCard = styled.a`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: ${tokens.spacing.lg};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.md};
  box-shadow: ${tokens.shadow.soft};
  text-decoration: none;
  cursor: pointer;
  transition: all ${tokens.transition.fast};
  overflow: hidden;

  &::after {
    content: '→';
    position: absolute;
    top: ${tokens.spacing.lg};
    right: ${tokens.spacing.lg};
    color: ${tokens.color.darkGray};
    font-size: ${tokens.font.size.xl};
    transition: transform ${tokens.transition.fast};
  }

  &:hover {
    border-color: ${tokens.color.blue};
    transform: translateY(-1px);
    box-shadow: ${tokens.shadow.md};
  }

  &:hover::after {
    transform: translateX(2px);
    color: ${tokens.color.blue};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.accent};
    outline-offset: 2px;
  }
`

const RewardEyebrow = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  letter-spacing: 0.04em;
  color: ${tokens.color.darkGray};
`

const RewardValue = styled.span`
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.status.success.fg};
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
`

const RewardZero = styled(RewardValue)`
  color: ${tokens.color.darkGray};
`

const RewardSub = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
`

const EmptyRewards = styled.div`
  padding: ${tokens.spacing.xl};
  background: ${tokens.color.surfaceMat};
  border: 1px dashed ${tokens.color.borderLight};
  border-radius: ${tokens.radius.md};
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.base};
  text-align: center;
  line-height: 1.6;
`

/* ─── Verification chips row ─── */

const VerificationRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.spacing.sm};
`

const VerifyChip = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: ${tokens.radius.pill};
  border: 1px solid ${tokens.color.borderLight};
  background: ${tokens.color.surface};
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  text-decoration: none;
  box-shadow: ${tokens.shadow.soft};
  transition: all ${tokens.transition.fast};

  &:hover {
    border-color: ${tokens.color.blue};
    color: ${tokens.color.blue};
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.accent};
    outline-offset: 2px;
  }
`

const VerifyArrow = styled.span`
  font-size: ${tokens.font.size.base};
  opacity: 0.6;
`

/* ─── Component ─── */

function useEnsTextRecord(name: string | null, key: string): string | undefined {
  const { data } = useEnsText({
    name: name ?? undefined,
    key,
    query: { enabled: Boolean(name) && !env.useMockApi },
  })
  return typeof data === 'string' && data.trim().length > 0 ? data : undefined
}

function getMockProfileField(
  address: string | undefined,
  key: 'description' | 'twitter' | 'url',
): string | undefined {
  if (!env.useMockApi || !address) return undefined
  return MOCK_ENS_PROFILES[address.toLowerCase()]?.[key]
}

export function VoterProfilePage() {
  const { address: param } = useParams<{ address: string }>()
  const rawParam = param ?? ''
  const isEnsParam = !isAddress(rawParam)

  // Wagmi resolution (skipped in mock mode — no real RPC means this hangs forever)
  const { data: resolvedAddress, isLoading: ensLoading } = useEnsAddress({
    name: rawParam,
    query: { enabled: isEnsParam && !env.useMockApi },
  })

  // Mock-mode reverse resolution for known ENS names in fixtures
  const mockResolvedAddress = useMemo(() => {
    if (!env.useMockApi || !isEnsParam) return null
    return MOCK_ENS_TO_ADDRESS[rawParam.toLowerCase()] ?? null
  }, [rawParam, isEnsParam])

  const resolvedAddr = isEnsParam
    ? (env.useMockApi ? (mockResolvedAddress ?? '') : (resolvedAddress ?? ''))
    : rawParam
  const { voter, loading, error } = useVoter(resolvedAddr)
  const walletState = useWalletState()

  const fetchTiers = useCallback(() => api.tierProgression(), [])
  const tiers = useAsync(fetchTiers)
  const aprPct = tiers.data?.maxTokenHolderAprPct ?? null

  const { data: resolvedEnsName } = useEnsName({
    address: resolvedAddr as `0x${string}`,
    query: { enabled: !!resolvedAddr && !isEnsParam && !env.useMockApi },
  })

  const ensName = voter?.ensName ?? (isEnsParam ? rawParam : resolvedEnsName) ?? null

  // ENS text records — bio + verified links (with mock-mode fallback)
  const liveBio = useEnsTextRecord(ensName, 'description')
  const liveTwitter = useEnsTextRecord(ensName, 'com.twitter')
  const liveUrl = useEnsTextRecord(ensName, 'url')
  const voterAddrForMock = voter?.address
  const bio = liveBio ?? getMockProfileField(voterAddrForMock, 'description')
  const twitter = liveTwitter ?? getMockProfileField(voterAddrForMock, 'twitter')
  const url = liveUrl ?? getMockProfileField(voterAddrForMock, 'url')

  // Rewards history
  const voterAddr = voter?.address ?? ''
  const fetchRewards = useCallback(
    () => (voterAddr ? fetchRewardHistory(voterAddr) : Promise.resolve([])),
    [voterAddr]
  )
  const rewardsHistory = useAsync(fetchRewards, Boolean(voterAddr))

  // Address copy
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    if (!voter?.address) return
    navigator.clipboard.writeText(voter.address).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  }

  // Voting metrics
  const votingPercentage = useMemo(() => {
    if (!voter) return 0
    if (voter.last10ProposalsVoted.length === 0) return 0
    return Math.round(
      (voter.last10ProposalsVoted.filter(Boolean).length / voter.last10ProposalsVoted.length) * 100
    )
  }, [voter])

  const votedCount = useMemo(
    () => (voter ? voter.last10ProposalsVoted.filter(Boolean).length : 0),
    [voter]
  )

  if (loading || ensLoading) {
    return <DelegateProfileSkeleton />
  }

  if (error || !voter) {
    return (
      <Page>
        <BackLink to="/voters">All voters</BackLink>
        <ErrorMessage>
          {error ?? 'Voter not found. They may not be an active voter in the incentives program.'}
        </ErrorMessage>
      </Page>
    )
  }

  const isDelegated =
    walletState.status === 'delegated' &&
    walletState.delegatedTo.toLowerCase() === voter.address.toLowerCase()

  const delegateUrl = getAnticaptureDelegateUrl(voter.address)
  const etherscanUrl = `https://etherscan.io/address/${voter.address}`
  const ensAppUrl = ensName
    ? `https://app.ens.domains/${ensName}`
    : `https://app.ens.domains/${voter.address}`

  const twitterUrl = twitter
    ? `https://twitter.com/${twitter.replace(/^@/, '')}`
    : null
  const webUrl = url
    ? (url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`)
    : null

  const activeSinceParts = voter.activeSince ? formatActiveSince(voter.activeSince) : null

  return (
    <Page>
        <BackLink to="/voters">All voters</BackLink>

        {/* ─── Hero billboard ─── */}
        <HeroCard>
          <HeroIdentity>
            <HeroTopRow>
              <AvatarWrap>
                <AddressIdentity
                  address={voter.address}
                  ensName={ensName}
                  avatarUrl={voter.avatarUrl}
                  showAvatar
                  avatarSize={80}
                  layout="inline"
                  size="md"
                  secondaryAddress="never"
                />
              </AvatarWrap>
              <NameStack>
                <HeroName>{ensName ?? truncateAddress(voter.address)}</HeroName>
                <AddressChip onClick={handleCopy} type="button" aria-label="Copy address">
                  {copied ? (
                    <CopiedFlash>
                      <FontAwesomeIcon icon={faCheck} /> Copied
                    </CopiedFlash>
                  ) : (
                    <>
                      {truncateAddress(voter.address)}
                      <FontAwesomeIcon icon={faCopy} style={{ opacity: 0.6 }} />
                    </>
                  )}
                </AddressChip>
              </NameStack>
            </HeroTopRow>

            {bio && <Bio>{bio}</Bio>}

            <VerifiedChips>
              {twitterUrl && (
                <Chip
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Twitter / X profile (from ENS record)"
                >
                  <FontAwesomeIcon icon={faXTwitter} />
                  @{twitter!.replace(/^@/, '')}
                </Chip>
              )}
              {webUrl && (
                <Chip
                  href={webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Website (from ENS record)"
                >
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                  {url}
                </Chip>
              )}
              <Chip href={delegateUrl} target="_blank" rel="noopener noreferrer">
                Anticapture <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
              </Chip>
              <Chip href={etherscanUrl} target="_blank" rel="noopener noreferrer">
                Etherscan <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
              </Chip>
              <Chip href={ensAppUrl} target="_blank" rel="noopener noreferrer">
                ENS profile <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
              </Chip>
            </VerifiedChips>
          </HeroIdentity>

          <HeroCta>
            {isDelegated ? (
              <ToneCallout
                tone="success"
                title="You're delegated"
                body={aprPct ? `Earning up to ${aprPct}% APR.` : 'Active delegation.'}
                compact
              />
            ) : (
              <>
                <DelegateButton type="button">
                  {aprPct ? `Delegate · Earn up to ${aprPct}% APR` : 'Delegate'}
                  <FreeTag>Free</FreeTag>
                </DelegateButton>
                <Hint>Gas sponsored by the incentives program</Hint>
              </>
            )}
          </HeroCta>
        </HeroCard>

        {/* ─── Stats strip ─── */}
        <StatStrip columns={4} gap="md">
          <StatCardSurface>
            <StatLabel>Voting Power</StatLabel>
            <StatValue>{formatVotingPower(voter.votingPower)}</StatValue>
            <StatSub>ENS delegated to them</StatSub>
          </StatCardSurface>

          <StatCardSurface>
            <StatLabel>Delegators</StatLabel>
            <StatValue>{voter.tokenHolderCount.toLocaleString('en-US')}</StatValue>
            <StatSub>token holders</StatSub>
          </StatCardSurface>

          <StatCardSurface>
            <StatLabel>Participation</StatLabel>
            <StatValue>{votingPercentage}%</StatValue>
            <StatSub>recent activity rate</StatSub>
          </StatCardSurface>

          {activeSinceParts ? (
            <StatCardSurface>
              <StatLabel>Active Since</StatLabel>
              <StatValue style={{ fontSize: tokens.font.size.xl }}>{activeSinceParts.primary}</StatValue>
              <StatSub>{activeSinceParts.secondary}</StatSub>
            </StatCardSurface>
          ) : (
            <StatCardSurface>
              <StatLabel>Active Since</StatLabel>
              <StatValue style={{ color: tokens.color.textFaint, fontSize: tokens.font.size.xl }}>—</StatValue>
              <StatSub>unknown</StatSub>
            </StatCardSurface>
          )}
        </StatStrip>

        {/* ─── Voting Record ─── */}
        <SectionCard>
          <SectionHeader>
            <div>
              <SectionEyebrow>Voting Record</SectionEyebrow>
              <SectionTitle>Voted on {votedCount} of last 10 proposals</SectionTitle>
            </div>
            <InlineExternalLink href={delegateUrl} target="_blank" rel="noopener noreferrer">
              Full record on Anticapture ↗
            </InlineExternalLink>
          </SectionHeader>
          <ProposalBar votes={voter.last10ProposalsVoted} />
          <SectionMeta>
            Each dot is one of the most recent 10 governance proposals — filled means they voted, empty means they didn't.
          </SectionMeta>
        </SectionCard>

        {/* ─── Recent Rewards ─── */}
        <SectionCard>
          <SectionHeader>
            <div>
              <SectionEyebrow>Recent Voter Rewards</SectionEyebrow>
              <SectionTitle>Last paid rounds</SectionTitle>
            </div>
            <SectionMeta>Voter share of the round&apos;s 10% pool</SectionMeta>
          </SectionHeader>

          {rewardsHistory.loading ? (
            <EmptyRewards>Loading reward history…</EmptyRewards>
          ) : rewardsHistory.data && rewardsHistory.data.length > 0 ? (
            <RewardsStrip>
              {rewardsHistory.data.map((r) => {
                const num = Number(r.totalRewardEns)
                const formatted = Number.isFinite(num) && num > 0
                  ? `${formatEnsAmount(r.totalRewardEns, { maximumFractionDigits: 2 })} ENS`
                  : '0 ENS'
                const earned = Number.isFinite(num) && num > 0
                return (
                  <RewardCard
                    key={r.roundNumber}
                    href={`/rounds/${r.roundNumber}?address=${voter.address}`}
                  >
                    <RewardEyebrow>Round {r.roundNumber}</RewardEyebrow>
                    {earned ? (
                      <RewardValue>+{formatted}</RewardValue>
                    ) : (
                      <RewardZero>0 ENS</RewardZero>
                    )}
                    <RewardSub>{formatMonthLabel(r.month)}</RewardSub>
                  </RewardCard>
                )
              })}
            </RewardsStrip>
          ) : (
            <EmptyRewards>
              No finalized voter rewards yet for this delegate. Their first appearance here will be after the next round closes.
            </EmptyRewards>
          )}
        </SectionCard>

    </Page>
  )
}
