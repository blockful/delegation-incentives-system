import styled from 'styled-components'
import { useEnsName, useEnsAvatar } from 'wagmi'
import makeBlockie from 'ethereum-blockies-base64'

interface EnsAvatarProps {
  address: string
  name?: string
  size?: number
}

const Img = styled.img<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
`

export function EnsAvatar({ address, name, size = 32 }: EnsAvatarProps) {
  const { data: resolvedName } = useEnsName({
    address: address as `0x${string}`,
    query: { enabled: !name },
  })

  const ensName = name ?? resolvedName ?? undefined

  const { data: avatarUrl } = useEnsAvatar({
    name: ensName,
    query: { enabled: !!ensName },
  })

  const src = avatarUrl ?? makeBlockie(address)

  return <Img $size={size} src={src} alt={ensName ?? address} />
}
