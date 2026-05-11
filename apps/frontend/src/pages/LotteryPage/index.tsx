import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import { Button, Spinner } from '@ensdomains/thorin'
import { isAddress } from 'viem'
import { fadeInUp } from '@/styles'
import { useLottery } from '@/features/lottery/useLottery'
import { useWalletState } from '@/features/wallet/useWalletState'
import { CopyableAddress } from '@/components/shared/CopyableAddress'
import { StepList } from '@/components/shared/StepList'
import { TrophyIcon } from '@/components/shared/icons/TrophyIcon'
import type {
  LotteryBucketDetail,
  LotteryDetail,
  LotteryEntryDetail,
  RoundDetailResponse,
  RoundSummary,
} from '@/api/types'
import { formatEnsAmount, formatUtcMonthRange } from '@/utils/format'
import { tokens } from '@/styles/tokens'
import { AddressLookupForm } from '@/pages/RoundsPage/components/AddressLookupForm'

type StatusTone = 'neutral' | 'success' | 'warning' | 'pending' | 'error'

interface AddressLotteryEntry {
  bucket: LotteryBucketDetail
  entry: LotteryEntryDetail
  won: boolean
}

interface StatusMetric {
  label: string
  value: string
}

interface AddressLotteryStatus {
  tone: StatusTone
  title: string
  body: string
  metrics: StatusMetric[]
}

const Page = styled.div`
  width: 100%;
  animation: ${fadeInUp} 0.4s ease both;
`

const HeaderBand = styled.section`
  width: 100%;
  background: linear-gradient(to bottom, ${tokens.color.lightBlue}, ${tokens.color.white});
  border-bottom: 1px solid ${tokens.color.borderLight};
`

const HeaderContent = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl} ${tokens.spacing['3xl']};
  display: grid;
  gap: ${tokens.spacing.lg};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['6xl']} ${tokens.spacing['2xl']} ${tokens.spacing['4xl']};
  }
`

const Eyebrow = styled.span`
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  letter-spacing: 0;
  text-transform: uppercase;
`

const Title = styled.h1`
  margin: 0;
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size['4xl']};
  font-weight: ${tokens.font.weight.black};
  line-height: 1.1;
  letter-spacing: 0;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['5xl']};
  }
`

const Description = styled.p`
  max-width: 760px;
  margin: 0;
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.lg};
  line-height: 1.6;
`

const CurrentRoundNote = styled.p`
  margin: 0;
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.base};
  line-height: 1.5;
`

const Content = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  padding: ${tokens.spacing['3xl']} ${tokens.spacing.xl} ${tokens.spacing['7xl']};
  display: grid;
  gap: ${tokens.spacing['3xl']};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['4xl']} ${tokens.spacing['2xl']} ${tokens.spacing['7xl']};
  }
`

const TopGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${tokens.spacing.lg};

  @media (min-width: 980px) {
    grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
    align-items: start;
  }
`

const Panel = styled.section`
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.surface};
  box-shadow: ${tokens.shadow.sm};
  padding: ${tokens.spacing['2xl']};
  display: grid;
  gap: ${tokens.spacing.lg};
  min-width: 0;
`

const StatusPanel = styled(Panel)<{ $tone: StatusTone }>`
  border-color: ${({ $tone }) => {
    if ($tone === 'success') return tokens.color.positiveEmphasis
    if ($tone === 'warning') return tokens.color.orange
    if ($tone === 'pending') return tokens.color.blue
    if ($tone === 'error') return tokens.color.negative
    return tokens.color.borderLight
  }};
  background: ${({ $tone }) => {
    if ($tone === 'success') return tokens.color.tierHighlight
    if ($tone === 'warning') return tokens.color.lightOrange
    if ($tone === 'pending') return tokens.color.lightBlue
    if ($tone === 'error') return '#FEE9F0'
    return tokens.color.surface
  }};
`

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: ${tokens.spacing.md};
  flex-wrap: wrap;
`

const PanelTitle = styled.h2`
  margin: 0;
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  line-height: 1.25;
`

const PanelBody = styled.p`
  margin: 0;
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.base};
  line-height: 1.6;
`

const RoundPill = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 ${tokens.spacing.md};
  border: 1px solid ${tokens.color.middleGray};
  border-radius: ${tokens.radius.pill};
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  white-space: nowrap;
`

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${tokens.spacing.md};

  @media (min-width: 680px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

const StatusMetricGrid = styled(StatGrid)`
  @media (min-width: 680px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

const Stat = styled.div`
  display: grid;
  gap: 4px;
  min-width: 0;
`

const StatValue = styled.span`
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  line-height: 1.2;
  overflow-wrap: anywhere;
`

const StatLabel = styled.span`
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
  line-height: 1.4;
`

const AddressPanel = styled(Panel)`
  align-content: start;
`

const TrophyMark = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.tierHighlight};
  border: 1px solid ${tokens.color.positiveEmphasis};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const LinkRow = styled.div`
  display: flex;
  gap: ${tokens.spacing.md};
  flex-wrap: wrap;
  align-items: center;
`

const TextLink = styled(Link)`
  color: ${tokens.color.blue};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const HowItWorksBox = styled(Panel)`
  max-width: 760px;
`

const TableWrap = styled.div`
  width: 100%;
  overflow-x: auto;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  min-width: 760px;
`

const Th = styled.th`
  padding: ${tokens.spacing.sm} ${tokens.spacing.md};
  text-align: left;
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0;
  border-bottom: 1px solid ${tokens.color.borderLight};
`

const Td = styled.td`
  padding: ${tokens.spacing.md};
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.base};
  border-bottom: 1px solid ${tokens.color.borderLight};
  vertical-align: middle;
  overflow-wrap: anywhere;
`

const Tr = styled.tr<{ $highlight?: boolean }>`
  background: ${({ $highlight }) => ($highlight ? tokens.color.lightBlue : 'transparent')};
`

const RewardValue = styled.span`
  color: ${tokens.color.positiveEmphasis};
  font-weight: ${tokens.font.weight.bold};
  white-space: nowrap;
`

const EmptyState = styled.div`
  border: 1px dashed ${tokens.color.borderLight};
  border-radius: ${tokens.radius.sm};
  padding: ${tokens.spacing['3xl']};
  color: ${tokens.color.darkGray};
  line-height: 1.6;
  text-align: center;
`

const LoadingWrap = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 320px;
`

const ErrorCard = styled(Panel)`
  max-width: 680px;
  border-color: #FBCDD8;
  background: #FEE9F0;
`

const HOW_IT_WORKS_STEPS = [
  'The final distribution combines delegate and token-holder rewards. Addresses below 1 ENS enter the lottery instead of receiving a direct payout.',
  'Entries are grouped into multiple buckets targeting about 10 ENS. Each bucket has its own winner and prize.',
  'Odds are weighted by the original sub-1 ENS amount, then the paid round uses prevRandao and keccak256(prevRandao, bucketIndex).',
]

function getWalletAddress(walletState: ReturnType<typeof useWalletState>): string {
  if (walletState.status === 'disconnected') return ''
  return walletState.address
}

function formatEns(value: string | null | undefined, empty = 'Unavailable', maximumFractionDigits = 4): string {
  if (value == null) return empty
  return `${formatEnsAmount(value, { maximumFractionDigits })} ENS`
}

function formatCount(value: number | null | undefined, empty = 'Unavailable'): string {
  return value == null ? empty : value.toLocaleString('en-US')
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

function formatBlockNumber(value: string): string {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return value
  return `#${numericValue.toLocaleString('en-US')}`
}

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
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

function bucketList(entries: AddressLotteryEntry[]): string {
  const buckets = [...new Set(entries.map((item) => item.bucket.bucketIndex + 1))]
  return buckets.map((bucket) => `#${bucket}`).join(', ')
}

function hasDirectReward(round: RoundDetailResponse): boolean {
  const reward = round.addressReward
  if (!reward) return false
  return Number(reward.delegateRewardEns) > 0 || Number(reward.tokenHolderRewardEns) > 0
}

function buildRoundPath(round: RoundDetailResponse, activeAddress: string, activeAddressValid: boolean): string {
  const addressQuery = activeAddress && activeAddressValid
    ? `?address=${encodeURIComponent(activeAddress)}`
    : ''
  return `/rounds/${round.roundNumber}${addressQuery}`
}

function buildAddressStatus(
  round: RoundDetailResponse,
  activeAddress: string,
  activeAddressValid: boolean,
): AddressLotteryStatus {
  if (!activeAddress) {
    return {
      tone: 'neutral',
      title: 'Inspect an address',
      body: 'Connect a wallet or enter any address to see whether it entered or won a bucket in this round.',
      metrics: [
        { label: 'Selected address', value: 'None' },
        { label: 'Lottery entry', value: 'Unknown' },
        { label: 'Lottery reward', value: 'Unknown' },
      ],
    }
  }

  if (!activeAddressValid) {
    return {
      tone: 'error',
      title: 'Invalid address',
      body: 'Enter a valid Ethereum address before checking lottery participation.',
      metrics: [
        { label: 'Selected address', value: 'Invalid' },
        { label: 'Lottery entry', value: 'Unknown' },
        { label: 'Lottery reward', value: 'Unknown' },
      ],
    }
  }

  if (round.distributionDataStatus !== 'available') {
    return {
      tone: 'pending',
      title: 'Lottery pending',
      body: 'This round has not produced final distribution data yet. Lottery entries and winners are only final after the round closes.',
      metrics: [
        { label: 'Round status', value: round.status },
        { label: 'Lottery entry', value: 'Pending' },
        { label: 'Lottery reward', value: 'Pending' },
      ],
    }
  }

  if (!round.lottery) {
    return {
      tone: 'neutral',
      title: 'No lottery data',
      body: 'This paid round does not have lottery buckets available.',
      metrics: [
        { label: 'Lottery entry', value: 'Unavailable' },
        { label: 'Buckets', value: '0' },
        { label: 'Lottery reward', value: '0 ENS' },
      ],
    }
  }

  const entries = getAddressLotteryEntries(round.lottery, activeAddress)
  const winningEntries = entries.filter((item) => item.won)

  if (winningEntries.length > 0) {
    return {
      tone: 'success',
      title: winningEntries.length === 1
        ? `Won bucket #${winningEntries[0].bucket.bucketIndex + 1}`
        : `Won ${winningEntries.length} buckets`,
      body: 'This address was selected in the final deterministic lottery for the selected paid round.',
      metrics: [
        { label: 'Lottery reward', value: formatEns(round.addressReward?.lotteryRewardEns, '0 ENS') },
        { label: 'Buckets won', value: bucketList(winningEntries) },
        { label: 'Best weighted odds', value: bestEntryProbability(winningEntries) },
      ],
    }
  }

  if (entries.length > 0) {
    return {
      tone: 'warning',
      title: 'Entered lottery, not selected',
      body: 'This address had a sub-1 ENS calculated reward and entered one or more lottery buckets, but another entry won each bucket.',
      metrics: [
        { label: 'Buckets entered', value: bucketList(entries) },
        { label: 'Entry amount', value: sumEntryAmountEns(entries) },
        { label: 'Best weighted odds', value: bestEntryProbability(entries) },
      ],
    }
  }

  if (hasDirectReward(round)) {
    return {
      tone: 'success',
      title: 'Direct payout, no lottery entry',
      body: 'This address received at least 1 ENS directly, so it did not need to enter the lottery for this round.',
      metrics: [
        { label: 'Direct reward', value: formatEns(round.addressReward?.totalRewardEns, '0 ENS') },
        { label: 'Lottery entry', value: 'No' },
        { label: 'Lottery reward', value: '0 ENS' },
      ],
    }
  }

  return {
    tone: 'neutral',
    title: 'No lottery entry for this round',
    body: 'This address was not present in the final lottery entries for the selected paid round.',
    metrics: [
      { label: 'Lottery entry', value: 'No' },
      { label: 'Buckets entered', value: '0' },
      { label: 'Lottery reward', value: '0 ENS' },
    ],
  }
}

function getCurrentRoundNote(currentRound: RoundSummary | undefined, selectedRound: RoundDetailResponse): string | null {
  if (!currentRound || currentRound.roundNumber === selectedRound.roundNumber) return null
  if (currentRound.status !== 'live') return null
  return `Current Round ${currentRound.roundNumber} is live. Its lottery entries will be finalized after ${formatUtcMonthRange(currentRound.startDate, currentRound.endDate)}.`
}

function HeaderBlock({
  round,
  currentRound,
}: {
  round?: RoundDetailResponse
  currentRound?: RoundSummary
}) {
  const currentRoundNote = round ? getCurrentRoundNote(currentRound, round) : null

  return (
    <HeaderBand>
      <HeaderContent>
        <Eyebrow>Lottery</Eyebrow>
        <Title>Lottery buckets</Title>
        <Description>
          Sub-1 ENS rewards are grouped into multiple prize buckets. Each bucket has its own winner,
          prize amount, and weighted odds.
        </Description>
        {round ? (
          <CurrentRoundNote>
            Showing Round {round.roundNumber}: {formatUtcMonthRange(round.startDate, round.endDate)}.
            {currentRoundNote ? ` ${currentRoundNote}` : ''}
          </CurrentRoundNote>
        ) : null}
      </HeaderContent>
    </HeaderBand>
  )
}

function StatusMetrics({ metrics }: { metrics: StatusMetric[] }) {
  return (
    <StatusMetricGrid>
      {metrics.map((metric) => (
        <Stat key={metric.label}>
          <StatValue>{metric.value}</StatValue>
          <StatLabel>{metric.label}</StatLabel>
        </Stat>
      ))}
    </StatusMetricGrid>
  )
}

function LotterySummary({ round }: { round: RoundDetailResponse }) {
  const lottery = round.lottery

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>Round {round.roundNumber} results</PanelTitle>
          <PanelBody>{formatUtcMonthRange(round.startDate, round.endDate)}</PanelBody>
        </div>
        <RoundPill>{round.status}</RoundPill>
      </PanelHeader>
      <StatGrid>
        <Stat>
          <StatValue>{formatEns(lottery?.totalPrizeEns ?? round.lotteryPrizeEns, round.status === 'live' ? 'Pending' : 'Unavailable')}</StatValue>
          <StatLabel>Total lottery prizes</StatLabel>
        </Stat>
        <Stat>
          <StatValue>{formatCount(lottery?.bucketCount ?? round.lotteryBucketCount)}</StatValue>
          <StatLabel>Prize buckets</StatLabel>
        </Stat>
        <Stat>
          <StatValue>{formatCount(lottery?.entryCount ?? round.lotteryEntryCount)}</StatValue>
          <StatLabel>Lottery entries</StatLabel>
        </Stat>
        <Stat>
          <StatValue>{formatEns(lottery?.bucketTargetEns, 'Pending')}</StatValue>
          <StatLabel>Approx. bucket target</StatLabel>
        </Stat>
      </StatGrid>
      {lottery ? (
        <StatGrid>
          <Stat>
            <StatValue>{formatCount(lottery.participantCount)}</StatValue>
            <StatLabel>Participating addresses</StatLabel>
          </Stat>
          <Stat>
            <StatValue>{formatCount(lottery.winnerCount)}</StatValue>
            <StatLabel>Winning draws</StatLabel>
          </Stat>
          <Stat>
            <StatValue>{formatBlockNumber(lottery.seed.blockNumber)}</StatValue>
            <StatLabel>Seed block</StatLabel>
          </Stat>
          <Stat>
            <StatValue>{lottery.seed.algorithm}</StatValue>
            <StatLabel>Draw algorithm</StatLabel>
          </Stat>
        </StatGrid>
      ) : null}
    </Panel>
  )
}

function AddressStatusPanel({
  status,
  roundPath,
}: {
  status: AddressLotteryStatus
  roundPath: string
}) {
  return (
    <StatusPanel $tone={status.tone}>
      <PanelHeader>
        <div>
          <PanelTitle>{status.title}</PanelTitle>
          <PanelBody>{status.body}</PanelBody>
        </div>
        <TrophyMark>
          <TrophyIcon size={22} color={tokens.color.positiveEmphasis} />
        </TrophyMark>
      </PanelHeader>
      <StatusMetrics metrics={status.metrics} />
      <LinkRow>
        <TextLink to={roundPath}>Open full round details</TextLink>
      </LinkRow>
    </StatusPanel>
  )
}

function HowItWorksSection() {
  return (
    <HowItWorksBox>
      <PanelTitle>How the draw works</PanelTitle>
      <StepList steps={HOW_IT_WORKS_STEPS} />
      <TextLink to="/transparency">View methodology</TextLink>
    </HowItWorksBox>
  )
}

function LotteryBucketTable({
  buckets,
  activeAddress,
}: {
  buckets: LotteryBucketDetail[]
  activeAddress: string
}) {
  if (buckets.length === 0) {
    return <EmptyState>No lottery buckets are available for this round.</EmptyState>
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Prize buckets</PanelTitle>
        <RoundPill>{buckets.length.toLocaleString('en-US')} bucket{buckets.length === 1 ? '' : 's'}</RoundPill>
      </PanelHeader>
      <TableWrap>
        <Table>
          <colgroup>
            <col style={{ width: '12%' }} />
            <col style={{ width: '32%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '22%' }} />
          </colgroup>
          <thead>
            <tr>
              <Th>Bucket</Th>
              <Th>Winner</Th>
              <Th>Prize</Th>
              <Th>Entries</Th>
              <Th>Winner odds</Th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket) => {
              const activeEntry = activeAddress
                ? bucket.entries.some((entry) => sameAddress(entry.address, activeAddress))
                : false
              return (
                <Tr key={bucket.bucketIndex} $highlight={activeEntry}>
                  <Td>#{bucket.bucketIndex + 1}</Td>
                  <Td>
                    <CopyableAddress
                      address={bucket.winner}
                      ensName={bucket.winnerEnsName}
                      resolveEns={false}
                      showEnsName
                    />
                  </Td>
                  <Td>
                    <RewardValue>{formatEns(bucket.prizeEns)}</RewardValue>
                  </Td>
                  <Td>{bucket.entryCount.toLocaleString('en-US')}</Td>
                  <Td>{formatProbability(bucket.winnerProbability)}</Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
      </TableWrap>
    </Panel>
  )
}

function AddressEntryTable({ entries }: { entries: AddressLotteryEntry[] }) {
  if (entries.length === 0) return null

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Selected address entries</PanelTitle>
        <RoundPill>
          {entries.length.toLocaleString('en-US')} {entries.length === 1 ? 'entry' : 'entries'}
        </RoundPill>
      </PanelHeader>
      <TableWrap>
        <Table>
          <colgroup>
            <col style={{ width: '14%' }} />
            <col style={{ width: '24%' }} />
            <col style={{ width: '24%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '18%' }} />
          </colgroup>
          <thead>
            <tr>
              <Th>Bucket</Th>
              <Th>Entry amount</Th>
              <Th>Weighted odds</Th>
              <Th>Winner</Th>
              <Th>Result</Th>
            </tr>
          </thead>
          <tbody>
            {entries.map((item) => (
              <Tr key={`${item.bucket.bucketIndex}-${item.entry.entryIndex}`} $highlight>
                <Td>#{item.bucket.bucketIndex + 1}</Td>
                <Td>{formatEns(item.entry.amountEns, '0 ENS')}</Td>
                <Td>{formatProbability(item.entry.probability)}</Td>
                <Td>
                  <CopyableAddress
                    address={item.bucket.winner}
                    ensName={item.bucket.winnerEnsName}
                    resolveEns={false}
                    showEnsName
                  />
                </Td>
                <Td>{item.won ? 'Won' : 'Not selected'}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </Panel>
  )
}

export function LotteryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const walletState = useWalletState()
  const walletAddress = getWalletAddress(walletState)
  const searchedAddress = searchParams.get('address') ?? ''
  const activeAddress = searchedAddress || walletAddress
  const activeAddressValid = activeAddress ? isAddress(activeAddress) : false
  const [addressInput, setAddressInput] = useState(activeAddress)
  const [inputError, setInputError] = useState<string | null>(null)

  const { data, loading, error, execute } = useLottery(
    activeAddressValid ? activeAddress : undefined,
  )

  useEffect(() => {
    setAddressInput(activeAddress)
    setInputError(null)
  }, [activeAddress])

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

  const sourceLabel = searchedAddress
    ? 'Searched address'
    : walletAddress
      ? 'Connected wallet'
      : 'No address selected'
  const addressError = inputError || (activeAddress && !activeAddressValid ? 'Invalid address' : null)
  const currentRound = data?.rounds.find((round) => round.isCurrent)

  if (loading) {
    return (
      <Page>
        <HeaderBlock />
        <LoadingWrap>
          <Spinner />
        </LoadingWrap>
      </Page>
    )
  }

  if (error) {
    return (
      <Page>
        <HeaderBlock />
        <Content>
          <ErrorCard>
            <PanelTitle>Could not load lottery data</PanelTitle>
            <PanelBody>Something went wrong while fetching round results from the backend.</PanelBody>
            <Button colorStyle="redSecondary" size="medium" width="auto" onClick={execute}>
              Try again
            </Button>
          </ErrorCard>
          <HowItWorksSection />
        </Content>
      </Page>
    )
  }

  if (!data) {
    return (
      <Page>
        <HeaderBlock />
        <Content>
          <EmptyState>
            No rounds are configured yet. Lottery buckets will appear after a round produces final distribution data.
          </EmptyState>
          <HowItWorksSection />
        </Content>
      </Page>
    )
  }

  const { round } = data
  const addressStatus = buildAddressStatus(round, activeAddress, activeAddressValid)
  const roundPath = buildRoundPath(round, activeAddress, activeAddressValid)
  const addressEntries = activeAddressValid
    ? getAddressLotteryEntries(round.lottery, activeAddress)
    : []

  return (
    <Page>
      <HeaderBlock round={round} currentRound={currentRound} />

      <Content>
        <TopGrid>
          <div>
            <AddressStatusPanel status={addressStatus} roundPath={roundPath} />
          </div>
          <AddressPanel>
            <PanelHeader>
              <div>
                <PanelTitle>Inspect address</PanelTitle>
                <PanelBody>
                  Check a connected wallet or any address against the selected round's lottery buckets.
                </PanelBody>
              </div>
            </PanelHeader>
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
        </TopGrid>

        <LotterySummary round={round} />
        <HowItWorksSection />
        <AddressEntryTable entries={addressEntries} />
        <LotteryBucketTable buckets={round.lottery?.buckets ?? []} activeAddress={activeAddress} />
      </Content>
    </Page>
  )
}
