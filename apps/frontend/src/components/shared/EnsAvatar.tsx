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
  const src = avatarUrl ?? resolvedAvatar ?? makeBlockie(address)

  return (
    <Wrapper $size={size}>
      <Avatar label={ensName ?? address} src={src} shape="circle" noBorder />
    </Wrapper>
  )
}
