import type {
  ChannelDoctorConfigMutation,
  ChannelDoctorLegacyConfigRule,
} from "granted/plugin-sdk/channel-contract";
import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
import { defineChannelAliasMigration } from "granted/plugin-sdk/runtime-doctor-migrations";

const streamingAliasMigration = defineChannelAliasMigration({
  channelId: "msteams",
  // Teams previews default to partial streaming, matching the runtime default
  // in reply-dispatcher when no mode is configured.
  streaming: { defaultMode: "partial" },
});

export const legacyConfigRules: ChannelDoctorLegacyConfigRule[] =
  streamingAliasMigration.legacyConfigRules;

export function normalizeCompatibilityConfig({
  cfg,
}: {
  cfg: GrantedConfig;
}): ChannelDoctorConfigMutation {
  return streamingAliasMigration.normalizeChannelConfig({ cfg });
}
