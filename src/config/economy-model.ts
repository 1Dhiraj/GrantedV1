// Resolves the economy model used for routine foreground routing and as the
// background-turn fallback when no more specific model is configured.
import type { GrantedConfig } from "./types.granted.js";

/**
 * Cheap model configured for routine work. The task router uses it for simple
 * foreground chat and classification; heartbeat, sub-agent, isolated cron,
 * and compaction flows use it as their background fallback. This keeps
 * low-risk work off the expensive primary model.
 *
 * Distinct from `utilityModel`, which routes short *internal* completions
 * (session titles, progress narration) and can derive a provider-declared
 * small model on its own. This one is the last-resort fallback for full agent
 * turns, and every per-role setting (`heartbeat.model`, `compaction.model`,
 * `subagents.model`) still wins over it.
 */
export function resolveEconomyModelRef(cfg?: GrantedConfig): string | undefined {
  const raw = cfg?.agents?.defaults?.economyModel;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed.length > 0 ? trimmed : undefined;
}
