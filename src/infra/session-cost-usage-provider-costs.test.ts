// Per-provider spend is folded out of the per-model rollup buckets the summary
// pass already walks; the per-provider spend limit reads it.
import { describe, expect, it } from "vitest";
import { addRollupToCostUsageSummary } from "./session-cost-usage-projection.js";
import { createEmptyCostUsageTotals } from "./session-cost-usage-totals.js";
import type { CostUsageTotals } from "./session-cost-usage.types.js";

const totalsWithCost = (totalCost: number): CostUsageTotals =>
  Object.assign(createEmptyCostUsageTotals(), { totalCost });

const rollupWith = (models: Array<{ provider?: string; model?: string; totalCost: number }>) => ({
  buckets: {
    b1: {
      timestampMs: 1_000,
      totals: totalsWithCost(models.reduce((sum, entry) => sum + entry.totalCost, 0)),
      messageCounts: { total: 0, user: 0, assistant: 0 },
      tools: [],
      models: models.map((entry) => ({
        provider: entry.provider,
        model: entry.model,
        count: 1,
        totals: totalsWithCost(entry.totalCost),
      })),
      latency: { count: 0, max: 0, sum: 0, centroids: [] },
    },
  },
  untimestamped: {
    totals: createEmptyCostUsageTotals(),
    messageCounts: { total: 0, user: 0, assistant: 0 },
    tools: [],
    models: [],
  },
});

const foldProviderCosts = (
  models: Array<{ provider?: string; model?: string; totalCost: number }>,
) => {
  const providerCosts = new Map<string, number>();
  addRollupToCostUsageSummary({
    rollup: rollupWith(models) as never,
    startMs: 0,
    endMs: 10_000,
    formatDay: () => "2026-09-03",
    daily: new Map(),
    totals: createEmptyCostUsageTotals(),
    providerCosts,
  });
  return Object.fromEntries(providerCosts);
};

describe("per-provider cost accumulation", () => {
  it("sums cost per provider across models", () => {
    expect(
      foldProviderCosts([
        { provider: "anthropic", model: "claude-opus-4-6", totalCost: 1.5 },
        { provider: "anthropic", model: "claude-haiku-4-5", totalCost: 0.25 },
        { provider: "google", model: "gemini-3.5-flash", totalCost: 0.1 },
      ]),
    ).toEqual({ anthropic: 1.75, google: 0.1 });
  });

  it("lowercases providers so casing cannot split one provider's spend", () => {
    // A split key would let a provider quietly run past its ceiling.
    expect(
      foldProviderCosts([
        { provider: "Anthropic", model: "claude-opus-4-6", totalCost: 1 },
        { provider: "anthropic", model: "claude-opus-4-6", totalCost: 2 },
      ]),
    ).toEqual({ anthropic: 3 });
  });

  it("skips entries with no provider attribution", () => {
    expect(
      foldProviderCosts([
        { model: "unknown-model", totalCost: 5 },
        { provider: "   ", model: "blank", totalCost: 5 },
        { provider: "google", model: "gemini-3.5-flash", totalCost: 0.5 },
      ]),
    ).toEqual({ google: 0.5 });
  });

  it("stays absent when the caller does not ask for it", () => {
    // The accumulator is opt-in so existing summary callers pay nothing.
    const totals = createEmptyCostUsageTotals();
    addRollupToCostUsageSummary({
      rollup: rollupWith([{ provider: "google", totalCost: 1 }]) as never,
      startMs: 0,
      endMs: 10_000,
      formatDay: () => "2026-09-03",
      daily: new Map(),
      totals,
    });
    expect(totals.totalCost).toBe(1);
  });
});
