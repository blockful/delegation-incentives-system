import { useState } from 'react'
import styled from 'styled-components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { Modal } from '@/components/shared/Modal/Modal'
import { tokens } from '@/styles'
import { buildVoterShareUrl, buildVoterOgImageUrl } from '@/features/delegate/utils/shareCard'

/**
 * Pre-filled X copy for a delegate sharing their OWN profile (first person).
 * Compliant with ENS Labs messaging rules: no APR / yield / price language;
 * only "free, gasless" and "rewards from the DAO". The trailing colon leads
 * into the profile URL that X appends after the text.
 */
export const DELEGATE_TWEET_TEXT =
  "I'm an active voter on ENS governance. Delegate your ENS to me to keep the DAO strong. It's free, gasless, and you earn rewards from the DAO for strengthening ENS:"

export interface DelegateShareModalProps {
  open: boolean
  onClose: () => void
  /** The delegate's address (used to build the share URL + card image). */
  address: string
  /** The delegate's ENS name, when resolved (preferred over address in the URL). */
  ensName?: string | null
}

/**
 * Post-launch / first-visit share modal shown to a delegate on their own
 * profile. Mirrors Figma node 6017:5770: success badge, headline, body, a
 * pre-filled X post preview (copy + the live OG card), and a "Share on X" CTA.
 * The preview image is the exact same endpoint the link unfurl uses, so what
 * the delegate sees here is what their followers will see on X.
 */
export function DelegateShareModal({ open, onClose, address, ensName }: DelegateShareModalProps) {
  const [previewFailed, setPreviewFailed] = useState(false)

  const shareUrl = buildVoterShareUrl({ address, ensName })
  const ogImageUrl = buildVoterOgImageUrl({ address, ensName, variant: 'delegate' })

  const handleShare = () => {
    // x.com (not twitter.com) — the twitter.com intent has an Oct-2025 mobile
    // in-app login bug. Images can't be attached via intent params; the card
    // renders from the URL's OG tags on unfurl.
    const intent = `https://x.com/intent/post?text=${encodeURIComponent(
      DELEGATE_TWEET_TEXT,
    )}&url=${encodeURIComponent(shareUrl)}`
    window.open(intent, '_blank', 'noopener,noreferrer')
  }

  return (
    <Modal open={open} onClose={onClose} label="Share your delegate profile">
      <Content>
        <Badge aria-hidden>
          <FontAwesomeIcon icon={faCheck} />
        </Badge>

        <Heading>Your delegate profile is live</Heading>
        <Body>
          Share it to bring more ENS into active governance.
          <br />
          Your delegators earn rewards from the DAO.
        </Body>

        <PostCard>
          <PostLabel>Pre-filled post</PostLabel>
          <TweetText>{DELEGATE_TWEET_TEXT}</TweetText>
          <CardPreview>
            {!previewFailed && (
              <CardImage
                src={ogImageUrl}
                alt="Preview of your shareable card"
                onError={() => setPreviewFailed(true)}
              />
            )}
          </CardPreview>
        </PostCard>

        <ShareButton type="button" onClick={handleShare}>
          Share on X
          <FontAwesomeIcon icon={faArrowRight} />
        </ShareButton>
      </Content>
    </Modal>
  )
}

/* ─── Styles ─── */

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing.xl};
  width: 100%;
`

const Badge = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.status.success.bg};
  color: ${tokens.color.green};
  font-size: 24px;
`

const Heading = styled.h2`
  margin: 0;
  text-align: center;
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.bold};
  line-height: 1.1;
  color: ${tokens.color.text};
`

const Body = styled.p`
  margin: 0;
  text-align: center;
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.medium};
  line-height: 1.56;
  color: ${tokens.color.textMuted};
  text-wrap: pretty;
`

const PostCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  width: 100%;
  /* Design uses a 12px radius; DS radius tokens cap at 8px, so raw. */
  border-radius: 12px;
  padding: ${tokens.spacing.lg};
  background: ${tokens.color.lightBlue};
`

const PostLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.blue};
`

const TweetText = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  line-height: 1.4;
  color: ${tokens.color.text};
  text-wrap: pretty;
`

const CardPreview = styled.div`
  width: 100%;
  aspect-ratio: 1120 / 630;
  border-radius: 12px;
  overflow: hidden;
  /* Subtle skeleton while the OG image loads (and a graceful empty state if it
     can't — e.g. the edge function isn't running under a plain vite dev server). */
  background: ${tokens.color.lightBlueOpacity};
`

const CardImage = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const ShareButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${tokens.spacing.sm};
  width: 100%;
  padding: 14px 16px;
  border: none;
  border-radius: ${tokens.radius.lg};
  background: ${tokens.color.blue};
  color: ${tokens.color.white};
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  cursor: pointer;
  transition: background ${tokens.transition.fast};

  &:hover {
    background: ${tokens.color.accent};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
  }
`
