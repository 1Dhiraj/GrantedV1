// Irc API module exposes the plugin public contract.
export { createAccountStatusSink } from "granted/plugin-sdk/channel-outbound";
export { DEFAULT_ACCOUNT_ID } from "granted/plugin-sdk/account-id";
export type { ChannelPlugin } from "granted/plugin-sdk/channel-core";
export { PAIRING_APPROVED_MESSAGE } from "granted/plugin-sdk/channel-status";
export { buildBaseChannelStatusSummary } from "granted/plugin-sdk/status-helpers";
export { chunkTextForOutbound } from "granted/plugin-sdk/text-chunking";
