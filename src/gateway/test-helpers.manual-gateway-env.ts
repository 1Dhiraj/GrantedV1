import path from "node:path";
import { setTestEnvValue } from "../test-utils/env.js";
import { GATEWAY_STARTUP_MUTATED_ENV_KEYS } from "./test-helpers.env.js";

const MANUAL_GATEWAY_BACKGROUND_ENV_KEYS = [
  "GRANTED_SKIP_BROWSER_CONTROL_SERVER",
  "GRANTED_SKIP_GMAIL_WATCHER",
  "GRANTED_SKIP_CANVAS_HOST",
  "GRANTED_SKIP_CHANNELS",
  "GRANTED_SKIP_PROVIDERS",
  "GRANTED_SKIP_CRON",
  "GRANTED_DISABLE_BUNDLED_PLUGINS",
  "GRANTED_BUNDLED_PLUGINS_DIR",
] as const;

export const MANUAL_GATEWAY_ENV_KEYS = [
  ...GATEWAY_STARTUP_MUTATED_ENV_KEYS,
  ...MANUAL_GATEWAY_BACKGROUND_ENV_KEYS,
] as const;

/** Keeps manual RPC suites on the real core Gateway without unrelated startup work. */
export function configureManualGatewayBackgroundEnv(tempHome: string): void {
  setTestEnvValue("GRANTED_SKIP_BROWSER_CONTROL_SERVER", "1");
  setTestEnvValue("GRANTED_SKIP_GMAIL_WATCHER", "1");
  setTestEnvValue("GRANTED_SKIP_CANVAS_HOST", "1");
  setTestEnvValue("GRANTED_SKIP_CHANNELS", "1");
  setTestEnvValue("GRANTED_SKIP_PROVIDERS", "1");
  setTestEnvValue("GRANTED_SKIP_CRON", "1");
  setTestEnvValue("GRANTED_DISABLE_BUNDLED_PLUGINS", "1");
  setTestEnvValue("GRANTED_BUNDLED_PLUGINS_DIR", path.join(tempHome, "no-plugins"));
}
