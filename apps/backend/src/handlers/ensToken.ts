import schema from "ponder:schema";
import { zeroAddress } from "viem";

import { normalizeAddress } from "../common/address.js";
import { eventMeta } from "../common/events.js";
import { ponder, type IndexingFunctionArgs } from "../common/ponder.js";

export function registerEnsTokenHandlers() {
  ponder.on(
    "ENSToken:Transfer",
    async ({ event, context }: IndexingFunctionArgs<"ENSToken:Transfer">) => {
      const { from, to, value } = event.args;
      const { blockNumber, timestamp, transactionHash, logId } = eventMeta(event);

      if (from !== zeroAddress) {
        const fromAddress = normalizeAddress(from);

        const { balance: currentSenderBalance } = await context.db
          .insert(schema.ensBalance)
          .values({
            id: fromAddress,
            balance: -value,
            lastUpdatedBlock: blockNumber,
          })
          .onConflictDoUpdate((row) => ({
            balance: row.balance - value,
            lastUpdatedBlock: blockNumber,
          }));

        await context.db.insert(schema.ensBalanceEvent).values({
          id: `${logId}-from`,
          accountId: fromAddress,
          balance: currentSenderBalance,
          delta: -value,
          deltaMod: value,
          blockNumber,
          timestamp,
          transactionHash,
        });
      }

      if (to !== zeroAddress) {
        const toAddress = normalizeAddress(to);

        const { balance: currentReceiverBalance } = await context.db
          .insert(schema.ensBalance)
          .values({
            id: toAddress,
            balance: value,
            lastUpdatedBlock: blockNumber,
          })
          .onConflictDoUpdate((row) => ({
            balance: row.balance + value,
            lastUpdatedBlock: blockNumber,
          }));

        await context.db.insert(schema.ensBalanceEvent).values({
          id: `${logId}-to`,
          accountId: toAddress,
          balance: currentReceiverBalance,
          delta: value,
          deltaMod: value,
          blockNumber,
          timestamp,
          transactionHash,
        });
      }
    },
  );

  ponder.on(
    "ENSToken:DelegateChanged",
    async ({ event, context }: IndexingFunctionArgs<"ENSToken:DelegateChanged">) => {
      const { delegator, fromDelegate, toDelegate } = event.args;
      const { blockNumber, timestamp, transactionHash, logId } = eventMeta(event);
      const delegatorAddress = normalizeAddress(delegator);
      const delegatorBalance = await context.db.find(schema.ensBalance, {
        id: delegatorAddress,
      });
      const delegatedValue = delegatorBalance?.balance ?? 0n;

      await context.db
        .insert(schema.ensDelegation)
        .values({
          id: delegatorAddress,
          delegateId: normalizeAddress(toDelegate),
          lastUpdatedBlock: blockNumber,
        })
        .onConflictDoUpdate({
          delegateId: normalizeAddress(toDelegate),
          lastUpdatedBlock: blockNumber,
        });

      await context.db.insert(schema.ensDelegationEvent).values({
        id: logId,
        delegatorId: delegatorAddress,
        fromDelegateId: normalizeAddress(fromDelegate),
        toDelegateId: normalizeAddress(toDelegate),
        delegatedValue,
        blockNumber,
        timestamp,
        transactionHash,
      });
    },
  );

  ponder.on(
    "ENSToken:DelegateVotesChanged",
    async ({ event, context }: IndexingFunctionArgs<"ENSToken:DelegateVotesChanged">) => {
      const { delegate, previousBalance, newBalance } = event.args;
      const { blockNumber, timestamp, transactionHash, logId } = eventMeta(event);
      const delta = newBalance - previousBalance;
      const deltaMod = delta > 0n ? delta : -delta;

      await context.db.insert(schema.ensVotingPowerSnapshot).values({
        id: logId,
        accountId: normalizeAddress(delegate),
        votingPower: newBalance,
        delta,
        deltaMod,
        blockNumber,
        timestamp,
        transactionHash,
      });
    },
  );
}
