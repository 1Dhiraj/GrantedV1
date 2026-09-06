// Matrix plugin module implements monitor route test support behavior.
export {
  registerSessionBindingAdapter,
  testing,
} from "granted/plugin-sdk/session-binding-runtime";
export { resolveAgentRoute } from "granted/plugin-sdk/routing";
export {
  createTestRegistry,
  setActivePluginRegistry,
} from "granted/plugin-sdk/plugin-test-runtime";
export type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
