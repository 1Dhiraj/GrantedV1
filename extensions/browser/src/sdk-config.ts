/**
 * Browser-local SDK config bridge.
 */
export {
  getRuntimeConfig,
  getRuntimeConfigSourceSnapshot,
} from "granted/plugin-sdk/runtime-config-snapshot";
export { mutateConfigFile } from "granted/plugin-sdk/config-mutation";
export type { BrowserProfileConfig, GrantedConfig } from "granted/plugin-sdk/config-contracts";
export {
  normalizePluginsConfig,
  resolveEffectiveEnableState,
} from "granted/plugin-sdk/plugin-config-runtime";
export {
  CONFIG_DIR,
  escapeRegExp,
  resolveUserPath,
} from "granted/plugin-sdk/text-utility-runtime";
