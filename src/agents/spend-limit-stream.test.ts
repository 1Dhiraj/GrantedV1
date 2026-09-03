// The spend guard must block the call itself, and must fail over per provider
// rather than ending the whole fallback chain.
import { describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import { resetSpendLimitReadingsForTests } from "../infra/spend-limit.js";
import type { StreamFn } from "./runtime/index.js";
import { wrapStreamFnSpendLimit } from "./spend-limit-stream.js";

vi.mock("../infra/session-cost-usage-cache-runtime.js", () => ({
  loadCostUsageSummaryFromCache: vi.fn(async () => ({
    updatedAt: Date.now(),
    days: 1,
    daily: [],
    totals: { totalCost: 12 },
    providerCosts: { anthropic: 9, google: 0.5 },
  })),
}));

const cfg = (defaults: Record<string, unknown>): OpenClawConfig =>
  ({ agents: { defaults } }) as unknown as OpenClawConfig;

const inner = (() => Promise.resolve("streamed")) as unknown as StreamFn;

const callWrapped = async (streamFn: StreamFn) =>
  await (streamFn as unknown as (a: unknown, b: unknown, c: unknown) => Promise<unknown>)(
    {},
    {},
    {},
  );

describe("wrapStreamFnSpendLimit", () => {
  it("returns the original stream function when no limit is configured", () => {
    // Identity matters: installs without ceilings must keep the exact stream
    // the rest of the chain built, with no added await.
    expect(wrapStreamFnSpendLimit({ streamFn: inner, config: cfg({}), agentId: "main" })).toBe(
      inner,
    );
  });

  it("allows the call while spend is under the ceiling", async () => {
    resetSpendLimitReadingsForTests();
    const wrapped = wrapStreamFnSpendLimit({
      streamFn: inner,
      config: cfg({ spendLimitUsd: 100 }),
      agentId: "main",
    });
    await expect(callWrapped(wrapped)).resolves.toBe("streamed");
  });

  it("blocks every provider with a plain error once the total ceiling is reached", async () => {
    resetSpendLimitReadingsForTests();
    const wrapped = wrapStreamFnSpendLimit({
      streamFn: inner,
      config: cfg({ spendLimitUsd: 10 }),
      agentId: "main",
      provider: "google",
    });
    // Not a FailoverError: nothing is left to fail over to, so the chain must
    // stop rather than burn every remaining provider.
    await expect(callWrapped(wrapped)).rejects.toThrow(/agents\.defaults\.spendLimitUsd/);
    await expect(callWrapped(wrapped)).rejects.not.toBeInstanceOf(
      (await import("./failover/error.js")).FailoverError,
    );
  });

  it("fails over with a billing reason when one provider hits its ceiling", async () => {
    resetSpendLimitReadingsForTests();
    const { FailoverError } = await import("./failover/error.js");
    const wrapped = wrapStreamFnSpendLimit({
      streamFn: inner,
      config: cfg({ spendLimitUsdByProvider: { anthropic: 5 } }),
      agentId: "main",
      provider: "anthropic",
    });
    const error = await callWrapped(wrapped).catch((err: unknown) => err);
    // A plain Error here would read as a completed attempt and starve the rest
    // of the chain, including a free local backstop.
    expect(error).toBeInstanceOf(FailoverError);
    expect((error as InstanceType<typeof FailoverError>).reason).toBe("billing");
    expect((error as Error).message).toContain("anthropic");
  });

  it("lets an under-ceiling provider through while another provider is blocked", async () => {
    resetSpendLimitReadingsForTests();
    const wrapped = wrapStreamFnSpendLimit({
      streamFn: inner,
      config: cfg({ spendLimitUsdByProvider: { anthropic: 5, google: 100 } }),
      agentId: "main",
      provider: "google",
    });
    await expect(callWrapped(wrapped)).resolves.toBe("streamed");
  });
});
