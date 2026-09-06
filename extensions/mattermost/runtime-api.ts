// Private runtime barrel for the bundled Mattermost extension.
// Keep this barrel thin and generic-only.

export type {
  BaseProbeResult,
  ChannelAccountSnapshot,
  ChannelDirectoryEntry,
  ChannelGroupContext,
  ChannelMessageActionName,
  ChannelPlugin,
  ChatType,
  HistoryEntry,
  GrantedConfig,
  GrantedPluginApi,
  PluginRuntime,
} from "granted/plugin-sdk/core";
export type { RuntimeEnv } from "granted/plugin-sdk/runtime";
export type { ReplyPayload } from "granted/plugin-sdk/reply-runtime";
export type { ModelsProviderData } from "granted/plugin-sdk/models-provider-runtime";
export type {
  BlockStreamingCoalesceConfig,
  ContextVisibilityMode,
  DmPolicy,
  GroupPolicy,
} from "granted/plugin-sdk/config-contracts";
export {
  DEFAULT_ACCOUNT_ID,
  buildChannelConfigSchema,
  createDedupeCache,
  parseStrictPositiveInteger,
  resolveClientIp,
  isTrustedProxyAddress,
} from "granted/plugin-sdk/core";
export { buildComputedAccountStatusSnapshot } from "granted/plugin-sdk/channel-status";
export { createAccountStatusSink } from "granted/plugin-sdk/channel-outbound";
export {
  listSkillCommandsForAgents,
  resolveControlCommandGate,
  resolveStoredModelOverride,
} from "granted/plugin-sdk/command-auth-native";
export { buildPreparedModelsProviderData } from "granted/plugin-sdk/models-provider-runtime";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "granted/plugin-sdk/runtime-group-policy";
export { isDangerousNameMatchingEnabled } from "granted/plugin-sdk/dangerous-name-runtime";
export { resolveStorePath } from "granted/plugin-sdk/session-store-runtime";
export { formatInboundFromLabel } from "granted/plugin-sdk/channel-inbound";
export { logInboundDrop } from "granted/plugin-sdk/channel-inbound";
export { createChannelPairingController } from "granted/plugin-sdk/channel-pairing";
export { createChannelMessageReplyPipeline } from "granted/plugin-sdk/channel-outbound";
export { logTypingFailure } from "granted/plugin-sdk/channel-feedback";
export { loadOutboundMediaFromUrl } from "granted/plugin-sdk/outbound-media";
export { rawDataToString } from "granted/plugin-sdk/webhook-ingress";
export { chunkTextForOutbound } from "granted/plugin-sdk/text-chunking";
// Legacy map-helper exports stay for older plugin consumers. New message-turn
// code should use createChannelHistoryWindow.
export {
  DEFAULT_GROUP_HISTORY_LIMIT,
  createChannelHistoryWindow,
  buildPendingHistoryContextFromMap,
  clearHistoryEntriesIfEnabled,
  recordPendingHistoryEntryIfEnabled,
} from "granted/plugin-sdk/reply-history";
export { normalizeAccountId, resolveThreadSessionKeys } from "granted/plugin-sdk/routing";
export { resolveAllowlistMatchSimple } from "granted/plugin-sdk/allow-from";
export { registerPluginHttpRoute } from "granted/plugin-sdk/webhook-targets";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
} from "granted/plugin-sdk/webhook-ingress";
export {
  applyAccountNameToChannelSection,
  applySetupAccountConfigPatch,
  migrateBaseNameToDefaultAccount,
} from "granted/plugin-sdk/setup";
export { resolveChannelMediaMaxBytes } from "granted/plugin-sdk/account-helpers";
export { getAgentScopedMediaLocalRoots } from "granted/plugin-sdk/media-runtime";
export { normalizeProviderId } from "granted/plugin-sdk/provider-model-shared";
export { setMattermostRuntime } from "./src/runtime.js";
