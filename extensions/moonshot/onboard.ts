// Moonshot setup module handles plugin onboarding behavior.
import {
  createDefaultModelPresetAppliers,
  type GrantedConfig,
} from "granted/plugin-sdk/provider-onboard";
import {
  buildMoonshotProvider,
  MOONSHOT_BASE_URL,
  MOONSHOT_CN_BASE_URL,
  MOONSHOT_DEFAULT_MODEL_ID,
  MOONSHOT_DEFAULT_MODEL_REF,
} from "./provider-catalog.js";

const moonshotPresetAppliers = createDefaultModelPresetAppliers<[string]>({
  primaryModelRef: MOONSHOT_DEFAULT_MODEL_REF,
  resolveParams: (_cfg: GrantedConfig, baseUrl: string) => {
    const defaultModel = buildMoonshotProvider().models.find(
      ({ id }) => id === MOONSHOT_DEFAULT_MODEL_ID,
    );
    return defaultModel
      ? {
          providerId: "moonshot",
          api: "openai-completions",
          baseUrl,
          defaultModel,
          defaultModelId: MOONSHOT_DEFAULT_MODEL_ID,
          aliases: [{ modelRef: MOONSHOT_DEFAULT_MODEL_REF, alias: "Kimi" }],
        }
      : null;
  },
});

export function applyMoonshotConfig(cfg: GrantedConfig): GrantedConfig {
  return moonshotPresetAppliers.applyConfig(cfg, MOONSHOT_BASE_URL);
}

export function applyMoonshotConfigCn(cfg: GrantedConfig): GrantedConfig {
  return moonshotPresetAppliers.applyConfig(cfg, MOONSHOT_CN_BASE_URL);
}
