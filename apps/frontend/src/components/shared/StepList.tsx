import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

/* ─── Types ─── */

export type StepItem =
  | string
  | { title: string; desc: string }

interface StepListProps {
  steps: StepItem[]
}

/* ─── Styles ─── */

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xl};
`

const Item = styled.div`
  display: flex;
  gap: ${tokens.spacing.lg};
  align-items: flex-start;
`

const Number = styled.div`
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.blue};
  color: ${tokens.color.white};
  font-weight: ${tokens.font.weight.bold};
  font-size: ${tokens.font.size.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 3px;
`

const Title = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.4;
`

const Desc = styled.p`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkGray};
  margin: 0;
  line-height: 1.6;
`

/* ─── Component ─── */

export function StepList({ steps }: StepListProps) {
  return (
    <List>
      {steps.map((step, i) => (
        <Item key={i}>
          <Number>{i + 1}</Number>
          <Body>
            {typeof step === 'string' ? (
              <Desc style={{ paddingTop: 0 }}>{step}</Desc>
            ) : (
              <>
                <Title>{step.title}</Title>
                <Desc>{step.desc}</Desc>
              </>
            )}
          </Body>
        </Item>
      ))}
    </List>
  )
}
