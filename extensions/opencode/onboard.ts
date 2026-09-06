// Opencode setup module handles plugin onboarding behavior.
import { withAgentModelAliases, type GrantedConfig } from "openclaw/plugin-sdk/provider-onboard";

export const OPENCODE_ZEN_DEFAULT_MODEL_REF = "opencode/claude-opus-5";

export function applyOpencodeZenProviderConfig(cfg: GrantedConfig): GrantedConfig {
  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models: withAgentModelAliases(cfg.agents?.defaults?.models, [
          { modelRef: OPENCODE_ZEN_DEFAULT_MODEL_REF, alias: "Opus" },
        ]),
      },
    },
  };
}
