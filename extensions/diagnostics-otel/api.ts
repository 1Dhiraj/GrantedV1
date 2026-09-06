// Diagnostics Otel API module exposes the plugin public contract.
export {
  createChildDiagnosticTraceContext,
  createDiagnosticTraceContext,
  emitDiagnosticEvent,
  formatDiagnosticTraceparent,
  isValidDiagnosticSpanId,
  isValidDiagnosticTraceFlags,
  isValidDiagnosticTraceId,
  onDiagnosticEvent,
  parseDiagnosticTraceparent,
  type DiagnosticEventMetadata,
  type DiagnosticEventPayload,
  type DiagnosticEventPrivateData,
  type DiagnosticTraceContext,
} from "granted/plugin-sdk/diagnostic-runtime";
export { emptyPluginConfigSchema, type GrantedPluginApi } from "granted/plugin-sdk/plugin-entry";
export type {
  GrantedPluginService,
  GrantedPluginServiceContext,
} from "granted/plugin-sdk/plugin-entry";
export { redactSensitiveText } from "granted/plugin-sdk/security-runtime";
