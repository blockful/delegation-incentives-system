import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { Link } from 'react-router-dom'
import { tokens } from '@/styles/tokens'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: ${tokens.spacing['4xl']};
  text-align: center;
  gap: ${tokens.spacing.xl};
`

const Code = styled.span`
  font-size: 64px;
  font-weight: ${tokens.font.weight.extrabold};
  color: ${tokens.color.border};
  line-height: 1;
`

const Title = styled.h1`
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

export function NotFoundPage() {
  return (
    <Wrapper>
      <Code>404</Code>
      <Title>Page not found</Title>
      <Message>The page you're looking for doesn't exist.</Message>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <Button colorStyle="bluePrimary" size="small">
          Go home
        </Button>
      </Link>
    </Wrapper>
  )
}
