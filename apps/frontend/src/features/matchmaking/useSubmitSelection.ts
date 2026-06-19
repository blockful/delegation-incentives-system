import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSignMessage } from 'wagmi'
import { buildSelectionMessage } from '@ens-dis/domain'
import { api } from '@/api'
import { useWalletState } from '@/features/wallet/useWalletState'
import { matchmakingKeys } from './queryKeys'

/**
 * The single write path: sign a deterministic message over the chosen words and
 * upsert. On success, invalidate every matchmaking surface + the voters list so
 * cards, profile, and dashboard all resolve together (FE requirement).
 *
 * Call `mutateAsync(words)` with the 5 selected word ids.
 */
export function useSubmitSelection() {
  const wallet = useWalletState()
  const address = wallet.status === 'disconnected' ? undefined : wallet.address
  const { signMessageAsync } = useSignMessage()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (words: string[]) => {
      if (!address) throw new Error('Connect your wallet to save your values')
      const message = buildSelectionMessage(address, words)
      const signature = await signMessageAsync({ message })
      return api.putSelection(address, { words, signature })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchmakingKeys.all })
      queryClient.invalidateQueries({ queryKey: ['voters'] })
    },
  })
}
