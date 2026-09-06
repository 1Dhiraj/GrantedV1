// Lobster API module exposes the plugin public contract.
export { definePluginEntry } from "openclaw/plugin-sdk/core";
export type {
  AnyAgentTool,
  GrantedPluginApi,
  GrantedPluginToolContext,
  GrantedPluginToolFactory,
} from "openclaw/plugin-sdk/core";
export {
  applyWindowsSpawnProgramPolicy,
  materializeWindowsSpawnProgram,
  resolveWindowsSpawnProgramCandidate,
} from "openclaw/plugin-sdk/windows-spawn";
