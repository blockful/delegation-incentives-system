import { useState } from 'react'
import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { tokens } from '@/styles'
import { useWordPool } from '../useWordPool'
import { useMySelection } from '../useMySelection'
import { useSelectionState } from '../useSelectionState'
import { useViewerRole } from '../useViewerRole'
import { EditSelectionModal } from './EditSelectionModal'
import { SelectionFlow } from './SelectionFlow'

/**
 * Dashboard matchmaking card:
 *  - connected + selected (any role) → "Values" card (5 words + Edit values →)
 *  - connected + not selected + delegate → "missing values" nudge → Pitch
 *  - holders pre-selection / disconnected → nothing
 * ⚠️ Copy is placeholder.
 */
export function DashboardValuesCard() {
  const { state } = useSelectionState()
  const { words } = useMySelection()
  const { pool } = useWordPool()
  const { role } = useViewerRole()
  const [editOpen, setEditOpen] = useState(false)
  const [flowOpen, setFlowOpen] = useState(false)

  const labelOf = (id: string) => pool?.find((w) => w.id === id)?.label ?? id

  if (state === 'connected-selected' && words) {
    return (
      <>
        <Card>
          <Header>
            <CardTitle>Values</CardTitle>
            <EditLink type="button" onClick={() => setEditOpen(true)}>
              Edit values →
            </EditLink>
          </Header>
          <Divider />
          <ValuesList>
            {words.map((id) => (
              <ValueRow key={id}>
                <Marker aria-hidden="true">
                  <Dot />
                </Marker>
                <ValueLabel>{labelOf(id)}</ValueLabel>
              </ValueRow>
            ))}
          </ValuesList>
        </Card>
        <EditSelectionModal open={editOpen} onClose={() => setEditOpen(false)} />
      </>
    )
  }

  if (state === 'connected-not-selected' && role === 'delegate') {
    return (
      <>
        <Card>
          <CardTitle>Your profile is missing values</CardTitle>
          <Muted>
            Pick the values you stand for so holders can find you by what matters to them.
          </Muted>
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

  // Holders pre-selection see nothing here; disconnected sees nothing.
  return null
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
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  line-height: 24px;
  color: ${tokens.color.darkBlue};
`

const Muted = styled.p`
  margin: 0;
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.base};
  line-height: 1.5;
`

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background: ${tokens.color.borderLight};
`

const ValuesList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
`

const ValueRow = styled.li`
  display: flex;
  align-items: center;
  gap: 14px;
`

/* Pill marker mirrors the Figma list rail; a neutral dot replaces the rank
   number / category icon, since the values are 5 free-form words from a pool
   (no ranking, no fixed-category iconography). */
const Marker = styled.span`
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.lightBlue};
  display: flex;
  align-items: center;
  justify-content: center;
`

const Dot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.blue};
`

const ValueLabel = styled.span`
  flex: 1;
  min-width: 0;
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.medium};
  line-height: 1.56;
  color: ${tokens.color.darkBlue};
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
