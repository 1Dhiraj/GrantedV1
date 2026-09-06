// Daemon runtime hint tests cover platform-specific daemon guidance.
import { describe, expect, it } from "vitest";
import { buildPlatformRuntimeLogHints, buildPlatformServiceStartHints } from "./runtime-hints.js";

describe("buildPlatformRuntimeLogHints", () => {
  it("renders launchd log hints on darwin", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "darwin",
        env: {
          HOME: "/Users/test",
          GRANTED_STATE_DIR: "/tmp/openclaw-state",
          GRANTED_LOG_PREFIX: "gateway",
        },
        systemdServiceName: "granted-gateway",
        windowsTaskName: "Granted Gateway",
      }),
    ).toEqual([
      "Launchd stdout (if installed): /Users/test/Library/Logs/openclaw/gateway.log",
      "Launchd stderr (if installed): suppressed",
      "Restart attempts: /tmp/openclaw-state/logs/gateway-restart.log",
    ]);
  });

  it("renders systemd and windows hints by platform", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "linux",
        env: {
          GRANTED_STATE_DIR: "/tmp/openclaw-state",
        },
        systemdServiceName: "granted-gateway",
        windowsTaskName: "Granted Gateway",
      }),
    ).toEqual([
      "Logs: journalctl --user -u granted-gateway.service -n 200 --no-pager",
      "Restart attempts: /tmp/openclaw-state/logs/gateway-restart.log",
    ]);
    expect(
      buildPlatformRuntimeLogHints({
        platform: "win32",
        env: {
          GRANTED_STATE_DIR: "/tmp/openclaw-state",
        },
        systemdServiceName: "granted-gateway",
        windowsTaskName: "Granted Gateway",
      }),
    ).toEqual([
      'Logs: schtasks /Query /TN "Granted Gateway" /V /FO LIST',
      "Restart attempts: /tmp/openclaw-state/logs/gateway-restart.log",
    ]);
  });
});

describe("buildPlatformServiceStartHints", () => {
  it("builds platform-specific service start hints", () => {
    expect(
      buildPlatformServiceStartHints({
        platform: "darwin",
        installCommand: "openclaw gateway install",
        startCommand: "openclaw gateway",
        launchAgentPlistPath: "~/Library/LaunchAgents/com.openclaw.gateway.plist",
        systemdServiceName: "granted-gateway",
        windowsTaskName: "Granted Gateway",
      }),
    ).toEqual([
      "openclaw gateway install",
      "openclaw gateway",
      "launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.openclaw.gateway.plist",
    ]);
    expect(
      buildPlatformServiceStartHints({
        platform: "linux",
        installCommand: "openclaw gateway install",
        startCommand: "openclaw gateway",
        launchAgentPlistPath: "~/Library/LaunchAgents/com.openclaw.gateway.plist",
        systemdServiceName: "granted-gateway",
        windowsTaskName: "Granted Gateway",
      }),
    ).toEqual([
      "openclaw gateway install",
      "openclaw gateway",
      "systemctl --user start granted-gateway.service",
    ]);
  });
});
