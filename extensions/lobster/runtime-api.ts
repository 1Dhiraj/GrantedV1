// Lobster API module exposes the plugin public contract.
export { definePluginEntry } from "granted/plugin-sdk/core";
export type {
  AnyAgentTool,
  GrantedPluginApi,
  GrantedPluginToolContext,
  GrantedPluginToolFactory,
} from "granted/plugin-sdk/core";
export {
  applyWindowsSpawnProgramPolicy,
  materializeWindowsSpawnProgram,
  resolveWindowsSpawnProgramCandidate,
} from "granted/plugin-sdk/windows-spawn";
