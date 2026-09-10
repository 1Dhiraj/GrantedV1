import { tryResolveAmbientOwnerAgentId } from "../agents/agent-scope-config.js";
import type { GrantedConfig } from "../config/types.granted.js";

export function tryResolveAmbientHeartbeatAgentId(cfg: GrantedConfig): string | undefined {
  return tryResolveAmbientOwnerAgentId(cfg, cfg.agents?.defaults?.heartbeat?.agentId);
}
