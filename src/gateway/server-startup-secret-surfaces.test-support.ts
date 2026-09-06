/** Secret-surface projection coverage loaded by the startup SecretRef suite. */
import { describe, expect, it } from "vitest";
import type { GrantedConfig } from "../config/types.openclaw.js";
import { resolveGatewayStartupSourceConfig } from "./server-startup-secret-surfaces.js";

function channelConfig(): GrantedConfig {
  return {
    channels: {
      telegram: {
        botToken: "example",
      },
    },
  };
}

describe("gateway startup secret surfaces", () => {
  it("preserves channel config during ordinary startup", () => {
    const config = channelConfig();
    expect(resolveGatewayStartupSourceConfig(config, {})).toBe(config);
  });

  it.each(["GRANTED_SKIP_CHANNELS", "GRANTED_SKIP_PROVIDERS"] as const)(
    "preserves explicit %s behavior",
    (key) => {
      expect(
        resolveGatewayStartupSourceConfig(channelConfig(), { [key]: "1" }).channels,
      ).toBeUndefined();
    },
  );
});
