import styled from 'styled-components'
import { Tag } from '@ensdomains/thorin'
import type { RewardRank } from '@/api/types'
import { tokens } from '@/styles/tokens'

/**
 * Reward-type Tag components used across the rounds list and round detail
 * tables. Thorin's `*Secondary` variants still read a bit saturated against the
 * white table — the `&&` background override lightens them with the project's
 * own light-tone tokens while leaving the text colour from the DS.
 */
export const AprTag = styled(Tag)`
  && {
    background-color: ${tokens.color.lightYellow};
  }
`

export const LotteryTag = styled(Tag)`
  && {
    background-color: ${tokens.color.lightOrange};
  }
`

export const DelegateTag = styled(Tag)`
  && {
    background-color: ${tokens.color.lightBlueOpacity};
  }
`

/** Picks the right Tag for a `RewardRank.source` value. */
export function RewardSourceTag({ source }: { source: RewardRank['source'] }) {
  if (source === 'lottery') {
    return (
      <LotteryTag colorStyle="orangeSecondary" size="small">
        Lottery
      </LotteryTag>
    )
  }
  if (source === 'combined') {
    return (
      <DelegateTag colorStyle="blueSecondary" size="small">
        Combined
      </DelegateTag>
    )
  }
  return null
}
