import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import { isAddress } from 'viem'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faArrowRight,
  faArrowTrendUp,
  faArrowUpRightFromSquare,
  faCircleCheck,
  faCircleInfo,
  faCoins,
  faDownload,
  faHourglassHalf,
  faMagnifyingGlass,
  faRankingStar,
  faTrophy,
} from '@fortawesome/free-solid-svg-icons'
import { Tag } from '@ensdomains/thorin'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { getAnticaptureDelegateUrl } from '@/utils/delegation'
import { api, ApiClientError } from '@/api'
import type {
  AddressRoundReward,
  LotteryDetail,
  RewardRank,
  RewardStatus,
  RoundDetailResponse,
  RoundStatus,
} from '@/api/types'
import { RoundDetailPageSkeleton } from '@/components/shared/PageSkeletons'
import { useAsync } from '@/hooks/useAsync'
import { useWalletState } from '@/features/wallet/useWalletState'
import { tokens, fadeInUp, ErrorMessage } from '@/styles'
import { formatEnsAmount, truncateAddress } from '@/utils/format'
import { AddressLookupForm } from './components/AddressLookupForm'
import {
  buildRoundDetailFallback,
  buildRoundListFromCurrentRound,
} from './roundFallback'

/**
 * TEMP — flip to `false` to render real backend data instead of MOCK_ROUND_DETAIL.
 * When on, the page skips loading/error gating and uses the hardcoded payload
 * below so the layout can be reviewed without a backend.
 */
const SHOW_MOCK_ROUND_DETAIL = true

const MOCK_ROUND_DETAIL: RoundDetailResponse = {
  roundNumber: 7,
  month: '2026-07',
  startDate: '2026-07-01T00:00:00.000Z',
  endDate: '2026-07-31T23:59:59.999Z',
  status: 'paid',
  distributionDataStatus: 'available',
  isCurrent: false,
  percentComplete: 100,
  daysRemaining: 0,
  tierIndex: 2,
  tierLabel: 'Tier 3',
  vpGrowthPct: '1.45',
  poolSize: '12500000000000000000000',
  poolSizeEns: '12500',
  totalDistributed: '12500000000000000000000',
  totalDistributedEns: '12500',
  activeVoterCount: 38,
  eligibleTokenHolderCount: 1247,
  lotteryBucketCount: 3,
  lotteryEntryCount: 412,
  lotteryParticipantCount: 41,
  lotteryWinnerCount: 3,
  lotteryPrize: '30000000000000000000',
  lotteryPrizeEns: '30',
  computedAt: '2026-08-01T00:10:00.000Z',
  addressReward: {
    address: '0xAbCdef0123456789abcdef0123456789abcdef01',
    rewardStatus: 'paid',
    voterReward: '0',
    voterRewardEns: '0',
    tokenHolderReward: '420000000000000000',
    tokenHolderRewardEns: '0.4200',
    lotteryReward: '0',
    lotteryRewardEns: '0',
    totalReward: '420000000000000000',
    totalRewardEns: '0.4200',
  },
  topVoterRewards: [
    { rank: 1, address: '0x1a2b3c4d5e6f70819203040506070809a0b1c2d3', ensName: 'nick.eth',         role: 'voter', reward: '3250000000000000000', rewardEns: '3.2487', source: 'direct', votingPower: '482350000000000000000000', delegationCount: 1820 },
    { rank: 2, address: '0x2b3c4d5e6f70819203040506070809a0b1c2d3e4', ensName: 'griff.eth',        role: 'voter', reward: '2980000000000000000', rewardEns: '2.9812', source: 'direct', votingPower: '438120000000000000000000', delegationCount: 1564 },
    { rank: 3, address: '0x3c4d5e6f70819203040506070809a0b1c2d3e4f5', ensName: 'coltron.eth',      role: 'voter', reward: '2640000000000000000', rewardEns: '2.6403', source: 'direct', votingPower: '391040000000000000000000', delegationCount: 1402 },
    { rank: 4, address: '0x4d5e6f70819203040506070809a0b1c2d3e4f506', ensName: 'limes.eth',        role: 'voter', reward: '2110000000000000000', rewardEns: '2.1075', source: 'direct', votingPower: '312870000000000000000000', delegationCount: 1180 },
    { rank: 5, address: '0x5e6f70819203040506070809a0b1c2d3e4f50617', ensName: 'fireeyesdao.eth',  role: 'voter', reward: '1840000000000000000', rewardEns: '1.8421', source: 'direct', votingPower: '273520000000000000000000', delegationCount: 942  },
    { rank: 6, address: '0x6f70819203040506070809a0b1c2d3e4f5061728', ensName: 'simona.eth',       role: 'voter', reward: '1520000000000000000', rewardEns: '1.5234', source: 'direct', votingPower: '226140000000000000000000', delegationCount: 783  },
    { rank: 7, address: '0x70819203040506070809a0b1c2d3e4f506172839', ensName: null,              role: 'voter', reward: '1180000000000000000', rewardEns: '1.1842', source: 'direct', votingPower: '176280000000000000000000', delegationCount: 612  },
    { rank: 8, address: '0x819203040506070809a0b1c2d3e4f50617283940', ensName: 'jameshhouk.eth',   role: 'voter', reward: '0890000000000000000', rewardEns: '0.8905', source: 'lottery', votingPower: '132040000000000000000000', delegationCount: 489 },
  ],
  topTokenHolderRewards: [
    { rank: 1, address: '0x9203040506070809a0b1c2d3e4f5061728394050', ensName: 'vault.eth',        role: 'token_holder', reward: '1240000000000000000', rewardEns: '1.2410', source: 'direct',  votingPower: null, delegationCount: null },
    { rank: 2, address: '0xa3040506070809b1c2d3e4f50617283940506172', ensName: 'whale.eth',        role: 'token_holder', reward: '0980000000000000000', rewardEns: '0.9836', source: 'direct',  votingPower: null, delegationCount: null },
    { rank: 3, address: '0xb40506070809c1d2e3f4051627384950617283a4', ensName: 'patient.eth',      role: 'token_holder', reward: '0760000000000000000', rewardEns: '0.7612', source: 'direct',  votingPower: null, delegationCount: null },
    { rank: 4, address: '0xc506070809d1e2f30415263748596071829304b5', ensName: null,               role: 'token_holder', reward: '0540000000000000000', rewardEns: '0.5408', source: 'direct',  votingPower: null, delegationCount: null },
    { rank: 5, address: '0xd6070809e1f2031425364758697081930405c6d7', ensName: 'compounder.eth',   role: 'token_holder', reward: '0320000000000000000', rewardEns: '0.3217', source: 'direct',  votingPower: null, delegationCount: null },
    { rank: 6, address: '0xe70809f10213243546576879809a1b2c3d4e5f60', ensName: null,               role: 'token_holder', reward: '0180000000000000000', rewardEns: '0.1843', source: 'direct',  votingPower: null, delegationCount: null },
    { rank: 7, address: '0xf809a1b2c3d4e5f6071829304a5b6c7d8e9f0010', ensName: 'frenly.eth',       role: 'token_holder', reward: '0090000000000000000', rewardEns: '0.0921', source: 'lottery', votingPower: null, delegationCount: null },
    { rank: 8, address: '0x09a1b2c3d4e5f60718293041526374859607a1b2', ensName: null,               role: 'token_holder', reward: '0040000000000000000', rewardEns: '0.0418', source: 'lottery', votingPower: null, delegationCount: null },
  ],
  lottery: null,
}

/* ─── Page layout ─── */

const Page = styled.div`
  width: 100%;
  max-width: 1120px;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
  animation: ${fadeInUp} 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
`

/* ─── Header card ─── */

const HeaderCard = styled.section`
  display: flex;
  flex-direction: column-reverse;
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

  @media (min-width: 768px) {
    grid-area: text;
  }
`

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
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
`

const NameTitle = styled.h1`
  margin: 0;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.1;
  word-break: break-word;
  text-wrap: balance;

  @media (min-width: 768px) {
    font-size: 68px;
  }
`

const StatusTag = styled.span<{ $status: RoundStatus | RewardStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 14px;
  background: ${({ $status }) =>
    $status === 'live'
      ? tokens.color.status.success.bg
      : $status === 'paid'
        ? tokens.color.lightBlueOpacity
        : tokens.color.bgSubtle};
  color: ${({ $status }) =>
    $status === 'live'
      ? tokens.color.status.success.fg
      : $status === 'paid'
        ? tokens.color.blue
        : tokens.color.darkGray};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  white-space: nowrap;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 9999px;
    background: currentColor;
    flex-shrink: 0;
  }
`

const SocialLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
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
    border-color: ${tokens.color.blue};
    color: ${tokens.color.blue};
    text-decoration: none;
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

const RoundNavButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 9999px;
  border: 1px solid ${tokens.color.borderLight};
  background: ${tokens.color.surface};
  color: ${tokens.color.darkBlue};
  font-family: inherit;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  cursor: pointer;
  white-space: nowrap;
  transition:
    border-color ${tokens.transition.fast},
    color ${tokens.transition.fast},
    gap ${tokens.transition.fast};

  svg {
    color: currentColor;
    width: 10px;
    height: 10px;
  }

  &:hover:not(:disabled) {
    border-color: ${tokens.color.blue};
    color: ${tokens.color.blue};
  }

  &:disabled {
    color: ${tokens.color.textSubtle};
    cursor: not-allowed;
    opacity: 0.6;
  }
`

/* ─── Avatar column with round badge ─── */

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
  width: 220px;
  height: 220px;
  flex-shrink: 0;

  @media (min-width: 768px) {
    width: 240px;
    height: 240px;
  }
`

const RingSvg = styled.svg`
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
`

const RingCenter = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
  pointer-events: none;
`

const RingDateRange = styled.span`
  font-size: 44px;
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;

  @media (min-width: 768px) {
    font-size: 56px;
  }
`

const RingMonth = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkGray};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`

interface RoundProgressRingProps {
  percent: number
  startDate: string
  endDate: string
  status: RoundStatus
}

function RoundProgressRing({
  percent,
  startDate,
  endDate,
  status,
}: RoundProgressRingProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [measuredSize, setMeasuredSize] = useState(220)
  const [animatedPct, setAnimatedPct] = useState(0)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      const next = Math.max(180, Math.min(rect.width, rect.height || rect.width))
      setMeasuredSize(next)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => setAnimatedPct(percent), 120)
    return () => window.clearTimeout(handle)
  }, [percent])

  const stroke = 12
  const radius = (measuredSize - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const safePct = Math.max(0, Math.min(100, animatedPct))
  const offset = circumference - (safePct / 100) * circumference

  const ringColor =
    status === 'live'
      ? tokens.color.positiveEmphasis
      : status === 'paid'
        ? tokens.color.blue
        : tokens.color.textSubtle

  const start = new Date(startDate)
  const end = new Date(endDate)
  const startDay = Number.isNaN(start.getTime()) ? '' : start.getUTCDate()
  const endDay = Number.isNaN(end.getTime()) ? '' : end.getUTCDate()
  const monthLabel = Number.isNaN(start.getTime())
    ? ''
    : start.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })

  return (
    <RingWrap ref={wrapRef} aria-label={`${Math.round(percent)}% complete`}>
      <RingSvg
        viewBox={`0 0 ${measuredSize} ${measuredSize}`}
        preserveAspectRatio="xMidYMid meet"
      >
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
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition:
              'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1), stroke 0.3s ease',
          }}
        />
      </RingSvg>
      <RingCenter>
        <RingDateRange>
          {startDay}
          {'-'}
          {endDay}
        </RingDateRange>
        <RingMonth>{monthLabel}</RingMonth>
      </RingCenter>
    </RingWrap>
  )
}

/* ─── Stats row ─── */

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
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
  font-variant-numeric: tabular-nums;
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

/* ─── Address inspector ─── */

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
  width: 100%;
  padding: ${tokens.spacing.xl};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
`

const SectionHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
  flex-wrap: wrap;
`

const SectionLabelGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const SectionLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkGray};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

const SectionTitle = styled.h2`
  margin: 0;
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.25;
`

const RowCount = styled.span`
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
`

const AddressResultStrip = styled.div<{ $tone: 'success' | 'neutral' | 'pending' }>`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.lg};
  border-radius: 12px;
  background: ${({ $tone }) =>
    $tone === 'success'
      ? tokens.color.status.success.bg
      : $tone === 'pending'
        ? tokens.color.lightBlueOpacity
        : tokens.color.bgSubtle};
  border: 1px solid
    ${({ $tone }) =>
      $tone === 'success'
        ? tokens.color.status.success.border
        : $tone === 'pending'
          ? tokens.color.lightBlue
          : tokens.color.borderLight};
`

const AddressResultIcon = styled.span<{ $tone: 'success' | 'neutral' | 'pending' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 9999px;
  flex-shrink: 0;
  background: ${({ $tone }) =>
    $tone === 'success'
      ? tokens.color.status.success.border
      : $tone === 'pending'
        ? tokens.color.lightBlue
        : tokens.color.borderLight};
  color: ${({ $tone }) =>
    $tone === 'success'
      ? tokens.color.white
      : $tone === 'pending'
        ? tokens.color.blue
        : tokens.color.darkGray};

  svg {
    width: 16px;
    height: 16px;
  }
`

const AddressResultText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const AddressResultTitle = styled.span<{ $tone: 'success' | 'neutral' | 'pending' }>`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${({ $tone }) =>
    $tone === 'success'
      ? tokens.color.status.success.fg
      : $tone === 'pending'
        ? tokens.color.blue
        : tokens.color.darkBlue};
`

const AddressResultBody = styled.span`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkBlue};
  line-height: 1.5;
`

/* ─── Rewards table (Voter Profile pattern) ─── */

const TableCard = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
  overflow: hidden;
  background: ${tokens.color.surface};

  @media (max-width: 767px) {
    border: none;
    background: transparent;
    border-radius: 0;
    overflow: visible;
    gap: 12px;
  }
`

const TableCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.lg};
  background: ${tokens.color.surface};
  border-bottom: 1px solid ${tokens.color.borderLight};
  flex-wrap: wrap;

  @media (max-width: 767px) {
    padding: 0 4px 8px;
    background: transparent;
    border-bottom: none;
  }
`

const TableHeadRow = styled.div`
  display: flex;
  background: ${tokens.color.bgSubtle};
  border-bottom: 1px solid ${tokens.color.borderLight};

  @media (max-width: 767px) {
    display: none;
  }
`

const TableHeadCell = styled.div<{ $weight?: number; $align?: 'start' | 'end' }>`
  flex: ${({ $weight }) => $weight ?? 1};
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: ${({ $align }) => ($align === 'end' ? 'flex-end' : 'flex-start')};
  padding: 12px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const TableRow = styled.a<{ $highlighted?: boolean }>`
  display: flex;
  width: 100%;
  background: ${({ $highlighted }) =>
    $highlighted ? tokens.color.lightBlueOpacity : tokens.color.surface};
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: background ${tokens.transition.fast};

  &:not(:last-child) {
    border-bottom: 1px solid ${tokens.color.borderLight};
  }

  &:hover {
    text-decoration: none;
    background: ${tokens.color.bgSubtle};
  }

  @media (max-width: 767px) {
    flex-direction: column;
    padding: 16px;
    gap: 4px;
    border: 1px solid
      ${({ $highlighted }) =>
        $highlighted ? tokens.color.blue : tokens.color.borderLight};
    border-radius: 12px;
    background: ${({ $highlighted }) =>
      $highlighted ? tokens.color.lightBlueOpacity : tokens.color.surface};
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);

    &:not(:last-child) {
      border-bottom: 1px solid
        ${({ $highlighted }) =>
          $highlighted ? tokens.color.blue : tokens.color.borderLight};
    }
  }
`

const TableCell = styled.div<{ $weight?: number; $align?: 'start' | 'end'; $primary?: boolean }>`
  flex: ${({ $weight }) => $weight ?? 1};
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: ${({ $align }) => ($align === 'end' ? 'flex-end' : 'flex-start')};
  gap: ${tokens.spacing.sm};
  padding: 14px 12px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 767px) {
    width: 100%;
    flex: none;
    justify-content: space-between;
    padding: 6px 0;
    white-space: normal;
    ${({ $primary }) =>
      $primary
        ? `
          justify-content: flex-start;
          font-weight: ${tokens.font.weight.bold};
          color: ${tokens.color.darkBlue};
          font-size: ${tokens.font.size.lg};
          padding: 2px 0 10px;
          margin-bottom: 4px;
          border-bottom: 1px solid ${tokens.color.borderLight};
        `
        : ''}
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

const RankPill = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 22px;
  padding: 0 8px;
  border-radius: 9999px;
  background: ${tokens.color.bgSubtle};
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  font-variant-numeric: tabular-nums;
`

const AddressText = styled.span`
  font-variant-numeric: tabular-nums;
  color: ${tokens.color.darkBlue};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const VotingPowerText = styled.span`
  color: ${tokens.color.darkBlue};
  font-variant-numeric: tabular-nums;
`

const RewardCellRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  width: 100%;
`

const RewardValueText = styled.span`
  color: ${tokens.color.positiveEmphasis};
  font-weight: ${tokens.font.weight.bold};
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`

const AprTag = styled(Tag)`
  && {
    background-color: ${tokens.color.lightYellow};
  }
`

const LotteryTag = styled(Tag)`
  && {
    background-color: ${tokens.color.lightOrange};
  }
`

const DelegateTag = styled(Tag)`
  && {
    background-color: ${tokens.color.lightBlueOpacity};
  }
`

const EmptyTableBody = styled.div`
  padding: ${tokens.spacing.xl};
  color: ${tokens.color.darkGray};
  text-align: center;
`

/* ─── Helpers ─── */

function getWalletAddress(walletState: ReturnType<typeof useWalletState>): string {
  if (walletState.status === 'disconnected') return ''
  return walletState.address
}

function isLegacyEndpointError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 404
}

function statusLabel(status: RoundStatus | RewardStatus): string {
  if (status === 'live') return 'Ongoing'
  if (status === 'paid') return 'Complete'
  if (status === 'pending') return 'Pending'
  if (status === 'not_eligible') return 'Not eligible'
  if (status === 'no_reward') return 'No payout'
  if (status === 'unavailable') return 'Unavailable'
  return 'Ended'
}

function formatEns(value: string | null, empty = 'Unavailable', maximumFractionDigits = 4): string {
  if (value == null) return empty
  return `${formatEnsAmount(value, { maximumFractionDigits })} ENS`
}

/**
 * Format an ENS pool amount in compact form using a comma decimal — e.g.
 * "12,5K ENS" / "1,2M ENS". Smaller amounts render as a plain integer.
 */
function formatPoolEns(value: string | null): string {
  if (value == null) return 'Unavailable'
  const n = Number(value)
  if (!Number.isFinite(n)) return 'Unavailable'
  if (n >= 1_000_000) {
    const m = Math.round((n / 1_000_000) * 10) / 10
    const text = (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)).replace('.', ',')
    return `${text}M ENS`
  }
  if (n >= 1_000) {
    const k = Math.round((n / 1_000) * 10) / 10
    const text = (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)).replace('.', ',')
    return `${text}K ENS`
  }
  return `${Math.round(n).toLocaleString('en-US')} ENS`
}

function formatPositiveReward(value: string | null | undefined): string {
  if (!value) return '—'
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return '—'
  return `+${formatEnsAmount(value, { maximumFractionDigits: 4 })}`
}

function formatAddressReward(reward: AddressRoundReward | null): string {
  if (!reward) return 'No address'
  if (reward.rewardStatus === 'pending') return 'Pending'
  if (reward.rewardStatus === 'unavailable') return 'Unavailable'
  return formatEns(reward.totalRewardEns, '0 ENS')
}

function formatVotingPower(vpWei: string | null): string {
  if (!vpWei) return '—'
  const ens = Number(vpWei) / 1e18
  if (!Number.isFinite(ens)) return '—'
  if (ens >= 1_000_000) {
    const m = ens / 1_000_000
    const rounded = Math.round(m * 10) / 10
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}M ENS`
  }
  if (ens >= 1_000) {
    const k = ens / 1_000
    const rounded = Math.round(k * 10) / 10
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}K ENS`
  }
  return `${formatEnsAmount(ens.toString())} ENS`
}

function formatVpGrowth(value: string | null): string {
  if (value == null) return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  if (n > 0) return `+${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
}

function buildRoundPath(roundNumber: number, activeAddress: string, activeAddressValid: boolean): string {
  const addressQuery = activeAddress && activeAddressValid
    ? `?address=${encodeURIComponent(activeAddress)}`
    : ''
  return `/rounds/${roundNumber}${addressQuery}`
}

/* ─── Reward source tag ─── */

function RewardSourceTag({ source }: { source: RewardRank['source'] }) {
  if (source === 'lottery') {
    return (
      <LotteryTag colorStyle="orangeSecondary" size="small">
        Lottery
      </LotteryTag>
    )
  }
  if (source === 'combined') {
    return (
      <DelegateTag colorStyle="blueSecondary" size="small">
        Combined
      </DelegateTag>
    )
  }
  return (
    <AprTag colorStyle="yellowSecondary" size="small">
      APR
    </AprTag>
  )
}

/* ─── Rewards table ─── */

interface RewardsTableProps {
  rows: RewardRank[]
  highlightAddress: string
  showVotingPower: boolean
}

function RewardsTable({ rows, highlightAddress, showVotingPower }: RewardsTableProps) {
  const highlightLower = highlightAddress.toLowerCase()

  if (rows.length === 0) {
    return <EmptyTableBody>No recipients in this round.</EmptyTableBody>
  }

  return (
    <>
      <TableHeadRow>
        <TableHeadCell $weight={0.6}>Rank</TableHeadCell>
        <TableHeadCell $weight={2}>Delegate</TableHeadCell>
        {showVotingPower ? (
          <TableHeadCell $weight={1.2} $align="end">Voting power</TableHeadCell>
        ) : null}
        <TableHeadCell $weight={1.4} $align="end">Reward</TableHeadCell>
      </TableHeadRow>
      {rows.map((row) => {
        const isHighlighted =
          highlightLower !== '' && row.address.toLowerCase() === highlightLower
        const displayName = row.ensName ?? truncateAddress(row.address)
        return (
          <TableRow
            key={`${row.role}-${row.rank}-${row.address}`}
            href={getAnticaptureDelegateUrl(row.address)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${displayName} on Anticapture`}
            $highlighted={isHighlighted}
            aria-current={isHighlighted ? 'true' : undefined}
          >
            <TableCell $weight={0.6}>
              <MobileLabel>Rank</MobileLabel>
              <RankPill>#{row.rank}</RankPill>
            </TableCell>
            <TableCell $weight={2} $primary>
              <EnsAvatar
                address={row.address}
                name={row.ensName ?? undefined}
                size={28}
              />
              <AddressText>{displayName}</AddressText>
            </TableCell>
            {showVotingPower ? (
              <TableCell $weight={1.2} $align="end">
                <MobileLabel>Voting power</MobileLabel>
                <VotingPowerText>{formatVotingPower(row.votingPower)}</VotingPowerText>
              </TableCell>
            ) : null}
            <TableCell $weight={1.4} $align="end">
              <MobileLabel>Reward</MobileLabel>
              <RewardCellRow>
                <RewardValueText>{formatPositiveReward(row.rewardEns)}</RewardValueText>
                <RewardSourceTag source={row.source} />
              </RewardCellRow>
            </TableCell>
          </TableRow>
        )
      })}
    </>
  )
}

/* ─── Component ─── */

export function RoundDetailPage() {
  const navigate = useNavigate()
  const params = useParams()
  const roundNumber = Number(params.roundNumber)
  const [searchParams, setSearchParams] = useSearchParams()
  const walletState = useWalletState()
  const walletAddress = getWalletAddress(walletState)
  const searchedAddress = searchParams.get('address') ?? ''
  const activeAddress = searchedAddress || walletAddress
  const activeAddressValid = activeAddress ? isAddress(activeAddress) : false
  const [addressInput, setAddressInput] = useState(activeAddress)
  const [inputError, setInputError] = useState<string | null>(null)

  const fetchRound = useCallback(async () => {
    try {
      return await api.round(roundNumber, activeAddressValid ? activeAddress : undefined, {
        rewardLimit: '25',
      })
    } catch (error) {
      if (!isLegacyEndpointError(error)) throw error

      let rounds = []
      try {
        rounds = (await api.rounds()).rounds
      } catch (roundsError) {
        if (!isLegacyEndpointError(roundsError)) throw roundsError

        const currentRound = await api.currentRound()
        rounds = buildRoundListFromCurrentRound(currentRound).rounds
      }

      const summary = rounds.find((candidate) => candidate.roundNumber === roundNumber)
      if (!summary) throw new Error(`Unknown round ${roundNumber}`)
      return buildRoundDetailFallback(summary, activeAddressValid ? activeAddress : undefined)
    }
  }, [roundNumber, activeAddress, activeAddressValid])
  const round = useAsync(fetchRound, !SHOW_MOCK_ROUND_DETAIL && Number.isInteger(roundNumber) && roundNumber > 0)

  const fetchRoundList = useCallback(async () => {
    try {
      return await api.rounds()
    } catch (error) {
      if (!isLegacyEndpointError(error)) throw error

      const currentRound = await api.currentRound()
      return buildRoundListFromCurrentRound(currentRound)
    }
  }, [])
  // Always fetch the rounds list — used both for prev/next nav and to pull
  // real dates / status / pool / tier per round (so navigation reflects each
  // round's actual data, not the mock detail body).
  const roundList = useAsync(fetchRoundList)

  // Live current round payload — finer-grained progress for the ongoing round.
  const fetchCurrentRound = useCallback(() => api.currentRound(), [])
  const currentRound = useAsync(fetchCurrentRound)

  // Tier progression — used to surface the APR of the tier the round reached.
  const fetchTierProgression = useCallback(() => api.tierProgression(), [])
  const tierProgression = useAsync(fetchTierProgression)

  useEffect(() => {
    setAddressInput(activeAddress)
    setInputError(null)
  }, [activeAddress])

  const sourceLabel = searchedAddress
    ? 'Searched address'
    : walletAddress
      ? 'Connected wallet'
      : 'No address selected'
  const addressError = inputError || (activeAddress && !activeAddressValid ? 'Invalid address' : null)
  const backTo = activeAddressValid
    ? `/rounds?address=${encodeURIComponent(activeAddress)}`
    : '/rounds'

  const availableRoundNumbers = useMemo(
    () =>
      (roundList.data?.rounds ?? [])
        .map((candidate) => candidate.roundNumber)
        .sort((a, b) => a - b),
    [roundList.data],
  )

  // Real summary for the round currently being viewed — drives dates/status/
  // pool/tier on the right-side ring + stats so prev/next show each round.
  const viewedRoundSummary = useMemo(
    () =>
      (roundList.data?.rounds ?? []).find(
        (candidate) => candidate.roundNumber === roundNumber,
      ) ?? null,
    [roundList.data, roundNumber],
  )

  const previousRoundNumber = availableRoundNumbers
    .filter((candidate) => candidate < roundNumber)
    .at(-1) ?? null
  const nextRoundNumber =
    availableRoundNumbers.find((candidate) => candidate > roundNumber) ?? null

  function handleAddressSubmit() {
    const nextAddress = addressInput.trim()
    if (!nextAddress) {
      handleAddressClear()
      return
    }

    if (!isAddress(nextAddress)) {
      setInputError('Invalid address')
      return
    }

    setSearchParams((next) => {
      next.set('address', nextAddress)
      return next
    })
  }

  function handleAddressClear() {
    setSearchParams((next) => {
      next.delete('address')
      return next
    })
    setAddressInput(walletAddress)
    setInputError(null)
  }

  if (!SHOW_MOCK_ROUND_DETAIL && round.loading) {
    return <RoundDetailPageSkeleton />
  }

  if (!Number.isInteger(roundNumber) || roundNumber <= 0) {
    return (
      <Page>
        <BackLinkButton type="button" onClick={() => navigate(backTo)}>
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to rounds
        </BackLinkButton>
        <ErrorMessage>Unknown round.</ErrorMessage>
      </Page>
    )
  }

  if (!SHOW_MOCK_ROUND_DETAIL && (round.error || !round.data)) {
    return (
      <Page>
        <BackLinkButton type="button" onClick={() => navigate(backTo)}>
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to rounds
        </BackLinkButton>
        <ErrorMessage>Failed to load round data: {round.error}</ErrorMessage>
      </Page>
    )
  }

  const roundData: RoundDetailResponse = SHOW_MOCK_ROUND_DETAIL
    ? { ...MOCK_ROUND_DETAIL, roundNumber }
    : (round.data as RoundDetailResponse)

  // Title follows the round being viewed (URL), so prev/next navigation updates it.
  const titleRoundNumber = roundData.roundNumber

  const hasActiveAddress = Boolean(activeAddress && activeAddressValid)

  const lotteryShareValue =
    roundData.lotteryPrizeEns != null
      ? `${formatEnsAmount(roundData.lotteryPrizeEns, { maximumFractionDigits: 2 })} ENS`
      : 'Unavailable'

  // Priority: live current-round payload (when viewing the ongoing round) →
  // the rounds-list summary for the viewed round → roundData fallback (real
  // detail when mock is off, or MOCK_ROUND_DETAIL while QA'ing the layout).
  const liveCurrentRound = currentRound.data ?? null
  const isViewingLiveRound =
    liveCurrentRound != null &&
    liveCurrentRound.roundNumber === roundNumber

  const displayStartDate =
    (isViewingLiveRound ? liveCurrentRound.startDate : null) ??
    viewedRoundSummary?.startDate ??
    roundData.startDate
  const displayEndDate =
    (isViewingLiveRound ? liveCurrentRound.endDate : null) ??
    viewedRoundSummary?.endDate ??
    roundData.endDate
  const displayStatus: RoundStatus =
    viewedRoundSummary?.status ?? roundData.status
  // Past/closed rounds: full ring (100%). Future rounds: empty (0%).
  // For the ongoing round only, read the actual live percent from the API
  // (rounds-list returns null for non-live rounds, which would render empty).
  const displayPercentComplete =
    displayStatus === 'paid' || displayStatus === 'ended'
      ? 100
      : displayStatus === 'live'
        ? (isViewingLiveRound ? liveCurrentRound.percentComplete : null) ??
          viewedRoundSummary?.percentComplete ??
          roundData.percentComplete ??
          0
        : 0
  const displayPoolSizeEns =
    (isViewingLiveRound ? liveCurrentRound.poolSizeEns : null) ??
    viewedRoundSummary?.poolSizeEns ??
    roundData.poolSizeEns ??
    null
  const reachedTierIndex =
    (isViewingLiveRound ? liveCurrentRound.tierIndex : null) ??
    viewedRoundSummary?.tierIndex ??
    roundData.tierIndex ??
    null
  const displayTierLabel =
    viewedRoundSummary?.tierLabel ??
    (reachedTierIndex != null ? `Tier ${reachedTierIndex + 1}` : '—')

  const reachedTier =
    reachedTierIndex != null
      ? tierProgression.data?.tiers[reachedTierIndex] ?? null
      : null
  const tierAprSubLabel =
    reachedTier?.estimatedAprPct != null
      ? `${reachedTier.estimatedAprPct}% APR reached`
      : 'Tier reached'

  const csvHref = `/api/rounds/${roundData.roundNumber}/distribution.csv`
  const etherscanHref = `https://etherscan.io/block/0`

  // Address inspector result strip
  const addressInsight: { tone: 'success' | 'neutral' | 'pending'; title: string; body: string } =
    !hasActiveAddress
      ? {
          tone: 'neutral',
          title: 'Check a wallet',
          body: 'Paste an ENS name or 0x address above to see what it earned this round.',
        }
      : roundData.distributionDataStatus !== 'available'
        ? {
            tone: 'pending',
            title: 'This round hasn’t finished yet',
            body: `Round ${roundData.roundNumber} is still ${roundData.status}. Results show up the moment it closes.`,
          }
        : roundData.addressReward && Number(roundData.addressReward.totalRewardEns) > 0
          ? {
              tone: 'success',
              title: `Earned ${formatEns(roundData.addressReward.totalRewardEns, '0 ENS')}`,
              body: 'Your reward landed in a single transfer.',
            }
          : {
              tone: 'neutral',
              title: 'No reward this round',
              body: 'This wallet didn’t earn anything in this round.',
            }

  return (
    <Page key={roundNumber}>
      <HeaderCard>
        <BackLinkButton type="button" onClick={() => navigate(backTo)}>
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to rounds
        </BackLinkButton>
        <AvatarColumn>
          <RoundProgressRing
            percent={displayPercentComplete}
            startDate={displayStartDate}
            endDate={displayEndDate}
            status={displayStatus}
          />
          <StatusTag $status={displayStatus}>{statusLabel(displayStatus)}</StatusTag>
        </AvatarColumn>
        <HeaderText>
          <TitleBlock>
            <NameRow>
              <NameTitle>Round {titleRoundNumber}</NameTitle>
            </NameRow>
          </TitleBlock>

          <SocialLinks>
            <SocialChip
              href={etherscanHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View on Etherscan"
            >
              <SocialIcon>
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
              </SocialIcon>
              View on Etherscan
            </SocialChip>
            <SocialChip
              href={csvHref}
              aria-label="Download distribution CSV"
            >
              <SocialIcon>
                <FontAwesomeIcon icon={faDownload} />
              </SocialIcon>
              Download CSV
            </SocialChip>
          </SocialLinks>

          <CtaRow>
            <RoundNavButton
              type="button"
              onClick={() =>
                previousRoundNumber != null &&
                navigate(buildRoundPath(previousRoundNumber, activeAddress, activeAddressValid))
              }
              disabled={previousRoundNumber == null}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              {previousRoundNumber != null ? `Round ${previousRoundNumber}` : 'Previous'}
            </RoundNavButton>
            <RoundNavButton
              type="button"
              onClick={() =>
                nextRoundNumber != null &&
                navigate(buildRoundPath(nextRoundNumber, activeAddress, activeAddressValid))
              }
              disabled={nextRoundNumber == null}
            >
              {nextRoundNumber != null ? `Round ${nextRoundNumber}` : 'Next'}
              <FontAwesomeIcon icon={faArrowRight} />
            </RoundNavButton>
          </CtaRow>
        </HeaderText>
      </HeaderCard>

      <StatsRow>
        <StatCard>
          <StatTopRow>
            <StatValue>{formatPoolEns(displayPoolSizeEns)}</StatValue>
            <StatIconBox aria-hidden>
              <FontAwesomeIcon icon={faCoins} />
            </StatIconBox>
          </StatTopRow>
          <StatLabel>Pool size</StatLabel>
        </StatCard>
        <StatCard>
          <StatTopRow>
            <StatValue>{displayTierLabel}</StatValue>
            <StatIconBox aria-hidden>
              <FontAwesomeIcon icon={faRankingStar} />
            </StatIconBox>
          </StatTopRow>
          <StatLabel>{tierAprSubLabel}</StatLabel>
        </StatCard>
        <StatCard>
          <StatTopRow>
            <StatValue>{formatVpGrowth(roundData.vpGrowthPct)}</StatValue>
            <StatIconBox aria-hidden>
              <FontAwesomeIcon icon={faArrowTrendUp} />
            </StatIconBox>
          </StatTopRow>
          <StatLabel>VP growth</StatLabel>
        </StatCard>
        <StatCard>
          <StatTopRow>
            <StatValue>{lotteryShareValue}</StatValue>
            <StatIconBox aria-hidden>
              <FontAwesomeIcon icon={faTrophy} />
            </StatIconBox>
          </StatTopRow>
          <StatLabel>Lottery prize</StatLabel>
        </StatCard>
      </StatsRow>

      <Section>
        <SectionHeader>
          <SectionLabelGroup>
            <SectionLabel>Check a wallet</SectionLabel>
            <SectionTitle>See what this round paid an address</SectionTitle>
          </SectionLabelGroup>
          {hasActiveAddress ? (
            <RowCount>{formatAddressReward(roundData.addressReward)}</RowCount>
          ) : null}
        </SectionHeader>
        <AddressLookupForm
          value={addressInput}
          activeAddress={activeAddress}
          sourceLabel={sourceLabel}
          error={addressError}
          connectedAddress={walletAddress || undefined}
          onChange={setAddressInput}
          onSubmit={handleAddressSubmit}
          onClear={handleAddressClear}
        />
        <AddressResultStrip $tone={addressInsight.tone}>
          <AddressResultIcon $tone={addressInsight.tone} aria-hidden>
            <FontAwesomeIcon
              icon={
                addressInsight.tone === 'success'
                  ? faCircleCheck
                  : addressInsight.tone === 'pending'
                    ? faHourglassHalf
                    : hasActiveAddress
                      ? faCircleInfo
                      : faMagnifyingGlass
              }
            />
          </AddressResultIcon>
          <AddressResultText>
            <AddressResultTitle $tone={addressInsight.tone}>{addressInsight.title}</AddressResultTitle>
            <AddressResultBody>{addressInsight.body}</AddressResultBody>
          </AddressResultText>
        </AddressResultStrip>
      </Section>

      <TableCard>
        <TableCardHeader>
          <SectionLabelGroup>
            <SectionLabel>Top voter rewards</SectionLabel>
            <SectionTitle>Top delegates this round</SectionTitle>
          </SectionLabelGroup>
        </TableCardHeader>
        <RewardsTable
          rows={roundData.topVoterRewards}
          highlightAddress={hasActiveAddress ? activeAddress : ''}
          showVotingPower
        />
      </TableCard>

      <TableCard>
        <TableCardHeader>
          <SectionLabelGroup>
            <SectionLabel>Top token holder rewards</SectionLabel>
            <SectionTitle>Top holders this round</SectionTitle>
          </SectionLabelGroup>
        </TableCardHeader>
        <RewardsTable
          rows={roundData.topTokenHolderRewards}
          highlightAddress={hasActiveAddress ? activeAddress : ''}
          showVotingPower={false}
        />
      </TableCard>
    </Page>
  )
}

// Suppress "imported but unused" for LotteryDetail — kept so the
// RoundDetailResponse type continues to type-check when SHOW_MOCK_ROUND_DETAIL flips.
export type { LotteryDetail }
