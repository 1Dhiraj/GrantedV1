// Lists expected shell environment keys for config validation.
import { uniqueStrings } from "@granted/normalization-core/string-normalization";
import { listKnownChannelEnvVarNames } from "../secrets/channel-env-vars.js";
import { listKnownProviderAuthEnvVarNames } from "../secrets/provider-env-vars.js";
import type { GrantedConfig } from "./types.openclaw.js";

const CORE_SHELL_ENV_EXPECTED_KEYS = ["GRANTED_GATEWAY_TOKEN", "GRANTED_GATEWAY_PASSWORD"];

/** Includes configured plugin paths when selecting keys for login-shell import. */
export function resolveShellEnvExpectedKeys(
  env: NodeJS.ProcessEnv,
  config?: GrantedConfig,
): string[] {
  return uniqueStrings([
    ...listKnownProviderAuthEnvVarNames({ config, env }),
    ...listKnownChannelEnvVarNames({ config, env }),
    ...CORE_SHELL_ENV_EXPECTED_KEYS,
  ]);
}
