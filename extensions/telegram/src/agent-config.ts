// Telegram helper module supports agent config behavior.
import { resolveAgentConfig } from "granted/plugin-sdk/agent-scope-runtime";
import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";

type ReasoningDefault = "on" | "stream" | "off";

export function resolveTelegramConfigReasoningDefault(
  cfg: GrantedConfig,
  agentId: string,
): ReasoningDefault {
  const agentDefault = resolveAgentConfig(cfg, agentId)?.reasoningDefault;
  return agentDefault ?? cfg.agents?.defaults?.reasoningDefault ?? "off";
}
