// Nostr API module exposes the plugin public contract.
export {
  buildChannelConfigSchema,
  DEFAULT_ACCOUNT_ID,
  formatPairingApproveHint,
  type ChannelPlugin,
} from "granted/plugin-sdk/channel-plugin-common";
export type { ChannelOutboundAdapter } from "granted/plugin-sdk/channel-contract";
export {
  collectStatusIssuesFromLastError,
  createDefaultChannelRuntimeState,
} from "granted/plugin-sdk/status-helpers";
