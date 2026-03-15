import { useState, useMemo, useCallback } from 'react'
import styled from 'styled-components'
import { Spinner } from '@ensdomains/thorin'
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

const Label = styled.span`
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #3889ff;
`

const Heading = styled.h1`
  font-size: 32px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  line-height: 1.2;
`

const Subtitle = styled.p`
  font-size: 16px;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin: 0;
  line-height: 1.5;
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
    }

    return sorted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sort, shuffleSeed])

  return (
    <Page>
      <div>
        <Label>Delegate Your Tokens</Label>
        <Heading>Delegate to someone who shows up</Heading>
        <Subtitle>
          Choose a delegate who votes on at least 7 out of 10 proposals to
          maximize your rewards.
        </Subtitle>
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
