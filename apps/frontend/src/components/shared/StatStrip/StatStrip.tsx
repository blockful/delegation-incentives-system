import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

interface StatStripProps {
  children: React.ReactNode
  columns?: 2 | 3 | 4 | 5 | 6
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

const Strip = styled.div<{ $columns: NonNullable<StatStripProps['columns']>; $gap: NonNullable<StatStripProps['gap']> }>`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ $gap }) => tokens.spacing[$gap]};
  min-width: 0;

  @media (min-width: 760px) {
    grid-template-columns: repeat(${({ $columns }) => $columns}, minmax(0, 1fr));
  }
`

export function StatStrip({ children, columns = 4, gap = 'md', className }: StatStripProps) {
  return (
    <Strip $columns={columns} $gap={gap} className={className}>
      {children}
    </Strip>
  )
}
