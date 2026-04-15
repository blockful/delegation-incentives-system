#!/usr/bin/env tsx
/**
 * Distribution script — triggered by cron after month-end.
 *
 * Usage:
 *   tsx scripts/run-distribution.ts
 *
 * Reads ROUND_MONTHS from environment, runs the pipeline for any completed
 * round whose output JSON does not yet exist, and writes the result to
 * distributions/{month}.json.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT, "distributions");

function getConfiguredRounds(): string[] {
  const raw = process.env.ROUND_MONTHS ?? "";
  return raw
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

function isMonthOver(month: string): boolean {
  const [year, m] = month.split("-").map(Number);
  // Month is over when the current UTC date is past the last day of the month
  const nextMonth = new Date(Date.UTC(year, m, 1)); // first day of next month
  return Date.now() >= nextMonth.getTime();
}

function outputExists(month: string): boolean {
  return fs.existsSync(path.join(DIST_DIR, `${month}.json`));
}

async function main() {
  const rounds = getConfiguredRounds();

  if (rounds.length === 0) {
    console.log("No ROUND_MONTHS configured. Nothing to do.");
    process.exit(0);
  }

  console.log(`Configured rounds: ${rounds.join(", ")}`);

  const pendingRounds = rounds.filter(
    (month) => isMonthOver(month) && !outputExists(month),
  );

  if (pendingRounds.length === 0) {
    console.log("All completed rounds already have distribution files. Nothing to do.");
    process.exit(0);
  }

  console.log(`Pending rounds to compute: ${pendingRounds.join(", ")}`);

  // Ensure output directory exists
  fs.mkdirSync(DIST_DIR, { recursive: true });

  for (const month of pendingRounds) {
    console.log(`\n=== Computing distribution for ${month} ===`);

    // NOTE: The actual pipeline execution requires a running Ponder instance
    // with an indexed database and a viem PublicClient. This script is a
    // skeleton that should be integrated with the backend's data source
    // once the system is deployed.
    //
    // In production, this would:
    // 1. Connect to the Ponder PostgreSQL database
    // 2. Create a viem PublicClient from RPC_URL
    // 3. Build the IncentivesDataSource via createDataSource(db, client)
    // 4. Call runDistributionPipeline(month, dataSource)
    // 5. Write the result JSON

    console.log(`TODO: Connect to Ponder DB and run pipeline for ${month}`);
    console.log(
      `Output would be written to: ${path.join(DIST_DIR, `${month}.json`)}`,
    );
  }
}

main().catch((err) => {
  console.error("Distribution script failed:", err);
  process.exit(1);
});
