// Zalouser plugin module implements runtime behavior.
import type { PluginRuntime } from "granted/plugin-sdk/core";
import { createPluginRuntimeStore } from "granted/plugin-sdk/runtime-store";

const { setRuntime: setZalouserRuntime, getRuntime: getZalouserRuntime } =
  createPluginRuntimeStore<PluginRuntime>({
    pluginId: "zalouser",
    errorMessage: "Zalouser runtime not initialized",
  });
export { getZalouserRuntime, setZalouserRuntime };
