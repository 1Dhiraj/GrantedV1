// Tlon plugin module implements runtime behavior.
import type { PluginRuntime } from "granted/plugin-sdk/plugin-runtime";
import { createPluginRuntimeStore } from "granted/plugin-sdk/runtime-store";

const { setRuntime: setTlonRuntime, getRuntime: getTlonRuntime } =
  createPluginRuntimeStore<PluginRuntime>({
    pluginId: "tlon",
    errorMessage: "Tlon runtime not initialized",
  });
export { getTlonRuntime, setTlonRuntime };
