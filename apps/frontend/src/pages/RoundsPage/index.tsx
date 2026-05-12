import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { isAddress } from 'viem'
import { api, ApiClientError } from '@/api'
import type { AddressDistributionRound, RoundStatus, RoundSummary } from '@/api/types'
import { RoundsPageSkeleton } from '@/components/shared/PageSkeletons'
import { useAsync } from '@/hooks/useAsync'
import { useRounds } from '@/features/rounds/useRounds'
import { useWalletState } from '@/features/wallet/useWalletState'
import { tokens, fadeInUp, Eyebrow, PageTitle, ErrorMessage } from '@/styles'
import { formatEnsAmount, formatUtcDate, formatUtcMonthRange } from '@/utils/format'
import { TierTable } from './components/TierTable'
import { RoundCard } from './components/RoundCard'
import {
  RoundHistoryTable,
  type RoundHistoryEntry,
} from './components/RoundHistoryTable'
import { AddressLookupForm } from './components/AddressLookupForm'
import {
  buildRoundListFromCurrentRound,
  buildUnavailableAddressHistory,
} from './roundFallback'

const Page = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
  animation: ${fadeInUp} 0.4s ease both;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['4xl']} ${tokens.spacing['2xl']};
  }
`

const HeaderBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
  min-width: 0;
`

const HeadingRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.lg};
  flex-wrap: wrap;
`

const RoundsPageTitle = styled(PageTitle)`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.darkBlue};

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['5xl']};
  }
`

const livePulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(26, 127, 55, 0.5); }
  60%       { box-shadow: 0 0 0 6px rgba(26, 127, 55, 0); }
`

const StatusBadge = styled.span<{ $status: RoundStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: ${({ $status }) =>
    $status === 'live'
      ? tokens.color.tierHighlight
      : $status === 'paid'
        ? tokens.color.tierHighlight
        : tokens.color.borderLight};
  color: ${({ $status }) =>
    $status === 'live' || $status === 'paid'
      ? tokens.color.positiveEmphasis
      : tokens.color.darkGray};
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.black};
  padding: 6px 18px 6px 12px;
  border-radius: ${tokens.radius.sm};
  line-height: 1.2;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['5xl']};
  }
`

const LiveDot = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${tokens.color.positiveEmphasis};
  flex-shrink: 0;
  animation: ${livePulse} 1.8s ease-in-out infinite;

  @media (min-width: 768px) {
    width: 14px;
    height: 14px;
  }
`

const EmptyState = styled.p`
  margin: 0;
  color: ${tokens.color.darkGray};
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing['3xl']};
  min-width: 0;

  @media (min-width: 1024px) {
    grid-template-columns: 2fr minmax(280px, 1fr);
  }
`

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
  min-width: 0;
`

const AddressPanel = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
  min-width: 0;
`

function formatDaysRemaining(daysRemaining: number | null): string {
  if (daysRemaining == null) return 'Pending'
  if (daysRemaining === 1) return '1 day'
  return `${daysRemaining} days`
}

function formatEnsCell(value: string | null, emptyValue: string, maximumFractionDigits = 4): string {
  if (value == null) return emptyValue
  return `${formatEnsAmount(value, { maximumFractionDigits })} ENS`
}

function buildRoundHistory(
  rounds: RoundSummary[],
  activeAddress: string,
  addressRounds: AddressDistributionRound[] | null,
  addressLoading: boolean,
  addressError: string | null,
): RoundHistoryEntry[] {
  const addressQuery = activeAddress && isAddress(activeAddress)
    ? `?address=${encodeURIComponent(activeAddress)}`
    : ''
  const rewardsByRound = new Map(
    (addressRounds ?? []).map((round) => [round.roundNumber, round]),
  )

  return rounds.map((round) => ({
    roundNumber: round.roundNumber,
    dates: formatUtcMonthRange(round.startDate, round.endDate),
    pool: formatEnsCell(round.poolSizeEns, 'Unavailable', 0),
    vpGrowth: formatVpGrowth(round.vpGrowthPct),
    lottery: formatLotteryCell(round),
    yourRewards: formatRewardCell({
      activeAddress,
      addressRound: rewardsByRound.get(round.roundNumber) ?? null,
      addressLoading,
      addressError,
      fallbackStatus: round.distributionDataStatus,
    }),
    to: `/rounds/${round.roundNumber}${addressQuery}`,
  }))
}

function formatLotteryCell(round: RoundSummary): string {
  if (round.distributionDataStatus === 'in_progress' || round.distributionDataStatus === 'not_started') {
    return 'Pending'
  }

  if (round.lotteryEntryCount == null || round.lotteryWinnerCount == null) {
    return 'Unavailable'
  }

  const buckets = round.lotteryBucketCount?.toLocaleString('en-US') ?? '0'
  const entries = round.lotteryEntryCount.toLocaleString('en-US')
  const winners = round.lotteryWinnerCount.toLocaleString('en-US')
  return `${buckets} buckets / ${entries} entries / ${winners} unique winners`
}

function formatVpGrowth(value: string | null): string {
  if (value == null) return 'Unavailable'
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 'Unavailable'
  if (numericValue > 0) return `+${numericValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
  return `${numericValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
}

function formatRewardCell({
  activeAddress,
  addressRound,
  addressLoading,
  addressError,
  fallbackStatus,
}: {
  activeAddress: string
  addressRound: AddressDistributionRound | null
  addressLoading: boolean
  addressError: string | null
  fallbackStatus: RoundSummary['distributionDataStatus']
}): string {
  if (!activeAddress || !isAddress(activeAddress)) return 'No address'
  if (addressLoading) return 'Loading'
  if (addressError) return 'Unavailable'
  if (!addressRound) {
    return fallbackStatus === 'in_progress' || fallbackStatus === 'not_started'
      ? 'Pending'
      : 'Unavailable'
  }

  if (addressRound.rewardStatus === 'pending') return 'Pending'
  if (addressRound.rewardStatus === 'unavailable') return 'Unavailable'
  if (addressRound.rewardStatus === 'not_eligible' || addressRound.rewardStatus === 'no_reward') {
    return '0 ENS'
  }

  return `${formatEnsAmount(addressRound.totalRewardEns, {
    maximumFractionDigits: 4,
    signDisplay: 'exceptZero',
  })} ENS`
}

function getWalletAddress(walletState: ReturnType<typeof useWalletState>): string {
  if (walletState.status === 'disconnected') return ''
  return walletState.address
}

function isLegacyEndpointError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 404
}

function selectFeaturedRound(rounds: RoundSummary[]): RoundSummary | null {
  return rounds.find((round) => round.isCurrent)
    ?? rounds.find((round) => round.status === 'pending')
    ?? rounds[0]
    ?? null
}

function headingStatus(status: RoundStatus): string {
  if (status === 'live') return 'live'
  if (status === 'paid') return 'paid'
  if (status === 'pending') return 'pending'
  return 'ended'
}

export function RoundsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const walletState = useWalletState()
  const walletAddress = getWalletAddress(walletState)
  const searchedAddress = searchParams.get('address') ?? ''
  const activeAddress = searchedAddress || walletAddress
  const [addressInput, setAddressInput] = useState(activeAddress)
  const [inputError, setInputError] = useState<string | null>(null)

  const { data: tierData, loading: tiersLoading, error: tiersError } = useRounds()
  const fetchRounds = useCallback(async () => {
    try {
      return await api.rounds()
    } catch (error) {
      if (!isLegacyEndpointError(error)) throw error

      const currentRound = await api.currentRound()
      return buildRoundListFromCurrentRound(currentRound)
    }
  }, [])
  const roundList = useAsync(fetchRounds)

  const activeAddressValid = activeAddress ? isAddress(activeAddress) : false
  const fetchAddressHistory = useCallback(
    async () => {
      try {
        const history = await api.distributionsForAddress(activeAddress)
        if (!('rounds' in history)) {
          return buildUnavailableAddressHistory(activeAddress, roundList.data?.rounds ?? [])
        }
        return history
      } catch (error) {
        if (!isLegacyEndpointError(error)) throw error

        return buildUnavailableAddressHistory(activeAddress, roundList.data?.rounds ?? [])
      }
    },
    [activeAddress, roundList.data],
  )
  const addressHistory = useAsync(
    fetchAddressHistory,
    Boolean(activeAddress && activeAddressValid && roundList.data),
  )

  useEffect(() => {
    setAddressInput(activeAddress)
    setInputError(null)
  }, [activeAddress])

  const currentRound = useMemo(() => {
    const rounds = roundList.data?.rounds ?? []
    return selectFeaturedRound(rounds)
  }, [roundList.data])

  const roundHistory = useMemo(
    () => buildRoundHistory(
      roundList.data?.rounds ?? [],
      activeAddress,
      addressHistory.data?.rounds ?? null,
      addressHistory.loading,
      addressHistory.error,
    ),
    [roundList.data, activeAddress, addressHistory.data, addressHistory.loading, addressHistory.error],
  )

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

  if (tiersLoading || roundList.loading) {
    return <RoundsPageSkeleton />
  }

  if (tiersError || roundList.error) {
    return (
      <Page>
        <ErrorMessage>Failed to load rounds data: {tiersError ?? roundList.error}</ErrorMessage>
      </Page>
    )
  }

  if (!tierData || !roundList.data) return null

  if (!currentRound) {
    return (
      <Page>
        <HeaderBlock>
          <Eyebrow>Rounds</Eyebrow>
          <RoundsPageTitle>No rounds configured</RoundsPageTitle>
          <EmptyState>Round history is unavailable.</EmptyState>
        </HeaderBlock>
      </Page>
    )
  }

  const currentTierIndex = currentRound.tierIndex ?? tierData.currentTierIndex
  const currentTier = tierData.tiers[currentTierIndex] ?? tierData.tiers[tierData.currentTierIndex]
  const sourceLabel = searchedAddress
    ? 'Searched address'
    : walletAddress
      ? 'Connected wallet'
      : 'No address selected'
  const addressError = inputError || (activeAddress && !activeAddressValid ? 'Invalid address' : null)

  return (
    <Page>
      <HeaderBlock>
        <Eyebrow>Rounds</Eyebrow>
        <HeadingRow>
          <RoundsPageTitle aria-label={`Round ${currentRound.roundNumber} is ${currentRound.status}`}>
            Round {currentRound.roundNumber} is
          </RoundsPageTitle>
          <StatusBadge $status={currentRound.status} aria-hidden="true">
            {currentRound.status === 'live' ? <LiveDot /> : null}
            {headingStatus(currentRound.status)}
          </StatusBadge>
        </HeadingRow>
        <AddressPanel>
          <Eyebrow>Inspect Address</Eyebrow>
          <AddressLookupForm
            value={addressInput}
            activeAddress={activeAddress}
            sourceLabel={sourceLabel}
            error={addressError}
            onChange={setAddressInput}
            onSubmit={handleAddressSubmit}
            onClear={handleAddressClear}
          />
        </AddressPanel>
      </HeaderBlock>

      <Grid>
        <LeftColumn>
          <RoundCard
            roundNumber={currentRound.roundNumber}
            status={currentRound.status}
            percentComplete={currentRound.percentComplete ?? 0}
            startDate={formatUtcDate(currentRound.startDate, { year: 'numeric' })}
            endDate={formatUtcDate(currentRound.endDate, { year: 'numeric' })}
            timeLeft={formatDaysRemaining(currentRound.daysRemaining)}
            poolSizeEns={currentRound.poolSizeEns ?? '0'}
            currentTier={currentRound.tierLabel ?? `Tier #${currentTierIndex + 1}`}
            currentApyPct={currentTier?.estimatedApyPct ?? '0'}
          />
          <RoundHistoryTable entries={roundHistory} />
        </LeftColumn>
        <TierTable tiers={tierData.tiers} currentTierIndex={currentTierIndex} />
      </Grid>
    </Page>
  )
}
