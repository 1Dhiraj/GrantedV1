// Discord plugin module implements native command dispatch behavior.
import type { ChatCommandDefinition, CommandArgs } from "granted/plugin-sdk/command-auth-native";
import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
import type { PluginCommandCatalogDecision } from "granted/plugin-sdk/plugin-command-runtime";
import type { ReplyPayload } from "granted/plugin-sdk/reply-dispatch-runtime";
import type { ResolvedAgentRoute } from "granted/plugin-sdk/routing";
import type {
  ButtonInteraction,
  CommandInteraction,
  StringSelectMenuInteraction,
} from "../internal/discord.js";
import type { DiscordDispatchReplyFromConfig } from "./native-command.types.js";
import type { ThreadBindingManager } from "./thread-bindings.js";

type DiscordConfig = NonNullable<GrantedConfig["channels"]>["discord"];

type DispatchDiscordCommandInteractionParams = {
  interaction: CommandInteraction | ButtonInteraction | StringSelectMenuInteraction;
  prompt: string;
  command: ChatCommandDefinition;
  commandArgs?: CommandArgs;
  cfg: GrantedConfig;
  discordConfig: DiscordConfig;
  accountId: string;
  sessionPrefix: string;
  preferFollowUp: boolean;
  threadBindings: ThreadBindingManager;
  responseEphemeral?: boolean;
  suppressReplies?: boolean;
  dispatchReplyFromConfig?: DiscordDispatchReplyFromConfig;
  pluginCommandDispatch: PluginCommandCatalogDecision;
};

export type DispatchDiscordCommandInteractionResult = {
  accepted: boolean;
  effectiveRoute?: ResolvedAgentRoute;
  hiddenFinalReply?: ReplyPayload;
};

export type DispatchDiscordCommandInteraction = (
  params: DispatchDiscordCommandInteractionParams,
) => Promise<DispatchDiscordCommandInteractionResult>;
