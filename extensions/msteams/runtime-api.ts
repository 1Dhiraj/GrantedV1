// Private runtime barrel for the bundled Microsoft Teams extension.
// Keep this barrel thin and aligned with the local extension surface.

export { DEFAULT_ACCOUNT_ID } from "granted/plugin-sdk/account-id";
export type { AllowlistMatch } from "granted/plugin-sdk/allow-from";
export {
  mergeAllowlist,
  resolveAllowlistMatchSimple,
  summarizeMapping,
} from "granted/plugin-sdk/allow-from";
export type {
  BaseProbeResult,
  ChannelDirectoryEntry,
  ChannelGroupContext,
  ChannelMessageActionName,
  ChannelOutboundAdapter,
} from "granted/plugin-sdk/channel-contract";
export type { ChannelPlugin } from "granted/plugin-sdk/channel-core";
export { logTypingFailure } from "granted/plugin-sdk/channel-outbound";
export { createChannelPairingController } from "granted/plugin-sdk/channel-pairing";
export { resolveToolsBySender } from "granted/plugin-sdk/channel-policy";
export { createChannelMessageReplyPipeline } from "granted/plugin-sdk/channel-outbound";
export {
  PAIRING_APPROVED_MESSAGE,
  buildProbeChannelStatusSummary,
  createDefaultChannelRuntimeState,
} from "granted/plugin-sdk/channel-status";
export {
  buildChannelKeyCandidates,
  normalizeChannelSlug,
  resolveChannelEntryMatchWithFallback,
  resolveNestedAllowlistDecision,
} from "granted/plugin-sdk/channel-targets";
export type {
  GroupPolicy,
  GroupToolPolicyConfig,
  MSTeamsChannelConfig,
  MSTeamsCloudName,
  MSTeamsConfig,
  MSTeamsReplyStyle,
  MSTeamsTeamConfig,
  MarkdownTableMode,
  GrantedConfig,
} from "granted/plugin-sdk/config-contracts";
export { isDangerousNameMatchingEnabled } from "granted/plugin-sdk/dangerous-name-runtime";
export { resolveDefaultGroupPolicy } from "granted/plugin-sdk/runtime-group-policy";
export { withFileLock } from "granted/plugin-sdk/file-lock";
export { keepHttpServerTaskAlive } from "granted/plugin-sdk/channel-outbound";
export {
  detectMime,
  extensionForMime,
  extractOriginalFilename,
  getFileExtension,
} from "granted/plugin-sdk/media-runtime";
export { resolveChannelMediaMaxBytes } from "granted/plugin-sdk/account-helpers";
export { loadOutboundMediaFromUrl } from "granted/plugin-sdk/outbound-media";
// Deprecated media-legacy-projection surface; the re-export stays until the
// compat record's removeAfter window expires (deleted in retirement PR 4).
export { buildMediaPayload } from "granted/plugin-sdk/reply-payload";
export type { ReplyPayload } from "granted/plugin-sdk/reply-payload";
export type { PluginRuntime } from "granted/plugin-sdk/runtime-store";
export type { RuntimeEnv } from "granted/plugin-sdk/runtime";
export type { SsrFPolicy } from "granted/plugin-sdk/ssrf-runtime";
export { fetchWithSsrFGuard } from "granted/plugin-sdk/ssrf-runtime";
export { normalizeStringEntries } from "granted/plugin-sdk/string-normalization-runtime";
export { chunkTextForOutbound } from "granted/plugin-sdk/text-chunking";
export { DEFAULT_WEBHOOK_MAX_BODY_BYTES } from "granted/plugin-sdk/webhook-ingress";
export { setMSTeamsRuntime } from "./src/runtime.js";
