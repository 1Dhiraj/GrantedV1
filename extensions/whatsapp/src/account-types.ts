// Whatsapp plugin module implements account types behavior.
import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";

export type WhatsAppAccountConfig = NonNullable<
  NonNullable<NonNullable<GrantedConfig["channels"]>["whatsapp"]>["accounts"]
>[string];
