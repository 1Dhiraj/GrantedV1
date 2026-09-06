// Mattermost API module exposes the plugin public contract.
export type {
  BaseProbeResult,
  ChannelAccountSnapshot,
  ChannelDirectoryEntry,
  ChatType,
  HistoryEntry,
  GrantedConfig,
  GrantedPluginApi,
  ReplyPayload,
} from "granted/plugin-sdk/core";
export type { RuntimeEnv } from "granted/plugin-sdk/runtime";
export { resolveAllowlistMatchSimple } from "granted/plugin-sdk/allow-from";
export { logInboundDrop } from "granted/plugin-sdk/channel-inbound";
export { createChannelPairingController } from "granted/plugin-sdk/channel-pairing";
export { createChannelMessageReplyPipeline } from "granted/plugin-sdk/channel-outbound";
export { logTypingFailure } from "granted/plugin-sdk/channel-feedback";
export { listSkillCommandsForAgents } from "granted/plugin-sdk/command-auth-native";
export { buildPreparedModelsProviderData } from "granted/plugin-sdk/models-provider-runtime";
export { isDangerousNameMatchingEnabled } from "granted/plugin-sdk/dangerous-name-runtime";
export {
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "granted/plugin-sdk/runtime-group-policy";
export { resolveChannelMediaMaxBytes } from "granted/plugin-sdk/account-helpers";
export { loadOutboundMediaFromUrl } from "granted/plugin-sdk/outbound-media";
// Legacy map-helper exports stay for older plugin consumers. New message-turn
// code should use createChannelHistoryWindow.
export {
  DEFAULT_GROUP_HISTORY_LIMIT,
  createChannelHistoryWindow,
} from "granted/plugin-sdk/reply-history";
export { registerPluginHttpRoute } from "granted/plugin-sdk/webhook-targets";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
} from "granted/plugin-sdk/webhook-ingress";
export { isTrustedProxyAddress, resolveClientIp } from "granted/plugin-sdk/core";
