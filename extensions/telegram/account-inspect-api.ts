// Telegram API module exposes the plugin public contract.
import type { GrantedConfig } from "./runtime-api.js";
import { inspectTelegramAccount } from "./src/account-inspect.js";

export function inspectTelegramReadOnlyAccount(cfg: GrantedConfig, accountId?: string | null) {
  return inspectTelegramAccount({ cfg, accountId });
}
