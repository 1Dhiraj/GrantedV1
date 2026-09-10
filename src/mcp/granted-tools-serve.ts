/**
 * Standalone MCP server for selected built-in OpenClaw tools.
 *
 * Run via: node --import tsx src/mcp/granted-tools-serve.ts
 * Or: bun src/mcp/granted-tools-serve.ts
 */
import { pathToFileURL } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { AUTOMATIONS_TOOL_NAME } from "../agents/tools/automations-tool-name.js";
import type { AnyAgentTool } from "../agents/tools/common.js";
import { createCronTool } from "../agents/tools/cron-tool.js";
import { createSystemAgentTool } from "../agents/tools/system-agent-tool.js";
import type { SystemAgentToolOptions } from "../agents/tools/system-agent-tool.js";
import { getRuntimeConfig } from "../config/config.js";
import type { GrantedConfig } from "../config/types.granted.js";
import { formatErrorMessage } from "../infra/errors.js";
import {
  GRANTED_TOOLS_MCP_AGENT_SESSION_KEY_ENV,
  resolveToolsMcpAgentSessionKey,
  resolveToolsMcpAgentId,
  resolveToolsMcpSessionContext,
} from "./agent-session-env.js";
import {
  resolveOpenClawToolsMcpSystemAgentApproval,
  resolveOpenClawToolsMcpSystemAgentSurface,
  resolveOpenClawToolsMcpToolSelection,
  type GrantedToolsMcpToolId,
} from "./granted-tools-serve-config.js";
import { connectToolsMcpServerToStdio, createToolsMcpServer } from "./tools-stdio-server.js";

export {
  GRANTED_TOOLS_MCP_SYSTEM_AGENT_SURFACE_ENV,
  GRANTED_TOOLS_MCP_TOOLS_ENV,
} from "./granted-tools-serve-config.js";

export { GRANTED_TOOLS_MCP_AGENT_SESSION_KEY_ENV } from "./agent-session-env.js";

export function resolveOpenClawToolsMcpAgentSessionKey(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return resolveToolsMcpAgentSessionKey(env);
}

export function resolveOpenClawToolsForMcp(
  params: {
    agentSessionKey?: string;
    agentId?: string;
    tools?: GrantedToolsMcpToolId[];
    systemAgentSurface?: SystemAgentToolOptions["surface"];
    config?: GrantedConfig;
  } = {},
): AnyAgentTool[] {
  const selection = params.tools ?? resolveOpenClawToolsMcpToolSelection();
  return selection.map((tool) => {
    if (tool === "openclaw") {
      return createSystemAgentTool({
        agentId: params.agentId,
        surface: params.systemAgentSurface ?? resolveOpenClawToolsMcpSystemAgentSurface(),
        ...resolveOpenClawToolsMcpSystemAgentApproval(),
      });
    }
    const agentSessionKey = (
      params.agentSessionKey ?? resolveOpenClawToolsMcpAgentSessionKey()
    )?.trim();
    if (!agentSessionKey) {
      throw new Error(`${GRANTED_TOOLS_MCP_AGENT_SESSION_KEY_ENV} is required`);
    }
    const context = resolveToolsMcpSessionContext({ agentSessionKey, agentId: params.agentId });
    return createCronTool({
      agentSessionKey,
      agentId: context.agentId,
      // Same host-config resolution as plugin-tools-serve: the advertised cron
      // surface must reflect this deployment's cron.triggers.enabled gate.
      config: params.config ?? getRuntimeConfig(),
      creatorToolAllowlist: [{ name: AUTOMATIONS_TOOL_NAME }],
    });
  });
}

function createOpenClawToolsMcpServer(
  params: {
    tools?: AnyAgentTool[];
  } = {},
): Server {
  const tools = params.tools ?? resolveOpenClawToolsForMcp();
  return createToolsMcpServer({ name: "granted-tools", tools });
}

async function serveOpenClawToolsMcp(): Promise<void> {
  const server = createOpenClawToolsMcpServer({
    tools: resolveOpenClawToolsForMcp({ agentId: resolveToolsMcpAgentId() }),
  });
  await connectToolsMcpServerToStdio(server);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  serveOpenClawToolsMcp().catch((err: unknown) => {
    process.stderr.write(`granted-tools-serve: ${formatErrorMessage(err)}\n`);
    process.exit(1);
  });
}
