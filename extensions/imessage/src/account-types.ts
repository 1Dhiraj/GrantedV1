// Imessage plugin module implements account types behavior.
import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";

export type IMessageAccountConfig = Omit<
  NonNullable<NonNullable<GrantedConfig["channels"]>["imessage"]>,
  "accounts" | "defaultAccount"
>;
