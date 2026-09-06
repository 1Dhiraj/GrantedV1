import type { GrantedPluginApi } from "./plugin-api.types.js";
import type { GrantedPluginConfigSchema } from "./plugin-config-schema.types.js";
import type { PluginKind } from "./plugin-kind.types.js";
import type {
  GrantedPluginReloadRegistration,
  GrantedPluginSecurityAuditCollector,
} from "./plugin-registration.types.js";
import type { GrantedPluginNodeHostCommand } from "./types.node-host.js";

/** Module-level plugin definition loaded from a native plugin entry file. */
export type GrantedPluginDefinition = {
  id?: string;
  name?: string;
  description?: string;
  version?: string;
  /**
   * @deprecated Declare exclusive plugin kind in `openclaw.plugin.json` via
   * manifest `kind`. Runtime-exported `kind` is kept as a compatibility
   * fallback for older plugins and may require loading plugin runtime on
   * metadata-only command paths.
   */
  kind?: PluginKind | PluginKind[];
  configSchema?: GrantedPluginConfigSchema;
  reload?: GrantedPluginReloadRegistration;
  nodeHostCommands?: GrantedPluginNodeHostCommand[];
  securityAuditCollectors?: GrantedPluginSecurityAuditCollector[];
  register?: (api: GrantedPluginApi) => void;
};

export type GrantedPluginModule = GrantedPluginDefinition | ((api: GrantedPluginApi) => void);
