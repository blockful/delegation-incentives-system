import type { ReactNode } from 'react'
import styled, { css } from 'styled-components'
import { cardStyles, cardHoverStyles } from '@/styles/primitives'
import { tokens } from '@/styles/tokens'
import { CopyableAddress } from './CopyableAddress'

/* ─── Styles ─── */

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing.md};

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

const cardLayoutStyles = css`
  ${cardStyles}
  ${cardHoverStyles}
  width: 100%;
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
  text-decoration: none;
  color: inherit;
  box-shadow: ${tokens.shadow.sm};
  box-sizing: border-box;
`

const Card = styled.a`
  ${cardLayoutStyles}
`

const CopyableCard = styled.div`
  ${cardLayoutStyles}
`

const CardLink = styled.a`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
  flex: 1;
  min-width: 0;
  color: inherit;
  text-decoration: none;
`

const IconBox = styled.span`
  width: 40px;
  height: 40px;
  border-radius: ${tokens.radius.md};
  background: ${tokens.color.darkBlue};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  overflow: hidden;
  padding: 6px;
  box-sizing: border-box;
`

const Content = styled.span`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const Title = styled.span`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Desc = styled.span`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkGray};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Tag = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.positiveEmphasis};
  background: ${tokens.color.tierHighlight};
  border: 1px solid ${tokens.color.positiveEmphasis};
  border-radius: ${tokens.radius.pill};
  padding: 2px 8px;
  white-space: nowrap;
  flex-shrink: 0;
`

const Chevron = styled.span`
  font-size: ${tokens.font.size.xl};
  color: ${tokens.color.textFaint};
  flex-shrink: 0;
`

/* ─── Types ─── */

export interface LinkCardItem {
  icon?: string
  iconSrc?: string
  title: string
  desc: ReactNode
  href: string
  tag?: string
  copyAddress?: string
}

interface LinkCardProps {
  item: LinkCardItem
}

/* ─── Components ─── */

export function LinkCard({ item }: LinkCardProps) {
  const body = (
    <>
      {(item.icon || item.iconSrc) && (
        <IconBox aria-hidden>
          {item.iconSrc
            ? <img src={item.iconSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', margin: 'auto' }} />
            : item.icon}
        </IconBox>
      )}
      <Content>
        <Title>{item.title}</Title>
        <Desc>{item.desc}</Desc>
      </Content>
      {item.tag && <Tag>{item.tag}</Tag>}
      <Chevron aria-hidden>›</Chevron>
    </>
  )

  if (item.copyAddress) {
    return (
      <CopyableCard>
        <CardLink href={item.href} target="_blank" rel="noopener noreferrer">
          {body}
        </CardLink>
        <CopyableAddress address={item.copyAddress} showEnsName={false} resolveEns={false} />
      </CopyableCard>
    )
  }

  return (
    <Card href={item.href} target="_blank" rel="noopener noreferrer">
      {body}
    </Card>
  )
}

export function LinkCardRow({ items }: { items: LinkCardItem[] }) {
  return (
    <Grid>
      {items.map((item) => (
        <LinkCard key={item.title} item={item} />
      ))}
    </Grid>
  )
}

export function LinkCardStack({ items }: { items: LinkCardItem[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
      {items.map((item) => (
        <LinkCard key={item.title} item={item} />
      ))}
    </div>
  )
}
