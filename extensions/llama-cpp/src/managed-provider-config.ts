import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
import type { ModelProviderConfig } from "granted/plugin-sdk/provider-model-shared";
import { LLAMA_CPP_PROVIDER_ID } from "./defaults.js";

export const MANAGED_LLAMA_CPP_CONFIG_REQUIRED_MESSAGE =
  "Local embeddings need the managed llama.cpp server config. Run `granted configure`, choose llama.cpp once, then retry `granted memory status --deep`.";

export function resolveManagedLlamaCppProviderConfig(config: GrantedConfig): ModelProviderConfig {
  const provider = config.models?.providers?.[LLAMA_CPP_PROVIDER_ID];
  if (!provider?.localService || !provider.baseUrl) {
    throw new Error(MANAGED_LLAMA_CPP_CONFIG_REQUIRED_MESSAGE);
  }
  return provider;
}
