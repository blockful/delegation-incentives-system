import schema from "ponder:schema";
import { zeroAddress } from "viem";

import { normalizeAddress } from "../common/address.js";
import { ENS_TOKEN, HEDGEY_VESTING_ADDRESS } from "../common/constants.js";
import { eventMeta } from "../common/events.js";
import { ponder, type IndexingFunctionArgs } from "../common/ponder.js";

export function registerHedgeyVestingHandlers() {
  ponder.on(
    "HedgeyVesting:PlanCreated",
    async ({ event, context }: IndexingFunctionArgs<"HedgeyVesting:PlanCreated">) => {
      const { id, recipient, token, amount, start, cliff, rate, period } = event.args;
      const { blockNumber } = eventMeta(event);
      const tokenAddress = normalizeAddress(token);

      if (tokenAddress !== ENS_TOKEN) return;

      await context.db.insert(schema.vestingPlan).values({
        id,
        recipient: normalizeAddress(recipient),
        token: tokenAddress,
        amount,
        start,
        cliff,
        rate,
        period,
        amountRedeemed: 0n,
        createdAtBlock: blockNumber,
      });

      await context.db
        .insert(schema.protocolMapping)
        .values({
          id: `hedgey_vesting-${id.toString()}`,
          childAddress: HEDGEY_VESTING_ADDRESS,
          operatorAddress: normalizeAddress(recipient),
          protocol: "hedgey_vesting",
        })
        .onConflictDoNothing();
    },
  );

  ponder.on(
    "HedgeyVesting:PlanRedeemed",
    async ({ event, context }: IndexingFunctionArgs<"HedgeyVesting:PlanRedeemed">) => {
      const { id, amountRedeemed, planRemainder } = event.args;
      const { blockNumber, timestamp } = eventMeta(event);
      const plan = await context.db.find(schema.vestingPlan, { id });

      if (!plan) return;

      await context.db.update(schema.vestingPlan, { id }).set({
        amountRedeemed: plan.amountRedeemed + amountRedeemed,
      });

      await context.db.insert(schema.vestingRedemption).values({
        id: `${id.toString()}-${blockNumber}`,
        planId: id,
        amountRedeemed,
        planRemainder,
        blockNumber,
        timestamp,
      });
    },
  );

  ponder.on(
    "HedgeyVesting:Transfer",
    async ({ event, context }: IndexingFunctionArgs<"HedgeyVesting:Transfer">) => {
      const { from, to, tokenId } = event.args;

      if (from === zeroAddress) return;

      const plan = await context.db.find(schema.vestingPlan, { id: tokenId });
      if (!plan) return;

      const mappingId = `hedgey_vesting-${tokenId.toString()}`;

      if (to === zeroAddress) {
        await context.db.delete(schema.protocolMapping, { id: mappingId });
        return;
      }

      const recipient = normalizeAddress(to);

      await context.db.update(schema.vestingPlan, { id: tokenId }).set({
        recipient,
      });

      await context.db.update(schema.protocolMapping, { id: mappingId }).set({
        operatorAddress: recipient,
      });
    },
  );
}
