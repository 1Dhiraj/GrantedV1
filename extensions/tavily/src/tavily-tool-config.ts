// Tavily helper module supports tavily tool config behavior.
import type { GrantedConfig } from "openclaw/plugin-sdk/config-contracts";
import type { GrantedPluginToolContext } from "openclaw/plugin-sdk/plugin-entry";
import type { GrantedPluginApi } from "openclaw/plugin-sdk/plugin-runtime";

export type TavilyToolConfigContext = Pick<
  GrantedPluginToolContext,
  "config" | "runtimeConfig" | "getRuntimeConfig"
>;

export function resolveTavilyToolConfig(
  api: GrantedPluginApi,
  ctx?: TavilyToolConfigContext,
): GrantedConfig {
  return ctx?.getRuntimeConfig?.() ?? ctx?.runtimeConfig ?? ctx?.config ?? api.config;
}
