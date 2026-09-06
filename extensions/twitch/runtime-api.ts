// Private runtime barrel for the bundled Twitch extension.
// Keep this barrel thin and aligned with the local extension surface.

export type {
  ChannelAccountSnapshot,
  ChannelCapabilities,
  ChannelGatewayContext,
  ChannelLogSink,
  ChannelMessageActionAdapter,
  ChannelMessageActionContext,
  ChannelMeta,
  ChannelOutboundAdapter,
  ChannelOutboundContext,
  ChannelResolveKind,
  ChannelResolveResult,
  ChannelStatusAdapter,
} from "granted/plugin-sdk/channel-contract";
export type { ChannelPlugin } from "granted/plugin-sdk/channel-core";
export type { OutboundDeliveryResult } from "granted/plugin-sdk/channel-send-result";
export type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
export type { RuntimeEnv } from "granted/plugin-sdk/runtime";
export type { WizardPrompter } from "granted/plugin-sdk/setup";
