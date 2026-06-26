import { useState, type ReactNode } from 'react'
import styled from 'styled-components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { tokens } from '@/styles'

export interface ShareCardBlockProps {
  /** Headline next to the success badge. */
  title: string
  /** Supporting copy under the title. */
  body: ReactNode
  /** Exact text pre-filled into the X composer. */
  tweetText: string
  /** Public URL whose OG tags unfurl into the card on X. */
  shareUrl: string
  /** OG card image endpoint for the in-modal preview (same image the unfurl uses). */
  ogImageUrl: string
}

/**
 * Shared content for the "share your card" surfaces — the delegate first-visit
 * modal and the post-delegation holder modal. Success badge, headline, body, a
 * pre-filled X post preview, and a "Share on X" CTA. Layout only: the caller
 * supplies the dialog chrome (centered Modal, or the DelegationModal dialog).
 */
export function ShareCardBlock({ title, body, tweetText, shareUrl, ogImageUrl }: ShareCardBlockProps) {
  const [previewFailed, setPreviewFailed] = useState(false)

  const handleShare = () => {
    // x.com (not twitter.com) — the twitter.com intent has an Oct-2025 mobile
    // in-app login bug. Images can't be attached via intent params; the card
    // renders from the URL's OG tags on unfurl.
    const intent = `https://x.com/intent/post?text=${encodeURIComponent(
      tweetText,
    )}&url=${encodeURIComponent(shareUrl)}`
    window.open(intent, '_blank', 'noopener,noreferrer')
  }

  return (
    <Content>
      <Badge aria-hidden>
        <FontAwesomeIcon icon={faCheck} />
      </Badge>

      <Heading>{title}</Heading>
      <Body>{body}</Body>

      <PostCard>
        <PostLabel>Pre-filled post</PostLabel>
        <TweetText>{tweetText}</TweetText>
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
