import styled from 'styled-components'
import { Tooltip } from '@ensdomains/thorin'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { tokens } from '@/styles/tokens'

interface LabelWithTooltipProps {
  children: React.ReactNode
  text: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  iconAriaLabel?: string
}

const Wrapper = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: help;
  color: ${tokens.color.textSubtle};
  transition: color ${tokens.transition.fast};

  &:hover {
    color: ${tokens.color.darkGray};
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

export function LabelWithTooltip({
  children,
  text,
  placement = 'top',
  iconAriaLabel,
}: LabelWithTooltipProps) {
  return (
    <Wrapper>
      {children}
      <Tooltip content={text} placement={placement}>
        <IconButton type="button" aria-label={iconAriaLabel ?? 'More info'}>
          <FontAwesomeIcon icon={faCircleInfo} />
        </IconButton>
      </Tooltip>
    </Wrapper>
  )
}
