// Discord type declarations define plugin contracts.
import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
import type { DiscordDispatchReplyFromConfig } from "./native-command.types.js";
import type { ThreadBindingManager } from "./thread-bindings.js";

type DiscordConfig = NonNullable<GrantedConfig["channels"]>["discord"];

export type DiscordCommandArgContext = {
  cfg: GrantedConfig;
  discordConfig: DiscordConfig;
  accountId: string;
  sessionPrefix: string;
  threadBindings: ThreadBindingManager;
  dispatchReplyFromConfig?: DiscordDispatchReplyFromConfig;
  postApplySettleMs?: number;
};

export type DiscordModelPickerContext = DiscordCommandArgContext;

export type SafeDiscordInteractionCall = <T>(
  label: string,
  fn: () => Promise<T>,
) => Promise<T | null>;
