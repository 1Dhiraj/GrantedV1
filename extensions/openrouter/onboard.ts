// Openrouter setup module handles plugin onboarding behavior.
import {
  createAliasOnlyPresetAppliers,
  type GrantedConfig,
} from "granted/plugin-sdk/provider-onboard";

export const OPENROUTER_DEFAULT_MODEL_REF = "openrouter/auto";
const openrouterPresetAppliers = createAliasOnlyPresetAppliers({
  modelRef: OPENROUTER_DEFAULT_MODEL_REF,
  alias: "OpenRouter",
});

export function applyOpenrouterProviderConfig(cfg: GrantedConfig): GrantedConfig {
  return openrouterPresetAppliers.applyProviderConfig(cfg);
}

export function applyOpenrouterConfig(cfg: GrantedConfig): GrantedConfig {
  return openrouterPresetAppliers.applyConfig(cfg);
}
