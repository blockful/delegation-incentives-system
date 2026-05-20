import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import type { VoterDetail } from '@/api/types'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { ProposalBar } from '@/components/shared/ProposalBar'
import { SideDrawer } from '@/components/shared/SideDrawer/SideDrawer'
import { tokens } from '@/styles/tokens'

interface CompareDrawerProps {
  open: boolean
  onClose: () => void
  selected: string[]
  voters: Map<string, VoterDetail>
}

function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function formatVotingPower(vpWei: string): string {
  const ens = Number(vpWei) / 1e18
  if (!Number.isFinite(ens)) return '0'
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
  return `${Math.round(ens)}`
}

function formatActiveSince(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const now = new Date()
  const months = Math.max(
    0,
    (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth()),
  )
  const years = Math.floor(months / 12)
  const remMonths = months % 12
  if (years > 0 && remMonths > 0) return `${years}y ${remMonths}mo ago`
  if (years > 0) return `${years}y ago`
  if (remMonths > 0) return `${remMonths}mo ago`
  return 'this month'
}

function useResolvedSide(): 'right' | 'bottom' {
  const [side, setSide] = useState<'right' | 'bottom'>(() => {
    if (typeof window === 'undefined') return 'right'
    return window.matchMedia('(max-width: 640px)').matches ? 'bottom' : 'right'
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(max-width: 640px)')
    const handler = (e: MediaQueryListEvent) => setSide(e.matches ? 'bottom' : 'right')
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return side
}

const Grid = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(220px, 1fr);
  gap: ${tokens.spacing.lg};
  overflow-x: auto;
  padding-bottom: ${tokens.spacing.sm};
  -webkit-overflow-scrolling: touch;
`

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
  padding: ${tokens.spacing.lg};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.md};
  min-width: 220px;
`

const HeaderLink = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${tokens.spacing.sm};
  text-decoration: none;
  color: inherit;

  &:hover .compare-name {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.accent};
    outline-offset: 2px;
    border-radius: ${tokens.radius.sm};
  }
`

const Name = styled.span`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  word-break: break-all;
  line-height: 1.25;
`

const SubAddress = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.darkGray};
`

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const RowLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
  font-weight: ${tokens.font.weight.semibold};
`

const RowValue = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
`

const ActiveSinceValue = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkBlue};
  line-height: 1.2;
`

const ParticipationStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const DelegateButton = styled.button`
  margin-top: auto;
  width: 100%;
  padding: ${tokens.spacing.sm} ${tokens.spacing.lg};
  border-radius: ${tokens.radius.sm};
  border: 1px solid ${tokens.color.blue};
  background: ${tokens.color.blue};
  color: ${tokens.color.white};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  cursor: pointer;
  transition: background ${tokens.transition.fast},
    border-color ${tokens.transition.fast};

  &:hover {
    background: ${tokens.color.accent};
    border-color: ${tokens.color.accent};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.accent};
    outline-offset: 2px;
  }
`

const MissingNote = styled.div`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
`

export function CompareDrawer({
  open,
  onClose,
  selected,
  voters,
}: CompareDrawerProps) {
  const side = useResolvedSide()

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title={`Compare voters (${selected.length})`}
      side={side}
      width="640px"
    >
      <Grid>
        {selected.map((addr) => {
          const voter = voters.get(addr)
          if (!voter) {
            return (
              <Column key={addr}>
                <SubAddress>{shortAddress(addr)}</SubAddress>
                <MissingNote>Voter data unavailable.</MissingNote>
              </Column>
            )
          }
          const target = voter.ensName ?? voter.address
          return (
            <Column key={addr}>
              <HeaderLink to={`/voters/${target}`} onClick={() => onClose()}>
                <EnsAvatar
                  address={voter.address}
                  name={voter.ensName ?? undefined}
                  avatarUrl={voter.avatarUrl ?? undefined}
                  size={44}
                />
                <Name className="compare-name">
                  {voter.ensName ?? shortAddress(voter.address)}
                </Name>
                {voter.ensName && <SubAddress>{shortAddress(voter.address)}</SubAddress>}
              </HeaderLink>

              <Row>
                <RowLabel>Voting Power</RowLabel>
                <RowValue>{formatVotingPower(voter.votingPower)}</RowValue>
              </Row>

              <Row>
                <RowLabel>Delegators</RowLabel>
                <RowValue>{voter.tokenHolderCount}</RowValue>
              </Row>

              <ParticipationStack>
                <RowLabel>Participation</RowLabel>
                <ProposalBar votes={voter.last10ProposalsVoted} />
              </ParticipationStack>

              <Row>
                <RowLabel>Active since</RowLabel>
                <ActiveSinceValue>
                  {formatActiveSince(voter.activeSince)}
                </ActiveSinceValue>
              </Row>

              <DelegateButton
                type="button"
                onClick={() => {
                  // TODO: call relayer for gasless delegation
                }}
              >
                Delegate
              </DelegateButton>
            </Column>
          )
        })}
      </Grid>
    </SideDrawer>
  )
}

