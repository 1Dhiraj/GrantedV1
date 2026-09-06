// Whatsapp plugin module implements channel actions behavior.
import { createActionGate } from "granted/plugin-sdk/channel-actions";
import type { ChannelMessageActionName } from "granted/plugin-sdk/channel-contract";
import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";

export { listWhatsAppAccountIds, resolveWhatsAppAccount } from "./accounts.js";
export { resolveWhatsAppReactionLevel } from "./reaction-level.js";
export { createActionGate, type ChannelMessageActionName, type GrantedConfig };
