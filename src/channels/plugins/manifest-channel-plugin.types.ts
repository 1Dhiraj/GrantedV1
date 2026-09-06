import type { GrantedConfig } from "../../config/types.openclaw.js";
import type { ChannelConfigSchema } from "./types.config.js";

type ManifestChannelAccount = {
  accountId: string;
  config: Record<string, unknown>;
};

/** Metadata adapters expose account inspection without loading channel runtime contracts. */
export type ManifestChannelPlugin = {
  id: string;
  meta: {
    id: string;
    label: string;
    selectionLabel: string;
    docsPath: string;
    blurb: string;
    preferOver?: readonly string[];
  };
  capabilities: { chatTypes: ["direct"] };
  commands?: {
    nativeCommandsAutoEnabled?: boolean;
    nativeSkillsAutoEnabled?: boolean;
  };
  configSchema?: ChannelConfigSchema;
  config: {
    listAccountIds: (cfg: GrantedConfig) => string[];
    defaultAccountId: (cfg: GrantedConfig) => string;
    resolveAccount: (cfg: GrantedConfig, accountId?: string | null) => ManifestChannelAccount;
    isEnabled: (account: ManifestChannelAccount, cfg: GrantedConfig) => boolean;
    isConfigured: (account: ManifestChannelAccount, cfg: GrantedConfig) => boolean;
    hasConfiguredState: (params: { cfg: GrantedConfig; env?: NodeJS.ProcessEnv }) => boolean;
  };
};
