import type { EligibilityResponse } from '@/api/types'

export const eligibleActiveVoterFixture: EligibilityResponse = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  ensName: null,
  isActiveVoter: true,
  isTokenHolderOfActiveVoter: false,
  eligible: true,
  delegatedTo: null,
  delegatedToEnsName: null,
  source: null,
}

export const eligibleTokenHolderFixture: EligibilityResponse = {
  address: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
  ensName: null,
  isActiveVoter: false,
  isTokenHolderOfActiveVoter: true,
  eligible: true,
  delegatedTo: '0x1234567890abcdef1234567890abcdef12345678',
  delegatedToEnsName: null,
  source: 'direct',
}

export const ineligibleFixture: EligibilityResponse = {
  address: '0x0000000000000000000000000000000000000001',
  ensName: null,
  isActiveVoter: false,
  isTokenHolderOfActiveVoter: false,
  eligible: false,
  delegatedTo: null,
  delegatedToEnsName: null,
  source: null,
}
