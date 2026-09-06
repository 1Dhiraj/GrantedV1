// Deepinfra setup module handles plugin onboarding behavior.
import {
  createAliasOnlyPresetAppliers,
  type GrantedConfig,
} from "granted/plugin-sdk/provider-onboard";
import { DEEPINFRA_DEFAULT_MODEL_REF } from "./provider-models.js";

export function applyDeepInfraConfig(
  cfg: GrantedConfig,
  modelRef: string = DEEPINFRA_DEFAULT_MODEL_REF,
): GrantedConfig {
  return createAliasOnlyPresetAppliers({ modelRef, alias: "DeepInfra" }).applyConfig(cfg);
}
