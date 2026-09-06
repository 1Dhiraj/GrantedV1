// Whatsapp API module exposes the plugin public contract.
export { resolveIdentityNamePrefix } from "granted/plugin-sdk/agent-runtime";
export { formatInboundEnvelope } from "granted/plugin-sdk/channel-inbound";
export { resolveInboundSessionEnvelopeContext } from "granted/plugin-sdk/channel-inbound";
export { createChannelMessageReplyPipeline } from "granted/plugin-sdk/channel-outbound";
export {
  isControlCommandMessage,
  shouldComputeCommandAuthorized,
} from "granted/plugin-sdk/command-detection";
export { resolveChannelContextVisibilityMode } from "../config.runtime.js";
export { getAgentScopedMediaLocalRoots } from "granted/plugin-sdk/media-runtime";
export type LoadConfigFn = typeof import("../config.runtime.js").getRuntimeConfig;
export {
  buildHistoryContextFromEntries,
  type HistoryEntry,
} from "granted/plugin-sdk/reply-history";
export { resolveSendableOutboundReplyParts } from "granted/plugin-sdk/reply-payload";
export {
  resolveChunkMode,
  resolveTextChunkLimit,
  type getReplyFromConfig,
  type ReplyPayload,
} from "granted/plugin-sdk/reply-runtime";
export {
  resolveInboundLastRouteSessionKey,
  type resolveAgentRoute,
} from "granted/plugin-sdk/routing";
export { logVerbose, shouldLogVerbose, type getChildLogger } from "granted/plugin-sdk/runtime-env";
export { resolvePinnedMainDmOwnerFromAllowlist } from "granted/plugin-sdk/security-runtime";
export { resolveMarkdownTableMode } from "granted/plugin-sdk/markdown-table-runtime";
export { jidToE164, normalizeE164 } from "../../text-runtime.js";
