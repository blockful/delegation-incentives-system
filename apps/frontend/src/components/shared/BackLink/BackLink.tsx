import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

interface BackLinkProps {
  to: string
  children: React.ReactNode
  chevron?: 'left' | 'none'
}

const StyledLink = styled(Link)`
  color: ${tokens.color.blue};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  width: fit-content;
  transition: color ${tokens.transition.fast};

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.accent};
    outline-offset: 2px;
    border-radius: ${tokens.radius.sm};
  }
`

const Chevron = styled.span`
  color: ${tokens.color.darkGray};
  font-weight: ${tokens.font.weight.normal};
`

export function BackLink({ to, children, chevron = 'left' }: BackLinkProps) {
  return (
    <StyledLink to={to}>
      {chevron === 'left' && <Chevron aria-hidden>←</Chevron>}
      {children}
    </StyledLink>
  )
}
