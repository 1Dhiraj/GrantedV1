// Telegram plugin module implements bot message context.session behavior.
export { buildChannelInboundEventContext } from "granted/plugin-sdk/channel-inbound";
export {
  readAmbientTranscriptWatermark,
  readSessionUpdatedAt,
  resolveAmbientTranscriptWatermarkKey,
  resolveStorePath,
} from "granted/plugin-sdk/session-store-runtime";
export { recordInboundSession } from "granted/plugin-sdk/conversation-runtime";
export { resolveInboundLastRouteSessionKey } from "granted/plugin-sdk/routing";
export { resolvePinnedMainDmOwnerFromAllowlist } from "granted/plugin-sdk/security-runtime";
