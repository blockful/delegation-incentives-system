import styled from 'styled-components'
import { Link } from 'react-router-dom'
import { tokens } from '@/styles/tokens'
import { fadeInUp } from '@/styles/primitives'

export type ToneCalloutTone = 'success' | 'warning' | 'pending' | 'danger' | 'neutral'

export interface ToneCalloutMetric {
  label: string
  value: React.ReactNode
}

export interface ToneCalloutAction {
  label: string
  to?: string
  onClick?: () => void
  external?: boolean
}

interface ToneCalloutProps {
  tone: ToneCalloutTone
  title: React.ReactNode
  body?: React.ReactNode
  metrics?: ToneCalloutMetric[]
  action?: ToneCalloutAction
  icon?: 'auto' | 'none' | React.ReactNode
  compact?: boolean
  className?: string
  children?: React.ReactNode
}

function defaultIcon(tone: ToneCalloutTone): string {
  if (tone === 'success') return '✓'
  if (tone === 'warning') return '!'
  if (tone === 'pending') return '⏳'
  if (tone === 'danger') return '✕'
  return 'ⓘ'
}

const Panel = styled.section<{ $tone: ToneCalloutTone; $compact: boolean }>`
  width: 100%;
  border: 1px solid ${({ $tone }) => tokens.color.status[$tone].border};
  background: ${({ $tone }) => tokens.color.status[$tone].bg};
  border-radius: ${tokens.radius.md};
  padding: ${({ $compact }) => ($compact ? tokens.spacing.lg : tokens.spacing['2xl'])};
  display: grid;
  gap: ${tokens.spacing.lg};
  animation: ${fadeInUp} 0.2s ease both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${tokens.spacing.md};
`

const IconBubble = styled.span<{ $tone: ToneCalloutTone }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  background: ${({ $tone }) => tokens.color.status[$tone].border};
  color: ${tokens.color.white};
  line-height: 1;
`

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
  min-width: 0;
`

const Title = styled.h2<{ $compact: boolean }>`
  margin: 0;
  font-size: ${({ $compact }) => ($compact ? tokens.font.size.lg : tokens.font.size['2xl'])};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.25;
`

const Body = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkGray};
  line-height: 1.6;
`

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${tokens.spacing.md};

  @media (min-width: 680px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

const Metric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const MetricLabel = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  letter-spacing: 0;
  color: ${tokens.color.darkGray};
`

const MetricValue = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkBlue};
  overflow-wrap: anywhere;
`

const ActionRow = styled.div`
  display: flex;
  gap: ${tokens.spacing.md};
  flex-wrap: wrap;
`

const ActionLink = styled(Link)<{ $tone: ToneCalloutTone }>`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  color: ${({ $tone }) => tokens.color.status[$tone].fg};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const ActionButton = styled.button<{ $tone: ToneCalloutTone }>`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  color: ${({ $tone }) => tokens.color.status[$tone].fg};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const ExternalAnchor = styled.a<{ $tone: ToneCalloutTone }>`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  color: ${({ $tone }) => tokens.color.status[$tone].fg};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

export function ToneCallout({
  tone,
  title,
  body,
  metrics,
  action,
  icon = 'auto',
  compact = false,
  className,
  children,
}: ToneCalloutProps) {
  const role = tone === 'danger' ? 'alert' : 'status'
  const iconNode =
    icon === 'none'
      ? null
      : icon === 'auto'
        ? <IconBubble $tone={tone} aria-hidden>{defaultIcon(tone)}</IconBubble>
        : icon

  return (
    <Panel $tone={tone} $compact={compact} className={className} role={role}>
      <Header>
        {iconNode}
        <HeaderText>
          <Title $compact={compact}>{title}</Title>
          {body && <Body>{body}</Body>}
        </HeaderText>
      </Header>

      {metrics && metrics.length > 0 && (
        <MetricsGrid>
          {metrics.map((metric) => (
            <Metric key={metric.label}>
              <MetricLabel>{metric.label}</MetricLabel>
              <MetricValue>{metric.value}</MetricValue>
            </Metric>
          ))}
        </MetricsGrid>
      )}

      {children}

      {action && (
        <ActionRow>
          {action.to ? (
            <ActionLink to={action.to} $tone={tone}>{action.label}</ActionLink>
          ) : action.external && typeof action.onClick === 'undefined' ? (
            <ExternalAnchor
              href={action.to ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              $tone={tone}
            >
              {action.label} ↗
            </ExternalAnchor>
          ) : (
            <ActionButton $tone={tone} onClick={action.onClick} type="button">
              {action.label}
            </ActionButton>
          )}
        </ActionRow>
      )}
    </Panel>
  )
}
