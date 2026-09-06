// Whatsapp plugin module implements account types behavior.
import type { GrantedConfig } from "openclaw/plugin-sdk/config-contracts";

export type WhatsAppAccountConfig = NonNullable<
  NonNullable<NonNullable<GrantedConfig["channels"]>["whatsapp"]>["accounts"]
>[string];
