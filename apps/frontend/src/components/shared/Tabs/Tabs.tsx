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

// Segmented switcher track: both tabs sit inside one pill-shaped container
// with a subtle background + hairline border and no gap between segments. The
// active tab reads as a filled pill floating inside this track. The thin
// padding insets the active fill so the track edge stays visible around it.
const TabList = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0;
  padding: 3px;
  border-radius: ${tokens.radius.pill};
  border: 1px solid ${tokens.color.borderLight};
  background: ${tokens.color.bgSubtle};
`

const TabButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 ${tokens.spacing.md};
  border-radius: ${tokens.radius.pill};
  border: 1px solid transparent;
  background: ${({ $active }) => ($active ? tokens.color.lightBlue : 'transparent')};
  color: ${({ $active }) => ($active ? tokens.color.darkBlue : tokens.color.darkGray)};
  font-family: inherit;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  letter-spacing: 0;
  cursor: pointer;
  transition:
    background ${tokens.transition.fast},
    color ${tokens.transition.fast};

  &:hover {
    color: ${tokens.color.darkBlue};
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
