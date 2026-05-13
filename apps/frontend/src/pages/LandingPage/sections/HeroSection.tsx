import styled, { css, keyframes } from 'styled-components'
import { Button, EnsSVG } from '@ensdomains/thorin'
import { Link } from 'react-router-dom'
import { tokens } from '@/styles/tokens'
import { fadeInUp } from '@/styles/primitives'

const RouterLink = styled(Link)`
  text-decoration: none;

  @media (max-width: 767px) {
    width: 100%;
    display: block;

    button {
      width: 100%;
      justify-content: center;
    }
  }
`

interface HeroSectionProps {
  currentApyPct: string
}

const Section = styled.section`
  padding: ${tokens.spacing['5xl']} ${tokens.spacing.xl};
  text-align: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(
    to bottom,
    ${tokens.color.lightBlue},
    ${tokens.color.white}
  );
  border-bottom: 1px solid ${tokens.color.middleGray};

  @media (min-width: 768px) {
    padding: 100px ${tokens.spacing['4xl']} ${tokens.spacing['9xl']};
  }
`

const Content = styled.div`
  position: relative;
  z-index: 1;
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
`

const HeroEyebrow = styled.span`
  display: inline-block;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: ${tokens.color.darkGray};
  margin-bottom: ${tokens.spacing['2xl']};
  animation: ${fadeInUp} 0.5s ease both;
`

const Headline = styled.h1`
  font-size: ${tokens.font.size['4xl']};
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.darkBlue};
  line-height: 1.32;
  letter-spacing: -0.02em;
  margin: 0 auto ${tokens.spacing.lg};
  max-width: 680px;
  animation: ${fadeInUp} 0.5s ease 0.1s both;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['6xl']};
  }
`

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`

const floatUp = keyframes`
  0%   { transform: translateY(0);      opacity: 0.4; }
  60%  {                                opacity: 0.15; }
  100% { transform: translateY(-110vh); opacity: 0; }
`

const ParticlesLayer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
`

const Particle = styled.div<{
  $left: number
  $size: number
  $duration: number
  $delay: number
  $playing: boolean
}>`
  position: absolute;
  bottom: -60px;
  left: ${({ $left }) => $left}%;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  opacity: 0;
  will-change: transform, opacity;

  ${({ $playing, $duration, $delay }) =>
    $playing &&
    css`
      animation: ${floatUp} ${$duration}s ease-in ${$delay}s infinite;
    `}

  svg {
    width: 100%;
    height: 100%;
    color: ${tokens.color.blue};
  }
`

const ApyValue = styled.span`
  display: inline-block;
  color: ${tokens.color.blue};
  background: ${tokens.color.lightBlueOpacity};
  padding:  ${tokens.spacing.xs} ${tokens.spacing.md};
  border-radius: ${tokens.radius.md};
`

const Subtitle = styled.p`
  font-size: ${tokens.font.size.xl};
  line-height: 1.6;
  color: ${tokens.color.darkGray};
  max-width: ${tokens.maxWidth.md};
  margin: 0 auto ${tokens.spacing['4xl']};
  opacity: 0.75;
  animation: ${fadeInUp} 0.5s ease 0.2s both;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['2xl']};
  }
`

const FreeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(246, 248, 250, 0.2);
  border: 1px solid rgba(208, 215, 222, 0.2);
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
  color: white;
  margin-left: ${tokens.spacing.sm};
  vertical-align: middle;
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: ${tokens.spacing.md};
  margin: 0 auto ${tokens.spacing['5xl']};
  width: 100%;
  animation: ${fadeInUp} 0.5s ease 0.3s both;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: center;
    width: auto;
    align-items: center;
  }
`

const PARTICLE_CONFIGS = [
  { id: 0,  left: 5,  size: 18, duration: 12, delay: 0    },
  { id: 1,  left: 14, size: 26, duration: 16, delay: 3.5  },
  { id: 2,  left: 23, size: 14, duration: 10, delay: 7    },
  { id: 3,  left: 31, size: 30, duration: 14, delay: 1.5  },
  { id: 4,  left: 40, size: 20, duration: 11, delay: 5    },
  { id: 5,  left: 50, size: 16, duration: 15, delay: 9    },
  { id: 6,  left: 58, size: 24, duration: 13, delay: 6    },
  { id: 7,  left: 67, size: 12, duration: 9,  delay: 2    },
  { id: 8,  left: 75, size: 22, duration: 17, delay: 11   },
  { id: 9,  left: 84, size: 28, duration: 12, delay: 4    },
  { id: 10, left: 92, size: 15, duration: 14, delay: 8    },
  { id: 11, left: 9,  size: 20, duration: 10, delay: 13   },
  { id: 12, left: 28, size: 16, duration: 16, delay: 0.5  },
  { id: 13, left: 45, size: 28, duration: 11, delay: 10   },
  { id: 14, left: 63, size: 14, duration: 13, delay: 5.5  },
  { id: 15, left: 78, size: 22, duration: 9,  delay: 14   },
  { id: 16, left: 88, size: 18, duration: 15, delay: 2.5  },
  { id: 17, left: 19, size: 12, duration: 12, delay: 7.5  },
  { id: 18, left: 53, size: 26, duration: 10, delay: 3    },
  { id: 19, left: 96, size: 20, duration: 16, delay: 6.5  },
]

export function HeroSection({ currentApyPct }: HeroSectionProps) {
  return (
    <Section>
      <ParticlesLayer>
        {PARTICLE_CONFIGS.map(p => (
          <Particle key={p.id} $left={p.left} $size={p.size} $duration={p.duration} $delay={p.delay} $playing={true}>
            <EnsSVG />
          </Particle>
        ))}
      </ParticlesLayer>
      <Content>
        <HeroEyebrow>ENS Governance &middot; 90-Day Pilot</HeroEyebrow>
        <Headline>
          Your ENS could be earning <br />{' '}
          <ApyValue>{currentApyPct}% APY</ApyValue>
        </Headline>
        <Subtitle>
        Help secure ENS governance by delegating to an active voter.
        Rewards are automatic, gas is sponsored.
        </Subtitle>
        <Actions>
          <RouterLink to="/voters">
            <Button colorStyle="bluePrimary">
              Delegate Now &rarr;<FreeBadge>Free</FreeBadge>
            </Button>
          </RouterLink>
          <RouterLink to="/rounds">
            <Button colorStyle="blueSecondary">
              View Rounds
            </Button>
          </RouterLink>
        </Actions>
      </Content>
    </Section>
  )
}
