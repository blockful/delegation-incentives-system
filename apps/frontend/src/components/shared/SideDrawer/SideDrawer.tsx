import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styled, { css, keyframes } from 'styled-components'
import { tokens } from '@/styles/tokens'

export type SideDrawerSide = 'right' | 'bottom'

interface SideDrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  side?: SideDrawerSide
  width?: string
  children: ReactNode
  className?: string
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`

const slideInRight = keyframes`
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
`

const slideInBottom = keyframes`
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
`

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.32);
  z-index: 1000;
  animation: ${fadeIn} 200ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const Panel = styled.aside<{ $side: SideDrawerSide; $width: string }>`
  position: fixed;
  z-index: 1001;
  background: ${tokens.color.surface};
  box-shadow: ${tokens.shadow.lg};
  display: flex;
  flex-direction: column;
  outline: none;

  ${({ $side, $width }) =>
    $side === 'right'
      ? css`
          top: 0;
          right: 0;
          bottom: 0;
          width: ${$width};
          max-width: 100vw;
          height: 100dvh;
          animation: ${slideInRight} 240ms ease-out;
        `
      : css`
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 80vh;
          max-height: 80dvh;
          border-top-left-radius: ${tokens.radius.lg};
          border-top-right-radius: ${tokens.radius.lg};
          animation: ${slideInBottom} 240ms ease-out;
        `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: none;
  }
`

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.lg} ${tokens.spacing['2xl']};
  border-bottom: 1px solid ${tokens.color.border};
  flex-shrink: 0;
`

const Title = styled.h2`
  margin: 0;
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.25;
  min-width: 0;
  overflow-wrap: anywhere;
`

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  background: transparent;
  border: none;
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.darkGray};
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  transition: background ${tokens.transition.fast}, color ${tokens.transition.fast};

  &:hover {
    background: ${tokens.color.surfaceAlt};
    color: ${tokens.color.darkBlue};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
  }
`

const Content = styled.div`
  flex: 1 1 auto;
  overflow-y: auto;
  padding: ${tokens.spacing['2xl']};
`

function useResolvedSide(side?: SideDrawerSide): SideDrawerSide {
  // Side is resolved on each render. If consumer passes explicit value, honor it;
  // otherwise default to 'right' on desktop, 'bottom' on mobile (max-width: 640px).
  if (side) return side
  if (typeof window === 'undefined') return 'right'
  return window.matchMedia('(max-width: 640px)').matches ? 'bottom' : 'right'
}

export function SideDrawer({
  open,
  onClose,
  title,
  side,
  width = '420px',
  children,
  className,
}: SideDrawerProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLElement | null>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const resolvedSide = useResolvedSide(side)

  const handleBackdropClick = useCallback(() => {
    onClose()
  }, [onClose])

  // Esc closes
  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Body scroll lock while open
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  // Focus management: capture previously focused, focus first focusable in drawer,
  // restore on close/unmount.
  useEffect(() => {
    if (!open) return
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null

    const panel = panelRef.current
    if (panel) {
      const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      const first = focusables[0]
      if (first) {
        first.focus()
      } else {
        panel.focus()
      }
    }

    return () => {
      const prev = previouslyFocusedRef.current
      if (prev && typeof prev.focus === 'function') {
        prev.focus()
      }
    }
  }, [open])

  // Tab / Shift+Tab trap
  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1)
      if (focusables.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }
      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!
      const active = document.activeElement as HTMLElement | null

      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault()
          last.focus()
        }
      } else {
        if (active === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  if (!open) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <Backdrop onClick={handleBackdropClick} aria-hidden="true" />
      <Panel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        $side={resolvedSide}
        $width={width}
        className={className}
      >
        <Header>
          <Title id={titleId}>{title}</Title>
          <CloseButton type="button" aria-label="Close" onClick={onClose}>
            ×
          </CloseButton>
        </Header>
        <Content>{children}</Content>
      </Panel>
    </>,
    document.body,
  )
}
