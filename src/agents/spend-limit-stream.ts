// Enforces the configured spend ceilings immediately before each model call.
import type { OpenClawConfig } from "../config/types.openclaw.js";
import {
  checkSpendLimit,
  describeSpendLimitVerdict,
  readSpendLimits,
} from "../infra/spend-limit.js";
import { FailoverError } from "./failover/error.js";
import type { StreamFn } from "./runtime/index.js";

/**
 * Wraps a stream function so a call is refused once spend reaches a ceiling.
 *
 * A per-provider ceiling raises a `billing` FailoverError so model fallback
 * treats it like any other provider-level billing failure and moves to the next
 * configured provider — a plain Error would read as a completed attempt and
 * starve the remaining chain, including a free local backstop. The global
 * ceiling blocks every provider, so it raises a plain Error: there is nothing
 * left to fail over to, and only a config change should lift it.
 *
 * Returns the original function untouched when no limit is configured, so
 * installs without ceilings keep the exact stream identity they had before.
 */
export function wrapStreamFnSpendLimit(params: {
  streamFn: StreamFn;
  config?: OpenClawConfig;
  agentId: string;
  provider?: string;
}): StreamFn {
  if (!readSpendLimits(params.config)) {
    return params.streamFn;
  }
  return async (model, context, options) => {
    const verdict = await checkSpendLimit({
      cfg: params.config,
      agentId: params.agentId,
      provider: params.provider,
    });
    if (verdict.kind === "provider") {
      throw new FailoverError(
        describeSpendLimitVerdict(verdict) ?? "Provider spend limit reached",
        {
          reason: "billing",
          provider: params.provider,
        },
      );
    }
    if (verdict.kind === "total") {
      throw new Error(describeSpendLimitVerdict(verdict) ?? "Spend limit reached");
    }
    return await params.streamFn(model, context, options);
  };
}
