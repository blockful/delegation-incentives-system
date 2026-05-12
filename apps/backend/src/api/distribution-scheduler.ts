import {
  computeAndStoreDistribution,
  type ComputeDistributionOptions,
  type ComputeDistributionResponse,
} from "./distribution-compute.js";
import { getConfiguredRoundMonths, getRoundDateRange } from "./round-config.js";

const SCAN_INTERVAL_MS = 60 * 1000;
const STARTUP_DELAY_MS = 0;
const MONTH_END_GRACE_MS = 60 * 1000;

type Timer = ReturnType<typeof setTimeout>;

type SchedulerLogger = Pick<Console, "info" | "warn" | "error">;

export interface AutomaticDistributionScanResult {
  ready: boolean;
  checkedMonths: string[];
  computedMonths: string[];
  cachedMonths: string[];
  skippedMonths: string[];
  failedMonths: Array<{ month: string; error: string }>;
}

export interface AutomaticDistributionSchedulerOptions {
  intervalMs?: number;
  startupDelayMs?: number;
  graceMs?: number;
  now?: () => Date;
  getRoundMonths?: () => string[];
  isReady?: () => Promise<boolean>;
  computeDistribution?: (
    month: string,
    options?: ComputeDistributionOptions,
  ) => Promise<ComputeDistributionResponse>;
  logger?: SchedulerLogger;
}

export interface AutomaticDistributionScheduler {
  runOnce: () => Promise<AutomaticDistributionScanResult>;
  stop: () => void;
}

let activeScheduler: AutomaticDistributionScheduler | null = null;

export function startAutomaticDistributionScheduler(
  options: AutomaticDistributionSchedulerOptions = {},
): AutomaticDistributionScheduler | null {
  if (isTestProcess()) return null;

  if (activeScheduler) return activeScheduler;

  const scheduler = createAutomaticDistributionScheduler(options);
  activeScheduler = scheduler;
  return scheduler;
}

export function createAutomaticDistributionScheduler(
  options: AutomaticDistributionSchedulerOptions = {},
): AutomaticDistributionScheduler {
  const logger = options.logger ?? console;
  const intervalMs = options.intervalMs ?? SCAN_INTERVAL_MS;
  const startupDelayMs = options.startupDelayMs ?? STARTUP_DELAY_MS;

  let intervalTimer: Timer | null = null;
  let startupTimer: Timer | null = null;
  let running = false;

  const runOnce = async (): Promise<AutomaticDistributionScanResult> => {
    if (running) {
      return emptyScanResult(false);
    }

    running = true;
    try {
      return await runAutomaticDistributionScan({ ...options, logger });
    } finally {
      running = false;
    }
  };

  startupTimer = setTimeout(() => {
    void runOnce();
  }, startupDelayMs);
  maybeUnref(startupTimer);

  intervalTimer = setInterval(() => {
    void runOnce();
  }, intervalMs);
  maybeUnref(intervalTimer);

  logger.info(
    `[distribution-scheduler] Automatic distribution computation enabled; interval=${intervalMs}ms startupDelay=${startupDelayMs}ms`,
  );

  return {
    runOnce,
    stop: () => {
      if (startupTimer) {
        clearTimeout(startupTimer);
        startupTimer = null;
      }
      if (intervalTimer) {
        clearInterval(intervalTimer);
        intervalTimer = null;
      }
      if (activeScheduler) activeScheduler = null;
    },
  };
}

export async function runAutomaticDistributionScan(
  options: AutomaticDistributionSchedulerOptions = {},
): Promise<AutomaticDistributionScanResult> {
  const logger = options.logger ?? console;
  const now = options.now?.() ?? new Date();
  const months = options.getRoundMonths?.() ?? getConfiguredRoundMonths();
  const graceMs = options.graceMs ?? MONTH_END_GRACE_MS;
  const isReady = options.isReady ?? isLocalPonderReady;
  const computeDistribution = options.computeDistribution ?? computeAndStoreDistribution;

  if (months.length === 0) {
    return emptyScanResult(true);
  }

  if (!(await isReady())) {
    logger.info("[distribution-scheduler] Indexer is not ready; automatic distribution scan deferred");
    return emptyScanResult(false);
  }

  const result: AutomaticDistributionScanResult = {
    ready: true,
    checkedMonths: [],
    computedMonths: [],
    cachedMonths: [],
    skippedMonths: [],
    failedMonths: [],
  };

  for (const month of months) {
    if (!shouldAttemptMonth(month, now, graceMs)) continue;

    result.checkedMonths.push(month);

    try {
      const response = await computeDistribution(month, { now });

      if (response.status === "computed") {
        result.computedMonths.push(month);
        logger.info(`[distribution-scheduler] Computed distribution for ${month}`);
      } else if (response.status === "cached") {
        result.cachedMonths.push(month);
      } else {
        result.skippedMonths.push(month);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.failedMonths.push({ month, error: message });
      logger.error(`[distribution-scheduler] Failed to compute distribution for ${month}: ${message}`);
    }
  }

  return result;
}

export function shouldAttemptMonth(month: string, now: Date, graceMs: number): boolean {
  const { endDate } = getRoundDateRange(month);
  return now.getTime() > Date.parse(endDate) + graceMs;
}

async function isLocalPonderReady(): Promise<boolean> {
  const port = process.env.PORT ?? process.env.BACKEND_PORT ?? "42069";

  try {
    const response = await fetch(`http://127.0.0.1:${port}/ready`);
    return response.ok;
  } catch {
    return false;
  }
}

function emptyScanResult(ready: boolean): AutomaticDistributionScanResult {
  return {
    ready,
    checkedMonths: [],
    computedMonths: [],
    cachedMonths: [],
    skippedMonths: [],
    failedMonths: [],
  };
}

function isTestProcess(): boolean {
  return process.env.NODE_ENV === "test" || process.env.VITEST === "true";
}

function maybeUnref(timer: Timer): void {
  const maybeNodeTimer = timer as unknown as { unref?: () => void };
  maybeNodeTimer.unref?.();
}
