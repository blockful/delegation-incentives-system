import { useCallback, useMemo } from 'react'
import styled, { keyframes } from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faShareNodes } from '@fortawesome/free-solid-svg-icons'
import makeBlockie from 'ethereum-blockies-base64'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { truncateAddress } from '@/utils/format'
import { tokens } from '@/styles/tokens'
import type { VoterDetail } from '@/api/types'

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
    gap: 8px;

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
    gap: 8px;

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
      ellipse 70% 60% at 50% -10%,
      rgba(56, 137, 255, 1) 0%,
      rgba(104, 164, 253, 1) 25%,
      rgba(151, 191, 251, 1) 50%,
      rgba(199, 219, 248, 1) 75%,
      rgba(246, 246, 246, 1) 100%
    ),
    ${tokens.color.blue};
  border: 1px solid ${tokens.color.white};
  border-radius: 24px;
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  padding: ${tokens.spacing['5xl']} ${tokens.spacing.xl} ${tokens.spacing['4xl']};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transition:
    transform 320ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 320ms cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 24px 60px -24px rgba(56, 137, 255, 0.55);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    }
  }

  @media (min-width: 768px) {
    padding: ${tokens.spacing['7xl']} ${tokens.spacing['4xl']} ${tokens.spacing['5xl']};
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
  max-width: 784px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['5xl']};
  }
`

const Subtitle = styled.p`
  font-size: ${tokens.font.size.lg};
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.4;
  margin: 0;
  max-width: 460px;

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

const Marquee = styled.div`
  position: relative;
  z-index: 1;
  margin-top: ${tokens.spacing['3xl']};
  display: flex;
  flex-direction: column;
  gap: 12px;
  opacity: 0.6;
  pointer-events: none;
  user-select: none;
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 8%,
    black 92%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 8%,
    black 92%,
    transparent 100%
  );
`

const scrollLeft = keyframes`
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(-50%, 0, 0); }
`

const scrollRight = keyframes`
  from { transform: translate3d(-50%, 0, 0); }
  to   { transform: translate3d(0, 0, 0); }
`

const MarqueeTrack = styled.div<{ $direction: 'left' | 'right'; $duration: number }>`
  display: flex;
  gap: 8px;
  width: max-content;
  animation: ${({ $direction }) => ($direction === 'left' ? scrollLeft : scrollRight)}
    ${({ $duration }) => $duration}s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const Pill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 16px 4px 4px;
  background: ${tokens.color.white};
  border-radius: 9999px;
  white-space: nowrap;
  flex-shrink: 0;
`

const PillAvatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 9999px;
  border: 1px solid ${tokens.color.borderLight};
  object-fit: cover;
  flex-shrink: 0;
`

const PillName = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
`

const SHARE_TWEET_TEXT =
  "Delegate your ENS to an active voter and earn APR rewards automatically. Share to lift everyone's APR, including yours."

function buildTwitterShareUrl(): string {
  if (typeof window === 'undefined') return '#'
  const text = encodeURIComponent(SHARE_TWEET_TEXT)
  const url = encodeURIComponent(window.location.origin)
  return `https://twitter.com/intent/tweet?text=${text}&url=${url}`
}

function buildAvatarUrl(voter: VoterDetail): string {
  if (voter.avatarUrl) return voter.avatarUrl
  try {
    return makeBlockie(voter.address)
  } catch {
    return ''
  }
}

interface PillRowProps {
  voters: VoterDetail[]
  direction: 'left' | 'right'
  duration: number
}

function PillRow({ voters, direction, duration }: PillRowProps) {
  // Duplicate the list so the loop is seamless when the track translates -50%.
  const items = [...voters, ...voters]
  return (
    <MarqueeTrack $direction={direction} $duration={duration}>
      {items.map((voter, i) => {
        const label =
          voter.ensName ??
          (voter.address ? truncateAddress(voter.address) : 'voter')
        return (
          <Pill key={`${voter.address}-${i}`}>
            <PillAvatar src={buildAvatarUrl(voter)} alt="" aria-hidden />
            <PillName>{label}</PillName>
          </Pill>
        )
      })}
    </MarqueeTrack>
  )
}

export function CtaSection() {
  const fetchVoters = useCallback(() => api.activeVoters(), [])
  const { data } = useAsync(fetchVoters)

  const { rowA, rowB } = useMemo(() => {
    const voters = data?.voters ?? []
    // Show up to ~14 pills total so the marquee is full enough to feel continuous.
    const top = voters.slice(0, 14)
    const half = Math.ceil(top.length / 2)
    return {
      rowA: top.slice(0, half),
      rowB: top.slice(half).concat(top.slice(0, Math.max(0, half - (top.length - half)))),
    }
  }, [data])

  return (
    <Section data-testid="cta-section">
      <Card>
        <Inner>
          <Heading>Earn ENS rewards. Strengthen governance.</Heading>
          <Subtitle>
            Delegate in under a minute. Share the program to lift everyone&rsquo;s
            APR, including yours.
          </Subtitle>
          <Actions>
            <PrimaryCtaLink to="/voters" $fullWidthMobile>
              <Button colorStyle="background">
                Delegate to an active voter
                <FontAwesomeIcon icon={faArrowRight} />
              </Button>
            </PrimaryCtaLink>
            <SecondaryCtaLink
              href={buildTwitterShareUrl()}
              target="_blank"
              rel="noopener noreferrer"
              $fullWidthMobile
            >
              <Button colorStyle="background">
                <FontAwesomeIcon icon={faShareNodes} />
                Share the program
              </Button>
            </SecondaryCtaLink>
          </Actions>
        </Inner>

        {rowA.length > 0 && (
          <Marquee aria-hidden>
            <PillRow voters={rowA} direction="left" duration={45} />
            {rowB.length > 0 && (
              <PillRow voters={rowB} direction="right" duration={55} />
            )}
          </Marquee>
        )}
      </Card>
    </Section>
  )
}
