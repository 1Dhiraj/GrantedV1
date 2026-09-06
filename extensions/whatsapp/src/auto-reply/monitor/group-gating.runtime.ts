// Whatsapp plugin module implements group gating behavior.
export {
  implicitMentionKindWhen,
  resolveInboundMentionDecision,
} from "granted/plugin-sdk/channel-mention-gating";
export { hasControlCommand } from "granted/plugin-sdk/command-detection";
export { createChannelHistoryWindow } from "granted/plugin-sdk/reply-history";
export { parseActivationCommand } from "granted/plugin-sdk/group-activation";
export { normalizeE164 } from "../../text-runtime.js";
