import type { GrantedConfig } from "../config/types.granted.js";
import { isTruthyEnvValue } from "../infra/env.js";

export function resolveGatewayStartupSourceConfig(
  config: GrantedConfig,
  env: NodeJS.ProcessEnv,
): GrantedConfig {
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
