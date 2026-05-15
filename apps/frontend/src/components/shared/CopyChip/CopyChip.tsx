import { useCallback, useEffect, useRef, useState } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy, faCheck } from '@fortawesome/free-solid-svg-icons'
import { tokens } from '@/styles/tokens'

export interface CopyChipProps {
  /** The value written to the clipboard on click. */
  value: string
  /** Optional visible prefix (e.g. "Seed:"). */
  label?: string
  /** Optional display value overriding `value` (e.g. truncated hash). */
  display?: string
  /** Render the display value in the mono stack. Defaults to true. */
  mono?: boolean
  /** Message announced/visible after a successful copy. Defaults to "Copied". */
  toastMessage?: string
  /** Keep the copy glyph visible at all times (otherwise only on hover/focus). */
  alwaysShowIcon?: boolean
  className?: string
}

const copiedFlash = keyframes`
  0%   { background: ${tokens.color.status.success.bg}; border-color: ${tokens.color.status.success.border}; }
  100% { background: ${tokens.color.white}; border-color: ${tokens.color.borderLight}; }
`

const Chip = styled.button<{ $copied: boolean; $alwaysShowIcon: boolean }>`
  /* Reset */
  appearance: none;
  font-family: inherit;
  cursor: pointer;

  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  min-height: 28px;
  padding: 4px ${tokens.spacing.sm};
  max-width: 100%;

  background: ${tokens.color.white};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.sm};
  line-height: 1.2;

  transition:
    background ${tokens.motion.inFast},
    border-color ${tokens.motion.inFast},
    color ${tokens.motion.inFast};

  &:hover {
    background: ${tokens.color.bgSubtle};
    border-color: ${tokens.color.middleGray};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
    border-color: ${tokens.color.blue};
  }

  /* Hover/focus reveals the copy glyph unless alwaysShowIcon. */
  ${({ $alwaysShowIcon }) =>
    !$alwaysShowIcon &&
    css`
      & [data-copychip-icon] {
        opacity: 0;
        transition: opacity ${tokens.motion.inFast};
      }
      &:hover [data-copychip-icon],
      &:focus-visible [data-copychip-icon] {
        opacity: 1;
      }
    `}

  ${({ $copied }) =>
    $copied &&
    css`
      animation: ${copiedFlash} 200ms ease-out;
      border-color: ${tokens.color.status.success.border};
      color: ${tokens.color.status.success.fg};

      & [data-copychip-icon] {
        opacity: 1;
      }

      @media (prefers-reduced-motion: reduce) {
        animation: none;
      }
    `}
`

const Label = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkGray};
  white-space: nowrap;
`

const DisplayValue = styled.span<{ $mono: boolean }>`
  font-family: ${({ $mono }) => ($mono ? tokens.font.mono : 'inherit')};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
`

const IconSlot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  font-size: 11px;
  color: ${tokens.color.darkGray};
  flex-shrink: 0;
`

const SrOnly = styled.span`
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

export function CopyChip({
  value,
  label,
  display,
  mono = true,
  toastMessage = 'Copied',
  alwaysShowIcon = false,
  className,
}: CopyChipProps) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const shown = display ?? value

  const handleCopy = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      }
    } catch {
      // Clipboard not available; still flash the visual confirmation.
    }
    setCopied(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopied(false), 1200)
  }, [value])

  const ariaLabel = label
    ? `Copy ${label.replace(/:$/, '')}: ${shown}`
    : `Copy ${shown}`

  return (
    <Chip
      type="button"
      onClick={handleCopy}
      aria-label={ariaLabel}
      $copied={copied}
      $alwaysShowIcon={alwaysShowIcon}
      className={className}
    >
      {label && <Label>{label}</Label>}
      <DisplayValue $mono={mono}>{shown}</DisplayValue>
      <IconSlot data-copychip-icon aria-hidden>
        <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
      </IconSlot>
      <SrOnly aria-live="polite" role="status">
        {copied ? toastMessage : ''}
      </SrOnly>
    </Chip>
  )
}
