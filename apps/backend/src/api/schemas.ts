import { z } from "zod"
import { isAddress } from "viem"

export const MonthParam = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "must be YYYY-MM").openapi({
  param: { name: "month", in: "path" },
  example: "2025-03",
  description: "Distribution month in YYYY-MM format",
})

export const AddressParam = z
  .string()
  .refine((v) => isAddress(v, { strict: false }), { message: "Invalid Ethereum address" })
  .openapi({
    param: { name: "address", in: "path" },
    example: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    description: "Ethereum address (checksummed or lowercase)",
  })

export const ErrorSchema = z.object({ error: z.string() }).openapi("Error")
export const HealthSchema = z.object({ status: z.enum(["ok"]) }).openapi("Health")

export const TierSchema = z.object({
  momGrowthMinBps: z.string(),
  momGrowthMaxBps: z.string(),
  poolSize: z.string(),
  delegateCap: z.string(),
  delegatorCap: z.string(),
}).openapi("Tier")

export const PayoutSchema = z.object({
  address: z.string(),
  amount: z.string(),
  amountEns: z.string(),
  role: z.enum(["delegate", "delegator"]),
}).openapi("Payout")

export const LotteryEntrySchema = z.object({
  address: z.string(),
  originalAmount: z.string(),
  role: z.enum(["delegate", "delegator"]),
}).openapi("LotteryEntry")

export const LotteryPoolSchema = z.object({
  totalPrize: z.string(),
  totalPrizeEns: z.string(),
  winner: z.string(),
  entries: z.array(LotteryEntrySchema),
}).openapi("LotteryPool")

export const MetadataSchema = z.object({
  totalDistributed: z.string(),
  totalDistributedEns: z.string(),
  poolTier: TierSchema,
  momGrowthBps: z.string(),
  activeDelegateCount: z.number(),
  eligibleDelegatorCount: z.number(),
  computedAt: z.string(),
  randaoSeed: z.string(),
}).openapi("DistributionMetadata")

export const ComputeResultSchema = z.object({
  month: z.string(),
  totalDistributed: z.string(),
  activeDelegateCount: z.number(),
  eligibleDelegatorCount: z.number(),
  directPayoutCount: z.number(),
  lotteryPoolCount: z.number(),
}).openapi("ComputeResult")

export const DistributionSchema = z.object({
  month: z.string(),
  metadata: MetadataSchema,
  directPayouts: z.array(PayoutSchema),
  lotteryPools: z.array(LotteryPoolSchema),
}).openapi("Distribution")

export const ActiveDelegatesSchema = z.object({
  count: z.number(),
  delegates: z.array(z.string()),
}).openapi("ActiveDelegates")

export const DelegateDetailSchema = z.object({
  address: z.string(),
  ensName: z.string().nullable(),
  votingPower: z.string().nullable().openapi({ description: "Voting power in wei" }),
  delegatorCount: z.number().nullable(),
  activeSince: z.string().nullable().openapi({ description: "ISO date of first delegation received" }),
  last10ProposalsVoted: z.array(z.boolean()).nullable().openapi({
    description: "Array of 10 booleans, true = delegate voted on that proposal",
  }),
}).openapi("DelegateDetail")

export const ActiveDelegatesDetailSchema = z.object({
  count: z.number(),
  delegates: z.array(DelegateDetailSchema),
}).openapi("ActiveDelegatesDetail")

export const EligibilitySchema = z.object({
  address: z.string(),
  isActiveDelegate: z.boolean(),
  isDelegatorToActiveDelegate: z.boolean(),
  eligible: z.boolean(),
  delegatedTo: z.string().nullable(),
}).openapi("Eligibility")

export const StatusSchema = z.object({
  activeDelegateCount: z.number(),
  proposalCount: z.number(),
  cachedDistributions: z.array(z.string()),
}).openapi("Status")

export const TierProgressionEntrySchema = z.object({
  index: z.number(),
  momGrowthMinPct: z.string(),
  momGrowthMaxPct: z.string(),
  poolSizeEns: z.string(),
  delegateCapEns: z.string(),
  delegatorCapEns: z.string(),
  isCurrent: z.boolean(),
  isUnlocked: z.boolean(),
  additionalVPNeeded: z.string(),
  requiredAVP: z.string(),
  estimatedApyPct: z.string().openapi({
    description: 'Estimated delegator APY for this tier, accounting for proportional balance growth',
    example: '8.50',
  }),
}).openapi("TierProgressionEntry")

export const TierProgressionSchema = z.object({
  currentAVP: z.string(),
  previousAVP: z.string(),
  currentGrowthBps: z.string(),
  currentGrowthPct: z.string(),
  currentTierIndex: z.number(),
  activeDelegateCount: z.number(),
  maxDelegatorApyPct: z.string(),
  tiers: z.array(TierProgressionEntrySchema),
}).openapi("TierProgression")

export const RoundInfoSchema = z.object({
  roundNumber: z.number().openapi({ description: "Current round number (1-based)", example: 2 }),
  startDate: z.string().openapi({ description: "Round start date ISO", example: "2025-02-14T00:00:00.000Z" }),
  endDate: z.string().openapi({ description: "Round end date ISO", example: "2025-03-16T00:00:00.000Z" }),
  percentComplete: z.number().openapi({ description: "Round progress 0-100", example: 47 }),
  daysRemaining: z.number().openapi({ description: "Days until round end", example: 14 }),
  poolSizeEns: z.string().openapi({ description: "Current tier pool size in ENS", example: "5000" }),
  tierIndex: z.number().openapi({ description: "Current tier index", example: 0 }),
}).openapi("RoundInfo")

export const ApyEstimateSchema = z.object({
  address: z.string(),
  /** "delegate" | "delegator" | "ineligible". Self-delegates who are active get "delegate". */
  role: z.enum(["delegate", "delegator", "ineligible"]),
  delegatedTo: z.string().nullable(),
  poolSizeEns: z.string(),
  estimatedMonthlyRewardEns: z.string(),
  estimatedApyPct: z.string(),
  /**
   * The address's weight in its sub-pool, in wei.
   * Delegates: current voting power (VP).
   * Delegators: 180-day time-weighted ENS balance.
   */
  userShareWei: z.string(),
  /**
   * Sum of all participants' weights in the same sub-pool, in wei.
   * Delegates: sum of all active delegates' VP.
   * Delegators: sum of all eligible delegators' TWB.
   */
  totalShareWei: z.string(),
  currentBalanceEns: z.string(),
}).openapi("ApyEstimate")
