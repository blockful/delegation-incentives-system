import { useEffect, useState } from 'react'
import { usePublicClient } from 'wagmi'
import styled from 'styled-components'
import { tokens } from '@/styles/tokens'
import { LiveDot } from '@/components/shared/LiveDot'

interface ContractLivenessProps {
  address: string
  chainId?: number
}

type ProbeState =
  | { status: 'loading' }
  | { status: 'reachable'; block: bigint }
  | { status: 'unreachable' }

const Row = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.sm};
  line-height: 1.4;
  color: ${tokens.color.darkGray};
`

// When the contract is unreachable or we're still probing, mute the LiveDot toward
// neutral grey without forking the primitive — override the background it paints itself.
const MutedDotWrap = styled.span`
  display: inline-flex;
  & > span {
    background: ${tokens.color.textFaint};
    color: transparent;
  }
`

const Mono = styled.span`
  font-family: ${tokens.font.mono};
  font-variant-numeric: tabular-nums;
`

export function ContractLiveness({ address, chainId = 1 }: ContractLivenessProps) {
  const publicClient = usePublicClient({ chainId })
  const [state, setState] = useState<ProbeState>({ status: 'loading' })

  useEffect(() => {
    if (!publicClient) return
    let cancelled = false
    setState({ status: 'loading' })

    const probe = async () => {
      try {
        const code = await publicClient.getCode({ address: address as `0x${string}` })
        if (cancelled) return
        if (code && code !== '0x') {
          const block = await publicClient.getBlockNumber()
          if (cancelled) return
          setState({ status: 'reachable', block })
        } else {
          setState({ status: 'unreachable' })
        }
      } catch {
        if (cancelled) return
        setState({ status: 'unreachable' })
      }
    }

    void probe()
    return () => {
      cancelled = true
    }
  }, [publicClient, address])

  const reachable = state.status === 'reachable'
  const tone: 'success' | 'warning' = reachable ? 'success' : 'warning'
  // Pulse only when we have a live signal; loading/unreachable stay quiet.
  const pulse = reachable

  let label: React.ReactNode
  if (state.status === 'loading') {
    label = <>Checking&hellip;</>
  } else if (state.status === 'reachable') {
    label = (
      <>
        Reachable as of block <Mono>{Number(state.block).toLocaleString('en-US')}</Mono>
      </>
    )
  } else {
    label = <>Could not reach contract</>
  }

  const dot = <LiveDot tone={tone} pulse={pulse} size={6} />

  return (
    <Row role="status" aria-live="polite">
      {reachable ? dot : <MutedDotWrap>{dot}</MutedDotWrap>}
      {label}
    </Row>
  )
}
