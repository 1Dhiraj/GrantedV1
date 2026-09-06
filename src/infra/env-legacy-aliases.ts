// Accepts environment variables written under the project's previous names.
//
// The project reads GRANTED_* everywhere. Installs, service definitions, CI
// jobs and shell profiles written before the rename set OPENCLAW_* (and older
// ones CLAWDBOT_*), and silently ignoring those would change behaviour for an
// existing machine — a set gateway token or state dir would simply stop being
// read. Rather than give 900+ call sites their own fallback, this aliases the
// whole namespace once, as early as the process starts.

/** Previous env prefixes, newest first. The current prefix is GRANTED_. */
const LEGACY_ENV_PREFIXES = ["OPENCLAW_", "CLAWDBOT_"] as const;

const CURRENT_ENV_PREFIX = "GRANTED_";

/**
 * Copies any legacy-prefixed variable onto its current-prefixed name when the
 * current one is unset. Returns the names it filled in, so startup diagnostics
 * can report what an old environment is still driving.
 *
 * An explicitly set GRANTED_* always wins: a user migrating one variable at a
 * time must not have the stale value win over the new one. Empty strings count
 * as set, because "" is how a variable is deliberately turned off.
 */
export function applyLegacyEnvAliases(env: NodeJS.ProcessEnv = process.env): string[] {
  const applied: string[] = [];
  // Prefix order is precedence, so this loops prefixes outermost: a machine
  // carrying both OPENCLAW_X and the older CLAWDBOT_X must resolve to the
  // newer one, not to whichever key the environment happens to list first.
  for (const prefix of LEGACY_ENV_PREFIXES) {
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined || !key.startsWith(prefix)) {
        continue;
      }
      const currentKey = `${CURRENT_ENV_PREFIX}${key.slice(prefix.length)}`;
      if (env[currentKey] !== undefined) {
        continue;
      }
      env[currentKey] = value;
      applied.push(currentKey);
    }
  }
  return applied;
}

/** True when any legacy-prefixed variable is present, for upgrade hints. */
export function hasLegacyEnvVars(env: NodeJS.ProcessEnv = process.env): boolean {
  return Object.keys(env).some((key) =>
    LEGACY_ENV_PREFIXES.some((prefix) => key.startsWith(prefix)),
  );
}

export { CURRENT_ENV_PREFIX, LEGACY_ENV_PREFIXES };
