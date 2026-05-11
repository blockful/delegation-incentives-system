import styled, { css } from 'styled-components'
import { useEnsName } from 'wagmi'
import { isAddress } from 'viem'
import { tokens } from '@/styles'
import { CopyableAddress } from './CopyableAddress'
import { EnsAvatar } from './EnsAvatar'

type AddressIdentityLayout = 'inline' | 'stack'
type AddressIdentitySize = 'sm' | 'md' | 'lg' | 'xl'
type SecondaryAddressMode = 'auto' | 'always' | 'never'

interface AddressIdentityProps {
  address: string
  ensName?: string | null
  avatarUrl?: string | null
  showAvatar?: boolean
  avatarSize?: number
  layout?: AddressIdentityLayout
  size?: AddressIdentitySize
  fullAddress?: boolean
  resolveEns?: boolean
  secondaryAddress?: SecondaryAddressMode
  className?: string
}

const Wrapper = styled.span<{ $layout: AddressIdentityLayout }>`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  min-width: 0;
  max-width: 100%;
  color: inherit;

  ${({ $layout }) =>
    $layout === 'stack' &&
    css`
      align-items: flex-start;
    `}
`

const TextStack = styled.span<{ $layout: AddressIdentityLayout }>`
  display: flex;
  min-width: 0;
  max-width: 100%;

  ${({ $layout }) =>
    $layout === 'stack'
      ? css`
          flex-direction: column;
          gap: 2px;
        `
      : css`
          align-items: center;
          gap: ${tokens.spacing.xs};
        `}
`

const PrimaryName = styled.span<{ $size: AddressIdentitySize }>`
  min-width: 0;
  max-width: 100%;
  color: ${tokens.color.darkBlue};
  font-weight: ${tokens.font.weight.bold};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  ${({ $size }) => {
    if ($size === 'xl') {
      return css`
        font-size: ${tokens.font.size['3xl']};

        @media (min-width: 768px) {
          font-size: ${tokens.font.size['4xl']};
        }
      `
    }
    if ($size === 'lg') {
      return css`
        font-size: ${tokens.font.size['2xl']};
      `
    }
    if ($size === 'md') {
      return css`
        font-size: ${tokens.font.size.lg};
      `
    }
    return css`
      font-size: inherit;
    `
  }}
`

const PrimaryAddress = styled(CopyableAddress)<{ $size: AddressIdentitySize }>`
  color: ${tokens.color.darkBlue};
  font-weight: ${tokens.font.weight.bold};

  ${({ $size }) => {
    if ($size === 'xl') {
      return css`
        font-size: ${tokens.font.size['3xl']};

        @media (min-width: 768px) {
          font-size: ${tokens.font.size['4xl']};
        }
      `
    }
    if ($size === 'lg') {
      return css`
        font-size: ${tokens.font.size['2xl']};
      `
    }
    if ($size === 'md') {
      return css`
        font-size: ${tokens.font.size.lg};
      `
    }
    return css`
      font-size: inherit;
    `
  }}
`

const SecondaryAddress = styled(CopyableAddress)`
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
`

export function AddressIdentity({
  address,
  ensName,
  avatarUrl,
  showAvatar = false,
  avatarSize = 32,
  layout = 'inline',
  size = 'sm',
  fullAddress = false,
  resolveEns = true,
  secondaryAddress = 'auto',
  className,
}: AddressIdentityProps) {
  const canResolveAddress = isAddress(address)
  const { data: resolvedEnsName } = useEnsName({
    address: address as `0x${string}`,
    query: { enabled: resolveEns && canResolveAddress && !ensName },
  })
  const displayName = ensName ?? resolvedEnsName ?? null
  const shouldShowSecondaryAddress =
    secondaryAddress === 'always' || (secondaryAddress === 'auto' && Boolean(displayName))

  return (
    <Wrapper className={className} $layout={layout}>
      {showAvatar && (
        <EnsAvatar
          address={address}
          name={displayName ?? undefined}
          avatarUrl={avatarUrl}
          size={avatarSize}
          resolveName={false}
        />
      )}
      <TextStack $layout={layout}>
        {displayName ? (
          <PrimaryName $size={size} title={displayName}>
            {displayName}
          </PrimaryName>
        ) : (
          <PrimaryAddress
            address={address}
            full={fullAddress}
            resolveEns={false}
            showEnsName={false}
            $size={size}
          />
        )}
        {shouldShowSecondaryAddress && (
          <SecondaryAddress
            address={address}
            full={fullAddress}
            resolveEns={false}
            showEnsName={false}
          />
        )}
      </TextStack>
    </Wrapper>
  )
}
