import { describe, expect, it } from "vitest";
import {
  applyLegacyEnvAliases,
  hasLegacyEnvVars,
  readEnvWithLegacyNames,
} from "./env-legacy-aliases.js";

describe("applyLegacyEnvAliases", () => {
  it("carries a legacy variable onto its current name", () => {
    const env = { OPENCLAW_STATE_DIR: "/tmp/state" } as NodeJS.ProcessEnv;
    expect(applyLegacyEnvAliases(env)).toEqual(["GRANTED_STATE_DIR"]);
    expect(env.GRANTED_STATE_DIR).toBe("/tmp/state");
  });

  it("never lets a stale value beat an explicitly set current one", () => {
    // Someone migrating one variable at a time must get the new value.
    const env = {
      OPENCLAW_STATE_DIR: "/old",
      GRANTED_STATE_DIR: "/new",
    } as NodeJS.ProcessEnv;
    applyLegacyEnvAliases(env);
    expect(env.GRANTED_STATE_DIR).toBe("/new");
  });

  it("treats an empty string as deliberately set, not missing", () => {
    // "" is how a variable is turned off; the legacy value must not revive it.
    const env = { OPENCLAW_PROFILE: "work", GRANTED_PROFILE: "" } as NodeJS.ProcessEnv;
    applyLegacyEnvAliases(env);
    expect(env.GRANTED_PROFILE).toBe("");
  });

  it("supports the older prefix too", () => {
    const env = { CLAWDBOT_HOME: "/home/x" } as NodeJS.ProcessEnv;
    applyLegacyEnvAliases(env);
    expect(env.GRANTED_HOME).toBe("/home/x");
  });

  it("prefers the newer legacy prefix when both are present", () => {
    const env = {
      CLAWDBOT_GATEWAY_PORT: "1111",
      OPENCLAW_GATEWAY_PORT: "2222",
    } as NodeJS.ProcessEnv;
    applyLegacyEnvAliases(env);
    expect(env.GRANTED_GATEWAY_PORT).toBe("2222");
  });

  it("leaves unrelated variables alone", () => {
    const env = { PATH: "/usr/bin", HOME: "/home/x" } as NodeJS.ProcessEnv;
    expect(applyLegacyEnvAliases(env)).toEqual([]);
    expect(Object.keys(env).toSorted()).toEqual(["HOME", "PATH"]);
  });

  it("is safe to run twice", () => {
    const env = { OPENCLAW_STATE_DIR: "/tmp/state" } as NodeJS.ProcessEnv;
    applyLegacyEnvAliases(env);
    expect(applyLegacyEnvAliases(env)).toEqual([]);
    expect(env.GRANTED_STATE_DIR).toBe("/tmp/state");
  });
});

describe("hasLegacyEnvVars", () => {
  it("detects an old environment", () => {
    expect(hasLegacyEnvVars({ OPENCLAW_HOME: "/x" } as NodeJS.ProcessEnv)).toBe(true);
    expect(hasLegacyEnvVars({ GRANTED_HOME: "/x" } as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe("readEnvWithLegacyNames", () => {
  it("reads a current name", () => {
    expect(
      readEnvWithLegacyNames(
        { GRANTED_GATEWAY_PORT: "18789" } as NodeJS.ProcessEnv,
        "GRANTED_GATEWAY_PORT",
      ),
    ).toBe("18789");
  });

  it("falls back to the names a pre-rename install wrote", () => {
    // A service script written before the rename is parsed off disk, so the
    // process-wide aliasing never touches it.
    expect(
      readEnvWithLegacyNames(
        { OPENCLAW_GATEWAY_PORT: "18789" } as NodeJS.ProcessEnv,
        "GRANTED_GATEWAY_PORT",
      ),
    ).toBe("18789");
    expect(
      readEnvWithLegacyNames(
        { CLAWDBOT_GATEWAY_PORT: "1234" } as NodeJS.ProcessEnv,
        "GRANTED_GATEWAY_PORT",
      ),
    ).toBe("1234");
  });

  it("prefers the current name over a legacy one", () => {
    expect(
      readEnvWithLegacyNames(
        { GRANTED_GATEWAY_PORT: "1", OPENCLAW_GATEWAY_PORT: "2" } as NodeJS.ProcessEnv,
        "GRANTED_GATEWAY_PORT",
      ),
    ).toBe("1");
  });

  it("returns undefined for a missing key, a missing env, or a non-prefixed key", () => {
    expect(readEnvWithLegacyNames({} as NodeJS.ProcessEnv, "GRANTED_GATEWAY_PORT")).toBeUndefined();
    expect(readEnvWithLegacyNames(undefined, "GRANTED_GATEWAY_PORT")).toBeUndefined();
    expect(readEnvWithLegacyNames({ PATH: "/usr/bin" } as NodeJS.ProcessEnv, "PATH")).toBe(
      "/usr/bin",
    );
    expect(readEnvWithLegacyNames({} as NodeJS.ProcessEnv, "PATH")).toBeUndefined();
  });
});
