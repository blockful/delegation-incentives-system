import { useState, useMemo, useCallback } from 'react'
import styled from 'styled-components'
import { Spinner, Heading as ThorinHeading, Typography } from '@ensdomains/thorin'
import { useDelegates } from '@/features/delegates/useDelegates'
import { DelegateCard } from './components/DelegateCard'
import { SortControls, type SortState } from './components/SortControls'
import { StatsBar } from './components/StatsBar'
import type { DelegateDetail } from '@/api/types'

const Page = styled.div`
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  gap: 32px;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`

const ErrorMessage = styled.p`
  text-align: center;
  padding: 40px 20px;
  color: #c62828;
  font-size: 16px;
`

function shuffled(delegates: DelegateDetail[]): DelegateDetail[] {
  const copy = [...delegates]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function activityScore(d: DelegateDetail): number {
  if (!d.last10ProposalsVoted) return 0
  return d.last10ProposalsVoted.filter(Boolean).length
}

export function DelegatesPage() {
  const { data, loading, error, count } = useDelegates()
  const [sort, setSort] = useState<SortState>({ field: 'random', direction: 'desc' })
  const [shuffleSeed, setShuffleSeed] = useState(0)

  const handleShuffle = useCallback(() => setShuffleSeed((s) => s + 1), [])

  const delegates = useMemo(() => {
    if (!data) return null

    if (sort.field === 'random') return shuffled(data)

    const sorted = [...data]
    const dir = sort.direction === 'desc' ? -1 : 1

    if (sort.field === 'votingPower') {
      sorted.sort((a, b) => {
        const aVp = Number(a.votingPower ?? '0')
        const bVp = Number(b.votingPower ?? '0')
        return (aVp - bVp) * dir
      })
    } else if (sort.field === 'activity') {
      sorted.sort((a, b) => (activityScore(a) - activityScore(b)) * dir)
    } else if (sort.field === 'activeSince') {
      sorted.sort((a, b) => {
        const aTime = a.activeSince ? new Date(a.activeSince).getTime() : 0
        const bTime = b.activeSince ? new Date(b.activeSince).getTime() : 0
        return (aTime - bTime) * dir
      })
    }

    return sorted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sort, shuffleSeed])

  return (
    <Page>
      <div>
        <Typography
          fontVariant="label"
          color="blue"
          weight="bold"
          style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          Delegate Your Tokens
        </Typography>
        <div style={{ margin: '4px 0' }}>
          <ThorinHeading level="1" responsive style={{ margin: 0 }}>
            Delegate to someone who shows up
          </ThorinHeading>
        </div>
        <Typography fontVariant="body" color="textTertiary">
          Choose a delegate who votes on at least 7 out of 10 proposals to
          maximize your rewards.
        </Typography>
      </div>

      <StatsBar activeDelegates={count} />

      <SortControls value={sort} onChange={setSort} onShuffle={handleShuffle} />

      {loading && (
        <LoadingWrapper>
          <Spinner />
        </LoadingWrapper>
      )}

      {error && <ErrorMessage>Failed to load delegates: {error}</ErrorMessage>}

      {delegates && (
        <Grid>
          {delegates.map((d) => (
            <DelegateCard key={d.address} delegate={d} />
          ))}
        </Grid>
      )}
    </Page>
  )
}
