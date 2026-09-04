// Prompt caching is one of the cheapest levers available, so the figure that
// reports it has to be honest: never guessed, and never counting the cache-write
// premium as a saving.
import { describe, expect, it } from "vitest";
import { applyCacheSavings } from "./session-cost-usage-pricing.js";
import { createEmptyCostUsageTotals } from "./session-cost-usage-totals.js";
import type { CostUsageTotals } from "./session-cost-usage.types.js";

type Rates = { input: number; output: number; cacheRead: number; cacheWrite: number };

// Rates are per million tokens, matching resolveModelCostConfig.
const rates = (over: Partial<Rates> = {}): Rates => ({
  input: 3,
  output: 15,
  cacheRead: 0.3,
  cacheWrite: 3.75,
  ...over,
});

const savingsFor = (
  usage: { cacheRead?: number; cacheWrite?: number } | undefined,
  cost: Partial<Rates> | undefined | null,
): CostUsageTotals => {
  const totals = createEmptyCostUsageTotals();
  applyCacheSavings(totals, usage as never, cost as never);
  return totals;
};

describe("applyCacheSavings", () => {
  it("credits the gap between the input rate and the cache-read rate", () => {
    // 1M cached reads at 0.3 instead of 3.0 saves 2.7.
    expect(savingsFor({ cacheRead: 1_000_000 }, rates()).cacheSavings).toBeCloseTo(2.7, 6);
  });

  it("charges the cache-write premium against the saving", () => {
    // Writes cost 3.75 against a 3.0 input rate, so this is a 0.75 loss.
    expect(savingsFor({ cacheWrite: 1_000_000 }, rates()).cacheSavings).toBeCloseTo(-0.75, 6);
  });

  it("nets reads against writes over a realistic session", () => {
    const totals = savingsFor({ cacheRead: 2_000_000, cacheWrite: 200_000 }, rates());
    // 2M reads save 5.4; 200k writes cost 0.15 more than plain input.
    expect(totals.cacheSavings).toBeCloseTo(5.4 - 0.15, 6);
  });

  it("stays silent when nothing was cached", () => {
    expect(savingsFor({}, rates()).cacheSavings).toBeUndefined();
    expect(savingsFor(undefined, rates()).cacheSavings).toBeUndefined();
    expect(savingsFor({ cacheRead: 0, cacheWrite: 0 }, rates()).cacheSavings).toBeUndefined();
  });

  it("refuses to guess when the model has no published pricing", () => {
    // An all-zero cost config means "price unknown", not "free". Inventing a
    // saving here would make the number untrustworthy everywhere else.
    expect(
      savingsFor({ cacheRead: 1_000_000 }, { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })
        .cacheSavings,
    ).toBeUndefined();
    expect(savingsFor({ cacheRead: 1_000_000 }, undefined).cacheSavings).toBeUndefined();
    expect(savingsFor({ cacheRead: 1_000_000 }, null).cacheSavings).toBeUndefined();
  });

  it("accumulates across entries rather than overwriting", () => {
    const totals = createEmptyCostUsageTotals();
    applyCacheSavings(totals, { cacheRead: 1_000_000 } as never, rates() as never);
    applyCacheSavings(totals, { cacheRead: 1_000_000 } as never, rates() as never);
    expect(totals.cacheSavings).toBeCloseTo(5.4, 6);
  });
});
