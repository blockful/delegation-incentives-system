import { useState, useCallback, useRef, useEffect } from 'react'
import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

interface InfoTooltipProps {
  text: string
  children?: React.ReactNode
}

const Wrapper = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
`

const Trigger = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: none;
  padding: 0;
  cursor: help;
  color: ${tokens.color.textFaint};
  font-size: 14px;
  line-height: 1;
  border-radius: 50%;
  transition: color ${tokens.transition.fast};

  &:hover,
  &:focus-visible {
    color: ${tokens.color.accent};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.accent};
    outline-offset: 2px;
  }
`

const Bubble = styled.div<{ $visible: boolean }>`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: ${tokens.color.darkBlue};
  color: ${tokens.color.lightBlue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.normal};
  line-height: 1.5;
  padding: ${tokens.spacing.sm} ${tokens.spacing.md};
  border-radius: ${tokens.radius.sm};
  width: 240px;
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: translateX(-50%) translateY(${({ $visible }) => ($visible ? '0' : '4px')});
  transition: opacity 0.15s ease, transform 0.15s ease;
  z-index: 50;
  box-shadow: ${tokens.shadow.lg};

  /* Arrow */
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: ${tokens.color.darkBlue};
  }
`

export function InfoTooltip({ text, children }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false)
  const wrapperRef = useRef<HTMLSpanElement>(null)

  const show = useCallback(() => setVisible(true), [])
  const hide = useCallback(() => setVisible(false), [])
  const toggle = useCallback(() => setVisible((v) => !v), [])

  // Close on click outside
  useEffect(() => {
    if (!visible) return
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setVisible(false)
      }
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [visible])

  return (
    <Wrapper ref={wrapperRef} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      <Trigger
        type="button"
        onClick={toggle}
        aria-label="More info"
        aria-expanded={visible}
      >
        &#9432;
      </Trigger>
      <Bubble $visible={visible} role="tooltip">
        {text}
      </Bubble>
    </Wrapper>
  )
}
