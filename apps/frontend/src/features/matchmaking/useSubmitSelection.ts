import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSignMessage } from 'wagmi'
import { buildSelectionMessage } from '@ens-dis/domain'
import { api } from '@/api'
import { isUserRejection } from '@/features/delegate/utils/gaslessRelayerError'
import { useWalletState } from '@/features/wallet/useWalletState'
import { errorMessageForAnalytics, trackEvent } from '@/utils/analytics'
import { matchmakingKeys } from './queryKeys'

/**
 * The single write path: sign a deterministic message over the chosen words and
 * upsert. On success, invalidate every matchmaking surface + the voters list so
 * cards, profile, and dashboard all resolve together (FE requirement).
 *
 * Call `mutateAsync(words)` with the 5 selected word ids.
 *
 * Being the single write path also makes this the single analytics point:
 * matchmaking_submit / matchmaking_submit_error fire here for every surface.
 * `source` only labels the events ('new' = first-time flow, 'edit' = edit modal).
 */
export function useSubmitSelection(source: 'new' | 'edit' = 'new') {
  const wallet = useWalletState()
  const address = wallet.status === 'disconnected' ? undefined : wallet.address
  const { signMessageAsync } = useSignMessage()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (words: string[]) => {
      if (!address) throw new Error('Connect your wallet to save your values')
      let stage: 'signature' | 'api' = 'signature'
      try {
        const message = buildSelectionMessage(address, words)
        const signature = await signMessageAsync({ message })
        stage = 'api'
        return await api.putSelection(address, { words, signature })
      } catch (err) {
        trackEvent('matchmaking_submit_error', {
          source,
          stage,
          reason: isUserRejection(err) ? 'user-rejected' : 'other',
          message: errorMessageForAnalytics(err),
        })
        throw err
      }
    },
    onSuccess: (_data, words) => {
      trackEvent('matchmaking_submit', {
        source,
        wordCount: words.length,
      })
      queryClient.invalidateQueries({ queryKey: matchmakingKeys.all })
      queryClient.invalidateQueries({ queryKey: ['voters'] })
    },
  })
}
