// Decides whether a rate-limited run may switch models, or should wait on the
// one it has.
import type { OpenClawConfig } from "../config/types.openclaw.js";

/**
 * Whether a 429 on this provider is allowed to escalate to the model fallback
 * chain.
 *
 * Failing over on a rate limit is often the expensive choice: the limit
 * usually clears in seconds, while the next model in the chain can cost
 * several times more per token. `fallbackOnRateLimit: false` turns that off
 * globally, and `waitOnRateLimitProviders` names the providers that should
 * always wait even when the global default stays on.
 *
 * Auth-profile rotation is unaffected either way — another key on the *same*
 * model gets fresh quota, which is strictly better than both waiting and
 * switching, so it is tried first regardless.
 */
export function allowsRateLimitModelFallback(params: {
  cfg?: OpenClawConfig;
  provider?: string;
}): boolean {
  const cooldowns = params.cfg?.auth?.cooldowns;
  const provider = params.provider?.trim().toLowerCase();
  if (provider) {
    const alwaysWait = cooldowns?.waitOnRateLimitProviders?.some(
      (entry) => entry.trim().toLowerCase() === provider,
    );
    if (alwaysWait) {
      return false;
    }
  }
  // Unset means the historical behavior: rate limits do reach model fallback.
  return cooldowns?.fallbackOnRateLimit ?? true;
}
