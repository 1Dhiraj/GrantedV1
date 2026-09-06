import type { GrantedConfig } from "../../config/types.openclaw.js";
import { tryResolveSessionCompatibilityOwnerAgentId } from "../session-request-agent.js";

export function resolveChatSendStopOwnerScope(params: {
  cfg: GrantedConfig;
  selectedAgentId?: string;
  sessionKey: string;
}): { agentId?: string; defaultAgentId?: string } {
  return {
    agentId: params.selectedAgentId,
    defaultAgentId: tryResolveSessionCompatibilityOwnerAgentId(params.cfg, params.sessionKey),
  };
}
