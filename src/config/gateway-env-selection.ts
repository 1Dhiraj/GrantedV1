import { collectConfigRuntimeEnvVars } from "./env-vars.js";
import type { OpenClawConfig } from "./types.js";

export const GATEWAY_CONFIG_SELECTION_ENV_KEYS: ReadonlySet<string> = new Set([
  "ANDROID_DATA",
  "HOME",
  "HOMEDRIVE",
  "HOMEPATH",
  "GRANTED_AGENT_DIR",
  "GRANTED_CONFIG_PATH",
  "GRANTED_HOME",
  "GRANTED_INCLUDE_ROOTS",
  "GRANTED_NIX_MODE",
  "GRANTED_OAUTH_DIR",
  "GRANTED_PACKAGE_DIR",
  "GRANTED_PROFILE",
  "GRANTED_STATE_DIR",
  "GRANTED_WORKSPACE_DIR",
  "PI_CODING_AGENT_DIR",
  "PREFIX",
  "USERPROFILE",
]);

/** Rejects config.env changes that would retarget a running Gateway process. */
export function assertGatewayConfigEnvSelectionUnchanged(
  previousConfig: OpenClawConfig,
  nextConfig: OpenClawConfig,
): void {
  const normalize = (config: OpenClawConfig) =>
    new Map(
      Object.entries(collectConfigRuntimeEnvVars(config)).map(([key, value]) => [
        key.toUpperCase(),
        value,
      ]),
    );
  const previous = normalize(previousConfig);
  const next = normalize(nextConfig);
  for (const key of GATEWAY_CONFIG_SELECTION_ENV_KEYS) {
    if (previous.get(key) !== next.get(key)) {
      throw new Error(
        `Config env cannot change process-stable Gateway selector ${key} during reload. Restart with the target environment instead.`,
      );
    }
  }
}
