import { useCallback, useRef } from 'react'
import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { Link } from 'react-router-dom'
import { tokens } from '@/styles/tokens'

const RouterLink = styled(Link)<{ $fullWidthMobile?: boolean }>`
  text-decoration: none;
  position: relative;
  z-index: 2;

  ${({ $fullWidthMobile }) =>
    $fullWidthMobile &&
    `
    @media (max-width: 767px) {
      display: block;
      width: 100%;

      button {
        width: 100%;
        justify-content: center;
      }
    }
  `}
`

const ShareLink = styled.a<{ $fullWidthMobile?: boolean }>`
  text-decoration: none;
  position: relative;
  z-index: 2;

  ${({ $fullWidthMobile }) =>
    $fullWidthMobile &&
    `
    @media (max-width: 767px) {
      display: block;
      width: 100%;

      button {
        width: 100%;
        justify-content: center;
      }
    }
  `}
`

const PrimaryCtaLink = styled(RouterLink)`
  button {
    background: ${tokens.color.white};
    color: ${tokens.color.blue};
    border: 1px solid ${tokens.color.white};

    &:hover {
      background: rgba(255, 255, 255, 0.92);
      color: ${tokens.color.blue};
    }
  }
`

const SecondaryCtaLink = styled(ShareLink)`
  button {
    background: rgba(255, 255, 255, 0.12);
    color: ${tokens.color.white};
    border: 1px solid rgba(255, 255, 255, 0.3);

    &:hover {
      background: rgba(255, 255, 255, 0.2);
      color: ${tokens.color.white};
    }
  }
`

const Section = styled.section`
  background: ${tokens.color.surfaceAlt};
  padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['7xl']} ${tokens.spacing['4xl']};
  }
`

const Card = styled.div`
  position: relative;
  overflow: hidden;
  isolation: isolate;
  background:
    radial-gradient(
      circle 480px at var(--mx, 50%) var(--my, 0%),
      rgba(255, 255, 255, 0.22),
      transparent 70%
    ),
    ${tokens.color.blue};
  border-radius: 24px;
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl};
  cursor: default;
  transition:
    transform 360ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 360ms cubic-bezier(0.16, 1, 0.3, 1);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle 280px at var(--mx, 50%) var(--my, 50%),
      rgba(255, 255, 255, 0.18),
      transparent 65%
    );
    pointer-events: none;
    opacity: 0;
    transition: opacity 320ms ease-out;
    z-index: 1;
  }

  &[data-hover='true'] {
    transform: translateY(-2px);
    box-shadow: 0 24px 60px -24px rgba(56, 137, 255, 0.55);
  }

  &[data-hover='true']::before {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &[data-hover='true'] {
      transform: none;
      box-shadow: none;
    }
  }

  @media (min-width: 768px) {
    padding: ${tokens.spacing['6xl']} ${tokens.spacing['4xl']};
  }
`

const Inner = styled.div`
  position: relative;
  z-index: 2;
  margin: 0 auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing['2xl']};
`

const Heading = styled.h2`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.white};
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 0;
  white-space: pre-line;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['5xl']};
  }
`

const Subtitle = styled.p`
  font-size: ${tokens.font.size.lg};
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
  margin: 0;
  max-width: 560px;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size.xl};
  }
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
  width: 100%;
  margin-top: ${tokens.spacing.md};

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: center;
    width: auto;
  }
`

const SHARE_TWEET_TEXT =
  'Delegate your ENS to an active voter and earn APR rewards automatically. The more people delegate, the higher everyone’s APR climbs.'

function buildTwitterShareUrl(): string {
  if (typeof window === 'undefined') return '#'
  const text = encodeURIComponent(SHARE_TWEET_TEXT)
  const url = encodeURIComponent(window.location.origin)
  return `https://twitter.com/intent/tweet?text=${text}&url=${url}`
}

export function CtaSection() {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    el.style.setProperty('--mx', `${x}px`)
    el.style.setProperty('--my', `${y}px`)
  }, [])

  const handleEnter = useCallback(() => {
    cardRef.current?.setAttribute('data-hover', 'true')
  }, [])

  const handleLeave = useCallback(() => {
    cardRef.current?.setAttribute('data-hover', 'false')
  }, [])

  return (
    <Section data-testid="cta-section">
      <Card
        ref={cardRef}
        data-hover="false"
        onMouseMove={handleMove}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <Inner>
          <Heading>
            {'The more we share,\nthe more we earn.'}
          </Heading>
          <Subtitle>
            Higher tiers unlock as more ENS gets delegated to active voters.
            Share the program and lift everyone&rsquo;s APR — including yours.
          </Subtitle>
          <Actions>
            <PrimaryCtaLink to="/voters" $fullWidthMobile>
              <Button colorStyle="background">Delegate</Button>
            </PrimaryCtaLink>
            <SecondaryCtaLink
              href={buildTwitterShareUrl()}
              target="_blank"
              rel="noopener noreferrer"
              $fullWidthMobile
            >
              <Button colorStyle="background">Share</Button>
            </SecondaryCtaLink>
          </Actions>
        </Inner>
      </Card>
    </Section>
  )
}
