import { useCallback, useRef, type KeyboardEvent } from 'react'
import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

export interface TabDescriptor {
  id: string
  label: string
}

interface TabsProps {
  tabs: TabDescriptor[]
  activeId: string
  onChange: (id: string) => void
  className?: string
  'aria-label'?: string
}

// Segmented switcher track (Figma 5620:158): both tabs sit inside one
// pill-shaped grey track with no border and a 4px gutter. The active tab
// reads as a white pill floating inside the track with a subtle shadow.
const TabList = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.surfaceAlt};
`

const TabButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: ${tokens.radius.pill};
  border: none;
  background: ${({ $active }) => ($active ? tokens.color.white : 'transparent')};
  box-shadow: ${({ $active }) =>
    $active ? '0px 1px 1px rgba(0, 0, 0, 0.08)' : 'none'};
  color: ${({ $active }) => ($active ? tokens.color.text : tokens.color.textMuted)};
  font-family: inherit;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  letter-spacing: 0;
  cursor: pointer;
  transition:
    background ${tokens.transition.fast},
    box-shadow ${tokens.transition.fast},
    color ${tokens.transition.fast};

  &:hover {
    color: ${tokens.color.text};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.accent};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export function Tabs({
  tabs,
  activeId,
  onChange,
  className,
  'aria-label': ariaLabel,
}: TabsProps) {
  const buttonRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map())

  const focusTab = useCallback(
    (id: string) => {
      const node = buttonRefs.current.get(id)
      if (node) node.focus()
    },
    [],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      const currentIndex = tabs.findIndex((t) => t.id === activeId)
      if (currentIndex === -1 || tabs.length === 0) return
      const delta = event.key === 'ArrowRight' ? 1 : -1
      const nextIndex = (currentIndex + delta + tabs.length) % tabs.length
      const nextTab = tabs[nextIndex]
      onChange(nextTab.id)
      focusTab(nextTab.id)
    },
    [tabs, activeId, onChange, focusTab],
  )

  return (
    <TabList role="tablist" aria-label={ariaLabel} className={className}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeId
        return (
          <TabButton
            key={tab.id}
            type="button"
            role="tab"
            id={tab.id}
            aria-selected={isActive}
            aria-controls={`${tab.id}-panel`}
            tabIndex={isActive ? 0 : -1}
            $active={isActive}
            ref={(el) => {
              buttonRefs.current.set(tab.id, el)
            }}
            onClick={() => onChange(tab.id)}
            onKeyDown={handleKeyDown}
          >
            {tab.label}
          </TabButton>
        )
      })}
    </TabList>
  )
}
