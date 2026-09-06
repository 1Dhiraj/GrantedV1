// Discord API module exposes the plugin public contract.
import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
import { inspectDiscordAccount } from "./src/account-inspect.js";

export function inspectDiscordReadOnlyAccount(cfg: GrantedConfig, accountId?: string | null) {
  return inspectDiscordAccount({ cfg, accountId });
}
