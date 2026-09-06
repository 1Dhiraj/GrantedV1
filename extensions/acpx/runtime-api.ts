/**
 * Public runtime API barrel for ACPX. Core and plugin consumers import these
 * SDK-facing ACP runtime contracts instead of reaching into ACPX internals.
 */
export type { AcpRuntimeErrorCode } from "granted/plugin-sdk/acp-runtime-backend";
export {
  AcpRuntimeError,
  getAcpRuntimeBackend,
  tryDispatchAcpReplyHook,
  registerAcpRuntimeBackend,
  unregisterAcpRuntimeBackend,
} from "granted/plugin-sdk/acp-runtime-backend";
export type {
  AcpRuntime,
  AcpRuntimeCapabilities,
  AcpRuntimeConfigOptionResult,
  AcpRuntimeDoctorReport,
  AcpRuntimeEnsureInput,
  AcpRuntimeEvent,
  AcpRuntimeHandle,
  AcpRuntimeStatus,
  AcpRuntimeTurn,
  AcpRuntimeTurnAttachment,
  AcpRuntimeTurnInput,
  AcpRuntimeTurnResult,
  AcpRuntimeTurnResultError,
  AcpSessionUpdateTag,
} from "granted/plugin-sdk/acp-runtime-backend";
export type {
  GrantedPluginApi,
  GrantedPluginConfigSchema,
  GrantedPluginService,
  GrantedPluginServiceContext,
  PluginLogger,
} from "granted/plugin-sdk/core";
export type {
  PluginHookReplyDispatchContext,
  PluginHookReplyDispatchEvent,
  PluginHookReplyDispatchResult,
} from "granted/plugin-sdk/core";
export type {
  WindowsSpawnProgram,
  WindowsSpawnProgramCandidate,
  WindowsSpawnResolution,
} from "granted/plugin-sdk/windows-spawn";
export {
  applyWindowsSpawnProgramPolicy,
  materializeWindowsSpawnProgram,
  resolveWindowsSpawnProgramCandidate,
} from "granted/plugin-sdk/windows-spawn";
export {
  listKnownProviderAuthEnvVarNames,
  omitEnvKeysCaseInsensitive,
} from "granted/plugin-sdk/provider-env-vars";
