/**
 * Tool filesystem policy resolver.
 *
 * Combines global and agent fs/tool policy into workspace-only and root-expansion decisions.
 */
import os from "node:os";
import path from "node:path";
import type { GrantedConfig } from "../config/types.granted.js";
import { resolveAgentConfig } from "./agent-scope.js";
import { pickSandboxToolPolicy } from "./sandbox-tool-policy.js";
import { isToolAllowedByPolicies } from "./tool-policy-match.js";
import { mergeAlsoAllowPolicy, resolveToolProfilePolicy } from "./tool-policy.js";

export type { PreparedSessionPermissionPolicy, ToolFsPolicy } from "./tool-fs-policy.types.js";
export { resolveSessionPermissionExecMode } from "./session-permission-exec-mode.js";

export function resolveToolFsConfig(params: { cfg?: GrantedConfig; agentId?: string }): {
  workspaceOnly?: boolean;
  allowPaths?: string[];
} {
  const cfg = params.cfg;
  const globalFs = cfg?.tools?.fs;
  const agentFs =
    cfg && params.agentId ? resolveAgentConfig(cfg, params.agentId)?.tools?.fs : undefined;
  // Agent entries add folders rather than replace the global list: granting an
  // agent one more folder should not silently revoke the shared ones.
  const allowPaths = normalizeFsAllowPaths([
    ...(globalFs?.allowPaths ?? []),
    ...(agentFs?.allowPaths ?? []),
  ]);
  return {
    workspaceOnly: agentFs?.workspaceOnly ?? globalFs?.workspaceOnly,
    ...(allowPaths.length > 0 ? { allowPaths } : {}),
  };
}

/**
 * Resolves tools.fs.allowPaths entries to absolute directories.
 *
 * Relative entries are dropped: there is no stable base to resolve them
 * against, and guessing one would widen access somewhere the operator did not
 * name. `~` and `~/...` expand to the OS home directory.
 */
export function normalizeFsAllowPaths(entries: readonly string[]): string[] {
  const resolved = new Set<string>();
  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    const expanded =
      trimmed === "~" || trimmed.startsWith("~/") || trimmed.startsWith("~\\")
        ? path.join(os.homedir(), trimmed.slice(1))
        : trimmed;
    if (path.isAbsolute(expanded)) {
      resolved.add(path.resolve(expanded));
    }
  }
  return [...resolved];
}

export function resolveEffectiveToolFsWorkspaceOnly(params: {
  cfg?: GrantedConfig;
  agentId?: string;
}): boolean {
  return resolveToolFsConfig(params).workspaceOnly === true;
}

export function resolveEffectiveToolFsRootExpansionAllowed(params: {
  cfg?: GrantedConfig;
  agentId?: string;
}): boolean {
  const cfg = params.cfg;
  if (!cfg) {
    return true;
  }
  const agentTools = params.agentId ? resolveAgentConfig(cfg, params.agentId)?.tools : undefined;
  const globalTools = cfg.tools;
  const profile = agentTools?.profile ?? globalTools?.profile;
  const profileAlsoAllow = new Set(agentTools?.alsoAllow ?? globalTools?.alsoAllow ?? []);
  const fsConfig = resolveToolFsConfig(params);
  if (fsConfig.workspaceOnly === true) {
    return false;
  }
  // tools.fs presence does not grant access; require profile or alsoAllow (#47487).
  const profilePolicy = mergeAlsoAllowPolicy(
    resolveToolProfilePolicy(profile),
    profileAlsoAllow.size > 0 ? Array.from(profileAlsoAllow) : undefined,
  );
  const globalPolicy = pickSandboxToolPolicy(globalTools);
  const agentPolicy = pickSandboxToolPolicy(agentTools);
  return isToolAllowedByPolicies("read", [profilePolicy, globalPolicy, agentPolicy]);
}
