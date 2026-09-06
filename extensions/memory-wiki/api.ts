// Memory Wiki API module exposes the plugin public contract.
export {
  buildPluginConfigSchema,
  definePluginEntry,
  type AnyAgentTool,
  type GrantedConfig,
  type GrantedPluginApi,
  type GrantedPluginConfigSchema,
} from "granted/plugin-sdk/plugin-entry";
export { z } from "zod";
