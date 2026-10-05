/**
 * Resolves the per-run tool-step cap from config.
 *
 * The agent loop otherwise keeps dispatching tools until the model stops asking
 * or a timeout fires, so a stuck run reports nothing. The cap makes the last
 * step a wrap-up instead. Defaults are deliberately far above normal task
 * length: they catch runaways, not real work. Spawned sub-agents get a tighter
 * cap because their parent can react to a short report and retry.
 */
import type { GrantedConfig } from "./types.js";

/** Default tool-step cap for a top-level agent run. */
export const DEFAULT_MAX_TOOL_STEPS = 400;
/** Default tool-step cap for one spawned sub-agent run. */
export const DEFAULT_SUBAGENT_MAX_TOOL_STEPS = 150;

/** Zero (or any non-positive value) is the documented "no cap" setting. */
function normalizeCap(raw: unknown): number | undefined | "unlimited" {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return undefined;
  }
  return raw <= 0 ? "unlimited" : Math.floor(raw);
}

/**
 * Returns the cap for a run, or undefined when the run is unlimited.
 *
 * Precedence: the agent's own setting, then agents.defaults.subagents for a
 * spawned run, then agents.defaults, then the built-in default.
 */
export function resolveMaxToolSteps(params: {
  cfg?: GrantedConfig;
  agentId?: string;
  /** True for runs spawned by another session (sessions_spawn). */
  isSubagent?: boolean;
}): number | undefined {
  const defaults = params.cfg?.agents?.defaults;
  const agentEntry = params.agentId
    ? params.cfg?.agents?.list?.find((agent) => agent.id === params.agentId)
    : undefined;
  const candidates = [
    agentEntry?.maxToolSteps,
    params.isSubagent ? defaults?.subagents?.maxToolSteps : undefined,
    defaults?.maxToolSteps,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeCap(candidate);
    if (normalized === "unlimited") {
      return undefined;
    }
    if (normalized !== undefined) {
      return normalized;
    }
  }
  return params.isSubagent ? DEFAULT_SUBAGENT_MAX_TOOL_STEPS : DEFAULT_MAX_TOOL_STEPS;
}
