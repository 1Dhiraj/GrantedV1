import type { GrantedConfig } from "../../config/types.granted.js";

// Reply completeness is process-local metadata. Keep it off config objects so
// frozen runtime snapshots and identity-keyed caches remain valid.
const replyConfigRuntimeModes = new WeakMap<GrantedConfig, "fast" | "full">();

export function markReplyConfigRuntimeMode<T extends GrantedConfig>(
  config: T,
  runtimeMode: "fast" | "full",
): T {
  replyConfigRuntimeModes.set(config, runtimeMode);
  return config;
}

export function isCompleteReplyConfig(config: unknown): config is GrantedConfig {
  return Boolean(
    config && typeof config === "object" && replyConfigRuntimeModes.has(config as GrantedConfig),
  );
}

export function usesFullReplyRuntime(config: unknown): boolean {
  if (!config || typeof config !== "object") {
    return false;
  }
  const mode = replyConfigRuntimeModes.get(config as GrantedConfig);
  return mode === "full";
}
