import { useState, useCallback, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { useEnsName } from 'wagmi'
import { isAddress } from 'viem'
import { tokens } from '@/styles'
import { truncateAddress } from '@/utils/format'

interface CopyableAddressProps {
  address: string
  ensName?: string | null
  full?: boolean
  resolveEns?: boolean
  showEnsName?: boolean
  className?: string
}

const Wrapper = styled.button<{ $monospace: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  max-width: 100%;
  min-width: 0;
  padding: 2px ${tokens.spacing.xs};
  border-radius: ${tokens.radius.sm};
  border: none;
  background: transparent;
  color: inherit;
  font-family: ${({ $monospace }) => ($monospace ? tokens.font.mono : 'inherit')};
  font-weight: inherit;
  font-size: inherit;
  cursor: pointer;
  transition: background ${tokens.transition.fast}, color ${tokens.transition.fast};

  &:hover {
    background: ${tokens.color.bgSubtle};
    color: ${tokens.color.darkBlue};
  }
`

const Text = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Feedback = styled.span`
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.positiveEmphasis};
  font-family: ${tokens.font.family};
  font-weight: ${tokens.font.weight.semibold};
  white-space: nowrap;
`

export function CopyableAddress({
  address,
  ensName,
  full = false,
  resolveEns = true,
  showEnsName = true,
  className,
}: CopyableAddressProps) {
  const [copied, setCopied] = useState(false)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canResolveAddress = isAddress(address)
  const { data: resolvedEnsName } = useEnsName({
    address: address as `0x${string}`,
    query: {
      enabled: resolveEns && showEnsName && canResolveAddress && !ensName,
    },
  })
  const displayName = showEnsName ? (ensName ?? resolvedEnsName ?? null) : null
  const displayText = displayName ?? (full ? address : truncateAddress(address))

  const handleCopy = useCallback(() => {
    const copyPromise = navigator.clipboard?.writeText(address)
    if (!copyPromise) return

    void copyPromise
      .then(() => {
        setCopied(true)
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
        resetTimerRef.current = setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {
        setCopied(false)
      })
  }, [address])

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [])

  return (
    <Wrapper
      type="button"
      className={className}
      $monospace={!displayName}
      onClick={handleCopy}
      title={`Copy ${address}`}
      aria-label={`Copy address ${address}`}
    >
      <Text>{displayText}</Text>
      {copied && <Feedback>Copied</Feedback>}
    </Wrapper>
  )
}
