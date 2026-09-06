// Slack plugin module implements slash dispatch behavior.
import {
  dispatchChannelInboundTurn as dispatchChannelInboundTurnImpl,
  isChannelPartialDeliveryError as isChannelPartialDeliveryErrorImpl,
} from "granted/plugin-sdk/channel-inbound";
import { resolveConversationLabel as resolveConversationLabelImpl } from "granted/plugin-sdk/conversation-runtime";
import { resolveMarkdownTableMode as resolveMarkdownTableModeImpl } from "granted/plugin-sdk/markdown-table-runtime";
import {
  finalizeInboundContext as finalizeInboundContextImpl,
  resolveChunkMode as resolveChunkModeImpl,
} from "granted/plugin-sdk/reply-runtime";
import { resolveAgentRoute as resolveAgentRouteImpl } from "granted/plugin-sdk/routing";
import { deliverSlackSlashReplies as deliverSlackSlashRepliesImpl } from "./replies.js";
export { sanitizeSlackMonitorReplyPayload } from "./replies.js";

type ResolveChunkMode = typeof import("granted/plugin-sdk/reply-runtime").resolveChunkMode;
type FinalizeInboundContext =
  typeof import("granted/plugin-sdk/reply-runtime").finalizeInboundContext;
type DispatchChannelInboundTurn =
  typeof import("granted/plugin-sdk/channel-inbound").dispatchChannelInboundTurn;
type IsChannelPartialDeliveryError =
  typeof import("granted/plugin-sdk/channel-inbound").isChannelPartialDeliveryError;
type ResolveConversationLabel =
  typeof import("granted/plugin-sdk/conversation-runtime").resolveConversationLabel;
type ResolveMarkdownTableMode =
  typeof import("granted/plugin-sdk/markdown-table-runtime").resolveMarkdownTableMode;
type ResolveAgentRoute = typeof import("granted/plugin-sdk/routing").resolveAgentRoute;
type DeliverSlackSlashReplies = typeof import("./replies.js").deliverSlackSlashReplies;

export function resolveChunkMode(
  ...args: Parameters<ResolveChunkMode>
): ReturnType<ResolveChunkMode> {
  return resolveChunkModeImpl(...args);
}

export function finalizeInboundContext(
  ...args: Parameters<FinalizeInboundContext>
): ReturnType<FinalizeInboundContext> {
  return finalizeInboundContextImpl(...args);
}

export function dispatchChannelInboundTurn(
  ...args: Parameters<DispatchChannelInboundTurn>
): ReturnType<DispatchChannelInboundTurn> {
  return dispatchChannelInboundTurnImpl(...args);
}

export function isChannelPartialDeliveryError(
  ...args: Parameters<IsChannelPartialDeliveryError>
): ReturnType<IsChannelPartialDeliveryError> {
  return isChannelPartialDeliveryErrorImpl(...args);
}

export function resolveConversationLabel(
  ...args: Parameters<ResolveConversationLabel>
): ReturnType<ResolveConversationLabel> {
  return resolveConversationLabelImpl(...args);
}

export function resolveMarkdownTableMode(
  ...args: Parameters<ResolveMarkdownTableMode>
): ReturnType<ResolveMarkdownTableMode> {
  return resolveMarkdownTableModeImpl(...args);
}

export function resolveAgentRoute(
  ...args: Parameters<ResolveAgentRoute>
): ReturnType<ResolveAgentRoute> {
  return resolveAgentRouteImpl(...args);
}

export function deliverSlackSlashReplies(
  ...args: Parameters<DeliverSlackSlashReplies>
): ReturnType<DeliverSlackSlashReplies> {
  return deliverSlackSlashRepliesImpl(...args);
}
