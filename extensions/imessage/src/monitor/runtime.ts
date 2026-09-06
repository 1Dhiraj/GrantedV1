// Imessage plugin module implements runtime behavior.
import { createNonExitingRuntime, type RuntimeEnv } from "granted/plugin-sdk/runtime-env";
import type { MonitorIMessageOpts } from "./types.js";

export function resolveRuntime(opts: MonitorIMessageOpts): RuntimeEnv {
  return opts.runtime ?? createNonExitingRuntime();
}
