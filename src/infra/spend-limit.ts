// Spend ceilings for unattended work: a cumulative USD cap for all model calls
// and optional per-provider caps, checked before each call.
import type { OpenClawConfig } from "../config/types.openclaw.js";
import { loadCostUsageSummaryFromCache } from "./session-cost-usage-cache-runtime.js";

/**
 * How long a spend reading stays usable. A turn can issue many model calls in
 * quick succession, and re-reading the usage cache for each one would put a
 * SQLite read plus a transcript directory scan on the hot path. Spend cannot
 * move without a completed call, so a few seconds of staleness costs at most a
 * small overshoot past the ceiling — far cheaper than stalling every call.
 */
const SPEND_READING_TTL_MS = 5_000;

/** Days of history a limit counts. Spend is cumulative, so this is deliberately wide. */
const SPEND_WINDOW_DAYS = 3650;

export type SpendLimits = {
  totalUsd: number;
  byProvider: Record<string, number>;
};

export type SpendLimitVerdict =
  | { kind: "ok" }
  | { kind: "total"; spentUsd: number; limitUsd: number }
  | { kind: "provider"; provider: string; spentUsd: number; limitUsd: number };

type SpendReading = {
  totalUsd: number;
  byProvider: Record<string, number>;
  readAtMs: number;
};

const readingsByAgent = new Map<string, SpendReading>();

function normalizeLimit(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Configured ceilings, or undefined when none apply. Callers use this to skip
 * the usage read entirely, so an install without limits pays nothing.
 */
export function readSpendLimits(cfg?: OpenClawConfig): SpendLimits | undefined {
  const defaults = cfg?.agents?.defaults;
  const totalUsd = normalizeLimit(defaults?.spendLimitUsd);
  const rawByProvider = defaults?.spendLimitUsdByProvider ?? {};
  const byProvider: Record<string, number> = {};
  for (const [provider, limit] of Object.entries(rawByProvider)) {
    const normalizedProvider = provider.trim().toLowerCase();
    const normalizedLimit = normalizeLimit(limit);
    if (normalizedProvider && normalizedLimit > 0) {
      byProvider[normalizedProvider] = normalizedLimit;
    }
  }
  if (totalUsd <= 0 && Object.keys(byProvider).length === 0) {
    return undefined;
  }
  return { totalUsd, byProvider };
}

async function readSpend(params: {
  cfg?: OpenClawConfig;
  agentId: string;
  nowMs: number;
}): Promise<SpendReading> {
  const cached = readingsByAgent.get(params.agentId);
  if (cached && params.nowMs - cached.readAtMs < SPEND_READING_TTL_MS) {
    return cached;
  }
  const startMs = params.nowMs - SPEND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  // Cache-only read: a spend check must never block on rebuilding usage rollups.
  const summary = await loadCostUsageSummaryFromCache({
    startMs,
    endMs: params.nowMs,
    config: params.cfg,
    agentId: params.agentId,
    requestRefresh: true,
  });
  const reading: SpendReading = {
    totalUsd: summary.totals.totalCost ?? 0,
    byProvider: summary.providerCosts ?? {},
    readAtMs: params.nowMs,
  };
  readingsByAgent.set(params.agentId, reading);
  return reading;
}

/**
 * Whether this call is still within the configured ceilings. Returns `ok` when
 * no limit is configured, so the check is cheap on the default path.
 */
export async function checkSpendLimit(params: {
  cfg?: OpenClawConfig;
  agentId: string;
  provider?: string;
  nowMs?: number;
}): Promise<SpendLimitVerdict> {
  const limits = readSpendLimits(params.cfg);
  if (!limits) {
    return { kind: "ok" };
  }
  const nowMs = params.nowMs ?? Date.now();
  let reading: SpendReading;
  try {
    reading = await readSpend({ cfg: params.cfg, agentId: params.agentId, nowMs });
  } catch {
    // A usage-cache failure must not become an outage: an unreadable ledger
    // means we cannot prove the limit was passed, and blocking every call on
    // that would be worse than briefly spending past it.
    return { kind: "ok" };
  }
  if (limits.totalUsd > 0 && reading.totalUsd >= limits.totalUsd) {
    return { kind: "total", spentUsd: reading.totalUsd, limitUsd: limits.totalUsd };
  }
  const provider = params.provider?.trim().toLowerCase();
  const providerLimit = provider ? limits.byProvider[provider] : undefined;
  if (provider && providerLimit !== undefined) {
    const providerSpend = reading.byProvider[provider] ?? 0;
    if (providerSpend >= providerLimit) {
      return { kind: "provider", provider, spentUsd: providerSpend, limitUsd: providerLimit };
    }
  }
  return { kind: "ok" };
}

/** Operator-facing explanation, including the exact config key to change. */
export function describeSpendLimitVerdict(verdict: SpendLimitVerdict): string | undefined {
  if (verdict.kind === "ok") {
    return undefined;
  }
  if (verdict.kind === "total") {
    return (
      `Spend limit reached: $${verdict.spentUsd.toFixed(4)} spent of the ` +
      `$${verdict.limitUsd.toFixed(2)} ceiling (agents.defaults.spendLimitUsd). ` +
      "All model calls are blocked until you raise or remove that limit."
    );
  }
  return (
    `Spend limit reached for "${verdict.provider}": $${verdict.spentUsd.toFixed(4)} spent of the ` +
    `$${verdict.limitUsd.toFixed(2)} ceiling ` +
    `(agents.defaults.spendLimitUsdByProvider.${verdict.provider}). ` +
    "Calls to this provider are blocked; raise its limit or switch to another provider."
  );
}

/** Test-only: drops cached spend readings so a case can control the ledger. */
export function resetSpendLimitReadingsForTests(): void {
  readingsByAgent.clear();
}
