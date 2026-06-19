import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { tokens } from '@/styles'

export interface UnlockMatchmakingBannerProps {
  /** Open the selection flow (e.g. the Pitch step). */
  onSelect: () => void
  /** Context-specific copy override. */
  message?: string
}

/**
 * Inline nudge for a connected-but-unselected viewer. Placed on /voters (FE-4)
 * and on visited delegate profiles (FE-5). ⚠️ Copy is placeholder (copy-pass).
 */
export function UnlockMatchmakingBanner({ onSelect, message }: UnlockMatchmakingBannerProps) {
  return (
    <Banner role="region" aria-label="Matchmaking">
      <Copy>{message ?? 'Want to see how delegates match you?'}</Copy>
      <Button size="small" colorStyle="bluePrimary" onClick={onSelect}>
        Select your values
      </Button>
    </Banner>
  )
}

const Banner = styled.div`
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

const Copy = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
  line-height: 1.5;
`
