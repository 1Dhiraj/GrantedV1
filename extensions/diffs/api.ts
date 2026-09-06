// Diffs API module exposes the plugin public contract.
export type { GrantedConfig } from "openclaw/plugin-sdk/config-contracts";
export {
  definePluginEntry,
  type AnyAgentTool,
  type GrantedPluginApi,
  type GrantedPluginConfigSchema,
  type GrantedPluginToolContext,
  type PluginLogger,
} from "openclaw/plugin-sdk/plugin-entry";
export { resolvePreferredOpenClawTmpDir } from "openclaw/plugin-sdk/temp-path";
