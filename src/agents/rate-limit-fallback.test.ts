import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import { allowsRateLimitModelFallback } from "./rate-limit-fallback.js";

const cfg = (cooldowns: Record<string, unknown>): OpenClawConfig =>
  ({ auth: { cooldowns } }) as unknown as OpenClawConfig;

describe("allowsRateLimitModelFallback", () => {
  it("keeps the historical behaviour when nothing is configured", () => {
    // Silence must not change how existing installs fail over.
    expect(allowsRateLimitModelFallback({})).toBe(true);
    expect(allowsRateLimitModelFallback({ cfg: {} as OpenClawConfig })).toBe(true);
    expect(allowsRateLimitModelFallback({ cfg: cfg({}), provider: "google" })).toBe(true);
  });

  it("honours the global opt-out", () => {
    expect(
      allowsRateLimitModelFallback({
        cfg: cfg({ fallbackOnRateLimit: false }),
        provider: "openai",
      }),
    ).toBe(false);
  });

  it("keeps fallback on when the global toggle is explicitly true", () => {
    expect(
      allowsRateLimitModelFallback({ cfg: cfg({ fallbackOnRateLimit: true }), provider: "openai" }),
    ).toBe(true);
  });

  it("lets a named provider wait even while the global default allows fallback", () => {
    const config = cfg({ waitOnRateLimitProviders: ["google", "groq"] });
    expect(allowsRateLimitModelFallback({ cfg: config, provider: "google" })).toBe(false);
    expect(allowsRateLimitModelFallback({ cfg: config, provider: "groq" })).toBe(false);
    // A provider absent from the list still follows the global default.
    expect(allowsRateLimitModelFallback({ cfg: config, provider: "anthropic" })).toBe(true);
  });

  it("matches provider ids case- and whitespace-insensitively", () => {
    const config = cfg({ waitOnRateLimitProviders: ["  Google  "] });
    expect(allowsRateLimitModelFallback({ cfg: config, provider: "google" })).toBe(false);
    expect(allowsRateLimitModelFallback({ cfg: config, provider: " GOOGLE " })).toBe(false);
  });

  it("falls back to the global default when no provider is known", () => {
    const config = cfg({ fallbackOnRateLimit: false, waitOnRateLimitProviders: ["google"] });
    expect(allowsRateLimitModelFallback({ cfg: config })).toBe(false);
  });
});
