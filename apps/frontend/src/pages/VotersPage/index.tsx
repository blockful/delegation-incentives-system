import { useCallback, useMemo, useState } from 'react'
import styled from 'styled-components'
import { useVoters } from '@/features/voters/useVoters'
import { useStats } from '@/features/stats/useStats'
import { tokens, fadeInUp, Eyebrow, ErrorMessage } from '@/styles'
import { VoterCardsSkeleton, StatsBarSkeleton } from '@/components/shared/PageSkeletons'
import { VoterCard } from './components/VoterCard'
import { SortControls, type SortState } from './components/SortControls'
import { StatsBar } from './components/StatsBar'
import type { VoterDetail } from '@/api/types'

const Page = styled.div`
  background: ${tokens.color.surfaceMat};
  min-height: calc(100vh - 80px);
`

const Inner = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  padding: ${tokens.spacing.xl} ${tokens.spacing.xl} ${tokens.spacing['6xl']};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};
  animation: ${fadeInUp} 0.4s ease both;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['3xl']} ${tokens.spacing['2xl']} ${tokens.spacing['7xl']};
    gap: ${tokens.spacing['3xl']};
  }
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

const TopSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: flex-start;
    gap: ${tokens.spacing['4xl']};
  }
`

const HeaderBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  flex: 1;
  min-width: 0;
`

const PageTitle = styled.h1`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.darkBlue};
  line-height: 1.15;
  letter-spacing: -0.01em;
  margin: 0;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['5xl']};
  }
`

const Description = styled.p`
  font-size: ${tokens.font.size.lg};
  line-height: 1.6;
  color: ${tokens.color.darkGray};
  margin: 0;
  max-width: 560px;
`

const StatsBarWrapper = styled.div`
  width: 100%;

  @media (min-width: 768px) {
    width: auto;
    flex-shrink: 0;
    align-self: center;
  }
`

/* ─── Toolbar ─── */

const Toolbar = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
`

const SearchRow = styled.div`
  position: relative;
  width: 100%;
`

const SearchIcon = styled.span`
  position: absolute;
  left: ${tokens.spacing.md};
  top: 50%;
  transform: translateY(-50%);
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.lg};
  pointer-events: none;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 44px;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.surface};
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkBlue};
  font-family: ${tokens.font.family};
  transition: all ${tokens.transition.fast};
  box-shadow: ${tokens.shadow.soft};

  &::placeholder {
    color: ${tokens.color.darkGray};
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

const ClearButton = styled.button`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: ${tokens.color.borderLight};
  border: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: pointer;
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.xs};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${tokens.transition.fast};

  &:hover {
    background: ${tokens.color.middleGray};
    color: ${tokens.color.darkBlue};
  }
`

const FiltersRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  align-items: stretch;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    gap: ${tokens.spacing.lg};
    flex-wrap: wrap;
  }
`

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  flex-wrap: wrap;
`

const FilterLabel = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${tokens.color.darkGray};
  flex-shrink: 0;
`

const FilterChip = styled.button<{ $active: boolean }>`
  padding: 6px 12px;
  border-radius: ${tokens.radius.pill};
  border: 1px solid ${({ $active }) => ($active ? tokens.color.blue : tokens.color.borderLight)};
  background: ${({ $active }) => ($active ? tokens.color.lightBlueOpacity : tokens.color.surface)};
  color: ${({ $active }) => ($active ? tokens.color.blue : tokens.color.darkGray)};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  cursor: pointer;
  transition: all ${tokens.transition.fast};
  white-space: nowrap;

  &:hover {
    border-color: ${tokens.color.blue};
    color: ${tokens.color.blue};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.accent};
    outline-offset: 2px;
  }
`

const ResultCount = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
  font-variant-numeric: tabular-nums;

  @media (min-width: 768px) {
    margin-left: auto;
  }
`

const EmptyState = styled.div`
  padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl};
  background: ${tokens.color.surface};
  border: 1px dashed ${tokens.color.borderLight};
  border-radius: ${tokens.radius.md};
  text-align: center;
  color: ${tokens.color.darkGray};
  line-height: 1.6;
`

const EmptyTitle = styled.h3`
  margin: 0 0 ${tokens.spacing.xs};
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

const ResetLink = styled.button`
  background: none;
  border: none;
  color: ${tokens.color.blue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  cursor: pointer;
  margin-top: ${tokens.spacing.md};

  &:hover {
    text-decoration: underline;
  }
`

type ParticipationFilter = 'all' | 'high' | 'perfect'

function shuffled(voters: VoterDetail[]): VoterDetail[] {
  const copy = [...voters]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function VotersPage() {
  const { data, loading, error } = useVoters()
  const { data: stats, loading: statsLoading } = useStats()
  const [sort, setSort] = useState<SortState>({ field: 'random', direction: 'desc' })
  const [shuffleSeed, setShuffleSeed] = useState(0)
  const [search, setSearch] = useState('')
  const [participation, setParticipation] = useState<ParticipationFilter>('all')

  const handleShuffle = useCallback(() => setShuffleSeed((s) => s + 1), [])

  const voters = useMemo(() => {
    if (!data) return null

    let filtered = [...data]

    // Search filter
    const q = search.trim().toLowerCase()
    if (q.length > 0) {
      filtered = filtered.filter((v) => {
        const ens = v.ensName?.toLowerCase() ?? ''
        const addr = v.address.toLowerCase()
        return ens.includes(q) || addr.includes(q)
      })
    }

    // Participation filter
    if (participation === 'high') {
      filtered = filtered.filter((v) => v.last10ProposalsVoted.filter(Boolean).length >= 9)
    } else if (participation === 'perfect') {
      filtered = filtered.filter((v) => v.last10ProposalsVoted.filter(Boolean).length === 10)
    }

    // Sort
    if (sort.field === 'random') {
      filtered = shuffled(filtered)
    } else {
      const dir = sort.direction === 'desc' ? -1 : 1
      if (sort.field === 'votingPower') {
        filtered.sort((a, b) => (Number(a.votingPower) - Number(b.votingPower)) * dir)
      } else if (sort.field === 'activity') {
        filtered.sort((a, b) => (a.votesInLast10 - b.votesInLast10) * dir)
      } else if (sort.field === 'activeSince') {
        filtered.sort((a, b) => {
          const aT = a.activeSince ? new Date(a.activeSince).getTime() : 0
          const bT = b.activeSince ? new Date(b.activeSince).getTime() : 0
          return (aT - bT) * dir
        })
      }
    }

    return filtered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sort, shuffleSeed, search, participation])

  const totalCount = data?.length ?? 0
  const filteredCount = voters?.length ?? 0
  const hasFilters = search.length > 0 || participation !== 'all'

  const resetFilters = () => {
    setSearch('')
    setParticipation('all')
  }

  return (
    <Page>
      <Inner>
        <TopSection>
          <HeaderBlock>
            <Eyebrow>Delegate Your Tokens</Eyebrow>
            <PageTitle>Delegate to someone who shows up</PageTitle>
            <Description>
              Choose an active voter — they cast votes on at least 7 of the last 10 proposals — to maximize your rewards.
            </Description>
          </HeaderBlock>

          <StatsBarWrapper>
            {statsLoading ? (
              <StatsBarSkeleton />
            ) : (
              <StatsBar
                activeVoterCount={stats?.activeVoterCount}
                totalDelegatedEns={stats?.totalDelegatedEns}
                holdersEarning={stats?.holdersEarning}
              />
            )}
          </StatsBarWrapper>
        </TopSection>

        <Toolbar>
          <SearchRow>
            <SearchIcon aria-hidden>🔍</SearchIcon>
            <SearchInput
              type="search"
              placeholder="Search by ENS name or 0x address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search voters"
            />
            {search.length > 0 && (
              <ClearButton type="button" onClick={() => setSearch('')} aria-label="Clear search">
                ×
              </ClearButton>
            )}
          </SearchRow>

          <SortControls value={sort} onChange={setSort} onShuffle={handleShuffle} />

          <FiltersRow>
            <FilterGroup>
              <FilterLabel>Participation</FilterLabel>
              <FilterChip
                type="button"
                $active={participation === 'all'}
                onClick={() => setParticipation('all')}
              >
                All
              </FilterChip>
              <FilterChip
                type="button"
                $active={participation === 'high'}
                onClick={() => setParticipation('high')}
              >
                ≥ 9/10
              </FilterChip>
              <FilterChip
                type="button"
                $active={participation === 'perfect'}
                onClick={() => setParticipation('perfect')}
              >
                Perfect 10/10
              </FilterChip>
            </FilterGroup>

            {data && (
              <ResultCount>
                Showing <strong>{filteredCount}</strong> of {totalCount}
              </ResultCount>
            )}
          </FiltersRow>
        </Toolbar>

        {loading && <VoterCardsSkeleton />}

        {error && <ErrorMessage>Failed to load voters: {error}</ErrorMessage>}

        {voters && voters.length === 0 && hasFilters && (
          <EmptyState>
            <EmptyTitle>No voters match these filters</EmptyTitle>
            <div>Try widening Participation, or clearing the search.</div>
            <ResetLink type="button" onClick={resetFilters}>Reset filters</ResetLink>
          </EmptyState>
        )}

        {voters && voters.length > 0 && (
          <Grid>
            {voters.map((v) => (
              <VoterCard key={v.address} voter={v} />
            ))}
          </Grid>
        )}
      </Inner>
    </Page>
  )
}
