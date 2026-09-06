// Private runtime barrel for the bundled Nostr extension.
// Keep this barrel thin and aligned with the local extension surface.

export type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
export { getPluginRuntimeGatewayRequestScope } from "granted/plugin-sdk/plugin-runtime";
export type { PluginRuntime } from "granted/plugin-sdk/runtime-store";
