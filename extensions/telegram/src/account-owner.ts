import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
import { resolveAgentRoute } from "granted/plugin-sdk/routing";

/** Resolves the agent that owns account-scoped Telegram runtime state. */
export function resolveTelegramAccountOwnerAgentId(params: {
  cfg: GrantedConfig;
  accountId?: string | null;
}): string {
  return resolveAgentRoute({
    cfg: params.cfg,
    channel: "telegram",
    accountId: params.accountId,
  }).agentId;
}
