// Resolves the economy model: the cheap model background agent turns fall back
// to when no per-role model is configured.
import type { OpenClawConfig } from "./types.openclaw.js";

/**
 * Cheap model configured for background/low-stakes agent turns (heartbeat,
 * sub-agents, isolated cron runs, compaction). Keeps routine work off the
 * expensive primary key when the user only has one provider or wants to
 * protect a premium model budget.
 *
 * Distinct from `utilityModel`, which routes short *internal* completions
 * (session titles, progress narration) and can derive a provider-declared
 * small model on its own. This one is the last-resort fallback for full agent
 * turns, and every per-role setting (`heartbeat.model`, `compaction.model`,
 * `subagents.model`) still wins over it.
 */
export function resolveEconomyModelRef(cfg?: OpenClawConfig): string | undefined {
  const raw = cfg?.agents?.defaults?.economyModel;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed.length > 0 ? trimmed : undefined;
}
