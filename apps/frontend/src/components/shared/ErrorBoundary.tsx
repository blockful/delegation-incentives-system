import { Component, type ReactNode } from 'react'
import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: ${tokens.spacing['4xl']};
  text-align: center;
  gap: ${tokens.spacing.lg};
`

const Title = styled.h2`
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
  margin: 0;
`

const Message = styled.p`
  font-size: ${tokens.font.size.md};
  color: ${tokens.color.textMuted};
  margin: 0;
`

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Wrapper>
          <Title>Something went wrong</Title>
          <Message>Please refresh the page and try again.</Message>
        </Wrapper>
      )
    }
    return this.props.children
  }
}
