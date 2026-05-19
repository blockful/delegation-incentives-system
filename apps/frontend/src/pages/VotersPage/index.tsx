import { useCallback, useMemo, useState } from 'react'
import styled from 'styled-components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faShareNodes, faXmark } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@ensdomains/thorin'
import { useVoters } from '@/features/voters/useVoters'
import { useStats } from '@/features/stats/useStats'
import { tokens, fadeInUp, ErrorMessage } from '@/styles'
import { VoterCardsSkeleton, StatsBarSkeleton } from '@/components/shared/PageSkeletons'
import { VoterCard } from './components/VoterCard'
import { SortControls, type SortState } from './components/SortControls'
import { StatsBar } from './components/StatsBar'
import type { VoterDetail } from '@/api/types'

const Page = styled.div`
  width: 100%;
  max-width: 1120px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${tokens.spacing['2xl']};
  animation: ${fadeInUp} 0.4s ease both;

  @media (min-width: 768px) {
    gap: 64px;
  }
`

const CardsAndFilters = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};
  width: 100%;
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
  align-items: center;
  gap: ${tokens.spacing['4xl']};
  width: 100%;
`

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
  gap: 4px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.48);
  border: 1px solid ${tokens.color.white};
  border-radius: 14px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const PageTitle = styled.h1`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.1;
  letter-spacing: 0;
  margin: 0;
  text-align: center;
  max-width: 720px;
  text-wrap: balance;

  @media (min-width: 768px) {
    font-size: 68px;
  }
`

const Description = styled.p`
  font-size: ${tokens.font.size.lg};
  line-height: 1.4;
  color: ${tokens.color.darkGray};
  margin: 0;
  max-width: 564px;
  text-align: center;
  text-wrap: pretty;
`

const StatsBarWrapper = styled.div`
  width: 100%;
`

const ShareStrip = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  padding: 14px 16px;
  background: ${tokens.color.lightBlueOpacity};
  border: 1px solid ${tokens.color.lightBlue};
  border-radius: 12px;

  @media (min-width: 720px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`

const ShareStripCopy = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
  line-height: 1.5;
`

const ShareStripCopyStrong = styled.span`
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.blue};
`

const ShareStripLink = styled.a`
  text-decoration: none;

  @media (max-width: 719px) {
    width: 100%;

    button {
      width: 100%;
      justify-content: center;
    }
  }
`

/* ─── Toolbar ─── */

const FilterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.lg};
  flex-wrap: wrap;
`

const SearchRow = styled.div`
  position: relative;
  width: 100%;
  max-width: 400px;
  flex-shrink: 0;
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
  padding: 12px 16px 12px 44px;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 9999px;
  background: ${tokens.color.surface};
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkBlue};
  font-family: ${tokens.font.family};
  transition: all ${tokens.transition.fast};

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
    text-decoration: none;
    opacity: 0.8;
  }
`

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

  const handleShuffle = useCallback(() => setShuffleSeed((s) => s + 1), [])

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '#'
    const text = encodeURIComponent(
      "Delegate your ENS to an active voter and earn APR rewards automatically. The more wallets delegate, the higher everyone's APR climbs.",
    )
    const url = encodeURIComponent(window.location.origin)
    return `https://twitter.com/intent/tweet?text=${text}&url=${url}`
  }, [])

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
  }, [data, sort, shuffleSeed, search])

  const totalCount = data?.length ?? 0
  const filteredCount = voters?.length ?? 0
  const hasFilters = search.length > 0

  const resetFilters = () => {
    setSearch('')
  }

  return (
    <Page>
        <TopSection>
          <HeaderBlock>
            <EyebrowPill>Delegate &amp; earn</EyebrowPill>
            <PageTitle>Pick an active voter. Earn ENS automatically.</PageTitle>
            <Description>
              Active voters cast on at least 7 of the last 10 proposals. Delegate to one to start earning ENS rewards.
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

          <ShareStrip>
            <ShareStripCopy>
              <ShareStripCopyStrong>More delegators lift everyone&rsquo;s APR.</ShareStripCopyStrong>
              {' '}Share the program to grow the pool.
            </ShareStripCopy>
            <ShareStripLink
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="small"
                colorStyle="bluePrimary"
                prefix={<FontAwesomeIcon icon={faShareNodes} />}
              >
                Share the program
              </Button>
            </ShareStripLink>
          </ShareStrip>
        </TopSection>

        <CardsAndFilters>
          <FilterRow>
            <SearchRow>
              <SearchIcon aria-hidden>
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </SearchIcon>
              <SearchInput
                type="search"
                placeholder="Search by ENS name or 0x address…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search voters"
              />
              {search.length > 0 && (
                <ClearButton type="button" onClick={() => setSearch('')} aria-label="Clear search">
                  <FontAwesomeIcon icon={faXmark} />
                </ClearButton>
              )}
            </SearchRow>

            <SortControls value={sort} onChange={setSort} onShuffle={handleShuffle} />
          </FilterRow>

          {loading && <VoterCardsSkeleton />}

          {error && <ErrorMessage>Failed to load voters: {error}</ErrorMessage>}

          {voters && voters.length === 0 && hasFilters && (
            <EmptyState>
              <EmptyTitle>No voters match your search</EmptyTitle>
              <div>Try a different ENS name or address.</div>
              <ResetLink type="button" onClick={resetFilters}>Clear search</ResetLink>
            </EmptyState>
          )}

          {voters && voters.length > 0 && (
            <Grid>
              {voters.map((v) => (
                <VoterCard key={v.address} voter={v} />
              ))}
            </Grid>
          )}
        </CardsAndFilters>
    </Page>
  )
}
