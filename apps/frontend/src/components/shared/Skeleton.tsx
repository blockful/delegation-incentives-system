import type { PropsWithChildren } from 'react'
import styled, { keyframes } from 'styled-components'
import { tokens } from '@/styles/tokens'

const shimmer = keyframes`
  0% { background-position: 180% 0; }
  100% { background-position: -180% 0; }
`

export const ScreenReaderOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

interface SkeletonRegionProps extends PropsWithChildren {
  className?: string
  label?: string
}

export function SkeletonRegion({
  children,
  className,
  label = 'Loading content',
}: SkeletonRegionProps) {
  return (
    <div className={className} role="status" aria-busy="true">
      <ScreenReaderOnly>{label}</ScreenReaderOnly>
      {children}
    </div>
  )
}

interface SkeletonBlockProps {
  $height?: string
  $maxWidth?: string
  $radius?: string
  $width?: string
  $inline?: boolean
}

export const SkeletonBlock = styled.span.attrs({ 'aria-hidden': true })<SkeletonBlockProps>`
  display: ${({ $inline }) => ($inline ? 'inline-block' : 'block')};
  width: ${({ $width }) => $width ?? '100%'};
  max-width: ${({ $maxWidth }) => $maxWidth ?? 'none'};
  height: ${({ $height }) => $height ?? '1em'};
  border-radius: ${({ $radius }) => $radius ?? tokens.radius.sm};
  background:
    linear-gradient(
      90deg,
      ${tokens.color.bgSubtle} 0%,
      #e9eef3 35%,
      #f9fbfd 50%,
      ${tokens.color.bgSubtle} 72%
    );
  background-size: 220% 100%;
  animation: ${shimmer} 1.45s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background-position: 0 0;
  }
`

export const SkeletonCircle = styled(SkeletonBlock)<{ $size?: string }>`
  width: ${({ $size }) => $size ?? '40px'};
  height: ${({ $size }) => $size ?? '40px'};
  min-width: ${({ $size }) => $size ?? '40px'};
  border-radius: ${tokens.radius.pill};
`

export const SkeletonStack = styled.div<{ $gap?: string; $maxWidth?: string }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap }) => $gap ?? tokens.spacing.sm};
  max-width: ${({ $maxWidth }) => $maxWidth ?? 'none'};
  min-width: 0;
`

export const SkeletonInline = styled.div<{ $gap?: string; $align?: string }>`
  display: flex;
  align-items: ${({ $align }) => $align ?? 'center'};
  gap: ${({ $gap }) => $gap ?? tokens.spacing.md};
  min-width: 0;
`

export const SkeletonGrid = styled.div<{ $columns?: string; $gap?: string }>`
  display: grid;
  grid-template-columns: ${({ $columns }) => $columns ?? 'repeat(2, minmax(0, 1fr))'};
  gap: ${({ $gap }) => $gap ?? tokens.spacing.md};
  min-width: 0;
`

export const SkeletonCard = styled.div<{
  $gap?: string
  $minHeight?: string
  $padding?: string
  $radius?: string
}>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap }) => $gap ?? tokens.spacing.md};
  min-height: ${({ $minHeight }) => $minHeight ?? 'auto'};
  min-width: 0;
  padding: ${({ $padding }) => $padding ?? tokens.spacing.lg};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${({ $radius }) => $radius ?? tokens.radius.md};
  background: ${tokens.color.surface};
  box-shadow: ${tokens.shadow.sm};
`

interface SkeletonTextProps {
  gap?: string
  lineHeight?: string
  lines?: number
  maxWidth?: string
  widths?: string[]
}

export function SkeletonText({
  gap,
  lineHeight = '12px',
  lines = 2,
  maxWidth,
  widths,
}: SkeletonTextProps) {
  return (
    <SkeletonStack $gap={gap} $maxWidth={maxWidth}>
      {Array.from({ length: lines }, (_, index) => (
        <SkeletonBlock
          key={index}
          $height={lineHeight}
          $width={widths?.[index] ?? (index === lines - 1 && lines > 1 ? '72%' : '100%')}
        />
      ))}
    </SkeletonStack>
  )
}
