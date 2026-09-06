// Narrow Matrix monitor helper seam.
// Keep monitor internals off the broad package runtime-api barrel so monitor
// tests and shared workers do not pull unrelated Matrix helper surfaces.

export type { NormalizedLocation } from "granted/plugin-sdk/channel-inbound";
export type { PluginRuntime, RuntimeLogger } from "granted/plugin-sdk/plugin-runtime";
export type { BlockReplyContext, ReplyPayload } from "granted/plugin-sdk/reply-runtime";
export type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
export type { RuntimeEnv } from "granted/plugin-sdk/runtime";
export {
  addAllowlistUserEntriesFromConfigEntry,
  buildAllowlistResolutionSummary,
  canonicalizeAllowlistWithResolvedIds,
  patchAllowlistUsersInConfigEntries,
  summarizeMapping,
} from "granted/plugin-sdk/allow-from";
export {
  createReplyPrefixOptions,
  createTypingCallbacks,
} from "granted/plugin-sdk/channel-outbound";
export { formatLocationText, toLocationContext } from "granted/plugin-sdk/channel-inbound";
export { getAgentScopedMediaLocalRoots } from "granted/plugin-sdk/media-local-roots";
export { logInboundDrop } from "granted/plugin-sdk/channel-inbound";
export { logTypingFailure } from "granted/plugin-sdk/channel-outbound";
export { buildChannelKeyCandidates } from "granted/plugin-sdk/channel-targets";
