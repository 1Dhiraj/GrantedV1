// Discord type declarations define plugin contracts.
import type { ChannelInboundTurnPlan } from "granted/plugin-sdk/channel-inbound";
import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
import type { CommandArgValues } from "granted/plugin-sdk/native-command-registry";

export type DiscordConfig = NonNullable<GrantedConfig["channels"]>["discord"];
export type DiscordDispatchReplyFromConfig = NonNullable<
  ChannelInboundTurnPlan["dispatchReplyFromConfig"]
>;

export type DiscordCommandArgs = {
  raw?: string;
  values?: CommandArgValues;
};
