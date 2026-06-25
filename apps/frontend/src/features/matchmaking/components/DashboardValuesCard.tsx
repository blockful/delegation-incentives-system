import { useState } from 'react'
import styled from 'styled-components'
import { Button, LockSVG } from '@ensdomains/thorin'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEyeSlash } from '@fortawesome/free-solid-svg-icons'
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
 *  - connected + not selected + holder → "missing values" nudge (Lock) → Pitch
 *  - disconnected → nothing
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
          <HeaderStrip>
            <CardTitle>Values</CardTitle>
            <EditLink type="button" onClick={() => setEditOpen(true)}>
              Edit values →
            </EditLink>
          </HeaderStrip>
          <Divider />
          <Body>
            <ChipRow>
              {words.map((id) => (
                <Chip key={id}>{labelOf(id)}</Chip>
              ))}
            </ChipRow>
          </Body>
        </Card>
        <EditSelectionModal open={editOpen} onClose={() => setEditOpen(false)} />
      </>
    )
  }

  // Connected but no values yet → the "missing values" nudge. The banner must
  // NOT depend on `role` resolving: useViewerRole returns null while /voters
  // loads or if it errors, and gating the banner on it made the nudge silently
  // disappear. Render for any connected, unselected viewer; `role` only swaps
  // the icon + body copy (delegate vs holder), defaulting to the holder copy.
  if (state === 'connected-not-selected') {
    const isDelegate = role === 'delegate'
    return (
      <>
        <Banner>
          <IconBadge aria-hidden="true">
            {isDelegate ? <FontAwesomeIcon icon={faEyeSlash} /> : <LockSVG />}
          </IconBadge>
          <BannerText>
            <CardTitle>Your profile is missing values</CardTitle>
            <Muted>
              {isDelegate
                ? 'Pick the values you stand for so holders can find you by what matters to them.'
                : 'We cannot match you to delegates. Rank 5 values in 30 seconds.'}
            </Muted>
          </BannerText>
          <Button colorStyle="bluePrimary" width="fit" onClick={() => setFlowOpen(true)}>
            Complete profile
          </Button>
        </Banner>
        {flowOpen && (
          <SelectionFlow open role={role ?? 'holder'} onClose={() => setFlowOpen(false)} />
        )}
      </>
    )
  }

  // Disconnected sees nothing.
  return null
}

const Card = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
`

// Grey header strip (Figma 5899-6474): "Values" + "Edit values →" on surfaceAlt,
// divider, then the chips on a white body.
const HeaderStrip = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.sm};
  padding: ${tokens.spacing.md} ${tokens.spacing.lg};
  background: ${tokens.color.surfaceAlt};
`

const Body = styled.div`
  padding: ${tokens.spacing.lg};
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

/* Holder pre-rank nudge — horizontal blue banner (Figma node 5899:7918):
   icon badge · title+body · content-width CTA, not a stacked card. */
const Banner = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.md} ${tokens.spacing.lg};
  background: ${tokens.color.lightBlue};
  border: 1px solid ${tokens.color.blue};
  border-radius: ${tokens.radius.md};

  @media (max-width: 767px) {
    flex-direction: column;
    align-items: flex-start;
    gap: ${tokens.spacing.sm};
  }
`

const IconBadge = styled.span`
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: ${tokens.radius.pill};
  /* Figma blue/light (#d1e4ff) — one shade above the banner's lightBlue; no DS token */
  background: #d1e4ff;
  color: ${tokens.color.blue};
  display: flex;
  align-items: center;
  justify-content: center;

  /* height-locked, width auto so non-square glyphs (eye-slash) keep their ratio */
  svg {
    width: auto;
    height: 20px;
  }
`

const BannerText = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background: ${tokens.color.borderLight};
`

/* Values render as light-blue chips (Figma 5899:6474 / 5899:6811) — matching the
   value chips used elsewhere (own-profile, delegate card), not a list rail. */
const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.spacing.sm};
`

const Chip = styled.span`
  padding: ${tokens.spacing.xs} ${tokens.spacing.md};
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.lightBlue};
  color: ${tokens.color.blue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
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
