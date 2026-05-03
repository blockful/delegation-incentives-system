#!/usr/bin/env tsx
/**
 * Compute configured round distributions through the backend API.
 *
 * Usage:
 *   pnpm --dir apps/backend distribution:run
 *   pnpm --dir apps/backend distribution:run -- --month 2026-04 --force
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface Args {
  months: string[];
  force: boolean;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadEnvFile(): void {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] != null) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function parseArgs(argv: string[]): Args {
  const months: string[] = [];
  let force = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--force") {
      force = true;
      continue;
    }

    if (arg === "--month") {
      const month = argv[i + 1];
      if (!month) throw new Error("--month requires a YYYY-MM value");
      months.push(month);
      i += 1;
      continue;
    }

    if (arg.startsWith("--month=")) {
      months.push(arg.slice("--month=".length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { months, force };
}

function parseRoundMonths(): string[] {
  return (process.env.ROUND_MONTHS ?? "")
    .split(",")
    .map((month) => month.trim())
    .filter((month) => /^\d{4}-\d{2}$/.test(month))
    .sort();
}

function apiBaseUrl(): string {
  const explicit = process.env.DISTRIBUTION_API_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const port = process.env.BACKEND_PORT ?? "42069";
  return `http://localhost:${port}`;
}

async function assertReady(baseUrl: string): Promise<void> {
  const ready = await fetch(`${baseUrl}/ready`);
  if (!ready.ok) {
    throw new Error(`Backend is not ready: ${ready.status} ${ready.statusText}`);
  }

  const status = await fetch(`${baseUrl}/status`);
  if (status.ok) {
    const body = await status.json().catch(() => null) as any;
    const blockNumber = body?.mainnet?.block?.number;
    if (blockNumber != null) {
      console.log(`Backend ready at indexed mainnet block ${blockNumber}`);
    }
  }
}

async function computeMonth(baseUrl: string, month: string, force: boolean): Promise<void> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const adminToken = process.env.DISTRIBUTION_ADMIN_TOKEN;
  if (adminToken) headers["x-distribution-admin-token"] = adminToken;

  const response = await fetch(`${baseUrl}/distributions/${month}/compute`, {
    method: "POST",
    headers,
    body: JSON.stringify({ force }),
  });
  const body = await response.json().catch(() => null) as any;

  if (!response.ok) {
    throw new Error(
      `Failed to compute ${month}: ${response.status} ${body?.error ?? response.statusText}`,
    );
  }

  if (body?.status === "skipped") {
    console.log(`${month}: skipped, ${body.reason ?? "round is not ready"}`);
    return;
  }

  console.log(
    `${month}: ${body.status}, distributed ${body.totalDistributedEns} ENS, rewards ${body.rewardCount}, lottery buckets ${body.lotteryBucketCount}`,
  );
}

async function main(): Promise<void> {
  loadEnvFile();

  const args = parseArgs(process.argv.slice(2));
  const configured = parseRoundMonths();
  const months = args.months.length > 0
    ? args.months
    : configured;

  if (months.length === 0) {
    console.log("No ROUND_MONTHS to compute.");
    return;
  }

  const baseUrl = apiBaseUrl();
  await assertReady(baseUrl);

  for (const month of months) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new Error(`Invalid month format: ${month}`);
    }

    await computeMonth(baseUrl, month, args.force);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
