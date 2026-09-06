/**
 * Resolves whether Codex app-server profiling instrumentation is enabled by
 * OpenClaw diagnostic flags.
 */
import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
import { isDiagnosticFlagEnabled } from "granted/plugin-sdk/diagnostic-flags";

const PROFILER_FLAGS = ["profiler", "codex.profiler"] as const;

/** Checks the generic and Codex-specific profiler diagnostic flags. */
export function isCodexAppServerProfilerEnabled(
  config?: GrantedConfig,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return PROFILER_FLAGS.some((flag) => isDiagnosticFlagEnabled(flag, config, env));
}
