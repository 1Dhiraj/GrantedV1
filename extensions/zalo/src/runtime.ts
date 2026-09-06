import type { PluginRuntime } from "granted/plugin-sdk/core";
// Zalo plugin module implements runtime behavior.
import { createPluginRuntimeStore } from "granted/plugin-sdk/runtime-store";

const { setRuntime: setZaloRuntime, getRuntime: getZaloRuntime } =
  createPluginRuntimeStore<PluginRuntime>({
    pluginId: "zalo",
    errorMessage: "Zalo runtime not initialized",
  });
export { getZaloRuntime, setZaloRuntime };
