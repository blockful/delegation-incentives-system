import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styled, { keyframes } from 'styled-components'
import { tokens } from '@/styles/tokens'

interface ModalProps {
  open: boolean
  onClose: () => void
  /**
   * Accessible name for the dialog. The visible title lives inside `children`
   * (the design centers it in the card body), so the name is supplied here.
   */
  label: string
  /** Max width of the centered card. Defaults to 520px (design spec). */
  width?: string
  /** Hide the top-right close affordance (e.g. a forced step). */
  hideClose?: boolean
  children: ReactNode
  className?: string
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`

const popIn = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: none; }
`

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${tokens.spacing.lg};
  background: rgba(0, 0, 0, 0.32);
  animation: ${fadeIn} 200ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  /* Mobile: dock to the bottom as a sheet (parity with SideDrawer's bottom variant). */
  @media (max-width: 640px) {
    align-items: flex-end;
    padding: 0;
  }
`

const Card = styled.div<{ $width: string }>`
  position: relative;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: ${({ $width }) => $width};
  max-height: calc(100dvh - ${tokens.spacing['3xl']});
  overflow-y: auto;
  background: ${tokens.color.surface};
  /* Hero modal: design uses a 20px radius; DS radius tokens cap at 8px, so raw. */
  border-radius: 20px;
  box-shadow: ${tokens.shadow.lg};
  padding: ${tokens.spacing['4xl']};
  outline: none;
  animation: ${popIn} 200ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @media (max-width: 640px) {
    max-width: 100%;
    max-height: 90dvh;
    padding: ${tokens.spacing['2xl']};
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
`

const CloseButton = styled.button`
  position: absolute;
  top: ${tokens.spacing.lg};
  right: ${tokens.spacing.lg};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: ${tokens.color.white};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.pill};
  color: ${tokens.color.textSecondary};
  font-size: 18px;
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

/**
 * Centered modal dialog. Shares SideDrawer's a11y contract (portal, focus trap,
 * Esc to close, body scroll lock, backdrop-click to dismiss, focus restore) but
 * renders a centered card instead of an edge-anchored panel. On mobile it docks
 * to the bottom as a sheet. The visible title is rendered by the caller inside
 * `children`; `label` provides the dialog's accessible name.
 */
export function Modal({
  open,
  onClose,
  label,
  width = tokens.maxWidth.md,
  hideClose = false,
  children,
  className,
}: ModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  // Esc closes.
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

  // Body scroll lock while open.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  // Focus management: capture previously focused, focus first focusable, restore on close.
  useEffect(() => {
    if (!open) return
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null

    const card = cardRef.current
    if (card) {
      const focusables = card.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      const first = focusables[0]
      if (first) {
        first.focus()
      } else {
        card.focus()
      }
    }

    return () => {
      const prev = previouslyFocusedRef.current
      if (prev && typeof prev.focus === 'function') {
        prev.focus()
      }
    }
  }, [open])

  // Tab / Shift+Tab trap.
  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const card = cardRef.current
      if (!card) return
      const focusables = Array.from(
        card.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1)
      if (focusables.length === 0) {
        event.preventDefault()
        card.focus()
        return
      }
      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!
      const active = document.activeElement as HTMLElement | null

      if (event.shiftKey) {
        if (active === first || !card.contains(active)) {
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

  const handleBackdropClick = useCallback(() => onClose(), [onClose])

  if (!open) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <Backdrop onClick={handleBackdropClick}>
      <Card
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        $width={width}
        className={className}
        onClick={(event) => event.stopPropagation()}
      >
        {!hideClose && (
          <CloseButton type="button" aria-label="Close" onClick={onClose}>
            ×
          </CloseButton>
        )}
        {children}
      </Card>
    </Backdrop>,
    document.body,
  )
}
