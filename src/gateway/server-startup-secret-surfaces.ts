import type { OpenClawConfig } from "../config/types.openclaw.js";
import { isTruthyEnvValue } from "../infra/env.js";

export function resolveGatewayStartupSourceConfig(
  config: OpenClawConfig,
  env: NodeJS.ProcessEnv,
): OpenClawConfig {
  const skipChannels =
    isTruthyEnvValue(env.GRANTED_SKIP_CHANNELS) || isTruthyEnvValue(env.GRANTED_SKIP_PROVIDERS);
  if (!skipChannels || !config.channels) {
    return config;
  }
  return {
    ...config,
    channels: undefined,
  };
}
