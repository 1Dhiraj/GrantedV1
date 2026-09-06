import type { GrantedConfig } from "openclaw/plugin-sdk/config-contracts";

export function resolveZalouserDmSessionScope(config: GrantedConfig) {
  const configured = config.session?.dmScope;
  return configured === "main" || !configured ? "per-channel-peer" : configured;
}
