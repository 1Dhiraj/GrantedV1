// Imessage plugin module implements account types behavior.
import type { GrantedConfig } from "openclaw/plugin-sdk/config-contracts";

export type IMessageAccountConfig = Omit<
  NonNullable<NonNullable<GrantedConfig["channels"]>["imessage"]>,
  "accounts" | "defaultAccount"
>;
