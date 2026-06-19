import styled from 'styled-components'
import { InfoCircleSVG, RightArrowSVG } from '@ensdomains/thorin'
import { tokens } from '@/styles'

export interface UnlockMatchmakingBannerProps {
  /** Open the selection flow (e.g. the Pitch step). */
  onSelect: () => void
  /** Context-specific copy override. */
  message?: string
}

/**
 * Inline nudge for a connected-but-unselected viewer. Placed on /voters (FE-4)
 * and on visited delegate profiles (FE-5).
 *
 * Layout mirrors Figma "Banner / Unlock matchmaking" (node 5584:9860): a thin,
 * single-row banner — leading info icon, descriptive copy, then a bold-blue
 * inline link (text + right arrow) acting as the CTA. The CTA is a text link,
 * not a filled button, so it sits inline with the copy at any width.
 */
export function UnlockMatchmakingBanner({ onSelect, message }: UnlockMatchmakingBannerProps) {
  return (
    <Banner role="region" aria-label="Matchmaking">
      <IconWrap aria-hidden="true">
        <InfoCircleSVG />
      </IconWrap>
      <Text>{message ?? 'Want to see how delegates match you?'}</Text>
      <CtaLink type="button" onClick={onSelect}>
        Select your values
        <ArrowWrap aria-hidden="true">
          <RightArrowSVG />
        </ArrowWrap>
      </CtaLink>
    </Banner>
  )
}

const Banner = styled.div`
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.md} ${tokens.spacing.lg};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.border};
  border-radius: 12px;
`

const IconWrap = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  color: ${tokens.color.darkGray};

  svg {
    width: 16px;
    height: 16px;
  }
`

const Text = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
  line-height: 1.56;
`

const CtaLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.blue};
  line-height: 1.25;
  transition: opacity ${tokens.transition.fast};

  &:hover {
    opacity: 0.8;
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
    border-radius: ${tokens.radius.sm};
  }
`

const ArrowWrap = styled.span`
  display: inline-flex;
  flex-shrink: 0;

  svg {
    width: 14px;
    height: 14px;
  }
`
