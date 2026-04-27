import type { EligibilityResponse } from '@/api/types'

export const eligibleDelegateFixture: EligibilityResponse = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  ensName: null,
  isActiveDelegate: true,
  isDelegatorToActiveDelegate: false,
  eligible: true,
  delegatedTo: null,
  delegatedToEnsName: null,
  source: null,
}

export const eligibleDelegatorFixture: EligibilityResponse = {
  address: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
  ensName: null,
  isActiveDelegate: false,
  isDelegatorToActiveDelegate: true,
  eligible: true,
  delegatedTo: '0x1234567890abcdef1234567890abcdef12345678',
  delegatedToEnsName: null,
  source: 'direct',
}

export const ineligibleFixture: EligibilityResponse = {
  address: '0x0000000000000000000000000000000000000001',
  ensName: null,
  isActiveDelegate: false,
  isDelegatorToActiveDelegate: false,
  eligible: false,
  delegatedTo: null,
  delegatedToEnsName: null,
  source: null,
}
