import type { ReactNode } from 'react'
import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

/* ─── Styles ─── */

const Card = styled.div`
  border: 1px solid ${tokens.color.gray};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.spacing.lg};
  background: ${tokens.color.surface};
  box-shadow: ${tokens.shadow.sm};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const Label = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${tokens.color.darkGray};
`

const Value = styled.span<{ $color?: string }>`
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${({ $color }) => $color ?? tokens.color.darkBlue};
  line-height: 1.2;
`

const Sub = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
`

/* ─── Types ─── */

interface StatCardProps {
  label: string
  value: ReactNode
  sub?: string
  valueColor?: string
}

/* ─── Component ─── */

export function StatCard({ label, value, sub, valueColor }: StatCardProps) {
  return (
    <Card>
      <Label>{label}</Label>
      <Value $color={valueColor}>{value}</Value>
      {sub && <Sub>{sub}</Sub>}
    </Card>
  )
}
