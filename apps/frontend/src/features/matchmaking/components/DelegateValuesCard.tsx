import { useState } from 'react'
import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { scoreSelection } from '@ens-dis/domain'
import { tokens } from '@/styles'
import { useWalletState } from '@/features/wallet/useWalletState'
import { openWalletModal } from '@/features/wallet/openWalletModal'
import { useWordPool } from '../useWordPool'
import { useMySelection } from '../useMySelection'
import { useDelegateSelection } from '../useDelegateSelection'
import { useViewerRole } from '../useViewerRole'
import { SelectionFlow } from './SelectionFlow'
import { EditSelectionModal } from './EditSelectionModal'
import { UnlockMatchmakingBanner } from './UnlockMatchmakingBanner'

export interface DelegateValuesCardProps {
  delegateAddress: string
}

/**
 * The delegate-profile "Values" card across all 7 viewer × delegate states.
 * Comparison is computed client-side; word labels come from the pool. ⚠️ Copy +
 * exact comparison viz are placeholder (Design will redraw).
 */
export function DelegateValuesCard({ delegateAddress }: DelegateValuesCardProps) {
  const wallet = useWalletState()
  const viewerAddress = wallet.status === 'disconnected' ? undefined : wallet.address
  const isOwnProfile =
    !!viewerAddress && viewerAddress.toLowerCase() === delegateAddress.toLowerCase()

  const { pool } = useWordPool()
  const { words: viewerWords, hasSelected: viewerSelected } = useMySelection()
  const { words: delegateWords, hasSelected: delegateSelected } =
    useDelegateSelection(delegateAddress)
  const { role } = useViewerRole()

  const [editOpen, setEditOpen] = useState(false)
  const [flowOpen, setFlowOpen] = useState(false)

  const labelOf = (id: string) => pool?.find((w) => w.id === id)?.label ?? id

  // ── Own profile ──────────────────────────────────────────────────────────
  if (isOwnProfile) {
    if (delegateSelected && delegateWords) {
      return (
        <>
          <Card>
            <Header>
              <CardTitle>Your values</CardTitle>
              <EditLink type="button" onClick={() => setEditOpen(true)}>
                Edit values →
              </EditLink>
            </Header>
            <Chips words={delegateWords} labelOf={labelOf} />
          </Card>
          <EditSelectionModal open={editOpen} onClose={() => setEditOpen(false)} />
        </>
      )
    }
    return (
      <>
        <Card>
          <CardTitle>Your profile is missing values</CardTitle>
          <Muted>Pick the values you stand for so holders can match with you.</Muted>
          <Button colorStyle="bluePrimary" onClick={() => setFlowOpen(true)}>
            Complete profile
          </Button>
        </Card>
        {flowOpen && role && (
          <SelectionFlow open role={role} onClose={() => setFlowOpen(false)} />
        )}
      </>
    )
  }

  // ── Logged out ───────────────────────────────────────────────────────────
  if (!viewerAddress) {
    return (
      <Card>
        <CardTitle>Values</CardTitle>
        <Muted>Connect your wallet to see how this delegate matches your priorities.</Muted>
        <Button colorStyle="bluePrimary" onClick={() => void openWalletModal()}>
          Connect wallet
        </Button>
      </Card>
    )
  }

  // ── Visited profile, viewer NOT selected ─────────────────────────────────
  if (!viewerSelected) {
    if (!delegateSelected) return null // nothing to show
    return (
      <>
        <Card>
          <CardTitle>This delegate&apos;s values</CardTitle>
          <Chips words={delegateWords ?? []} labelOf={labelOf} />
        </Card>
        <UnlockMatchmakingBanner
          onSelect={() => setFlowOpen(true)}
          message="Select your values to see how well you match."
        />
        {flowOpen && role && (
          <SelectionFlow open role={role} onClose={() => setFlowOpen(false)} />
        )}
      </>
    )
  }

  // ── Visited profile, viewer selected ─────────────────────────────────────
  if (!delegateSelected || !delegateWords) {
    return (
      <Card>
        <CardTitle>Values</CardTitle>
        <Muted>This delegate hasn&apos;t selected their priorities.</Muted>
      </Card>
    )
  }

  // Both selected → shared / unique comparison + match pill.
  const score = scoreSelection(viewerWords ?? [], delegateWords)
  return (
    <Card>
      <Header>
        <CardTitle>Values comparison</CardTitle>
        <MatchPill>⭐ {score.percent}% match with your priorities</MatchPill>
      </Header>

      <Group>
        <GroupLabel>Shared</GroupLabel>
        {score.sharedWords.length > 0 ? (
          <Chips words={score.sharedWords} labelOf={labelOf} highlight />
        ) : (
          <Muted>No words in common.</Muted>
        )}
      </Group>

      <Group>
        <GroupLabel>Only this delegate</GroupLabel>
        <Chips words={score.bUnique} labelOf={labelOf} />
      </Group>

      <Group>
        <GroupLabel>Only you</GroupLabel>
        <Chips words={score.aUnique} labelOf={labelOf} />
      </Group>
    </Card>
  )
}

function Chips({
  words,
  labelOf,
  highlight = false,
}: {
  words: string[]
  labelOf: (id: string) => string
  highlight?: boolean
}) {
  if (words.length === 0) return <Muted>—</Muted>
  return (
    <ChipRow>
      {words.map((id) => (
        <Chip key={id} $highlight={highlight}>
          {labelOf(id)}
        </Chip>
      ))}
    </ChipRow>
  )
}

const Card = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.lg};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.md};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.sm};
`

const CardTitle = styled.h3`
  margin: 0;
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

const Muted = styled.p`
  margin: 0;
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.base};
  line-height: 1.5;
`

const MatchPill = styled.span`
  background: ${tokens.color.tierHighlight};
  color: ${tokens.color.positiveEmphasis};
  padding: ${tokens.spacing.xs} ${tokens.spacing.md};
  border-radius: ${tokens.radius.pill};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  white-space: nowrap;
`

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const GroupLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.textSecondary};
`

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.spacing.sm};
`

const Chip = styled.span<{ $highlight: boolean }>`
  padding: ${tokens.spacing.xs} ${tokens.spacing.md};
  border-radius: ${tokens.radius.pill};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  border: 1px solid
    ${({ $highlight }) => ($highlight ? tokens.color.status.success.fg : tokens.color.border)};
  background: ${({ $highlight }) =>
    $highlight ? tokens.color.status.success.bg : tokens.color.surfaceAlt};
  color: ${({ $highlight }) =>
    $highlight ? tokens.color.status.success.fg : tokens.color.darkBlue};
`

const EditLink = styled.button`
  background: none;
  border: none;
  color: ${tokens.color.blue};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  cursor: pointer;

  &:hover {
    opacity: 0.85;
  }
`
