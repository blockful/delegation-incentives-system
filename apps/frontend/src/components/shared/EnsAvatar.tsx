import styled from 'styled-components'

interface EnsAvatarProps {
  address: string
  name?: string
  size?: number
}

function hueFromAddress(address: string): number {
  let hash = 0
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

const Circle = styled.div<{ $size: number; $hue: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background: hsl(${({ $hue }) => $hue}, 65%, 55%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: ${({ $size }) => Math.round($size * 0.4)}px;
  text-transform: uppercase;
  flex-shrink: 0;
`

export function EnsAvatar({ address, name, size = 32 }: EnsAvatarProps) {
  const label = name ? name.slice(0, 2) : address.slice(2, 4)
  const hue = hueFromAddress(address)

  return (
    <Circle $size={size} $hue={hue}>
      {label}
    </Circle>
  )
}
