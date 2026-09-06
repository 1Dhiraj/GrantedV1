// Profile CLI tests cover profile selection, persistence, and command wiring.
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveGatewayPort } from "../config/paths.js";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs([
      "node",
      "openclaw",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "openclaw", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("leaves gateway --dev for subcommands after leading root options", () => {
    const res = parseCliProfileArgs([
      "node",
      "openclaw",
      "--no-color",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual([
      "node",
      "openclaw",
      "--no-color",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "openclaw", "--dev", "gateway"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "openclaw", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "openclaw", "--profile", "work", "status"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "openclaw", "status"]);
  });

  it("parses interleaved --profile after the command token", () => {
    const res = parseCliProfileArgs(["node", "openclaw", "status", "--profile", "work", "--deep"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "openclaw", "status", "--deep"]);
  });

  it("preserves Matrix QA --profile for the command parser", () => {
    const res = parseCliProfileArgs([
      "node",
      "openclaw",
      "qa",
      "matrix",
      "--profile",
      "fast",
      "--fail-fast",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual([
      "node",
      "openclaw",
      "qa",
      "matrix",
      "--profile",
      "fast",
      "--fail-fast",
    ]);
  });

  it("preserves Matrix QA --profile after leading root options", () => {
    const res = parseCliProfileArgs([
      "node",
      "openclaw",
      "--no-color",
      "qa",
      "matrix",
      "--profile=fast",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "openclaw", "--no-color", "qa", "matrix", "--profile=fast"]);
  });

  it("parses qa run --profile smoke-ci as a root profile", () => {
    const res = parseCliProfileArgs([
      "node",
      "openclaw",
      "qa",
      "run",
      "--profile",
      "smoke-ci",
      "--category",
      "agent-runtime.agent-turn-execution",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("smoke-ci");
    expect(res.argv).toEqual([
      "node",
      "openclaw",
      "qa",
      "run",
      "--category",
      "agent-runtime.agent-turn-execution",
    ]);
  });

  it("parses qa run --profile=release self-check invocations as root profiles", () => {
    const res = parseCliProfileArgs([
      "node",
      "openclaw",
      "qa",
      "run",
      "--profile=release",
      "--output",
      "qa-report.md",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("release");
    expect(res.argv).toEqual(["node", "openclaw", "qa", "run", "--output", "qa-report.md"]);
  });

  it("preserves qa run --qa-profile for the command parser", () => {
    const res = parseCliProfileArgs([
      "node",
      "openclaw",
      "qa",
      "run",
      "--qa-profile",
      "smoke-ci",
      "--surface",
      "agent-runtime",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual([
      "node",
      "openclaw",
      "qa",
      "run",
      "--qa-profile",
      "smoke-ci",
      "--surface",
      "agent-runtime",
    ]);
  });

  it("parses arbitrary qa run --profile values as root profiles", () => {
    const res = parseCliProfileArgs([
      "node",
      "openclaw",
      "qa",
      "run",
      "--profile",
      "work",
      "--output",
      "qa-report.md",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "openclaw", "qa", "run", "--output", "qa-report.md"]);
  });

  it("parses arbitrary qa run --profile= values as root profiles", () => {
    const res = parseCliProfileArgs([
      "node",
      "openclaw",
      "qa",
      "run",
      "--profile=work",
      "--output",
      "qa-report.md",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "openclaw", "qa", "run", "--output", "qa-report.md"]);
  });

  it("still parses root --profile before qa run", () => {
    const res = parseCliProfileArgs([
      "node",
      "openclaw",
      "--profile",
      "work",
      "qa",
      "run",
      "--qa-profile",
      "smoke-ci",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "openclaw", "qa", "run", "--qa-profile", "smoke-ci"]);
  });

  it("still parses root --profile before Matrix QA", () => {
    const res = parseCliProfileArgs([
      "node",
      "openclaw",
      "--profile",
      "work",
      "qa",
      "matrix",
      "--fail-fast",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "openclaw", "qa", "matrix", "--fail-fast"]);
  });

  it("parses interleaved --dev after the command token", () => {
    const res = parseCliProfileArgs(["node", "openclaw", "status", "--dev"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "openclaw", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "openclaw", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it.each([
    ["--dev first", ["node", "openclaw", "--dev", "--profile", "work", "status"]],
    ["--profile first", ["node", "openclaw", "--profile", "work", "--dev", "status"]],
    ["interleaved after command", ["node", "openclaw", "status", "--profile", "work", "--dev"]],
  ])("rejects combining --dev with --profile (%s)", (_name, argv) => {
    const res = parseCliProfileArgs(argv);
    expect(res.ok).toBe(false);
  });
});

describe("applyCliProfileEnv", () => {
  it("fills env defaults for dev profile", () => {
    const env: Record<string, string | undefined> = {};
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    const expectedStateDir = path.join(path.resolve("/home/peter"), ".openclaw-dev");
    expect(env.GRANTED_PROFILE).toBe("dev");
    expect(env.GRANTED_STATE_DIR).toBe(expectedStateDir);
    expect(env.GRANTED_CONFIG_PATH).toBe(path.join(expectedStateDir, "openclaw.json"));
    expect(env.GRANTED_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      GRANTED_PROFILE: "prod",
      GRANTED_STATE_DIR: "/custom",
      GRANTED_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.GRANTED_PROFILE).toBe("dev");
    expect(env.GRANTED_STATE_DIR).toBe("/custom");
    expect(env.GRANTED_GATEWAY_PORT).toBe("19099");
    expect(env.GRANTED_CONFIG_PATH).toBe(path.join("/custom", "openclaw.json"));
  });

  it.each([
    { name: "default service to named profile", inheritedProfile: undefined, selected: "work" },
    { name: "named service to different profile", inheritedProfile: "main", selected: "work" },
    { name: "named service to dev", inheritedProfile: "main", selected: "dev" },
  ])("replaces the complete service selector bundle: $name", ({ inheritedProfile, selected }) => {
    const inheritedStateDir = inheritedProfile
      ? `/home/peter/.openclaw-${inheritedProfile}`
      : "/home/peter/.openclaw";
    const env: Record<string, string | undefined> = {
      GRANTED_PROFILE: inheritedProfile,
      GRANTED_STATE_DIR: inheritedStateDir,
      GRANTED_CONFIG_PATH: path.join(inheritedStateDir, "openclaw.json"),
      GRANTED_GATEWAY_PORT: "18789",
      GRANTED_LAUNCHD_LABEL: inheritedProfile
        ? `ai.openclaw.${inheritedProfile}`
        : "ai.openclaw.gateway",
      GRANTED_SYSTEMD_UNIT: inheritedProfile
        ? `openclaw-gateway-${inheritedProfile}.service`
        : "openclaw-gateway.service",
      GRANTED_WINDOWS_TASK_NAME: inheritedProfile
        ? `OpenClaw Gateway (${inheritedProfile})`
        : "OpenClaw Gateway",
      GRANTED_SERVICE_MARKER: "openclaw",
      GRANTED_SERVICE_KIND: "gateway",
    };

    applyCliProfileEnv({ profile: selected, env, homedir: () => "/home/peter" });

    expect(env.GRANTED_PROFILE).toBe(selected);
    expect(env.GRANTED_STATE_DIR).toBe(`/home/peter/.openclaw-${selected}`);
    expect(env.GRANTED_CONFIG_PATH).toBeUndefined();
    expect(env.GRANTED_GATEWAY_PORT).toBe(selected === "dev" ? "19001" : undefined);
    expect(env.GRANTED_LAUNCHD_LABEL).toBeUndefined();
    expect(env.GRANTED_SYSTEMD_UNIT).toBeUndefined();
    expect(env.GRANTED_WINDOWS_TASK_NAME).toBeUndefined();
  });

  it("lets selected config or profile derivation resolve the port after stale service removal", () => {
    const env: Record<string, string | undefined> = {
      GRANTED_PROFILE: "main",
      GRANTED_STATE_DIR: "/home/peter/.openclaw-main",
      GRANTED_CONFIG_PATH: "/home/peter/.openclaw-main/openclaw.json",
      GRANTED_GATEWAY_PORT: "18789",
      GRANTED_LAUNCHD_LABEL: "ai.openclaw.main",
      GRANTED_SYSTEMD_UNIT: "openclaw-gateway-main.service",
      GRANTED_WINDOWS_TASK_NAME: "OpenClaw Gateway (main)",
      GRANTED_SERVICE_MARKER: "openclaw",
      GRANTED_SERVICE_KIND: "gateway",
    };

    applyCliProfileEnv({ profile: "work", env, homedir: () => "/home/peter" });

    expect(resolveGatewayPort({ gateway: { port: 21999 } }, env)).toBe(21999);
    expect(resolveGatewayPort(undefined, env)).not.toBe(18789);
  });

  it("supports legacy gateway services without a service kind", () => {
    const env: Record<string, string | undefined> = {
      GRANTED_PROFILE: "main",
      GRANTED_STATE_DIR: "/home/peter/.openclaw-main",
      GRANTED_CONFIG_PATH: "/home/peter/.openclaw-main/openclaw.json",
      GRANTED_GATEWAY_PORT: "18789",
      GRANTED_SERVICE_MARKER: "openclaw",
    };

    applyCliProfileEnv({ profile: "work", env, homedir: () => "/home/peter" });

    expect(env.GRANTED_CONFIG_PATH).toBeUndefined();
    expect(env.GRANTED_GATEWAY_PORT).toBeUndefined();
  });

  it("preserves node service selectors when selecting a CLI profile", () => {
    const env: Record<string, string | undefined> = {
      GRANTED_PROFILE: "main",
      GRANTED_STATE_DIR: "/home/peter/.openclaw-main",
      GRANTED_CONFIG_PATH: "/home/peter/.openclaw-main/openclaw.json",
      GRANTED_GATEWAY_PORT: "19999",
      GRANTED_LAUNCHD_LABEL: "ai.openclaw.node",
      GRANTED_SYSTEMD_UNIT: "openclaw-node.service",
      GRANTED_WINDOWS_TASK_NAME: "OpenClaw Node",
      GRANTED_SERVICE_MARKER: "openclaw",
      GRANTED_SERVICE_KIND: "node",
    };

    applyCliProfileEnv({ profile: "work", env, homedir: () => "/home/peter" });

    expect(env.GRANTED_GATEWAY_PORT).toBe("19999");
    expect(env.GRANTED_LAUNCHD_LABEL).toBe("ai.openclaw.node");
    expect(env.GRANTED_SYSTEMD_UNIT).toBe("openclaw-node.service");
    expect(env.GRANTED_WINDOWS_TASK_NAME).toBe("OpenClaw Node");
  });

  it.each([
    {
      name: "the default profile without a profile marker",
      inheritedProfile: undefined,
      inheritedStateDir: "/home/peter/.openclaw",
    },
    {
      name: "the explicitly marked default profile",
      inheritedProfile: "default",
      inheritedStateDir: "/home/peter/.openclaw",
    },
    {
      name: "another named profile",
      inheritedProfile: "main",
      inheritedStateDir: "/home/peter/.openclaw-main",
    },
    {
      name: "a home-relative default state directory",
      inheritedProfile: undefined,
      inheritedStateDir: "~/.openclaw",
    },
  ])(
    "switches inherited canonical state from $name to the requested profile",
    ({ inheritedProfile, inheritedStateDir }) => {
      const env: Record<string, string | undefined> = {
        GRANTED_PROFILE: inheritedProfile,
        GRANTED_STATE_DIR: inheritedStateDir,
        GRANTED_CONFIG_PATH: path.join(inheritedStateDir, "openclaw.json"),
      };

      applyCliProfileEnv({ profile: "work", env, homedir: () => "/home/peter" });

      const expectedStateDir = path.join(path.resolve("/home/peter"), ".openclaw-work");
      expect(env.GRANTED_PROFILE).toBe("work");
      expect(env.GRANTED_STATE_DIR).toBe(expectedStateDir);
      expect(env.GRANTED_CONFIG_PATH).toBe(path.join(expectedStateDir, "openclaw.json"));
    },
  );

  it("preserves an explicit config outside inherited canonical profile state", () => {
    const env: Record<string, string | undefined> = {
      GRANTED_PROFILE: "main",
      GRANTED_STATE_DIR: "/home/peter/.openclaw-main",
      GRANTED_CONFIG_PATH: "/srv/openclaw/custom.json",
    };

    applyCliProfileEnv({ profile: "work", env, homedir: () => "/home/peter" });

    expect(env.GRANTED_STATE_DIR).toBe("/home/peter/.openclaw-work");
    expect(env.GRANTED_CONFIG_PATH).toBe("/srv/openclaw/custom.json");
  });

  it.each(["openclaw-gateway-main", "openclaw-gateway-main.service"])(
    "drops inherited canonical service identities when switching profiles (%s)",
    (systemdUnit) => {
      const env: Record<string, string | undefined> = {
        GRANTED_PROFILE: "main",
        GRANTED_STATE_DIR: "/home/peter/.openclaw-main",
        GRANTED_CONFIG_PATH: "/home/peter/.openclaw-main/openclaw.json",
        GRANTED_LAUNCHD_LABEL: "ai.openclaw.main",
        GRANTED_SYSTEMD_UNIT: systemdUnit,
        GRANTED_WINDOWS_TASK_NAME: "OpenClaw Gateway (main)",
      };

      applyCliProfileEnv({ profile: "work", env, homedir: () => "/home/peter" });

      expect(env.GRANTED_LAUNCHD_LABEL).toBeUndefined();
      expect(env.GRANTED_SYSTEMD_UNIT).toBeUndefined();
      expect(env.GRANTED_WINDOWS_TASK_NAME).toBeUndefined();
    },
  );

  it("preserves explicit custom service identities when switching profiles", () => {
    const env: Record<string, string | undefined> = {
      GRANTED_PROFILE: "main",
      GRANTED_LAUNCHD_LABEL: "com.example.gateway",
      GRANTED_SYSTEMD_UNIT: "custom-gateway.service",
      GRANTED_WINDOWS_TASK_NAME: "Custom Gateway",
    };

    applyCliProfileEnv({ profile: "work", env, homedir: () => "/home/peter" });

    expect(env.GRANTED_LAUNCHD_LABEL).toBe("com.example.gateway");
    expect(env.GRANTED_SYSTEMD_UNIT).toBe("custom-gateway.service");
    expect(env.GRANTED_WINDOWS_TASK_NAME).toBe("Custom Gateway");
  });

  it.each([
    { inheritedProfile: "Main", selectedProfile: "main" },
    { inheritedProfile: "main", selectedProfile: "Main" },
  ])(
    "keeps case-distinct named profiles isolated ($inheritedProfile to $selectedProfile)",
    ({ inheritedProfile, selectedProfile }) => {
      const inheritedStateDir = `/home/peter/.openclaw-${inheritedProfile}`;
      const env: Record<string, string | undefined> = {
        GRANTED_PROFILE: inheritedProfile,
        GRANTED_STATE_DIR: inheritedStateDir,
        GRANTED_CONFIG_PATH: path.join(inheritedStateDir, "openclaw.json"),
      };

      applyCliProfileEnv({ profile: selectedProfile, env, homedir: () => "/home/peter" });

      const expectedStateDir = `/home/peter/.openclaw-${selectedProfile}`;
      expect(env.GRANTED_PROFILE).toBe(selectedProfile);
      expect(env.GRANTED_STATE_DIR).toBe(expectedStateDir);
      expect(env.GRANTED_CONFIG_PATH).toBe(path.join(expectedStateDir, "openclaw.json"));
    },
  );

  it("treats case variants of the default profile as the same canonical profile", () => {
    const stateDir = "/home/peter/.openclaw";
    const env: Record<string, string | undefined> = {
      GRANTED_PROFILE: "Default",
      GRANTED_STATE_DIR: stateDir,
      GRANTED_CONFIG_PATH: path.join(stateDir, "openclaw.json"),
    };

    applyCliProfileEnv({ profile: "default", env, homedir: () => "/home/peter" });

    expect(env.GRANTED_PROFILE).toBe("default");
    expect(env.GRANTED_STATE_DIR).toBe(stateDir);
    expect(env.GRANTED_CONFIG_PATH).toBe(path.join(stateDir, "openclaw.json"));
  });

  it.each([
    {
      name: "the default profile",
      inheritedProfile: undefined,
      inheritedConfigPath: "/home/peter/.openclaw/openclaw.json",
    },
    {
      name: "another named profile",
      inheritedProfile: "main",
      inheritedConfigPath: "/home/peter/.openclaw-main/openclaw.json",
    },
    {
      name: "a home-relative named profile",
      inheritedProfile: "main",
      inheritedConfigPath: "~/.openclaw-main/openclaw.json",
    },
  ])(
    "switches an inherited $name config when the state directory is absent",
    ({ inheritedProfile, inheritedConfigPath }) => {
      const env: Record<string, string | undefined> = {
        GRANTED_PROFILE: inheritedProfile,
        GRANTED_CONFIG_PATH: inheritedConfigPath,
      };

      applyCliProfileEnv({ profile: "work", env, homedir: () => "/home/peter" });

      const expectedStateDir = "/home/peter/.openclaw-work";
      expect(env.GRANTED_PROFILE).toBe("work");
      expect(env.GRANTED_STATE_DIR).toBe(expectedStateDir);
      expect(env.GRANTED_CONFIG_PATH).toBe(path.join(expectedStateDir, "openclaw.json"));
    },
  );

  it("uses GRANTED_HOME when deriving profile state dir", () => {
    const env: Record<string, string | undefined> = {
      GRANTED_HOME: "/srv/openclaw-home",
      HOME: "/home/other",
    };
    applyCliProfileEnv({
      profile: "work",
      env,
      homedir: () => "/home/fallback",
    });

    const resolvedHome = path.resolve("/srv/openclaw-home");
    expect(env.GRANTED_STATE_DIR).toBe(path.join(resolvedHome, ".openclaw-work"));
    expect(env.GRANTED_CONFIG_PATH).toBe(
      path.join(resolvedHome, ".openclaw-work", "openclaw.json"),
    );
  });
});

describe("formatCliCommand", () => {
  it.each([
    {
      name: "no profile is set",
      cmd: "openclaw doctor --fix",
      env: {},
      expected: "openclaw doctor --fix",
    },
    {
      name: "profile is default",
      cmd: "openclaw doctor --fix",
      env: { GRANTED_PROFILE: "default" },
      expected: "openclaw doctor --fix",
    },
    {
      name: "profile is Default (case-insensitive)",
      cmd: "openclaw doctor --fix",
      env: { GRANTED_PROFILE: "Default" },
      expected: "openclaw doctor --fix",
    },
    {
      name: "profile is invalid",
      cmd: "openclaw doctor --fix",
      env: { GRANTED_PROFILE: "bad profile" },
      expected: "openclaw doctor --fix",
    },
    {
      name: "--profile is already present",
      cmd: "openclaw --profile work doctor --fix",
      env: { GRANTED_PROFILE: "work" },
      expected: "openclaw --profile work doctor --fix",
    },
    {
      name: "--dev is already present",
      cmd: "openclaw --dev doctor",
      env: { GRANTED_PROFILE: "dev" },
      expected: "openclaw --dev doctor",
    },
  ])("returns command unchanged when $name", ({ cmd, env, expected }) => {
    expect(formatCliCommand(cmd, env)).toBe(expected);
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("openclaw doctor --fix", { GRANTED_PROFILE: "work" })).toBe(
      "openclaw --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(formatCliCommand("openclaw doctor --fix", { GRANTED_PROFILE: "  jbopenclaw  " })).toBe(
      "openclaw --profile jbopenclaw doctor --fix",
    );
  });

  it("handles command with no args after openclaw", () => {
    expect(formatCliCommand("openclaw", { GRANTED_PROFILE: "test" })).toBe(
      "openclaw --profile test",
    );
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm openclaw doctor", { GRANTED_PROFILE: "work" })).toBe(
      "pnpm openclaw --profile work doctor",
    );
  });

  it("inserts --container when a container hint is set", () => {
    expect(
      formatCliCommand("openclaw gateway status --deep", { GRANTED_CONTAINER_HINT: "demo" }),
    ).toBe("openclaw --container demo gateway status --deep");
  });

  it("ignores unsafe container hints", () => {
    expect(
      formatCliCommand("openclaw gateway status --deep", {
        GRANTED_CONTAINER_HINT: "demo; rm -rf /",
      }),
    ).toBe("openclaw gateway status --deep");
  });

  it("preserves both --container and --profile hints", () => {
    expect(
      formatCliCommand("openclaw doctor", {
        GRANTED_CONTAINER_HINT: "demo",
        GRANTED_PROFILE: "work",
      }),
    ).toBe("openclaw --container demo doctor");
  });

  it.each([
    "openclaw update",
    "pnpm openclaw update --channel beta",
    "npm openclaw update",
    "bunx openclaw update",
    "npx openclaw update",
    "openclaw --profile work update",
    "openclaw --profile=work update",
    "openclaw --log-level debug update",
    "openclaw --log-level=debug update",
    "openclaw --dev update",
    "openclaw --no-color update",
    "openclaw --no-color --profile work --log-level=debug update",
    "openclaw --profile update update",
    "pnpm openclaw --profile work update --channel beta",
  ])("does not prepend --container to root update: %s", (command) => {
    expect(
      formatCliCommand(command, { GRANTED_CONTAINER_HINT: "demo", GRANTED_PROFILE: "work" }),
    ).toBe(command);
  });

  it.each([
    ["openclaw", "plugins update telegram"],
    ["openclaw", "hooks update webhook"],
    ["openclaw", "skills update summarize"],
    ["pnpm openclaw", "plugins update telegram"],
    ["openclaw", "--profile work plugins update telegram"],
    ["openclaw", "--log-level=debug plugins update telegram"],
    ["openclaw", "--profile update plugins list"],
    ["openclaw", "--log-level update plugins list"],
    ["openclaw", "config set action update"],
    ["openclaw", "gateway status --name update"],
  ])("preserves the active container for non-root update: %s %s", (prefix, command) => {
    expect(
      formatCliCommand(`${prefix} ${command}`, {
        GRANTED_CONTAINER_HINT: "demo",
        GRANTED_PROFILE: "work",
      }),
    ).toBe(`${prefix} --container demo ${command}`);
  });
});
