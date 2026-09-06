import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadGlobalRuntimeDotEnvFiles, readDotEnvFile } from "./dotenv-global.js";

const logWarnSpy = vi.hoisted(() => vi.fn());

vi.mock("../logging/subsystem.js", () => ({
  createSubsystemLogger: () => ({ warn: logWarnSpy }),
}));

const cleanups: Array<() => void> = [];

afterEach(() => {
  logWarnSpy.mockClear();
  for (const fn of cleanups.splice(0)) {
    fn();
  }
});

function tmpDir(): string {
  const d = mkdtempSync(join(tmpdir(), "openclaw-dotenv-global-"));
  cleanups.push(() => rmSync(d, { recursive: true, force: true }));
  return d;
}

function tmpFile(name: string, contents: string): string {
  const d = tmpDir();
  const p = join(d, name);
  writeFileSync(p, contents, "utf8");
  return p;
}

describe("readDotEnvFile", () => {
  it("reads a small .env file", () => {
    const filePath = tmpFile(".env", "API_KEY=secret\nOTHER_KEY=value\n");
    const result = readDotEnvFile({ filePath });
    expect(result).not.toBeNull();
    expect(result!.entries).toContainEqual({ key: "API_KEY", value: "secret" });
    expect(result!.entries).toContainEqual({ key: "OTHER_KEY", value: "value" });
    expect(logWarnSpy).not.toHaveBeenCalled();
  });

  it("reads a symlinked .env file", () => {
    const d = tmpDir();
    const realPath = join(d, "real.env");
    writeFileSync(realPath, "REAL_KEY=from_symlink_target\n", "utf8");
    const linkPath = join(d, ".env");
    symlinkSync(realPath, linkPath);
    const result = readDotEnvFile({ filePath: linkPath });
    expect(result).not.toBeNull();
    expect(result!.entries).toContainEqual({
      key: "REAL_KEY",
      value: "from_symlink_target",
    });
  });

  it("returns null for a missing file (quiet)", () => {
    const d = tmpDir();
    const result = readDotEnvFile({ filePath: join(d, "nonexistent.env"), quiet: true });
    expect(result).toBeNull();
    expect(logWarnSpy).not.toHaveBeenCalled();
  });

  it("warns when an oversized .env file is skipped", () => {
    const d = tmpDir();
    // Create a file larger than 1 MiB so the bounded read rejects it.
    const filePath = join(d, "oversized.env");
    const large = Buffer.alloc(2 * 1024 * 1024, "x");
    large.write("KEY=value\n", 0, "utf8");
    writeFileSync(filePath, large);
    const result = readDotEnvFile({ filePath, quiet: false });
    expect(result).toBeNull();
    expect(logWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("skipping oversized .env file (max"),
    );
  });
});

describe("loadGlobalRuntimeDotEnvFiles", () => {
  // The gateway env lives outside the state directory, so an install that
  // predates the rename keeps it under the old XDG name. These cover which of
  // those directories wins, since nothing else exercises that lookup.
  function withIsolatedHome(): string {
    const home = tmpDir();
    const previous = {
      home: process.env.GRANTED_HOME,
      stateDir: process.env.GRANTED_STATE_DIR,
    };
    process.env.GRANTED_HOME = home;
    delete process.env.GRANTED_STATE_DIR;
    cleanups.push(() => {
      restoreEnv("GRANTED_HOME", previous.home);
      restoreEnv("GRANTED_STATE_DIR", previous.stateDir);
    });
    return home;
  }

  function restoreEnv(key: string, value: string | undefined): void {
    if (value === undefined) {
      delete process.env[key];
      return;
    }
    process.env[key] = value;
  }

  function writeGatewayEnv(home: string, dirName: string, value: string): void {
    const dir = join(home, ".config", dirName);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "gateway.env"),
      `${PROBE_KEY}=${value}
`,
      "utf8",
    );
  }

  const PROBE_KEY = "GRANTED_GATEWAY_ENV_PROBE";

  function loadWithoutStateEnv(home: string) {
    cleanups.push(() => {
      delete process.env[PROBE_KEY];
    });
    return loadGlobalRuntimeDotEnvFiles({ stateEnvPath: join(home, "no-state-dir", ".env") });
  }

  it("reads the gateway env from the current config directory", () => {
    const home = withIsolatedHome();
    writeGatewayEnv(home, "granted", "from_current");

    const result = loadWithoutStateEnv(home);

    expect(result.gatewayEnvAppliedKeys).toContain(PROBE_KEY);
    expect(process.env[PROBE_KEY]).toBe("from_current");
  });

  it("falls back to the config directory written before the rename", () => {
    const home = withIsolatedHome();
    writeGatewayEnv(home, "openclaw", "from_legacy");

    const result = loadWithoutStateEnv(home);

    expect(result.gatewayEnvAppliedKeys).toContain(PROBE_KEY);
    expect(process.env[PROBE_KEY]).toBe("from_legacy");
  });

  it("prefers the current config directory over a legacy one", () => {
    const home = withIsolatedHome();
    writeGatewayEnv(home, "granted", "from_current");
    writeGatewayEnv(home, "openclaw", "from_legacy");

    loadWithoutStateEnv(home);

    expect(process.env[PROBE_KEY]).toBe("from_current");
  });

  it("reports no gateway env when neither directory has one", () => {
    const home = withIsolatedHome();

    const result = loadWithoutStateEnv(home);

    expect(result.gatewayEnvAppliedKeys).toEqual([]);
    expect(process.env[PROBE_KEY]).toBeUndefined();
  });
});
