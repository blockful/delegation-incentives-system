import { useState, useMemo, useCallback } from 'react'
import styled from 'styled-components'
import { Spinner } from '@ensdomains/thorin'
import { useDelegates } from '@/features/delegates/useDelegates'
import { tokens, fadeInUp, Eyebrow, PageTitle, SectionSubheading, LoadingWrapper, ErrorMessage } from '@/styles'
import { DelegateCard } from './components/DelegateCard'
import { SortControls, type SortState } from './components/SortControls'
import { StatsBar } from './components/StatsBar'
import type { DelegateDetail } from '@/api/types'

const Page = styled.div`
  max-width: 960px;
  margin: 0 auto;
  padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
  animation: ${fadeInUp} 0.4s ease both;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing.lg};

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }

  > * {
    animation: ${fadeInUp} 0.35s ease both;
  }

  ${Array.from({ length: 12 }, (_, i) => `
    > *:nth-child(${i + 1}) { animation-delay: ${i * 0.04}s; }
  `).join('')}
`

const HeaderBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
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
      <HeaderBlock>
        <Eyebrow>Delegate Your Tokens</Eyebrow>
        <PageTitle>Delegate to someone who shows up</PageTitle>
        <SectionSubheading>
          Choose a delegate who votes on at least 7 out of 10 proposals to
          maximize your rewards.
        </SectionSubheading>
      </HeaderBlock>

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
