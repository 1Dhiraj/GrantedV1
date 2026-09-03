import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import { describeSpendLimitVerdict, readSpendLimits } from "./spend-limit.js";

const cfg = (defaults: Record<string, unknown>): OpenClawConfig =>
  ({ agents: { defaults } }) as unknown as OpenClawConfig;

describe("readSpendLimits", () => {
  it("returns undefined when nothing is configured, so the check stays free", () => {
    // The hot path depends on this: no limits means no usage read at all.
    expect(readSpendLimits(undefined)).toBeUndefined();
    expect(readSpendLimits(cfg({}))).toBeUndefined();
  });

  it("treats zero and negative ceilings as no ceiling", () => {
    // 0 is the documented "no ceiling" value, so it must not block every call.
    expect(readSpendLimits(cfg({ spendLimitUsd: 0 }))).toBeUndefined();
    expect(readSpendLimits(cfg({ spendLimitUsd: -5 }))).toBeUndefined();
  });

  it("reads a total ceiling", () => {
    expect(readSpendLimits(cfg({ spendLimitUsd: 10 }))).toEqual({ totalUsd: 10, byProvider: {} });
  });

  it("lowercases provider keys so config casing cannot bypass a ceiling", () => {
    expect(readSpendLimits(cfg({ spendLimitUsdByProvider: { Anthropic: 20 } }))).toEqual({
      totalUsd: 0,
      byProvider: { anthropic: 20 },
    });
  });

  it("drops unusable provider entries but keeps the valid ones", () => {
    expect(
      readSpendLimits(
        cfg({ spendLimitUsdByProvider: { anthropic: 20, openai: 0, "  ": 5, google: -1 } }),
      ),
    ).toEqual({ totalUsd: 0, byProvider: { anthropic: 20 } });
  });

  it("ignores non-finite values instead of trusting them as ceilings", () => {
    expect(readSpendLimits(cfg({ spendLimitUsd: Number.NaN }))).toBeUndefined();
    expect(readSpendLimits(cfg({ spendLimitUsd: Number.POSITIVE_INFINITY }))).toBeUndefined();
  });
});

describe("describeSpendLimitVerdict", () => {
  it("says nothing when the call is allowed", () => {
    expect(describeSpendLimitVerdict({ kind: "ok" })).toBeUndefined();
  });

  it("names the exact config key for a total ceiling", () => {
    const text = describeSpendLimitVerdict({ kind: "total", spentUsd: 10.5, limitUsd: 10 });
    expect(text).toContain("agents.defaults.spendLimitUsd");
    expect(text).toContain("$10.5000");
    expect(text).toContain("$10.00");
  });

  it("names the provider and its own config key for a provider ceiling", () => {
    const text = describeSpendLimitVerdict({
      kind: "provider",
      provider: "anthropic",
      spentUsd: 21,
      limitUsd: 20,
    });
    expect(text).toContain("anthropic");
    expect(text).toContain("agents.defaults.spendLimitUsdByProvider.anthropic");
    // The operator needs to know other providers still work.
    expect(text).toContain("switch to another provider");
  });
});
