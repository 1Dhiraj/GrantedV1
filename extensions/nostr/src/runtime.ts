// Nostr plugin module implements runtime behavior.
import type { PluginRuntime } from "granted/plugin-sdk/core";
import { createPluginRuntimeStore } from "granted/plugin-sdk/runtime-store";

const { setRuntime: setNostrRuntime, getRuntime: getNostrRuntime } =
  createPluginRuntimeStore<PluginRuntime>({
    pluginId: "nostr",
    errorMessage: "Nostr runtime not initialized",
  });
export { getNostrRuntime, setNostrRuntime };
