// Diffs API module exposes the plugin public contract.
export type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
export {
  definePluginEntry,
  type AnyAgentTool,
  type GrantedPluginApi,
  type GrantedPluginConfigSchema,
  type GrantedPluginToolContext,
  type PluginLogger,
} from "granted/plugin-sdk/plugin-entry";
export { resolvePreferredOpenClawTmpDir } from "granted/plugin-sdk/temp-path";
