// Slack API module exposes the plugin public contract.
import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
import { inspectSlackAccount } from "./src/account-inspect.js";

export function inspectSlackReadOnlyAccount(cfg: GrantedConfig, accountId?: string | null) {
  return inspectSlackAccount({ cfg, accountId });
}
