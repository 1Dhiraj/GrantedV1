// Mattermost API module exposes the plugin public contract.
export { createAccountStatusSink } from "granted/plugin-sdk/channel-outbound";
export type { ChannelPlugin } from "granted/plugin-sdk/core";
export { DEFAULT_ACCOUNT_ID } from "granted/plugin-sdk/core";
export { chunkTextForOutbound } from "granted/plugin-sdk/text-chunking";
