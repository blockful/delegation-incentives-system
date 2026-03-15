export const contracts = {
  ensIncentives: (import.meta.env.VITE_CONTRACT_ENS_INCENTIVES ??
    '0x0000000000000000000000000000000000000000') as `0x${string}`,
  delegateBySig: (import.meta.env.VITE_CONTRACT_DELEGATE_BY_SIG ??
    '0x0000000000000000000000000000000000000000') as `0x${string}`,
  rewardDistributor: (import.meta.env.VITE_CONTRACT_REWARD_DISTRIBUTOR ??
    '0x0000000000000000000000000000000000000000') as `0x${string}`,
} as const
