import type { EligibilityResponse } from '@/api/types'

export const eligibleDelegateFixture: EligibilityResponse = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  isActiveDelegate: true,
  isDelegatorToActiveDelegate: false,
  eligible: true,
  delegatedTo: null,
}

export const eligibleDelegatorFixture: EligibilityResponse = {
  address: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
  isActiveDelegate: false,
  isDelegatorToActiveDelegate: true,
  eligible: true,
  delegatedTo: '0x1234567890abcdef1234567890abcdef12345678',
}

export const ineligibleFixture: EligibilityResponse = {
  address: '0x0000000000000000000000000000000000000001',
  isActiveDelegate: false,
  isDelegatorToActiveDelegate: false,
  eligible: false,
  delegatedTo: null,
}
