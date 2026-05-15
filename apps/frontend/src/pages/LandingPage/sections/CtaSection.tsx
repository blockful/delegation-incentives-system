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

const Section = styled.section`
  position: relative;
  overflow: hidden;
  background: ${tokens.color.blue};
  padding: ${tokens.spacing['5xl']} ${tokens.spacing.xl};
  cursor: default;
  isolation: isolate;

  /* Static dot pattern — calm baseline that the cursor-trail dances over */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.18) 1px,
      transparent 1.5px
    );
    background-size: 24px 24px;
    background-position: 0 0;
    opacity: 0.5;
    pointer-events: none;
    z-index: 0;
  }

  /* Cursor spotlight — brightens the dots beneath as the cursor moves */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle 220px at var(--mx, 50%) var(--my, 50%),
      rgba(255, 255, 255, 0.22),
      transparent 70%
    );
    pointer-events: none;
    opacity: 0;
    transition: opacity 240ms ease-out;
    z-index: 0;
  }

  &[data-hover='true']::after {
    opacity: 1;
  }

  @media (min-width: 768px) {
    padding: ${tokens.spacing['8xl']} ${tokens.spacing['4xl']};
  }
`

const Inner = styled.div`
  position: relative;
  z-index: 2;
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing['3xl']};
`

const Heading = styled.h2`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.black};
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
  max-width: 540px;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size.xl};
  }
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
  width: 100%;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: center;
    width: auto;
  }
`

/* Cursor-follow pixel trail */
const TrailLayer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0;
  transition: opacity 200ms ease-out;

  [data-hover='true'] & {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`

const Pixel = styled.span<{ $size: number; $delay: number; $alpha: number; $offX: number; $offY: number }>`
  position: absolute;
  top: 0;
  left: 0;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  background: rgba(255, 255, 255, ${({ $alpha }) => $alpha});
  border-radius: 2px;
  will-change: transform;
  transform: translate3d(
    calc(var(--mx, 0px) + ${({ $offX }) => $offX}px - 50%),
    calc(var(--my, 0px) + ${({ $offY }) => $offY}px - 50%),
    0
  );
  transition: transform ${({ $delay }) => $delay}ms cubic-bezier(0.16, 1, 0.3, 1);
`

/* Six pixel blocks, increasing lag → comet trail. Random offsets keep it lively. */
const PIXEL_CONFIGS = [
  { id: 0, size: 10, delay: 60,  alpha: 1.0,  offX:  0,  offY:  0  },
  { id: 1, size: 8,  delay: 140, alpha: 0.85, offX: 14,  offY: -6  },
  { id: 2, size: 6,  delay: 220, alpha: 0.7,  offX: -18, offY:  4  },
  { id: 3, size: 8,  delay: 320, alpha: 0.55, offX:  8,  offY: 18  },
  { id: 4, size: 6,  delay: 460, alpha: 0.4,  offX: -10, offY: -16 },
  { id: 5, size: 4,  delay: 640, alpha: 0.3,  offX: 20,  offY: 12  },
]

export function CtaSection() {
  const ref = useRef<HTMLElement>(null)

  const handleMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    el.style.setProperty('--mx', `${x}px`)
    el.style.setProperty('--my', `${y}px`)
  }, [])

  const handleEnter = useCallback(() => {
    ref.current?.setAttribute('data-hover', 'true')
  }, [])

  const handleLeave = useCallback(() => {
    ref.current?.setAttribute('data-hover', 'false')
  }, [])

  return (
    <Section
      ref={ref}
      data-testid="cta-section"
      data-hover="false"
      onMouseMove={handleMove}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <TrailLayer aria-hidden>
        {PIXEL_CONFIGS.map((p) => (
          <Pixel
            key={p.id}
            $size={p.size}
            $delay={p.delay}
            $alpha={p.alpha}
            $offX={p.offX}
            $offY={p.offY}
          />
        ))}
      </TrailLayer>

      <Inner>
        <Heading>
          {'Earn ENS rewards.\nStrengthen governance.'}
        </Heading>
        <Subtitle>Delegate in under a minute. Gas is sponsored. Rewards are automatic.</Subtitle>
        <Actions>
          <RouterLink to="/voters" $fullWidthMobile>
            <Button colorStyle="greenPrimary">
              Delegate to an active voter →
            </Button>
          </RouterLink>
          <RouterLink to="/transparency" $fullWidthMobile>
            <Button colorStyle="background">
              See the methodology
            </Button>
          </RouterLink>
        </Actions>
      </Inner>
    </Section>
  )
}
