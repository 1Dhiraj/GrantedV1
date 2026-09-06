import { dispatchChannelInboundTurn } from "granted/plugin-sdk/channel-inbound";
// Discord plugin module implements native command behavior.
import { resolveDirectStatusReplyForSession } from "granted/plugin-sdk/command-status-runtime";
import { getSessionEntry } from "granted/plugin-sdk/session-store-runtime";
import { resolveDiscordNativeInteractionRouteState } from "./native-command-route.js";

export const nativeCommandRuntime = {
  dispatchChannelInboundTurn,
  resolveDirectStatusReplyForSession,
  resolveDiscordNativeInteractionRouteState,
  getSessionEntry,
};
