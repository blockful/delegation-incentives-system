import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled, { css, keyframes } from 'styled-components'
import { isAddress } from 'viem'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMagnifyingGlass,
  faTrophy,
  faLayerGroup,
  faUsers,
  faChevronRight,
  faChevronDown,
  faWallet,
  faXmark,
  faCheck,
  faHourglassHalf,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons'
import { tokens, ErrorMessage } from '@/styles'
import { useLottery } from '@/features/lottery/useLottery'
import { useWalletState } from '@/features/wallet/useWalletState'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/api'
import { AddressIdentity } from '@/components/shared/AddressIdentity'
import { LotteryPageSkeleton } from '@/components/shared/PageSkeletons'
import { BucketSlotGrid } from '@/components/shared/BucketSlotGrid'
import { SkeletonBlock } from '@/components/shared/Skeleton'
import type {
  AddressDistributionRound,
  LotteryBucketDetail,
  LotteryDetail,
  LotteryEntryDetail,
  RoundDetailResponse,
  RoundStatus,
  RoundSummary,
} from '@/api/types'
import {
  formatEnsAmount,
  formatUtcDate,
  truncateAddress,
} from '@/utils/format'

/* ─── Page shell (matches RoundsPage idiom) ─── */

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
  gap: 8px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.48);
  border: 1px solid ${tokens.color.white};
  border-radius: 14px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const EyebrowSep = styled.span`
  color: ${tokens.color.textSubtle};
`

const PageTitle = styled.h1`
  margin: 0;
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.1;
  text-align: center;
  text-wrap: balance;

  @media (min-width: 768px) {
    font-size: 68px;
  }
`

const eyebrowPulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(25, 156, 117, 0.55); }
  70%  { box-shadow: 0 0 0 6px rgba(25, 156, 117, 0); }
  100% { box-shadow: 0 0 0 0 rgba(25, 156, 117, 0); }
`

const EyebrowDot = styled.span<{ $status: RoundStatus }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background: ${({ $status }) =>
    $status === 'live' ? tokens.color.positiveEmphasis : tokens.color.textSubtle};

  ${({ $status }) =>
    $status === 'live'
      ? css`
          animation: ${eyebrowPulse} 2s ease-out infinite;
        `
      : ''}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
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

/* ─── Stats + progress ─── */

const SummaryBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
`

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  width: 100%;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

const StatCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 20px;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
`

const StatTopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`

const StatValue = styled.span<{ $tone?: 'default' | 'positive' }>`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${({ $tone }) =>
    $tone === 'positive' ? tokens.color.positiveEmphasis : tokens.color.darkBlue};
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

const ProgressBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
`

const ProgressTrack = styled.div`
  position: relative;
  width: 100%;
  height: 12px;
  background: ${tokens.color.borderLight};
  border-radius: 9999px;
  overflow: hidden;
`

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => Math.max(0, Math.min(100, $pct))}%;
  background: ${tokens.color.blue};
  border-radius: 9999px;
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
`

const BarLabels = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const BarLabel = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 1.6;
`

const BarEndGroup = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const TimeLeft = styled.span<{ $status: RoundStatus }>`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${({ $status }) =>
    $status === 'live' ? tokens.color.blue : tokens.color.darkGray};
  line-height: 20px;
`

const Dot = styled.span`
  width: 4px;
  height: 4px;
  border-radius: 9999px;
  background: ${tokens.color.textSubtle};
`

/* ─── Inspect card ─── */

const InspectCard = styled.section`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
`

const InspectHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const InspectLabel = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  @media (max-width: 767px) {
    flex-wrap: wrap;
  }
`

const SearchInputWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
`

const SearchIcon = styled.span`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: ${tokens.color.textSecondary};
  font-size: ${tokens.font.size.base};
  pointer-events: none;
`

const SearchInput = styled.input<{ $hasError?: boolean }>`
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 1px solid ${({ $hasError }) =>
    $hasError ? tokens.color.negative : tokens.color.borderLight};
  border-radius: 9999px;
  background: ${tokens.color.surface};
  font-size: ${tokens.font.size.base};
  font-family: ${tokens.font.family};
  color: ${tokens.color.darkBlue};
  transition: border-color ${tokens.transition.fast};

  &::placeholder {
    color: ${tokens.color.textSecondary};
  }

  &:hover {
    border-color: ${tokens.color.middleGray};
  }

  &:focus {
    outline: none;
    border-color: ${tokens.color.blue};
    box-shadow: 0 0 0 3px ${tokens.color.lightBlueOpacity};
  }
`

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
`

const SearchButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: ${tokens.color.blue};
  color: ${tokens.color.white};
  border: none;
  border-radius: 8px;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  cursor: pointer;
  transition: background ${tokens.transition.fast};

  &:hover {
    background: ${tokens.color.accent};
  }

  &:disabled {
    background: ${tokens.color.borderLight};
    color: ${tokens.color.textSubtle};
    cursor: not-allowed;
  }
`

const ClearButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  background: ${tokens.color.lightBlueOpacity};
  color: ${tokens.color.blue};
  border: none;
  border-radius: 8px;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  cursor: pointer;
  transition: background ${tokens.transition.fast};

  &:hover {
    background: ${tokens.color.lightBlue};
  }
`

const HintRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const HintText = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const UseMyWalletPill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: ${tokens.color.lightBlueOpacity};
  border: 1px solid ${tokens.color.blue};
  border-radius: 9999px;
  color: ${tokens.color.blue};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
  cursor: pointer;
  transition: background ${tokens.transition.fast};

  &:hover {
    background: ${tokens.color.lightBlue};
  }
`

const ActiveAddressPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: ${tokens.color.status.success.bg};
  border-radius: 9999px;
  color: ${tokens.color.status.success.fg};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
`

const InputError = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.negative};
  line-height: 16px;
`

/* ─── Personal-result strip (inside InspectCard) ─── */

type ResultTone = 'success' | 'warning' | 'neutral' | 'pending' | 'danger'

const ResultStrip = styled.div<{ $tone: ResultTone }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  background: ${({ $tone }) => {
    if ($tone === 'success') return tokens.color.status.success.bg
    if ($tone === 'warning') return tokens.color.status.warning.bg
    if ($tone === 'pending') return tokens.color.status.pending.bg
    if ($tone === 'danger') return tokens.color.status.danger.bg
    return tokens.color.bgSubtle
  }};
  border: 1px solid
    ${({ $tone }) => {
      if ($tone === 'success') return tokens.color.status.success.border
      if ($tone === 'warning') return tokens.color.status.warning.border
      if ($tone === 'pending') return tokens.color.status.pending.border
      if ($tone === 'danger') return tokens.color.status.danger.border
      return tokens.color.borderLight
    }};
  color: ${({ $tone }) => {
    if ($tone === 'success') return tokens.color.status.success.fg
    if ($tone === 'warning') return tokens.color.status.warning.fg
    if ($tone === 'pending') return tokens.color.status.pending.fg
    if ($tone === 'danger') return tokens.color.status.danger.fg
    return tokens.color.darkGray
  }};

  @media (max-width: 767px) {
    flex-wrap: wrap;
  }
`

const ResultIcon = styled.span<{ $tone: ResultTone }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  background: ${tokens.color.surface};
  color: inherit;
  font-size: 14px;
`

const ResultTextStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
`

const ResultTitle = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
`

const ResultBody = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const ResultAction = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 9999px;
  color: ${tokens.color.darkBlue};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  cursor: pointer;
  flex-shrink: 0;
  transition:
    border-color ${tokens.transition.fast},
    background ${tokens.transition.fast},
    transform ${tokens.transition.fast};

  &:hover {
    border-color: ${tokens.color.blue};
    color: ${tokens.color.blue};
    transform: translateY(-1px);
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover {
      transform: none;
    }
  }
`

/* ─── History table ─── */

const TableCard = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
  overflow: hidden;
  background: ${tokens.color.surface};
`

const TableHeadRow = styled.div`
  display: flex;
  background: ${tokens.color.bgSubtle};
  border-bottom: 1px solid ${tokens.color.borderLight};

  @media (max-width: 767px) {
    display: none;
  }
`

const TableHeadCell = styled.div<{ $weight?: number }>`
  flex: ${({ $weight }) => $weight ?? 1};
  min-width: 0;
  display: flex;
  align-items: center;
  padding: 12px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const rowFadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`

const TableRow = styled.button<{ $clickable?: boolean; $index?: number; $active?: boolean }>`
  display: flex;
  width: 100%;
  background: ${({ $active }) =>
    $active ? tokens.color.lightBlueOpacity : tokens.color.surface};
  border: none;
  font-family: inherit;
  text-align: left;
  color: inherit;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: background ${tokens.transition.fast};
  animation: ${rowFadeIn} 0.28s ease-out both;
  animation-delay: ${({ $index }) => Math.min(($index ?? 0) * 0.03, 0.18)}s;

  &:not(:last-child) {
    border-bottom: 1px solid ${tokens.color.borderLight};
  }

  ${({ $clickable, $active }) =>
    $clickable &&
    `
      &:hover { background: ${$active ? tokens.color.lightBlueOpacity : tokens.color.bgSubtle}; }
      &:focus-visible {
        outline: 2px solid ${tokens.color.blue};
        outline-offset: -2px;
      }
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @media (max-width: 767px) {
    flex-direction: column;
    padding: 4px 0;
  }
`

const TableCell = styled.div<{ $weight?: number; $primary?: boolean }>`
  flex: ${({ $weight }) => $weight ?? 1};
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 14px 12px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 767px) {
    width: 100%;
    flex: none;
    justify-content: space-between;
    padding: 10px 16px;
    white-space: normal;
    ${({ $primary }) =>
      $primary
        ? `font-weight: ${tokens.font.weight.bold}; color: ${tokens.color.darkBlue};`
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

const MutedCell = styled.span`
  color: ${tokens.color.textSecondary};
  font-weight: ${tokens.font.weight.medium};
`

const RewardPositive = styled.span`
  color: ${tokens.color.positiveEmphasis};
  font-weight: ${tokens.font.weight.bold};
`

const RoundNumber = styled.span`
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

const StatusPill = styled.span<{ $status: RoundStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
  text-transform: capitalize;
  white-space: nowrap;
  background: ${({ $status }) =>
    $status === 'live'
      ? tokens.color.status.success.bg
      : $status === 'paid'
        ? tokens.color.lightBlueOpacity
        : tokens.color.bgSubtle};
  color: ${({ $status }) =>
    $status === 'live'
      ? tokens.color.positiveEmphasis
      : $status === 'paid'
        ? tokens.color.blue
        : tokens.color.darkGray};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 9999px;
    background: currentColor;
    flex-shrink: 0;
  }
`

const ChevronCell = styled(TableCell)<{ $expanded?: boolean }>`
  justify-content: flex-end;
  color: ${({ $expanded }) =>
    $expanded ? tokens.color.blue : tokens.color.textSecondary};
  transition: color ${tokens.transition.fast}, transform ${tokens.transition.fast};

  ${TableRow}:hover & {
    color: ${tokens.color.blue};
  }

  @media (max-width: 767px) {
    display: none;
  }
`

const ExpandedPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px;
  background: ${tokens.color.bgSubtle};
  border-bottom: 1px solid ${tokens.color.borderLight};
  animation: ${rowFadeIn} 0.24s ease-out both;

  &:last-child {
    border-bottom: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @media (max-width: 720px) {
    padding: 16px;
  }
`

const TableEmpty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
  background: ${tokens.color.surface};
  text-align: center;
`

const EmptyIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 9999px;
  background: ${tokens.color.lightBlueOpacity};
  color: ${tokens.color.blue};
  font-size: 20px;
`

const EmptyTitle = styled.span`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 24px;
`

const EmptyBody = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
  max-width: 440px;
`

/* ─── Bucket detail (inlined inside expanded rows) ─── */

const PanelIntro = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkGray};
  line-height: 1.5;
`

const BucketChipStrip = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-gutter: stable;
  padding-bottom: 4px;
  margin: 0 -4px;
  padding-left: 4px;
  padding-right: 4px;
`

const BucketChip = styled.button<{ $active?: boolean; $isUser?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 9999px;
  border: 1px solid
    ${({ $active, $isUser }) =>
      $active
        ? tokens.color.blue
        : $isUser
          ? tokens.color.status.success.border
          : tokens.color.borderLight};
  background: ${({ $active, $isUser }) =>
    $active
      ? tokens.color.lightBlueOpacity
      : $isUser
        ? tokens.color.status.success.bg
        : tokens.color.surface};
  color: ${({ $active, $isUser }) =>
    $active
      ? tokens.color.blue
      : $isUser
        ? tokens.color.status.success.fg
        : tokens.color.darkBlue};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  white-space: nowrap;
  cursor: pointer;
  transition:
    border-color ${tokens.transition.fast},
    background ${tokens.transition.fast},
    color ${tokens.transition.fast};

  &:hover {
    border-color: ${tokens.color.blue};
  }
`

const BucketStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (min-width: 760px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

const BucketStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  background: ${tokens.color.bgSubtle};
  border-radius: 8px;
`

const BucketStatValue = styled.span`
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.2;
  overflow-wrap: anywhere;
`

const BucketStatLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
`

const SlotGridSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid ${tokens.color.borderLight};
`

const SlotGridCaption = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
  line-height: 1.5;
  max-width: 680px;
`

const SubsectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
  border-top: 1px solid ${tokens.color.borderLight};
  padding-top: 16px;
`

const SubsectionTitle = styled.h3`
  margin: 0;
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.25;
`

const ParticipantTableWrap = styled.div`
  width: 100%;
  max-width: 100%;
  max-height: 360px;
  min-width: 0;
  overflow: auto;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 8px;
  scrollbar-gutter: stable;

  @media (max-width: 720px) {
    max-height: none;
    overflow: visible;
  }
`

const ParticipantTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  min-width: 580px;

  @media (max-width: 720px) {
    min-width: 0;
    table-layout: auto;

    thead {
      display: none;
    }

    tbody, tr {
      display: block;
      width: 100%;
    }

    tr {
      border-bottom: 1px solid ${tokens.color.borderLight};

      &:last-child {
        border-bottom: 0;
      }
    }
  }
`

const Th = styled.th`
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 12px;
  text-align: left;
  background: ${tokens.color.surface};
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  letter-spacing: 0;
  border-bottom: 1px solid ${tokens.color.borderLight};
`

const Td = styled.td`
  padding: 12px;
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.base};
  border-bottom: 1px solid ${tokens.color.borderLight};
  vertical-align: middle;
  overflow-wrap: anywhere;

  @media (max-width: 720px) {
    display: grid;
    grid-template-columns: minmax(82px, 34%) minmax(0, 1fr);
    gap: 12px;
    padding: 10px 12px;
    border-bottom: 1px solid ${tokens.color.borderLight};

    &::before {
      content: attr(data-label);
      color: ${tokens.color.darkGray};
      font-size: ${tokens.font.size.sm};
      font-weight: ${tokens.font.weight.semibold};
    }

    &:last-child {
      border-bottom: 0;
    }
  }
`

const ParticipantTr = styled.tr<{ $highlight?: boolean; $winner?: boolean }>`
  background: ${({ $highlight, $winner }) => {
    if ($winner) return tokens.color.tierHighlight
    if ($highlight) return tokens.color.lightBlue
    return 'transparent'
  }};
`

const OddsStack = styled.div`
  display: grid;
  gap: 6px;
`

const OddsMeter = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 9999px;
  background: ${tokens.color.borderLight};
  overflow: hidden;
`

const OddsFill = styled.span`
  display: block;
  height: 100%;
  border-radius: inherit;
  background: ${tokens.color.blue};
`

const OutcomePill = styled.span<{ $winner?: boolean }>`
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 26px;
  padding: 0 8px;
  border-radius: 9999px;
  background: ${({ $winner }) => ($winner ? tokens.color.tierHighlight : tokens.color.borderLight)};
  color: ${({ $winner }) => ($winner ? tokens.color.positiveEmphasis : tokens.color.darkGray)};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  white-space: nowrap;
`

const MonoDigits = styled.span`
  font-family: ${tokens.font.mono};
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
`

const WinnerSearchInput = styled.input`
  width: 100%;
  max-width: 320px;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 8px;
  background: ${tokens.color.surface};
  color: ${tokens.color.darkBlue};
  font-family: inherit;
  font-size: ${tokens.font.size.base};
  transition: border-color ${tokens.transition.fast};

  &::placeholder {
    color: ${tokens.color.textSubtle};
  }

  &:hover {
    border-color: ${tokens.color.blue};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
    border-color: ${tokens.color.blue};
  }
`

const ClickableTr = styled(ParticipantTr)`
  cursor: pointer;
  transition: background ${tokens.transition.fast};

  &:hover {
    background: ${({ $highlight }) => ($highlight ? tokens.color.lightBlue : tokens.color.bgSubtle)};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: -2px;
  }
`

const TableCaption = styled.p`
  margin: 8px 0 0;
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
  line-height: 1.5;
`

const BucketEmpty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 24px;
  text-align: center;
`

const BucketEmptyIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 9999px;
  background: ${tokens.color.bgSubtle};
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.lg};
`

/* ─── Types & helpers ─── */

interface RoundsRow {
  roundNumber: number
  period: string
  buckets: string | null
  entries: string | null
  yourResult: { label: string | null; tone: 'positive' | 'neutral' | 'muted' }
  status: RoundStatus
  hasAddress: boolean
}

function getWalletAddress(walletState: ReturnType<typeof useWalletState>): string {
  if (walletState.status === 'disconnected') return ''
  return walletState.address
}

function formatEns(value: string | null | undefined, empty = 'Unavailable', maximumFractionDigits = 4): string {
  if (value == null) return empty
  return `${formatEnsAmount(value, { maximumFractionDigits })} ENS`
}

function formatProbability(value: string | null | undefined): string {
  if (value == null) return 'Unavailable'
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 'Unavailable'
  const pct = numericValue * 100
  if (pct > 0 && pct < 0.01) return '<0.01%'
  return `${pct.toLocaleString('en-US', {
    maximumFractionDigits: pct < 1 ? 3 : 2,
  })}%`
}

function parsePositiveInteger(value: string | null): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function buildLotteryHref(
  searchParams: URLSearchParams,
  updates: Partial<Record<'round' | 'bucket' | 'address', string | number | null>>,
): string {
  const next = new URLSearchParams(searchParams)

  for (const [key, value] of Object.entries(updates)) {
    if (value == null || value === '') {
      next.delete(key)
    } else {
      next.set(key, String(value))
    }
  }

  const query = next.toString()
  return query ? `/lottery?${query}` : '/lottery'
}

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

function findUserBucket(lottery: LotteryDetail | null, address: string): LotteryBucketDetail | null {
  if (!lottery || !address) return null
  return (
    lottery.buckets.find((bucket) =>
      bucket.entries.some((entry) => sameAddress(entry.address, address)),
    ) ?? null
  )
}

function getSelectedBucket(
  lottery: LotteryDetail | null,
  bucketParam: string | null,
  activeAddress: string,
): LotteryBucketDetail | null {
  if (!lottery || lottery.buckets.length === 0) return null
  // Single pool: always focus it; "all pools" view adds nothing.
  if (lottery.buckets.length === 1) return lottery.buckets[0]
  // Explicit "all pools" request.
  if (bucketParam === 'all') return null
  const bucketNumber = parsePositiveInteger(bucketParam)
  if (bucketNumber != null) {
    const requestedIndex = bucketNumber - 1
    return lottery.buckets.find((bucket) => bucket.bucketIndex === requestedIndex) ?? null
  }
  // No param: auto-focus the user's bucket if they're in one, else show all pools.
  return findUserBucket(lottery, activeAddress)
}

function getBucketParticipantCount(bucket: LotteryBucketDetail): number {
  return new Set(bucket.entries.map((entry) => entry.address.toLowerCase())).size
}

function getOddsWidth(probability: string): string {
  const numericValue = Number(probability)
  if (!Number.isFinite(numericValue) || numericValue <= 0) return '0%'
  return `${Math.min(100, Math.max(0, numericValue * 100))}%`
}

function progressPercent(start: string | null, end: string | null): number {
  if (!start || !end) return 0
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0
  const now = Date.now()
  return Math.max(0, Math.min(100, ((now - s) / (e - s)) * 100))
}

function formatTimeToDraw(round: RoundDetailResponse): string {
  if (round.status === 'paid') return 'Drawn'
  if (round.daysRemaining == null) return 'Draw pending'
  if (round.daysRemaining === 0) return 'Draws today'
  if (round.daysRemaining === 1) return 'Draws in 1 day'
  return `Draws in ${round.daysRemaining} days`
}

interface AddressLotteryEntry {
  bucket: LotteryBucketDetail
  entry: LotteryEntryDetail
  won: boolean
}

function getAddressLotteryEntries(lottery: LotteryDetail | null, address: string): AddressLotteryEntry[] {
  if (!lottery || !address) return []
  const entries: AddressLotteryEntry[] = []
  for (const bucket of lottery.buckets) {
    for (const entry of bucket.entries) {
      if (sameAddress(entry.address, address)) {
        entries.push({
          bucket,
          entry,
          won: sameAddress(bucket.winner, address),
        })
      }
    }
  }
  return entries
}

function sumEntryAmountEns(entries: AddressLotteryEntry[]): string {
  const total = entries.reduce((acc, item) => acc + Number(item.entry.amountEns), 0)
  if (!Number.isFinite(total)) return 'Unavailable'
  return `${total.toLocaleString('en-US', { maximumFractionDigits: 4 })} ENS`
}

function bestEntryProbability(entries: AddressLotteryEntry[]): string {
  const best = entries.reduce((max, item) => {
    const probability = Number(item.entry.probability)
    return Number.isFinite(probability) ? Math.max(max, probability) : max
  }, 0)
  return best > 0 ? formatProbability(String(best)) : 'Unavailable'
}

interface PersonalResult {
  tone: ResultTone
  title: string
  body: string
  action?: { label: string; onClick: () => void }
}

function buildPersonalResult(opts: {
  round: RoundDetailResponse
  activeAddress: string
  activeAddressValid: boolean
  onJumpToBucket: (bucketNumber: number) => void
}): PersonalResult | null {
  const { round, activeAddress, activeAddressValid, onJumpToBucket } = opts

  if (!activeAddress) return null

  if (!activeAddressValid) {
    return {
      tone: 'danger',
      title: 'That doesn’t look like a valid address',
      body: 'Paste an ENS name or 0x address to check.',
    }
  }

  if (round.distributionDataStatus !== 'available') {
    return {
      tone: 'pending',
      title: 'Draw hasn’t happened yet',
      body: `Round ${round.roundNumber} draws once it closes. Come back then to see your result.`,
    }
  }

  if (!round.lottery) {
    return {
      tone: 'neutral',
      title: 'No pools this round',
      body: 'Every reward this round was over 1 ENS, so they all went directly to wallets.',
    }
  }

  const entries = getAddressLotteryEntries(round.lottery, activeAddress)
  const winningEntries = entries.filter((item) => item.won)

  if (winningEntries.length > 0) {
    const firstWin = winningEntries[0]
    const lotteryReward = round.addressReward?.lotteryRewardEns
    return {
      tone: 'success',
      title:
        winningEntries.length === 1
          ? `You won pool #${firstWin.bucket.bucketIndex + 1} · ${formatEns(lotteryReward, '10 ENS')}`
          : `You won ${winningEntries.length} pools in this round`,
      body: 'Your reward landed in the same transfer as the rest of the round.',
      action: {
        label: 'See your pool',
        onClick: () => onJumpToBucket(firstWin.bucket.bucketIndex + 1),
      },
    }
  }

  if (entries.length > 0) {
    const firstEntry = entries[0]
    return {
      tone: 'warning',
      title: `You were in pool #${firstEntry.bucket.bucketIndex + 1}, but didn’t win`,
      body: `Your odds: ${bestEntryProbability(entries)} · Your share: ${sumEntryAmountEns(entries)}`,
      action: {
        label: 'See the pool',
        onClick: () => onJumpToBucket(firstEntry.bucket.bucketIndex + 1),
      },
    }
  }

  const totalReward = Number(round.addressReward?.totalRewardEns ?? '0')
  if (Number.isFinite(totalReward) && totalReward > 0) {
    return {
      tone: 'neutral',
      title: 'Your reward went out directly',
      body: `You earned ${formatEns(round.addressReward?.totalRewardEns)} this round. That’s over 1 ENS, so it skipped the pool and paid out directly.`,
    }
  }

  return {
    tone: 'neutral',
    title: 'No pool entry this round',
    body: 'This wallet didn’t earn a reward under 1 ENS, so nothing went into a pool.',
  }
}

function buildRoundsRows(
  rounds: RoundSummary[],
  activeAddress: string,
  addressRounds: AddressDistributionRound[] | null,
  addressLoading: boolean,
  addressError: string | null,
): RoundsRow[] {
  const rewardsByRound = new Map((addressRounds ?? []).map((r) => [r.roundNumber, r]))
  const hasAddress = Boolean(activeAddress && isAddress(activeAddress))

  return rounds.map((round) => {
    const buckets = round.lotteryBucketCount ?? null
    const entries = round.lotteryEntryCount ?? null
    const reward = rewardsByRound.get(round.roundNumber) ?? null

    let yourResult: RoundsRow['yourResult'] = { label: null, tone: 'muted' }
    if (hasAddress) {
      if (addressError) {
        yourResult = { label: null, tone: 'muted' }
      } else if (addressLoading) {
        yourResult = { label: 'Loading…', tone: 'muted' }
      } else if (round.distributionDataStatus !== 'available') {
        yourResult = { label: 'Pending', tone: 'muted' }
      } else if (!reward) {
        yourResult = { label: '—', tone: 'muted' }
      } else if (reward.rewardStatus === 'pending') {
        yourResult = { label: 'Pending', tone: 'muted' }
      } else if (Number(reward.lotteryRewardEns) > 0) {
        yourResult = {
          label: `Won ${formatEns(reward.lotteryRewardEns)}`,
          tone: 'positive',
        }
      } else if (Number(reward.totalRewardEns) > 0) {
        yourResult = { label: 'Direct payout', tone: 'neutral' }
      } else {
        yourResult = { label: 'No entry', tone: 'muted' }
      }
    }

    return {
      roundNumber: round.roundNumber,
      period: round.month,
      buckets: buckets == null
        ? null
        : `${buckets.toLocaleString('en-US')} ${buckets === 1 ? 'pool' : 'pools'}`,
      entries: entries == null ? null : entries.toLocaleString('en-US'),
      yourResult,
      status: round.status,
      hasAddress,
    }
  })
}

/* ─── Components ─── */

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(handle)
  }, [value, delayMs])
  return debounced
}

function BucketDetailPanel({
  round,
  bucket,
  activeAddress,
  searchParams,
  onSelectBucket,
}: {
  round: RoundDetailResponse
  bucket: LotteryBucketDetail | null
  activeAddress: string
  searchParams: URLSearchParams
  onSelectBucket: (bucketNumber: number | 'all') => void
}) {
  const navigate = useNavigate()
  const rowRefs = useRef<Map<number, HTMLTableRowElement | null>>(new Map())
  const [winnerSearch, setWinnerSearch] = useState('')
  const debouncedWinnerSearch = useDebouncedValue(winnerSearch, 200)

  const lottery = round.lottery
  const allBuckets = lottery?.buckets ?? []
  const seedBlockNumber = lottery?.seed.blockNumber ?? null
  const userBucket = activeAddress ? findUserBucket(lottery, activeAddress) : null

  const filteredBuckets = useMemo(() => {
    const query = debouncedWinnerSearch.trim().toLowerCase()
    if (!query) return allBuckets
    return allBuckets.filter((b) => {
      const ens = b.winnerEnsName?.toLowerCase() ?? ''
      const addr = b.winner.toLowerCase()
      return ens.includes(query) || addr.includes(query)
    })
  }, [allBuckets, debouncedWinnerSearch])

  const handleSlotClick = (entry: LotteryEntryDetail) => {
    const row = rowRefs.current.get(entry.entryIndex)
    if (!row) return
    row.scrollIntoView({ behavior: 'smooth', block: 'center' })
    row.animate(
      [
        { backgroundColor: tokens.color.lightBlue },
        { backgroundColor: 'transparent' },
      ],
      { duration: 1200, easing: 'ease-out' },
    )
  }

  const handleWinnerRowSelect = (selected: LotteryBucketDetail) => {
    const href = buildLotteryHref(searchParams, {
      round: round.roundNumber,
      bucket: selected.bucketIndex + 1,
    })
    navigate(href)
  }

  return (
    <>
      <PanelIntro>
        {bucket
          ? 'Everyone in this pool earned under 1 ENS. One wallet wins the full prize.'
          : 'Each row is one pool, with the wallet that won it. Click a pool to see everyone who was in.'}
      </PanelIntro>

      {allBuckets.length > 1 ? (
        <BucketChipStrip>
          <BucketChip
            type="button"
            $active={bucket == null}
            onClick={() => onSelectBucket('all')}
          >
            All pools
          </BucketChip>
          {allBuckets.map((b) => {
            const isActive = bucket?.bucketIndex === b.bucketIndex
            const isUser = userBucket?.bucketIndex === b.bucketIndex
            return (
              <BucketChip
                key={b.bucketIndex}
                type="button"
                $active={isActive}
                $isUser={isUser && !isActive}
                onClick={() => onSelectBucket(b.bucketIndex + 1)}
              >
                Pool #{b.bucketIndex + 1}
                {isUser ? ' · You' : ''}
              </BucketChip>
            )
          })}
        </BucketChipStrip>
      ) : null}

      {bucket ? (
        <>
          <BucketStatsGrid>
            <BucketStat>
              <BucketStatValue>{formatEns(bucket.prizeEns, '0 ENS')}</BucketStatValue>
              <BucketStatLabel>Prize</BucketStatLabel>
            </BucketStat>
            <BucketStat>
              <BucketStatValue>
                <AddressIdentity
                  address={bucket.winner}
                  ensName={bucket.winnerEnsName}
                  resolveEns
                  secondaryAddress="never"
                />
              </BucketStatValue>
              <BucketStatLabel>Winner</BucketStatLabel>
            </BucketStat>
            <BucketStat>
              <BucketStatValue>{getBucketParticipantCount(bucket).toLocaleString('en-US')}</BucketStatValue>
              <BucketStatLabel>Participants</BucketStatLabel>
            </BucketStat>
            <BucketStat>
              <BucketStatValue>{formatProbability(bucket.winnerProbability)}</BucketStatValue>
              <BucketStatLabel>Winner’s odds</BucketStatLabel>
            </BucketStat>
          </BucketStatsGrid>

          <SlotGridSection>
            <SlotGridCaption>
              Each slot is one entry. Wider slots had a bigger share, and better odds. The winning slot is highlighted.
            </SlotGridCaption>
            <BucketSlotGrid
              entries={bucket.entries}
              winnerAddress={bucket.winner}
              highlightAddress={activeAddress}
              onSlotClick={handleSlotClick}
              ariaLabel={`Pool ${bucket.bucketIndex + 1} entry distribution`}
            />
          </SlotGridSection>

          <SubsectionHeader>
            <SubsectionTitle>Everyone in this pool</SubsectionTitle>
          </SubsectionHeader>

          <ParticipantTableWrap>
            <ParticipantTable>
              <colgroup>
                <col style={{ width: '36%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '22%' }} />
              </colgroup>
              <thead>
                <tr>
                  <Th>Participant</Th>
                  <Th>Share</Th>
                  <Th>Odds</Th>
                  <Th>Result</Th>
                </tr>
              </thead>
              <tbody>
                {bucket.entries.map((entry) => {
                  const isWinner = sameAddress(entry.address, bucket.winner)
                  const isActive = activeAddress ? sameAddress(entry.address, activeAddress) : false
                  return (
                    <ParticipantTr
                      key={`${bucket.bucketIndex}-${entry.entryIndex}`}
                      ref={(el) => {
                        rowRefs.current.set(entry.entryIndex, el)
                      }}
                      $highlight={isActive}
                      $winner={isWinner}
                    >
                      <Td data-label="Participant">
                        <AddressIdentity
                          address={entry.address}
                          ensName={entry.ensName}
                          resolveEns
                          secondaryAddress="auto"
                        />
                      </Td>
                      <Td data-label="Share">
                        <RewardPositive>{formatEns(entry.amountEns, '0 ENS')}</RewardPositive>
                      </Td>
                      <Td data-label="Odds">
                        <OddsStack>
                          <span>{formatProbability(entry.probability)}</span>
                          <OddsMeter aria-hidden>
                            <OddsFill style={{ width: getOddsWidth(entry.probability) }} />
                          </OddsMeter>
                        </OddsStack>
                      </Td>
                      <Td data-label="Result">
                        <OutcomePill $winner={isWinner}>
                          {isWinner ? `Won ${formatEns(bucket.prizeEns, '0 ENS')}` : 'Not selected'}
                        </OutcomePill>
                      </Td>
                    </ParticipantTr>
                  )
                })}
              </tbody>
            </ParticipantTable>
          </ParticipantTableWrap>
        </>
      ) : (
        <>
          <SubsectionHeader>
            <SubsectionTitle>Winners across all pools</SubsectionTitle>
            <WinnerSearchInput
              type="search"
              placeholder="Search by ENS or address"
              value={winnerSearch}
              onChange={(e) => setWinnerSearch(e.target.value)}
              aria-label="Search by ENS name or address"
            />
          </SubsectionHeader>

          <ParticipantTableWrap>
            <ParticipantTable>
              <colgroup>
                <col style={{ width: '14%' }} />
                <col style={{ width: '42%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
              </colgroup>
              <thead>
                <tr>
                  <Th>Pool</Th>
                  <Th>Winner</Th>
                  <Th>Prize</Th>
                  <Th>Odds</Th>
                  <Th>Block</Th>
                </tr>
              </thead>
              <tbody>
                {filteredBuckets.map((b) => {
                  const isUserWinner = activeAddress && sameAddress(b.winner, activeAddress)
                  return (
                    <ClickableTr
                      key={b.bucketIndex}
                      $highlight={Boolean(isUserWinner)}
                      role="link"
                      tabIndex={0}
                      onClick={() => handleWinnerRowSelect(b)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleWinnerRowSelect(b)
                        }
                      }}
                    >
                      <Td data-label="Pool">
                        <MonoDigits>#{b.bucketIndex + 1}</MonoDigits>
                      </Td>
                      <Td data-label="Winner">
                        <AddressIdentity
                          address={b.winner}
                          ensName={b.winnerEnsName}
                          resolveEns
                          secondaryAddress="auto"
                        />
                      </Td>
                      <Td data-label="Prize">
                        <RewardPositive>
                          <MonoDigits>{formatEns(b.prizeEns, '0 ENS')}</MonoDigits>
                        </RewardPositive>
                      </Td>
                      <Td data-label="Odds">
                        <MonoDigits>{formatProbability(b.winnerProbability)}</MonoDigits>
                      </Td>
                      <Td data-label="Block">
                        <MonoDigits>{seedBlockNumber ?? '—'}</MonoDigits>
                      </Td>
                    </ClickableTr>
                  )
                })}
              </tbody>
            </ParticipantTable>
          </ParticipantTableWrap>
          {seedBlockNumber ? (
            <TableCaption>
              Winners drawn from an Ethereum block hash (RANDAO) at block <MonoDigits>{seedBlockNumber}</MonoDigits>, so nobody could predict the result.
            </TableCaption>
          ) : null}
        </>
      )}
    </>
  )
}

function BucketDetailFallback({ round }: { round: RoundDetailResponse }) {
  const hasNoLottery =
    round.status === 'paid' &&
    round.distributionDataStatus === 'available' &&
    (round.lottery == null || round.lottery.buckets.length === 0)

  if (hasNoLottery) {
    return (
      <BucketEmpty>
        <BucketEmptyIcon aria-hidden>
          <FontAwesomeIcon icon={faCheck} />
        </BucketEmptyIcon>
        <EmptyTitle>No pools this round</EmptyTitle>
        <EmptyBody>
          Every reward was over 1 ENS this round, so they all went out directly to wallets.
        </EmptyBody>
      </BucketEmpty>
    )
  }

  return (
    <BucketEmpty>
      <BucketEmptyIcon aria-hidden>
        <FontAwesomeIcon icon={faHourglassHalf} />
      </BucketEmptyIcon>
      <EmptyTitle>This round hasn’t drawn yet</EmptyTitle>
      <EmptyBody>
        Round {round.roundNumber} is still {round.status}. Pools draw the moment the round closes.
      </EmptyBody>
    </BucketEmpty>
  )
}

export function LotteryPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const walletState = useWalletState()
  const walletAddress = getWalletAddress(walletState)
  const searchedAddress = searchParams.get('address') ?? ''
  const activeAddress = searchedAddress
  const activeAddressValid = activeAddress ? isAddress(activeAddress) : false
  const selectedRoundNumber = parsePositiveInteger(searchParams.get('round')) ?? undefined
  const bucketParam = searchParams.get('bucket')

  const [addressInput, setAddressInput] = useState(searchedAddress)
  const [inputError, setInputError] = useState<string | null>(null)
  const hasPrefilledRef = useRef(false)
  const userClearedRef = useRef(false)

  const { data, loading, error, execute } = useLottery(
    activeAddressValid ? activeAddress : undefined,
    selectedRoundNumber,
  )

  const fetchAddressHistory = useCallback(async () => {
    if (!activeAddressValid) return null
    return api.distributionsForAddress(activeAddress)
  }, [activeAddress, activeAddressValid])
  const addressHistory = useAsync(fetchAddressHistory, activeAddressValid)

  useEffect(() => {
    if (hasPrefilledRef.current) return
    if (userClearedRef.current) return
    if (!walletAddress || searchedAddress) return
    hasPrefilledRef.current = true
    setAddressInput(walletAddress)
    setSearchParams(
      (p) => {
        p.set('address', walletAddress)
        return p
      },
      { replace: true },
    )
  }, [walletAddress, searchedAddress, setSearchParams])

  useEffect(() => {
    setAddressInput(searchedAddress)
    setInputError(null)
  }, [searchedAddress])

  function handleSubmit(addressOverride?: string) {
    const next = (addressOverride ?? addressInput).trim()
    if (!next) {
      handleClear()
      return
    }
    if (!isAddress(next)) {
      setInputError('Invalid address')
      return
    }
    userClearedRef.current = false
    setSearchParams((p) => {
      p.set('address', next)
      return p
    })
  }

  function handleClear() {
    userClearedRef.current = true
    setSearchParams((p) => {
      p.delete('address')
      return p
    })
    setAddressInput('')
    setInputError(null)
  }

  function handleUseWallet() {
    if (!walletAddress) return
    userClearedRef.current = false
    setAddressInput(walletAddress)
    handleSubmit(walletAddress)
  }

  function handleSelectBucket(bucketNumber: number | 'all') {
    const href = buildLotteryHref(searchParams, {
      round: data?.round.roundNumber,
      bucket: bucketNumber,
    })
    navigate(href)
  }

  function handleSelectRound(roundNumber: number) {
    const href = buildLotteryHref(searchParams, {
      round: roundNumber,
      bucket: null,
    })
    navigate(href)
  }

  if (loading) {
    return <LotteryPageSkeleton />
  }

  if (error) {
    return (
      <Page>
        <ErrorMessage>
          Could not load lottery data. <button onClick={execute}>Try again</button>
        </ErrorMessage>
      </Page>
    )
  }

  if (!data) {
    return (
      <Page>
        <HeaderBlock>
          <EyebrowPill>Lottery</EyebrowPill>
          <PageTitle>No rounds yet</PageTitle>
          <Description>
            Pools and winners will show up here once the first round closes.
          </Description>
        </HeaderBlock>
      </Page>
    )
  }

  const { round, rounds } = data
  const bucketCount = round.lottery?.bucketCount ?? round.lotteryBucketCount ?? 0
  const entryCount = round.lottery?.entryCount ?? round.lotteryEntryCount ?? 0
  const bucketTargetEns = round.lottery?.bucketTargetEns
    ? `${formatEnsAmount(round.lottery.bucketTargetEns, { maximumFractionDigits: 0 })} ENS`
    : '10 ENS'

  const progressPct = progressPercent(round.startDate, round.endDate)
  const drawLabel = formatTimeToDraw(round)

  const showWalletHint =
    Boolean(walletAddress) &&
    !addressInput.trim() &&
    !activeAddress &&
    addressInput !== walletAddress

  const showActivePill =
    Boolean(activeAddress) && activeAddressValid && activeAddress === walletAddress

  const personalResult = activeAddress
    ? buildPersonalResult({
        round,
        activeAddress,
        activeAddressValid,
        onJumpToBucket: handleSelectBucket,
      })
    : null

  const addressError = inputError || (activeAddress && !activeAddressValid ? 'Invalid address' : null)

  const rows = buildRoundsRows(
    rounds,
    activeAddress,
    addressHistory.data?.rounds ?? null,
    addressHistory.loading,
    addressHistory.error,
  )
  const tableEmpty = rows.length === 0

  const selectedBucket = getSelectedBucket(round.lottery, bucketParam, activeAddress)
  const hasPools = Boolean(round.lottery && round.lottery.buckets.length > 0)
  const noAddressInspected = !activeAddress || !activeAddressValid

  return (
    <Page>
      <HeaderBlock>
        <EyebrowPill>
          <span>Lottery</span>
          <EyebrowSep aria-hidden>·</EyebrowSep>
          <span>Round {round.roundNumber}</span>
          <EyebrowDot $status={round.status} aria-hidden />
        </EyebrowPill>
        <PageTitle>Pool prizes</PageTitle>
        <Description>
          Rewards under 1 ENS go into shared pools of {bucketTargetEns}. Each pool draws one winner. The more you earned, the better your odds.
        </Description>
      </HeaderBlock>

      <SummaryBlock>
        <StatsRow>
          <StatCard>
            <StatTopRow>
              <StatValue $tone="positive">{bucketTargetEns}</StatValue>
              <StatIconBox aria-hidden>
                <FontAwesomeIcon icon={faTrophy} />
              </StatIconBox>
            </StatTopRow>
            <StatLabel>Prize per pool</StatLabel>
          </StatCard>
          <StatCard>
            <StatTopRow>
              <StatValue>{bucketCount.toLocaleString('en-US')}</StatValue>
              <StatIconBox aria-hidden>
                <FontAwesomeIcon icon={faLayerGroup} />
              </StatIconBox>
            </StatTopRow>
            <StatLabel>{bucketCount === 1 ? 'Pool this round' : 'Pools this round'}</StatLabel>
          </StatCard>
          <StatCard>
            <StatTopRow>
              <StatValue>{entryCount.toLocaleString('en-US')}</StatValue>
              <StatIconBox aria-hidden>
                <FontAwesomeIcon icon={faUsers} />
              </StatIconBox>
            </StatTopRow>
            <StatLabel>{entryCount === 1 ? 'Entry' : 'Entries'}</StatLabel>
          </StatCard>
        </StatsRow>

        <ProgressBlock>
          <ProgressTrack>
            <ProgressFill $pct={progressPct} />
          </ProgressTrack>
          <BarLabels>
            <BarLabel>Started {formatUtcDate(round.startDate, { year: 'numeric' })}</BarLabel>
            <BarEndGroup>
              <TimeLeft $status={round.status}>{drawLabel}</TimeLeft>
              <Dot aria-hidden />
              <BarLabel>Ends {formatUtcDate(round.endDate, { year: 'numeric' })}</BarLabel>
            </BarEndGroup>
          </BarLabels>
        </ProgressBlock>
      </SummaryBlock>

      <InspectCard>
        <InspectHeader>
          <InspectLabel>Check a wallet</InspectLabel>
          <SearchRow>
            <SearchInputWrap>
              <SearchIcon aria-hidden>
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </SearchIcon>
              <SearchInput
                type="text"
                placeholder="Paste an ENS name or 0x address…"
                value={addressInput}
                $hasError={Boolean(addressError)}
                onChange={(e) => {
                  setAddressInput(e.target.value)
                  if (inputError) setInputError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit()
                }}
                aria-label="Search by ENS name or address"
              />
            </SearchInputWrap>
            <ActionButtons>
              <SearchButton type="button" onClick={() => handleSubmit()} disabled={!addressInput.trim()}>
                <FontAwesomeIcon icon={faMagnifyingGlass} />
                Search
              </SearchButton>
              {(addressInput || activeAddress) && (
                <ClearButton type="button" onClick={handleClear}>
                  <FontAwesomeIcon icon={faXmark} />
                  Clear
                </ClearButton>
              )}
            </ActionButtons>
          </SearchRow>

          {(showWalletHint || showActivePill || addressError) && (
            <HintRow>
              {showWalletHint && (
                <>
                  <HintText>or</HintText>
                  <UseMyWalletPill type="button" onClick={handleUseWallet}>
                    <FontAwesomeIcon icon={faWallet} />
                    Use my connected wallet
                  </UseMyWalletPill>
                </>
              )}
              {showActivePill && (
                <ActiveAddressPill>
                  <FontAwesomeIcon icon={faWallet} />
                  Checking your connected wallet · {truncateAddress(walletAddress)}
                </ActiveAddressPill>
              )}
              {addressError && <InputError>{addressError}</InputError>}
            </HintRow>
          )}
        </InspectHeader>

        {personalResult && (
          <ResultStrip $tone={personalResult.tone} role="status">
            <ResultIcon $tone={personalResult.tone} aria-hidden>
              <FontAwesomeIcon
                icon={
                  personalResult.tone === 'success'
                    ? faTrophy
                    : personalResult.tone === 'warning'
                      ? faHourglassHalf
                      : personalResult.tone === 'pending'
                        ? faHourglassHalf
                        : faCheck
                }
              />
            </ResultIcon>
            <ResultTextStack>
              <ResultTitle>{personalResult.title}</ResultTitle>
              <ResultBody>{personalResult.body}</ResultBody>
            </ResultTextStack>
            {personalResult.action && (
              <ResultAction type="button" onClick={personalResult.action.onClick}>
                {personalResult.action.label}
                <FontAwesomeIcon icon={faArrowRight} />
              </ResultAction>
            )}
          </ResultStrip>
        )}

        <TableCard>
          <TableHeadRow>
            <TableHeadCell $weight={0.9}>Round</TableHeadCell>
            <TableHeadCell>Pools</TableHeadCell>
            <TableHeadCell>Entries</TableHeadCell>
            <TableHeadCell $weight={1.3}>Your result</TableHeadCell>
            <TableHeadCell $weight={0.8}>Status</TableHeadCell>
            <TableHeadCell $weight={0.25}>{' '}</TableHeadCell>
          </TableHeadRow>

          {tableEmpty ? (
            <TableEmpty>
              <EmptyTitle>No round history yet</EmptyTitle>
              <EmptyBody>
                Once the first round closes, you’ll see its pools and winners here.
              </EmptyBody>
            </TableEmpty>
          ) : (
            rows.map((row, idx) => {
              const isActiveRow = row.roundNumber === round.roundNumber
              return (
                <Fragment key={`${row.roundNumber}:${activeAddress || 'none'}`}>
                  <TableRow
                    type="button"
                    $clickable
                    $active={isActiveRow}
                    $index={idx}
                    onClick={() => handleSelectRound(row.roundNumber)}
                    aria-expanded={isActiveRow}
                  >
                    <TableCell $weight={0.9} $primary>
                      <MobileLabel>Round</MobileLabel>
                      <RoundNumber>Round {row.roundNumber}</RoundNumber>
                    </TableCell>
                    <TableCell>
                      <MobileLabel>Pools</MobileLabel>
                      {row.buckets ? <span>{row.buckets}</span> : <MutedCell>—</MutedCell>}
                    </TableCell>
                    <TableCell>
                      <MobileLabel>Entries</MobileLabel>
                      {row.entries ? <span>{row.entries}</span> : <MutedCell>—</MutedCell>}
                    </TableCell>
                    <TableCell $weight={1.3}>
                      <MobileLabel>Your result</MobileLabel>
                      {!row.hasAddress ? (
                        <MutedCell>Check a wallet</MutedCell>
                      ) : addressHistory.loading && row.yourResult.label === 'Loading…' ? (
                        <SkeletonBlock $height="14px" $width="84px" $radius="6px" />
                      ) : row.yourResult.label == null ? (
                        <MutedCell>—</MutedCell>
                      ) : row.yourResult.tone === 'positive' ? (
                        <RewardPositive>{row.yourResult.label}</RewardPositive>
                      ) : row.yourResult.tone === 'muted' ? (
                        <MutedCell>{row.yourResult.label}</MutedCell>
                      ) : (
                        <span>{row.yourResult.label}</span>
                      )}
                    </TableCell>
                    <TableCell $weight={0.8}>
                      <MobileLabel>Status</MobileLabel>
                      <StatusPill $status={row.status}>{row.status}</StatusPill>
                    </TableCell>
                    <ChevronCell $weight={0.25} $expanded={isActiveRow} aria-hidden>
                      <FontAwesomeIcon icon={isActiveRow ? faChevronDown : faChevronRight} />
                    </ChevronCell>
                  </TableRow>
                  {isActiveRow ? (
                    <ExpandedPanel>
                      {hasPools ? (
                        <BucketDetailPanel
                          round={round}
                          bucket={selectedBucket}
                          activeAddress={activeAddress}
                          searchParams={searchParams}
                          onSelectBucket={handleSelectBucket}
                        />
                      ) : (
                        <BucketDetailFallback round={round} />
                      )}
                    </ExpandedPanel>
                  ) : null}
                </Fragment>
              )
            })
          )}

          {!tableEmpty && noAddressInspected && (
            <TableEmpty>
              <EmptyIcon aria-hidden>
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </EmptyIcon>
              <EmptyTitle>Check a wallet to see its pool history</EmptyTitle>
              <EmptyBody>
                Paste an ENS name or 0x address above
                {walletAddress ? ', or use your connected wallet,' : ''}
                {' '}to see which pools it entered and what it won.
              </EmptyBody>
            </TableEmpty>
          )}
        </TableCard>
      </InspectCard>
    </Page>
  )
}
