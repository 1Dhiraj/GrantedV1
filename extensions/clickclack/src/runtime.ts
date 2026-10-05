/**
 * Runtime store for host-provided Granted services used by the ClickClack
 * bundled plugin.
 */
import { createPluginRuntimeStore } from "granted/plugin-sdk/runtime-store";
import type { PluginRuntime } from "granted/plugin-sdk/runtime-store";

const { setRuntime: setClickClackRuntime, getRuntime: getClickClackRuntime } =
  createPluginRuntimeStore<PluginRuntime>({
    pluginId: "clickclack",
    errorMessage: "ClickClack runtime not initialized",
  });

export { getClickClackRuntime, setClickClackRuntime };
