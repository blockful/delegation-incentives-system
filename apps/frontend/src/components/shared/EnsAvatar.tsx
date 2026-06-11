import { useMemo } from 'react'
import styled from 'styled-components'
import { Avatar } from '@ensdomains/thorin'
import { useEnsName, useEnsAvatar } from 'wagmi'
import makeBlockie from 'ethereum-blockies-base64'
import { isAddress } from 'viem'

interface EnsAvatarProps {
  address: string
  name?: string
  avatarUrl?: string | null
  size?: number
  resolveName?: boolean
  /** Native img loading hint — pass 'lazy' for avatars in long lists. */
  loading?: 'lazy' | 'eager'
}

const Wrapper = styled.div<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  flex-shrink: 0;
`

export function EnsAvatar({
  address,
  name,
  avatarUrl,
  size = 32,
  resolveName = true,
  loading,
}: EnsAvatarProps) {
  const canResolveAddress = isAddress(address)
  const { data: resolvedName } = useEnsName({
    address: address as `0x${string}`,
    query: { enabled: resolveName && canResolveAddress && !name },
  })
  const ensName = name ?? resolvedName ?? undefined
  const { data: resolvedAvatar } = useEnsAvatar({
    name: ensName,
    query: { enabled: !!ensName && !avatarUrl },
  })
  // Memoized: makeBlockie renders to a canvas, which adds up in long lists
  // (~1,200 avatars on the round detail page) if regenerated per render.
  const src = useMemo(
    () => avatarUrl ?? resolvedAvatar ?? makeBlockie(address),
    [avatarUrl, resolvedAvatar, address],
  )

  return (
    <Wrapper $size={size}>
      <Avatar
        label={ensName ?? address}
        src={src}
        shape="circle"
        noBorder
        loading={loading}
      />
    </Wrapper>
  )
}
