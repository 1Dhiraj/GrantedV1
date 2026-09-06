/**
 * Default agent workspace resolver.
 *
 * Derives the process workspace directory from env, profile, and home-directory state.
 */
import os from "node:os";
import path from "node:path";
import { normalizeOptionalLowercaseString } from "@openclaw/normalization-core/string-coerce";
import { resolveProfileStateDir } from "../cli/profile-utils.js";
import { resolveStateDir } from "../config/paths.js";

/** Resolve the default agent workspace directory from env/profile/home state. */
export function resolveDefaultAgentWorkspaceDir(
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = os.homedir,
): string {
  const workspaceDir = env.GRANTED_WORKSPACE_DIR?.trim();
  if (workspaceDir) {
    return path.resolve(workspaceDir);
  }
  if (env.GRANTED_STATE_DIR?.trim()) {
    return path.join(resolveStateDir(env, homedir), "workspace");
  }
  const profile = env.GRANTED_PROFILE?.trim();
  if (profile && normalizeOptionalLowercaseString(profile) !== "default") {
    return path.join(resolveProfileStateDir(profile, env, homedir), "workspace");
  }
  // resolveStateDir picks the current state dir, or adopts one left by an
  // install from before the rename, so an existing workspace stays findable.
  return path.join(resolveStateDir(env, homedir), "workspace");
}

/** Default agent workspace directory for the current process environment. */
export const DEFAULT_AGENT_WORKSPACE_DIR = resolveDefaultAgentWorkspaceDir();
