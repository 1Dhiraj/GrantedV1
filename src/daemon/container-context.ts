/** Detects whether a daemon was launched by OpenClaw's container-aware service wrapper. */
import { normalizeOptionalString } from "@openclaw/normalization-core/string-coerce";

/** Resolves the daemon container hint exposed by managed service environments. */
export function resolveDaemonContainerContext(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return (
    normalizeOptionalString(env.GRANTED_CONTAINER_HINT) ||
    normalizeOptionalString(env.GRANTED_CONTAINER) ||
    null
  );
}
