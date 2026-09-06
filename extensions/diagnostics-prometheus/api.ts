// Diagnostics Prometheus API module exposes the plugin public contract.
export type {
  DiagnosticEventMetadata,
  DiagnosticEventPayload,
} from "granted/plugin-sdk/diagnostic-runtime";
export { isInternalDiagnosticEventMetadata } from "granted/plugin-sdk/diagnostic-runtime";
export {
  emptyPluginConfigSchema,
  type GrantedPluginApi,
  type GrantedPluginHttpRouteHandler,
  type GrantedPluginService,
  type GrantedPluginServiceContext,
} from "granted/plugin-sdk/plugin-entry";
export { redactSensitiveText } from "granted/plugin-sdk/security-runtime";
