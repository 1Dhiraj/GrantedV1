// A rate limit usually clears in seconds, while the next model in the chain can
// cost several times more. These cover the opt-out that keeps a 429 on the
// selected model instead of paying to escape it.
import { describe, expect, it } from "vitest";
import type { AgentRunAttemptTerminal } from "../../agent-run-terminal-outcome.js";
import { resolveRunFailoverDecision } from "./failover-policy.js";

const assistantTerminal = {
  kind: "error",
  source: "provider",
} as unknown as AgentRunAttemptTerminal;

describe("retry-limit stage", () => {
  const base = { stage: "retry_limit", fallbackConfigured: true } as const;

  it("switches models on a rate limit by default", () => {
    expect(resolveRunFailoverDecision({ ...base, failoverReason: "rate_limit" })).toEqual({
      action: "fallback_model",
      reason: "rate_limit",
    });
  });

  it("stays on the model when the operator opted out", () => {
    expect(
      resolveRunFailoverDecision({
        ...base,
        failoverReason: "rate_limit",
        rateLimitModelFallback: false,
      }),
    ).toEqual({ action: "return_error_payload" });
  });

  it("still switches models for other failures while the opt-out is on", () => {
    // The opt-out is about rate limits only; a billing failure must still move.
    expect(
      resolveRunFailoverDecision({
        ...base,
        failoverReason: "billing",
        rateLimitModelFallback: false,
      }),
    ).toEqual({ action: "fallback_model", reason: "billing" });
  });
});

describe("prompt stage", () => {
  const base = {
    stage: "prompt",
    aborted: false,
    externalAbort: false,
    fallbackConfigured: true,
    failoverFailure: true,
    profileRotated: true,
  } as const;

  it("switches models on a rate limit by default", () => {
    expect(resolveRunFailoverDecision({ ...base, failoverReason: "rate_limit" })).toEqual({
      action: "fallback_model",
      reason: "rate_limit",
    });
  });

  it("surfaces the error instead of switching when the operator opted out", () => {
    expect(
      resolveRunFailoverDecision({
        ...base,
        failoverReason: "rate_limit",
        rateLimitModelFallback: false,
      }),
    ).toEqual({ action: "surface_error", reason: "rate_limit" });
  });

  it("rotates auth profiles first, even with the opt-out on", () => {
    // Another key on the same model gets fresh quota, which beats both waiting
    // and switching, so rotation must not be gated by this setting.
    expect(
      resolveRunFailoverDecision({
        ...base,
        profileRotated: false,
        failoverReason: "rate_limit",
        rateLimitModelFallback: false,
      }),
    ).toEqual({ action: "rotate_profile", reason: "rate_limit" });
  });
});

describe("assistant stage", () => {
  const base = {
    stage: "assistant",
    terminal: assistantTerminal,
    fallbackConfigured: true,
    failoverFailure: true,
    profileRotated: true,
  } as const;

  it("switches models on a rate limit by default", () => {
    expect(resolveRunFailoverDecision({ ...base, failoverReason: "rate_limit" })).toEqual({
      action: "fallback_model",
      reason: "rate_limit",
    });
  });

  it("surfaces the error instead of switching when the operator opted out", () => {
    expect(
      resolveRunFailoverDecision({
        ...base,
        failoverReason: "rate_limit",
        rateLimitModelFallback: false,
      }),
    ).toEqual({ action: "surface_error", reason: "rate_limit" });
  });
});
