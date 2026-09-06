// Daemon constant tests cover platform constants used by service installers.
import { describe, expect, it } from "vitest";
import {
  GATEWAY_LAUNCH_AGENT_LABEL,
  LEGACY_GATEWAY_SYSTEMD_SERVICE_NAMES,
  resolveGatewayLaunchAgentLabel,
  resolveGatewayNativeServiceIdentityConflict,
  resolveGatewayProfileSuffix,
  resolveGatewayServiceDescription,
  resolveGatewaySystemdServiceName,
  resolveGatewayWindowsTaskName,
} from "./constants.js";

describe("resolveGatewayLaunchAgentLabel", () => {
  it("returns default label when no profile is set", () => {
    const result = resolveGatewayLaunchAgentLabel();
    expect(result).toBe(GATEWAY_LAUNCH_AGENT_LABEL);
    expect(result).toBe("ai.granted.gateway");
  });

  it("returns profile-specific label when profile is set", () => {
    const result = resolveGatewayLaunchAgentLabel("dev");
    expect(result).toBe("ai.granted.dev");
  });
});

describe("resolveGatewaySystemdServiceName", () => {
  it("returns default service name when no profile is set", () => {
    const result = resolveGatewaySystemdServiceName();
    expect(result).toBe("granted-gateway");
  });

  it("returns profile-specific service name when profile is set", () => {
    const result = resolveGatewaySystemdServiceName("dev");
    expect(result).toBe("granted-gateway-dev");
  });
});

describe("resolveGatewayWindowsTaskName", () => {
  it("returns default task name when no profile is set", () => {
    const result = resolveGatewayWindowsTaskName();
    expect(result).toBe("Granted Gateway");
  });

  it("returns profile-specific task name when profile is set", () => {
    const result = resolveGatewayWindowsTaskName("dev");
    expect(result).toBe("Granted Gateway (dev)");
  });
});

describe("resolveGatewayNativeServiceIdentityConflict", () => {
  it.each([
    {
      platform: "darwin" as const,
      envKey: "GRANTED_LAUNCHD_LABEL",
      value: "ai.granted.gateway",
    },
    {
      platform: "linux" as const,
      envKey: "GRANTED_SYSTEMD_UNIT",
      value: "granted-gateway.service",
    },
    {
      platform: "win32" as const,
      envKey: "GRANTED_WINDOWS_TASK_NAME",
      value: "Granted Gateway",
    },
  ])("rejects $envKey overrides for named profiles on $platform", ({ platform, envKey, value }) => {
    expect(
      resolveGatewayNativeServiceIdentityConflict(
        { GRANTED_PROFILE: "work", [envKey]: value },
        platform,
      ),
    ).toMatchObject({ envKey });
  });

  it("accepts canonical named-profile identities and default-profile overrides", () => {
    expect(
      resolveGatewayNativeServiceIdentityConflict(
        { GRANTED_PROFILE: "work", GRANTED_SYSTEMD_UNIT: "granted-gateway-work" },
        "linux",
      ),
    ).toBeNull();
    expect(
      resolveGatewayNativeServiceIdentityConflict(
        { GRANTED_SYSTEMD_UNIT: "custom-gateway.service" },
        "linux",
      ),
    ).toBeNull();
  });
});

describe("resolveGatewayProfileSuffix", () => {
  it("returns empty string when no profile is set", () => {
    expect(resolveGatewayProfileSuffix()).toBe("");
  });

  it("returns empty string for default profiles", () => {
    expect(resolveGatewayProfileSuffix("default")).toBe("");
    expect(resolveGatewayProfileSuffix(" Default ")).toBe("");
  });

  it("returns a hyphenated suffix for custom profiles", () => {
    expect(resolveGatewayProfileSuffix("dev")).toBe("-dev");
  });

  it("trims whitespace from profiles", () => {
    expect(resolveGatewayProfileSuffix("  staging  ")).toBe("-staging");
  });
});

describe("resolveGatewayServiceDescription", () => {
  it("returns default description when no profile", () => {
    expect(resolveGatewayServiceDescription({ env: {} })).toBe("Granted Gateway");
  });

  it("includes profile when set", () => {
    expect(resolveGatewayServiceDescription({ env: { GRANTED_PROFILE: "work" } })).toBe(
      "Granted Gateway (profile: work)",
    );
  });

  it("ignores legacy install-time version metadata", () => {
    expect(
      resolveGatewayServiceDescription({ env: { GRANTED_SERVICE_VERSION: "2026.1.10" } }),
    ).toBe("Granted Gateway");
  });

  it("prefers explicit description override", () => {
    expect(
      resolveGatewayServiceDescription({
        env: { GRANTED_PROFILE: "work" },
        description: "Custom",
      }),
    ).toBe("Custom");
  });
});

describe("LEGACY_GATEWAY_SYSTEMD_SERVICE_NAMES", () => {
  it("includes known pre-rebrand gateway unit names", () => {
    expect(LEGACY_GATEWAY_SYSTEMD_SERVICE_NAMES).toContain("clawdbot-gateway");
  });
});
