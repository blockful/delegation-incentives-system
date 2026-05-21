import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faArrowUpRightFromSquare,
  faBolt,
  faCheck,
  faCircleCheck,
  faCircleMinus,
  faClock,
  faCopy,
  faShareNodes,
  faSquarePollVertical,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'
import { faXTwitter } from '@fortawesome/free-brands-svg-icons'
import { isAddress } from 'viem'
import { useEnsName, useEnsAddress, useEnsText } from 'wagmi'
import { env } from '@/config/env'
import { MOCK_ENS_TO_ADDRESS } from '@/api/mock'
import { DelegateProfileSkeleton } from '@/components/shared/PageSkeletons'
import { LabelWithTooltip } from '@/components/shared/LabelWithTooltip'
import { useVoter } from '@/features/voters/useVoter'
import { useWalletState } from '@/features/wallet/useWalletState'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { DelegationModal } from '@/features/delegate/components/DelegationModal'
import { useRelayerBalance } from '@/features/delegate/hooks/useGaslessRelayer'
import { contracts } from '@/config/contracts'
import { tokens, fadeInUp, ErrorMessage } from '@/styles'
import { formatEnsAmount, truncateAddress } from '@/utils/format'
import { getAnticaptureDelegateUrl } from '@/utils/delegation'
import { Button } from '@ensdomains/thorin'

/* ─── Helpers ─── */

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

function formatActiveSinceShort(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const year = String(date.getFullYear()).slice(-2)
  return `${month} ‘${year}`
}

/* ─── Page layout ─── */

const Page = styled.div`
  width: 100%;
  max-width: 1120px;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
  animation: ${fadeInUp} 0.4s ease both;
`

/* ─── Header card ─── */

const HeaderCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};
  padding: ${tokens.spacing['2xl']};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);

  @media (min-width: 768px) {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "back avatar"
      "text avatar";
    column-gap: ${tokens.spacing['4xl']};
    row-gap: ${tokens.spacing['2xl']};
  }
`

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};
  min-width: 0;
  align-items: center;
  text-align: center;

  @media (min-width: 768px) {
    grid-area: text;
    align-items: stretch;
    text-align: left;
  }
`

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
  align-items: center;

  @media (min-width: 768px) {
    align-items: stretch;
  }
`

const BackLinkButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  align-self: flex-start;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  color: ${tokens.color.blue};
  transition: opacity ${tokens.transition.fast}, gap ${tokens.transition.fast};

  &:hover {
    text-decoration: none;
    opacity: 0.8;
    gap: ${tokens.spacing.sm};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
    border-radius: 4px;
  }

  @media (min-width: 768px) {
    grid-area: back;
  }
`

const NameRow = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: ${tokens.spacing.md};
  justify-content: center;

  @media (min-width: 768px) {
    justify-content: flex-start;
  }
`

const NameTitle = styled.h1`
  margin: 0;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.1;
  letter-spacing: -0.02em;
  word-break: break-word;
  text-wrap: balance;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['5xl']};
  }
`

const AddressTag = styled.button<{ $copied?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  background: ${({ $copied }) =>
    $copied ? tokens.color.status.success.bg : tokens.color.borderLight};
  border: none;
  border-radius: 14px;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  color: ${({ $copied }) =>
    $copied ? tokens.color.status.success.fg : tokens.color.darkGray};
  white-space: nowrap;
  cursor: pointer;
  transition:
    background ${tokens.transition.fast},
    color ${tokens.transition.fast};

  &:hover {
    background: ${({ $copied }) =>
      $copied ? tokens.color.status.success.bg : tokens.color.middleGray};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
  }
`

const CopyIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  font-size: 12px;
  opacity: 0.7;
`

const Description = styled.p`
  margin: 0;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.medium};
  line-height: 1.4;
  color: ${tokens.color.darkGray};
  max-width: 720px;
  text-wrap: pretty;
`

const SocialLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;

  @media (min-width: 768px) {
    justify-content: flex-start;
  }
`

const SocialChip = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 14px;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  text-decoration: none;
  transition: border-color ${tokens.transition.fast}, color ${tokens.transition.fast};

  &:hover {
    text-decoration: none;
    border-color: ${tokens.color.blue};
    color: ${tokens.color.blue};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
  }
`

const SocialIcon = styled.span`
  display: inline-flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  font-size: 14px;
`

const CtaRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    width: auto;
  }
`

const FreeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(246, 248, 250, 0.2);
  border: 1px solid rgba(208, 215, 222, 0.2);
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
  color: white;
  margin-left: ${tokens.spacing.sm};
  vertical-align: middle;
`

/* ─── Avatar column with participation ring ─── */

const AvatarColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${tokens.spacing.sm};
  flex-shrink: 0;

  @media (min-width: 768px) {
    grid-area: avatar;
    align-self: center;
  }
`

const RingWrap = styled.div`
  position: relative;
  width: 240px;
  height: 240px;
  flex-shrink: 0;

  @media (max-width: 767px) {
    width: 160px;
    height: 160px;
  }
`

const RingSvg = styled.svg`
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
`

const AvatarSlot = styled.div`
  position: absolute;
  inset: 24px;
  border-radius: 9999px;
  overflow: hidden;
  border: 1px solid ${tokens.color.borderLight};
  background: ${tokens.color.surface};
  display: flex;
  align-items: center;
  justify-content: center;
`

const ParticipationTag = styled.span<{ $isFull: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 14px;
  background: ${({ $isFull }) =>
    $isFull ? tokens.color.status.success.bg : tokens.color.lightBlueOpacity};
  color: ${({ $isFull }) =>
    $isFull ? tokens.color.status.success.fg : tokens.color.blue};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  white-space: nowrap;
`

interface ParticipationRingProps {
  percent: number
  address: string
  name?: string
  avatarUrl?: string | null
}

function ParticipationRing({ percent, address, name, avatarUrl }: ParticipationRingProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [measuredSize, setMeasuredSize] = useState(148)
  const [animatedPct, setAnimatedPct] = useState(0)

  // Size the ring + avatar to whatever space the column gives us
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      const next = Math.max(148, Math.min(rect.width, rect.height || rect.width))
      setMeasuredSize(next)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Animate from 0% to target on mount — small delay so the transition catches
  useEffect(() => {
    const handle = window.setTimeout(() => setAnimatedPct(percent), 120)
    return () => window.clearTimeout(handle)
  }, [percent])

  const stroke = 12
  const radius = (measuredSize - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const safeTargetPct = Math.max(0, Math.min(100, percent))
  const safeAnimatedPct = Math.max(0, Math.min(100, animatedPct))
  const offset = circumference - (safeAnimatedPct / 100) * circumference
  const isFull = safeTargetPct >= 100
  const color = isFull ? tokens.color.positiveEmphasis : tokens.color.blue
  const avatarSize = Math.max(0, measuredSize - 48)

  return (
    <RingWrap ref={wrapRef} aria-label={`${Math.round(safeTargetPct)}% participation`}>
      <RingSvg viewBox={`0 0 ${measuredSize} ${measuredSize}`} preserveAspectRatio="xMidYMid meet">
        <circle
          cx={measuredSize / 2}
          cy={measuredSize / 2}
          r={radius}
          fill="none"
          stroke={tokens.color.borderLight}
          strokeWidth={stroke}
        />
        <circle
          cx={measuredSize / 2}
          cy={measuredSize / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1), stroke 0.3s ease',
          }}
        />
      </RingSvg>
      <AvatarSlot>
        <EnsAvatar
          address={address}
          name={name}
          avatarUrl={avatarUrl ?? undefined}
          size={avatarSize}
        />
      </AvatarSlot>
    </RingWrap>
  )
}

/* ─── Stats row ─── */

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${tokens.spacing.md};

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`

const StatCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
  padding: ${tokens.spacing.xl};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
`

const StatTopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`

const StatValue = styled.span`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.1;
  white-space: nowrap;
`

const StatIconBox = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: ${tokens.color.textSubtle};
  font-size: 18px;
`

const StatLabel = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

/* ─── Voting record table ─── */

const VotingRecordSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
  width: 100%;
`

const SectionTitle = styled.h2`
  margin: 0;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.25;
`

const TableCard = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
  overflow: hidden;
`

const TableHeadRow = styled.div`
  display: flex;
  background: ${tokens.color.bgSubtle};
  border-bottom: 1px solid ${tokens.color.borderLight};

  @media (max-width: 767px) {
    display: none;
  }
`

const TableHeadCell = styled.div<{ $width?: string }>`
  padding: 12px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
  ${({ $width }) => ($width ? `width: ${$width}; flex-shrink: 0;` : `flex: 1; min-width: 0;`)}
`

const TableRow = styled.a`
  display: flex;
  background: ${tokens.color.surface};
  color: inherit;
  text-decoration: none;
  cursor: pointer;
  transition: background ${tokens.transition.fast};

  &:not(:last-child) {
    border-bottom: 1px solid ${tokens.color.borderLight};
  }

  &:hover {
    text-decoration: none;
    background: ${tokens.color.bgSubtle};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: -2px;
  }

  @media (max-width: 767px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 12px 16px;
    gap: ${tokens.spacing.sm} ${tokens.spacing.md};
  }
`

const TableCell = styled.div<{ $width?: string; $primary?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  padding: 12px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
  ${({ $width }) => ($width ? `width: ${$width}; flex-shrink: 0;` : `flex: 1; min-width: 0;`)}

  @media (max-width: 767px) {
    width: 100%;
    padding: 0;
    ${({ $primary }) =>
      $primary
        ? `
          grid-column: 1 / -1;
          font-weight: ${tokens.font.weight.bold};
          color: ${tokens.color.darkBlue};
          word-break: break-word;
        `
        : `
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        `}
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

const CellValue = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
`

const VoteIcon = styled.span<{ $tone: 'positive' | 'negative' | 'neutral' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 16px;
  color: ${({ $tone }) =>
    $tone === 'positive'
      ? tokens.color.positiveEmphasis
      : $tone === 'negative'
        ? tokens.color.negative
        : tokens.color.textSubtle};
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

interface ProposalRow {
  id: number
  title: string
  voted: boolean
  anticaptureUrl: string
  // NOTE(backend): we currently only have a boolean[] of "voted on last 10 proposals".
  // See BACKEND-NEEDS in MOCK_PROPOSALS below.
}

/**
 * Placeholder data for the last 10 ENS DAO proposals.
 *
 * BACKEND-NEEDS — we don't have any of this from the API yet:
 *   1) Proposal title / EP number  → needs Snapshot or Tally feed
 *      (e.g. GET /proposals?limit=10 returning {id, epNumber, title, type})
 *   2) Delegate's vote choice (For / Against / Abstain) per proposal
 *      — currently we only know "voted at all" via `last10ProposalsVoted: boolean[]`
 *   3) Proposal outcome (Passed / Rejected) per proposal
 *   4) On-chain governance proposal id (uint256) — used to build the Anticapture URL
 *      `https://app.anticapture.com/ens/proposals/{id}`
 *
 * Until those land we render the rows from this hardcoded list mirrored against
 * the existing `boolean[]`. Vote and Result columns mirror the boolean for now.
 */
interface MockProposal {
  title: string
  /** On-chain ENS governance proposal id (uint256 as decimal string). Mocked. */
  proposalId: string
}

const MOCK_PROPOSALS: MockProposal[] = [
  { title: 'EP 6.6 — [Executable] Working Group budgets, Term 6',         proposalId: '39893466662181856279242827854933926689925858494049650894234231038376231891860' },
  { title: 'EP 6.5 — [Social] Service Provider Program renewal',          proposalId: '85714230187321904471028836259741268340985717625190837624089417823625781421003' },
  { title: 'EP 6.4 — [Executable] Public Goods WG funding allocation',    proposalId: '12471203487123048712304871230487123048712304871230487123048712304871230487' },
  { title: 'EP 6.3 — [Social] Term 6 Steward elections',                  proposalId: '74028371203748120374812037481203748120374812037481203748120374812037481203' },
  { title: 'EP 6.2 — [Executable] Ecosystem WG quarterly budget',         proposalId: '38419283749182748392174839218374839218374839218374839218374839218374839218' },
  { title: 'EP 6.1 — [Social] Endorse Term 6 Working Group Stewards',     proposalId: '90218374921837492183749218374921837492183749218374921837492183749218374921' },
  { title: 'EP 5.31 — [Executable] Q4 governance facilitation budget',    proposalId: '52830192837492837410293847102938471029384710293847102938471029384710293847' },
  { title: 'EP 5.30 — [Social] Service Provider Stream amendment',        proposalId: '67419283746192837461928374619283746192837461928374619283746192837461928374' },
  { title: 'EP 5.29 — [Executable] Security audit budget approval',       proposalId: '18374619283746192837461928374619283746192837461928374619283746192837461928' },
  { title: 'EP 5.28 — [Social] Constitution amendment — voting periods',  proposalId: '29384710293847102938471029384710293847102938471029384710293847102938471029' },
]

function buildProposalRows(votes: boolean[]): ProposalRow[] {
  return votes.map((voted, i) => {
    const mock = MOCK_PROPOSALS[i]
    const title = mock?.title ?? `EP — Proposal #${i + 1}`
    const proposalId = mock?.proposalId ?? '0'
    return {
      id: i + 1,
      title,
      voted,
      anticaptureUrl: `https://app.anticapture.com/ens/proposals/${proposalId}`,
    }
  })
}

export function VoterProfilePage() {
  const navigate = useNavigate()
  const { address: param } = useParams<{ address: string }>()
  const rawParam = param ?? ''
  const isEnsParam = !isAddress(rawParam)

  const { data: resolvedAddress, isLoading: ensLoading } = useEnsAddress({
    name: rawParam,
    query: { enabled: isEnsParam && !env.useMockApi },
  })

  const mockResolvedAddress = useMemo(() => {
    if (!isEnsParam || !env.useMockApi) return null
    return MOCK_ENS_TO_ADDRESS[rawParam.toLowerCase()] ?? null
  }, [rawParam, isEnsParam])

  const resolvedAddr = isEnsParam
    ? (env.useMockApi ? (mockResolvedAddress ?? '') : (resolvedAddress ?? ''))
    : rawParam
  const { voter, loading, error } = useVoter(resolvedAddr)
  const walletState = useWalletState()
  const { hasEnoughBalance: relayerHasGas } = useRelayerBalance()
  const [modalOpen, setModalOpen] = useState(false)

  const { data: resolvedEnsName } = useEnsName({
    address: resolvedAddr as `0x${string}`,
    query: { enabled: !!resolvedAddr && !isEnsParam && !env.useMockApi },
  })

  const ensName = voter?.ensName ?? (isEnsParam ? rawParam : resolvedEnsName) ?? null

  // ENS text records — description + Twitter handle (the only social we surface)
  const description = useEnsTextRecord(ensName, 'description')
  const twitter = useEnsTextRecord(ensName, 'com.twitter')

  const [copied, setCopied] = useState(false)

  const handleCopyAddress = () => {
    if (!voter?.address) return
    navigator.clipboard.writeText(voter.address).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      },
      () => {
        // Clipboard unavailable; silently no-op
      },
    )
  }

  const handleShareOnTwitter = () => {
    if (!voter) return
    const handle = twitter ? `@${twitter.replace(/^@/, '')}` : (ensName ?? truncateAddress(voter.address))
    const votedCount = voter.last10ProposalsVoted.filter(Boolean).length
    const totalProposals = voter.last10ProposalsVoted.length || 10
    const text = `Check out ${handle} on the ENS Delegation Incentives Program — ${votedCount}/${totalProposals} recent proposals voted.`
    const url = window.location.href
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    window.open(intent, '_blank', 'noopener,noreferrer')
  }

  if (loading || ensLoading) {
    return <DelegateProfileSkeleton />
  }

  if (error || !voter) {
    return (
      <Page>
        <BackLinkButton type="button" onClick={() => navigate('/voters')}>
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to all voters
        </BackLinkButton>
        <ErrorMessage>
          {error ?? 'Voter not found. They may not be an active voter in the incentives program.'}
        </ErrorMessage>
      </Page>
    )
  }

  const isDelegated =
    walletState.status === 'delegated' &&
    walletState.delegatedTo.toLowerCase() === voter.address.toLowerCase()

  const totalProposals = voter.last10ProposalsVoted.length || 10
  const votedCount = voter.last10ProposalsVoted.filter(Boolean).length
  const participationPct = totalProposals > 0
    ? Math.round((votedCount / totalProposals) * 100)
    : 0
  const isFullParticipation = participationPct >= 100

  const handleDelegate = () => {
    if (walletState.status === 'disconnected') return
    setModalOpen(true)
  }

  const proposalRows = buildProposalRows(voter.last10ProposalsVoted)

  const twitterUrl = twitter ? `https://twitter.com/${twitter.replace(/^@/, '')}` : null
  const ensProfileUrl = ensName
    ? `https://app.ens.domains/${ensName}`
    : `https://app.ens.domains/${voter.address}`
  const anticaptureUrl = getAnticaptureDelegateUrl(voter.address)

  const displayName = ensName ?? truncateAddress(voter.address)

  return (
    <>
    <Page>
      <HeaderCard>
        <BackLinkButton type="button" onClick={() => navigate('/voters')}>
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to all voters
        </BackLinkButton>
        <AvatarColumn>
          <ParticipationRing
            percent={participationPct}
            address={voter.address}
            name={ensName ?? undefined}
            avatarUrl={voter.avatarUrl}
          />
          <ParticipationTag $isFull={isFullParticipation}>
            {participationPct}% of participation
          </ParticipationTag>
        </AvatarColumn>
        <HeaderText>
          <TitleBlock>
            <NameRow>
              <NameTitle>{displayName}</NameTitle>
              <AddressTag
                type="button"
                $copied={copied}
                onClick={handleCopyAddress}
                aria-label={copied ? 'Address copied' : 'Copy address'}
                title={copied ? 'Copied!' : 'Click to copy'}
              >
                {copied ? (
                  <>
                    <CopyIcon><FontAwesomeIcon icon={faCheck} /></CopyIcon>
                    Copied!
                  </>
                ) : (
                  <>
                    {truncateAddress(voter.address)}
                    <CopyIcon><FontAwesomeIcon icon={faCopy} /></CopyIcon>
                  </>
                )}
              </AddressTag>
            </NameRow>
            {description && <Description>{description}</Description>}
          </TitleBlock>

          <SocialLinks>
            {twitterUrl && (
              <SocialChip href={twitterUrl} target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
                <SocialIcon><FontAwesomeIcon icon={faXTwitter} /></SocialIcon>
                @{twitter!.replace(/^@/, '')}
              </SocialChip>
            )}
            <SocialChip href={ensProfileUrl} target="_blank" rel="noopener noreferrer" aria-label="ENS profile">
              <SocialIcon><FontAwesomeIcon icon={faArrowUpRightFromSquare} /></SocialIcon>
              ENS profile
            </SocialChip>
            <SocialChip href={anticaptureUrl} target="_blank" rel="noopener noreferrer" aria-label="Anticapture profile">
              <SocialIcon><FontAwesomeIcon icon={faArrowUpRightFromSquare} /></SocialIcon>
              Anticapture profile
            </SocialChip>
          </SocialLinks>

          <CtaRow>
            {!isDelegated && (
              <Button colorStyle="bluePrimary" width="auto" onClick={handleDelegate}>
                Delegate and earn{relayerHasGas === true && <FreeBadge>Free</FreeBadge>}
              </Button>
            )}
            <Button
              colorStyle="blueSecondary"
              prefix={<FontAwesomeIcon icon={faShareNodes} />}
              onClick={handleShareOnTwitter}
              width="auto"
            >
              Share profile
            </Button>
          </CtaRow>
        </HeaderText>
      </HeaderCard>

      <StatsRow>
        <StatCard>
          <StatTopRow>
            <StatValue>{formatVotingPower(voter.votingPower)}</StatValue>
            <StatIconBox aria-hidden><FontAwesomeIcon icon={faBolt} /></StatIconBox>
          </StatTopRow>
          <StatLabel>Voting power</StatLabel>
        </StatCard>
        <StatCard>
          <StatTopRow>
            <StatValue>{voter.tokenHolderCount.toLocaleString('en-US')}</StatValue>
            <StatIconBox aria-hidden><FontAwesomeIcon icon={faUsers} /></StatIconBox>
          </StatTopRow>
          <StatLabel>Delegators</StatLabel>
        </StatCard>
        <StatCard>
          <StatTopRow>
            <StatValue>{votedCount}/{totalProposals}</StatValue>
            <StatIconBox aria-hidden><FontAwesomeIcon icon={faSquarePollVertical} /></StatIconBox>
          </StatTopRow>
          <StatLabel>Participation on last proposals</StatLabel>
        </StatCard>
        <StatCard>
          <StatTopRow>
            <StatValue>{formatActiveSinceShort(voter.activeSince)}</StatValue>
            <StatIconBox aria-hidden><FontAwesomeIcon icon={faClock} /></StatIconBox>
          </StatTopRow>
          <StatLabel>Active since</StatLabel>
        </StatCard>
      </StatsRow>

      <VotingRecordSection>
        <SectionTitle>Voting record</SectionTitle>
        <TableCard>
        <TableHeadRow>
          <TableHeadCell>Proposal Name</TableHeadCell>
          <TableHeadCell $width="200px">
            <LabelWithTooltip
              text="How this delegate voted on each proposal — “For”, “Against”, “Abstain”, or didn’t vote."
              iconAriaLabel="About Delegate Vote"
            >
              Delegate Vote
            </LabelWithTooltip>
          </TableHeadCell>
          <TableHeadCell $width="200px">Result</TableHeadCell>
        </TableHeadRow>
        {proposalRows.map((row) => (
          <TableRow
            key={row.id}
            href={row.anticaptureUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${row.title} on Anticapture`}
          >
            <TableCell $primary>{row.title}</TableCell>
            <TableCell $width="200px">
              <MobileLabel>Delegate Vote</MobileLabel>
              <CellValue>
                {row.voted ? (
                  <>
                    <VoteIcon $tone="positive"><FontAwesomeIcon icon={faCircleCheck} /></VoteIcon>
                    For
                  </>
                ) : (
                  <>
                    <VoteIcon $tone="neutral"><FontAwesomeIcon icon={faCircleMinus} /></VoteIcon>
                    Did not vote
                  </>
                )}
              </CellValue>
            </TableCell>
            <TableCell $width="200px">
              <MobileLabel>Result</MobileLabel>
              <CellValue>
                {/* TODO(backend): real proposal outcome from Snapshot/Tally */}
                <LabelWithTooltip
                  text="Proposal outcome data not yet available"
                  iconAriaLabel="Proposal outcome unavailable"
                >
                  <span aria-label="Proposal outcome unavailable">—</span>
                </LabelWithTooltip>
              </CellValue>
            </TableCell>
          </TableRow>
        ))}
        </TableCard>
      </VotingRecordSection>
    </Page>
    {modalOpen && (
      <DelegationModal
        open
        onClose={() => setModalOpen(false)}
        delegateAddress={voter.address as `0x${string}`}
        delegateEnsName={ensName}
        delegateAvatarUrl={voter.avatarUrl}
        tokenAddress={contracts.ensToken}
      />
    )}
    </>
  )
}
