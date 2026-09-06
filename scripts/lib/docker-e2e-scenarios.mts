// Docker E2E scenario catalog.
// Keep lane names, commands, image kind, timeout, resources, and release chunks
// here. Planning and execution live in separate modules.
import { fileURLToPath } from "node:url";

export type DockerE2eImageKind = "bare" | "functional";
export type DockerE2eReleaseProfile = "beta" | "stable" | "full";
export type DockerE2eReleaseProfileInput = "minimum" | DockerE2eReleaseProfile;
type ReleaseProfileArg = DockerE2eReleaseProfileInput | null | undefined;
export type DockerE2eLane = {
  cacheKey?: string;
  command: string;
  e2eImageKind?: DockerE2eImageKind;
  estimateSeconds?: number;
  live: boolean;
  name: string;
  needsLiveImage?: boolean;
  noOutputTimeoutMs?: number;
  prepublishPluginPackages?: string[];
  resources: string[];
  retries: number;
  retryPatterns: RegExp[];
  stateScenario?: string;
  timeoutMs?: number;
  upgradeSurvivorScenario?: string;
  weight: number;
};
type LaneOptions = Partial<Omit<DockerE2eLane, "command" | "e2eImageKind" | "name">> & {
  e2eImageKind?: DockerE2eImageKind | false;
  provider?: string;
  providers?: string[];
};

export const DEFAULT_LIVE_RETRIES = 1;
const LIVE_DOCKER_DEFAULT_HARNESS_DIR =
  /[\\/]\.release-harness[\\/]/u.test(fileURLToPath(import.meta.url)) &&
  process.env.GRANTED_DOCKER_E2E_REPO_ROOT
    ? ".release-harness"
    : ".";
const LIVE_ACP_TIMEOUT_MS = 20 * 60 * 1000;
const LIVE_CLI_TIMEOUT_MS = 20 * 60 * 1000;
const LIVE_PROFILE_TIMEOUT_MS = 30 * 60 * 1000;
const OPENWEBUI_TIMEOUT_MS = 20 * 60 * 1000;
const RELEASE_OPENWEBUI_COMMAND =
  "GRANTED_OPENWEBUI_MODEL=openai/gpt-5.4-mini GRANTED_OPENWEBUI_PROVIDER_TIMEOUT_SECONDS=300 GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:openwebui";
export const BUNDLED_PLUGIN_INSTALL_UNINSTALL_SHARDS = 24;
const upgradeSurvivorCommand = upgradeSurvivorScriptCommand();
const publishedUpgradeSurvivorCommand = upgradeSurvivorScriptCommand(
  "GRANTED_UPGRADE_SURVIVOR_PUBLISHED_BASELINE=1",
  'export GRANTED_UPGRADE_SURVIVOR_BASELINE_SPEC="${GRANTED_UPGRADE_SURVIVOR_BASELINE_SPEC:-openclaw@latest}"; export GRANTED_UPGRADE_SURVIVOR_DOCKER_RUN_TIMEOUT="${GRANTED_UPGRADE_SURVIVOR_DOCKER_RUN_TIMEOUT:-1500s}"',
);
const rootManagedVpsUpgradeCommand = upgradeSurvivorScriptCommand(
  "GRANTED_UPGRADE_SURVIVOR_PUBLISHED_BASELINE=1 GRANTED_UPGRADE_SURVIVOR_ROOT_MANAGED_VPS=1",
  'export GRANTED_UPGRADE_SURVIVOR_BASELINE_SPEC="${GRANTED_UPGRADE_SURVIVOR_BASELINE_SPEC:-openclaw@latest}"; export GRANTED_UPGRADE_SURVIVOR_DOCKER_RUN_TIMEOUT="${GRANTED_UPGRADE_SURVIVOR_DOCKER_RUN_TIMEOUT:-1500s}"',
);
const updateRestartAuthCommand = upgradeSurvivorScriptCommand(
  "GRANTED_UPGRADE_SURVIVOR_PUBLISHED_BASELINE=1 GRANTED_UPGRADE_SURVIVOR_UPDATE_RESTART_MODE=auto-auth",
  'export GRANTED_UPGRADE_SURVIVOR_BASELINE_SPEC="${GRANTED_UPGRADE_SURVIVOR_BASELINE_SPEC:-openclaw@latest}"; export GRANTED_UPGRADE_SURVIVOR_DOCKER_RUN_TIMEOUT="${GRANTED_UPGRADE_SURVIVOR_DOCKER_RUN_TIMEOUT:-1500s}"',
);
const updateMigrationCommand = upgradeSurvivorScriptCommand(
  "GRANTED_UPGRADE_SURVIVOR_PUBLISHED_BASELINE=1",
  'export GRANTED_UPGRADE_SURVIVOR_BASELINE_SPEC="${GRANTED_UPGRADE_SURVIVOR_BASELINE_SPEC:-openclaw@latest}"; export GRANTED_UPGRADE_SURVIVOR_SCENARIO="${GRANTED_UPGRADE_SURVIVOR_SCENARIO:-plugin-deps-cleanup}"',
);
const updateRunPackageSelfUpgradeCommand =
  "GRANTED_QA_ALLOW_UPDATE_RUN_SELF=1 GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:update-run-package-self-upgrade";
const CODEX_HARNESS_API_KEY_ENV = "GRANTED_LIVE_CODEX_HARNESS_AUTH=api-key";
const npmOnboardLaneOptions = {
  prepublishPluginPackages: ["@openclaw/codex"],
  resources: ["service"],
  stateScenario: "empty",
  weight: 3,
} satisfies LaneOptions;

const LIVE_RETRY_PATTERNS = [
  /529\b/i,
  /overloaded/i,
  /capacity/i,
  /rate.?limit/i,
  /gateway closed \(1000 normal closure\)/i,
  /ECONNRESET|ETIMEDOUT|ENOTFOUND/i,
];

export function liveDockerScriptCommand(
  script: string,
  envPrefix = "",
  options: { shellPrelude?: string; skipBuild?: boolean } = {},
) {
  const prefix = envPrefix ? `${envPrefix} ` : "";
  const shellPrelude = options.shellPrelude ? `${options.shellPrelude}; ` : "";
  const skipBuild = options.skipBuild === false ? "" : "GRANTED_SKIP_DOCKER_BUILD=1 ";
  return `${prefix}${skipBuild}bash -c '${shellPrelude}harness="\${GRANTED_DOCKER_E2E_TRUSTED_HARNESS_DIR:-${LIVE_DOCKER_DEFAULT_HARNESS_DIR}}"; GRANTED_LIVE_DOCKER_REPO_ROOT="\${GRANTED_DOCKER_E2E_REPO_ROOT:-$PWD}" bash "$harness/scripts/${script}"'`;
}

function upgradeSurvivorScriptCommand(envPrefix = "", shellPrelude = "") {
  const rootPrefix = 'GRANTED_DOCKER_E2E_REPO_ROOT="${GRANTED_DOCKER_E2E_REPO_ROOT:-$PWD}"';
  return liveDockerScriptCommand(
    "e2e/upgrade-survivor-docker.sh",
    envPrefix ? `${rootPrefix} ${envPrefix}` : rootPrefix,
    { shellPrelude },
  );
}

function lane(name: string, command: string, options: LaneOptions = {}): DockerE2eLane {
  return {
    cacheKey: options.cacheKey,
    command,
    e2eImageKind:
      options.e2eImageKind === false
        ? undefined
        : (options.e2eImageKind ?? (options.live ? undefined : "functional")),
    estimateSeconds: options.estimateSeconds,
    live: options.live === true,
    noOutputTimeoutMs: options.noOutputTimeoutMs,
    name,
    needsLiveImage: options.needsLiveImage,
    prepublishPluginPackages: options.prepublishPluginPackages,
    retryPatterns: options.retryPatterns ?? [],
    retries: options.retries ?? 0,
    resources: options.resources ?? [],
    stateScenario: options.stateScenario,
    timeoutMs: options.timeoutMs,
    upgradeSurvivorScenario: options.upgradeSurvivorScenario,
    weight: options.weight ?? 1,
  };
}

function liveProviderResource(provider: string) {
  if (!provider) {
    return undefined;
  }
  if (provider === "claude-cli" || provider === "claude") {
    return "live:claude";
  }
  if (provider === "codex-cli" || provider === "codex") {
    return "live:codex";
  }
  if (provider === "droid") {
    return "live:droid";
  }
  if (provider === "google-gemini-cli" || provider === "gemini") {
    return "live:gemini";
  }
  if (provider === "opencode") {
    return "live:opencode";
  }
  if (provider === "openai") {
    return "live:openai";
  }
  return `live:${provider}`;
}

function liveProviderResources(options: LaneOptions) {
  const providers = options.providers ?? (options.provider ? [options.provider] : []);
  return providers.flatMap((provider) => liveProviderResource(provider) ?? []);
}

function liveLane(name: string, command: string, options: LaneOptions = {}) {
  return lane(name, command, {
    ...options,
    live: true,
    // Package-backed live lanes use their E2E image; live credentials alone do
    // not require building the separate source live-test image.
    needsLiveImage: options.needsLiveImage ?? !options.e2eImageKind,
    resources: ["live", ...liveProviderResources(options), ...(options.resources ?? [])],
    retryPatterns: options.retryPatterns ?? LIVE_RETRY_PATTERNS,
    retries: options.retries ?? DEFAULT_LIVE_RETRIES,
    weight: options.weight ?? 3,
  });
}

function npmLane(name: string, command: string, options: LaneOptions = {}) {
  return lane(name, command, {
    ...options,
    e2eImageKind: options.e2eImageKind ?? "bare",
    resources: ["npm", ...(options.resources ?? [])],
    weight: options.weight ?? 2,
  });
}

function serviceLane(name: string, command: string, options: LaneOptions = {}) {
  return lane(name, command, {
    ...options,
    resources: ["service", ...(options.resources ?? [])],
    weight: options.weight ?? 2,
  });
}

function releaseTypedOnboardingLane() {
  return npmLane(
    "release-typed-onboarding",
    "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:release-typed-onboarding",
    {
      ...npmOnboardLaneOptions,
      timeoutMs: 20 * 60 * 1000,
    },
  );
}

function createPackageUpdateMaintenanceLanes() {
  return [
    npmLane("doctor-switch", "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:doctor-switch", {
      stateScenario: "empty",
      weight: 3,
    }),
    npmLane(
      "update-channel-switch",
      "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:update-channel-switch",
      {
        stateScenario: "update-stable",
        timeoutMs: 30 * 60 * 1000,
        weight: 3,
      },
    ),
    npmLane("skill-install", "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:skill-install", {
      retryPatterns: LIVE_RETRY_PATTERNS,
      retries: 1,
      stateScenario: "empty",
      timeoutMs: 10 * 60 * 1000,
      weight: 2,
    }),
    npmLane("upgrade-survivor", upgradeSurvivorCommand, {
      stateScenario: "upgrade-survivor",
      timeoutMs: 20 * 60 * 1000,
      upgradeSurvivorScenario: "base",
      weight: 3,
    }),
    npmLane("published-upgrade-survivor", publishedUpgradeSurvivorCommand, {
      stateScenario: "upgrade-survivor",
      timeoutMs: 25 * 60 * 1000,
      upgradeSurvivorScenario: "base",
      weight: 3,
    }),
    npmLane("root-managed-vps-upgrade", rootManagedVpsUpgradeCommand, {
      stateScenario: "upgrade-survivor",
      timeoutMs: 25 * 60 * 1000,
      upgradeSurvivorScenario: "base",
      weight: 3,
    }),
    npmLane("update-restart-auth", updateRestartAuthCommand, {
      stateScenario: "upgrade-survivor",
      timeoutMs: 25 * 60 * 1000,
      upgradeSurvivorScenario: "base",
      weight: 3,
    }),
    npmLane("update-run-package-self-upgrade", updateRunPackageSelfUpgradeCommand, {
      resources: ["service"],
      stateScenario: "upgrade-survivor",
      timeoutMs: 45 * 60 * 1000,
      weight: 3,
    }),
  ];
}

const bundledPluginInstallUninstallLanes = Array.from(
  { length: BUNDLED_PLUGIN_INSTALL_UNINSTALL_SHARDS },
  (_, index) =>
    lane(
      `bundled-plugin-install-uninstall-${index}`,
      `GRANTED_BUNDLED_PLUGIN_SWEEP_TOTAL=${BUNDLED_PLUGIN_INSTALL_UNINSTALL_SHARDS} GRANTED_BUNDLED_PLUGIN_SWEEP_INDEX=${index} GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:bundled-plugin-install-uninstall`,
      {
        estimateSeconds: 120,
        resources: ["npm"],
        stateScenario: "empty",
        weight: 1,
      },
    ),
);

function livePluginToolLane() {
  return liveLane(
    "live-plugin-tool",
    "GRANTED_LIVE_PLUGIN_TOOL_TIMEOUT_SECONDS=300 GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:live-plugin-tool",
    {
      cacheKey: "plugin-tool",
      e2eImageKind: "bare",
      provider: "openai",
      resources: ["npm"],
      stateScenario: "empty",
      timeoutMs: 20 * 60 * 1000,
      weight: 3,
    },
  );
}

function liveOpenAiChatToolsLane() {
  return liveLane(
    "openai-chat-tools",
    "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:openai-chat-tools",
    {
      e2eImageKind: "functional",
      provider: "openai",
      resources: ["service"],
      stateScenario: "empty",
      timeoutMs: 10 * 60 * 1000,
      weight: 2,
    },
  );
}

function liveCodexNpmPluginLane() {
  return liveLane(
    "live-codex-npm-plugin",
    liveDockerScriptCommand("e2e/codex-npm-plugin-live-docker.sh"),
    {
      cacheKey: "codex-npm-plugin",
      e2eImageKind: "bare",
      provider: "openai",
      resources: ["npm"],
      stateScenario: "empty",
      timeoutMs: 30 * 60 * 1000,
      weight: 3,
    },
  );
}

function mcpCodeModeGatewayLane() {
  return serviceLane(
    "mcp-code-mode-gateway",
    "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-code-mode-gateway",
    {
      prepublishPluginPackages: ["@openclaw/codex"],
      resources: ["npm"],
      stateScenario: "empty",
      weight: 3,
    },
  );
}

function liveMcpCodeModeGatewayLane() {
  return liveLane(
    "live-mcp-code-mode-gateway",
    "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:live-mcp-code-mode-gateway",
    {
      cacheKey: "mcp-code-mode-gateway",
      e2eImageKind: "functional",
      prepublishPluginPackages: ["@openclaw/codex"],
      provider: "openai",
      resources: ["npm", "service"],
      stateScenario: "empty",
      timeoutMs: 20 * 60 * 1000,
      weight: 3,
    },
  );
}

function kitchenSinkRpcLane() {
  return serviceLane(
    "kitchen-sink-rpc",
    "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:kitchen-sink-rpc",
    {
      resources: ["npm"],
      stateScenario: "empty",
      timeoutMs: 25 * 60 * 1000,
      weight: 3,
    },
  );
}

export const mainLanes: DockerE2eLane[] = [
  lane("docker-selected-plugins", "GRANTED_SKIP_DOCKER_BUILD=0 pnpm test:docker:selected-plugins", {
    e2eImageKind: false,
    estimateSeconds: 600,
    resources: ["docker"],
    timeoutMs: 30 * 60 * 1000,
    weight: 4,
  }),
  serviceLane("compose-setup", "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:compose-setup", {
    stateScenario: "empty",
    timeoutMs: 20 * 60 * 1000,
    weight: 3,
  }),
  npmLane(
    "cli-installer-distribution",
    "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:cli-installer-distribution",
    {
      stateScenario: "empty",
      timeoutMs: 30 * 60 * 1000,
      weight: 3,
    },
  ),
  npmLane(
    "docker-package-install",
    "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:package-install",
    {
      stateScenario: "empty",
      timeoutMs: 20 * 60 * 1000,
      weight: 3,
    },
  ),
  liveLane("live-models", liveDockerScriptCommand("test-live-models-docker.sh"), {
    providers: ["claude-cli", "google-gemini-cli"],
    timeoutMs: LIVE_PROFILE_TIMEOUT_MS,
    weight: 4,
  }),
  liveLane(
    "live-gateway",
    liveDockerScriptCommand(
      "test-live-gateway-models-docker.sh",
      "GRANTED_LIVE_GATEWAY_PROVIDERS=claude-cli,google-gemini-cli",
    ),
    {
      providers: ["claude-cli", "google-gemini-cli"],
      timeoutMs: LIVE_PROFILE_TIMEOUT_MS,
      weight: 4,
    },
  ),
  liveLane(
    "live-cli-backend-claude",
    liveDockerScriptCommand(
      "test-live-cli-backend-docker.sh",
      "GRANTED_LIVE_CLI_BACKEND_MODEL=claude-cli/claude-sonnet-4-6",
    ),
    {
      cacheKey: "cli-backend-claude",
      provider: "claude-cli",
      resources: ["npm"],
      timeoutMs: LIVE_CLI_TIMEOUT_MS,
      weight: 3,
    },
  ),
  liveLane(
    "live-cli-backend-gemini",
    liveDockerScriptCommand(
      "test-live-cli-backend-docker.sh",
      "GRANTED_LIVE_CLI_BACKEND_ADVISORY=1 GRANTED_LIVE_CLI_BACKEND_ALLOW_PROVIDER_SKIP=1 GRANTED_LIVE_CLI_BACKEND_MODEL=google-gemini-cli/gemini-3-flash-preview",
    ),
    {
      cacheKey: "cli-backend-gemini",
      provider: "google-gemini-cli",
      resources: ["npm"],
      timeoutMs: LIVE_CLI_TIMEOUT_MS,
      weight: 3,
    },
  ),
  liveLane("openwebui", "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:openwebui", {
    e2eImageKind: "functional",
    provider: "openai",
    resources: ["service"],
    timeoutMs: OPENWEBUI_TIMEOUT_MS,
    weight: 5,
  }),
  serviceLane("onboard", "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:onboard", {
    stateScenario: "empty",
    weight: 2,
  }),
  npmLane("codex-on-demand", "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:codex-on-demand", {
    prepublishPluginPackages: ["@openclaw/codex"],
    resources: ["service"],
    stateScenario: "empty",
    weight: 3,
  }),
  serviceLane("codex-media-path", "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:codex-media-path", {
    prepublishPluginPackages: ["@openclaw/codex"],
    resources: ["npm"],
    stateScenario: "empty",
    weight: 3,
  }),
  npmLane(
    "npm-onboard-channel-agent",
    "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:npm-onboard-channel-agent",
    npmOnboardLaneOptions,
  ),
  npmLane(
    "npm-onboard-discord-channel-agent",
    "GRANTED_NPM_ONBOARD_CHANNEL=discord GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:npm-onboard-channel-agent",
    npmOnboardLaneOptions,
  ),
  npmLane(
    "npm-onboard-slack-channel-agent",
    "GRANTED_NPM_ONBOARD_CHANNEL=slack GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:npm-onboard-channel-agent",
    npmOnboardLaneOptions,
  ),
  // Prerelease validation must pair frozen core bytes with matching target plugin bytes.
  // The lanes above leave channel source selection to the published catalog.
  npmLane(
    "npm-onboard-discord-candidate-channel-agent",
    liveDockerScriptCommand(
      "e2e/npm-onboard-channel-agent-docker.sh",
      "GRANTED_NPM_ONBOARD_CHANNEL=discord GRANTED_NPM_ONBOARD_USE_SOURCE_PLUGIN_PACKAGE=1",
    ),
    {
      ...npmOnboardLaneOptions,
      prepublishPluginPackages: ["@openclaw/codex", "@openclaw/discord"],
    },
  ),
  npmLane(
    "npm-onboard-slack-candidate-channel-agent",
    liveDockerScriptCommand(
      "e2e/npm-onboard-channel-agent-docker.sh",
      "GRANTED_NPM_ONBOARD_CHANNEL=slack GRANTED_NPM_ONBOARD_USE_SOURCE_PLUGIN_PACKAGE=1",
    ),
    {
      ...npmOnboardLaneOptions,
      prepublishPluginPackages: ["@openclaw/codex", "@openclaw/slack"],
    },
  ),
  npmLane(
    "release-user-journey",
    "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:release-user-journey",
    {
      resources: ["npm", "service"],
      stateScenario: "empty",
      timeoutMs: 20 * 60 * 1000,
      weight: 4,
    },
  ),
  releaseTypedOnboardingLane(),
  npmLane(
    "release-media-memory",
    "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:release-media-memory",
    {
      resources: ["npm", "service"],
      stateScenario: "empty",
      timeoutMs: 20 * 60 * 1000,
      weight: 3,
    },
  ),
  npmLane(
    "release-upgrade-user-journey",
    "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:release-upgrade-user-journey",
    {
      resources: ["npm", "service"],
      stateScenario: "empty",
      timeoutMs: 30 * 60 * 1000,
      weight: 5,
    },
  ),
  npmLane(
    "release-plugin-marketplace",
    "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:release-plugin-marketplace",
    {
      resources: ["npm"],
      stateScenario: "empty",
      timeoutMs: 20 * 60 * 1000,
      weight: 3,
    },
  ),
  serviceLane("gateway-concurrency", liveDockerScriptCommand("e2e/gateway-concurrency-docker.sh"), {
    timeoutMs: 10 * 60 * 1000,
    weight: 3,
  }),
  serviceLane("gateway-network", "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:gateway-network"),
  serviceLane("browser-cdp-snapshot", "pnpm test:docker:browser-cdp-snapshot", {
    stateScenario: "empty",
    timeoutMs: 20 * 60 * 1000,
    weight: 3,
  }),
  serviceLane(
    "sandbox-browser-sidecar",
    "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:sandbox-browser-sidecar",
    {
      stateScenario: "empty",
      timeoutMs: 20 * 60 * 1000,
      weight: 4,
    },
  ),
  serviceLane(
    "agents-delete-shared-workspace",
    "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:agents-delete-shared-workspace",
    { stateScenario: "empty" },
  ),
  serviceLane("mcp-channels", "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels", {
    resources: ["npm"],
    stateScenario: "empty",
    weight: 3,
  }),
  mcpCodeModeGatewayLane(),
  lane(
    "agent-bundle-mcp-tools",
    "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:agent-bundle-mcp-tools",
    {
      stateScenario: "empty",
    },
  ),
  lane("system-agent-rescue", "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:system-agent-rescue", {
    stateScenario: "empty",
  }),
  serviceLane("cron-mcp-cleanup", "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:cron-mcp-cleanup", {
    resources: ["npm"],
    stateScenario: "empty",
    weight: 3,
  }),
  ...createPackageUpdateMaintenanceLanes(),
  npmLane("update-migration", updateMigrationCommand, {
    stateScenario: "upgrade-survivor",
    timeoutMs: 30 * 60 * 1000,
    upgradeSurvivorScenario: "plugin-deps-cleanup",
    weight: 3,
  }),
  lane("plugins", "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:plugins", {
    resources: ["npm", "service"],
    stateScenario: "empty",
    weight: 6,
  }),
  lane("kitchen-sink-plugin", "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:kitchen-sink-plugin", {
    resources: ["npm"],
    stateScenario: "empty",
    weight: 3,
  }),
  kitchenSinkRpcLane(),
  ...bundledPluginInstallUninstallLanes,
  lane(
    "plugins-offline",
    "GRANTED_PLUGINS_E2E_CLAWHUB=0 GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:plugins",
    {
      resources: ["npm", "service"],
      stateScenario: "empty",
      weight: 6,
    },
  ),
  npmLane("plugin-update", "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:plugin-update", {
    stateScenario: "empty",
  }),
  npmLane(
    "update-corrupt-plugin",
    "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:update-corrupt-plugin",
    {
      stateScenario: "empty",
      timeoutMs: 30 * 60 * 1000,
      weight: 3,
    },
  ),
  npmLane(
    "plugin-lifecycle-matrix",
    "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:plugin-lifecycle-matrix",
    {
      stateScenario: "empty",
      timeoutMs: 12 * 60 * 1000,
    },
  ),
  serviceLane("config-reload", "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:config-reload", {
    stateScenario: "empty",
  }),
  npmLane("multi-node-update", "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:multi-node-update", {
    stateScenario: "empty",
    timeoutMs: 15 * 60 * 1000,
    weight: 3,
  }),
  lane("openai-image-auth", "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:openai-image-auth", {
    stateScenario: "empty",
  }),
  lane(
    "system-agent-first-run",
    "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:system-agent-first-run",
    { stateScenario: "empty" },
  ),
  lane(
    "session-runtime-context",
    "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:session-runtime-context",
  ),
  lane(
    "plugin-binding-command-escape",
    "GRANTED_SKIP_DOCKER_BUILD=0 pnpm test:docker:plugin-binding-command-escape",
    {
      e2eImageKind: false,
      resources: ["npm"],
      stateScenario: "empty",
    },
  ),
  liveLane("npm-telegram-live", "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:npm-telegram-live", {
    e2eImageKind: "bare",
    provider: "openai",
    resources: ["live:telegram", "npm", "service"],
    timeoutMs: 30 * 60 * 1000,
    weight: 3,
  }),
  lane("qr", "pnpm test:docker:qr"),
];

export const tailLanes: DockerE2eLane[] = [
  serviceLane(
    "openai-web-search-minimal",
    "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:openai-web-search-minimal",
    { stateScenario: "empty", timeoutMs: 8 * 60 * 1000 },
  ),
  liveLane(
    "live-codex-harness",
    liveDockerScriptCommand("test-live-codex-harness-docker.sh", CODEX_HARNESS_API_KEY_ENV),
    {
      cacheKey: "codex-harness",
      provider: "openai",
      resources: ["npm"],
      timeoutMs: LIVE_ACP_TIMEOUT_MS,
      weight: 3,
    },
  ),
  liveLane(
    "live-codex-media-path",
    liveDockerScriptCommand(
      "test-live-codex-harness-docker.sh",
      "GRANTED_LIVE_CODEX_HARNESS_AUTH=api-key GRANTED_LIVE_CODEX_HARNESS_CHAT_IMAGE_PROBE=1 GRANTED_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 GRANTED_LIVE_CODEX_HARNESS_MCP_PROBE=0 GRANTED_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0 GRANTED_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0",
    ),
    {
      cacheKey: "codex-harness",
      provider: "openai",
      resources: ["npm"],
      timeoutMs: LIVE_ACP_TIMEOUT_MS,
      weight: 3,
    },
  ),
  liveLane(
    "live-subagent-announce",
    liveDockerScriptCommand("test-live-subagent-announce-docker.sh"),
    {
      cacheKey: "subagent-announce",
      provider: "openai",
      resources: ["npm"],
      timeoutMs: 25 * 60 * 1000,
      weight: 3,
    },
  ),
  liveLane(
    "live-codex-bind",
    liveDockerScriptCommand(
      "test-live-codex-harness-docker.sh",
      `${CODEX_HARNESS_API_KEY_ENV} GRANTED_LIVE_CODEX_BIND=1 GRANTED_LIVE_CODEX_TEST_FILES=src/gateway/gateway-codex-bind.live.test.ts`,
    ),
    {
      cacheKey: "codex-harness",
      provider: "openai",
      resources: ["npm"],
      timeoutMs: LIVE_ACP_TIMEOUT_MS,
      weight: 3,
    },
  ),
  liveCodexNpmPluginLane(),
  liveMcpCodeModeGatewayLane(),
  livePluginToolLane(),
  liveLane(
    "live-acp-bind-claude",
    liveDockerScriptCommand("test-live-acp-bind-docker.sh", "GRANTED_LIVE_ACP_BIND_AGENT=claude"),
    {
      cacheKey: "acp-bind-claude",
      provider: "claude-cli",
      resources: ["npm"],
      timeoutMs: LIVE_ACP_TIMEOUT_MS,
      weight: 3,
    },
  ),
  liveLane(
    "live-acp-bind-codex",
    liveDockerScriptCommand("test-live-acp-bind-docker.sh", "GRANTED_LIVE_ACP_BIND_AGENT=codex"),
    {
      cacheKey: "acp-bind-codex",
      provider: "codex-cli",
      resources: ["live:openai", "npm"],
      timeoutMs: LIVE_ACP_TIMEOUT_MS,
      weight: 3,
    },
  ),
  liveLane(
    "live-acp-bind-droid",
    liveDockerScriptCommand(
      "test-live-acp-bind-docker.sh",
      "GRANTED_LIVE_ACP_BIND_AGENT=droid GRANTED_LIVE_ACP_BIND_REQUIRE_TRANSCRIPT=1",
    ),
    {
      cacheKey: "acp-bind-droid",
      provider: "droid",
      resources: ["npm"],
      timeoutMs: LIVE_ACP_TIMEOUT_MS,
      weight: 3,
    },
  ),
  liveLane(
    "live-acp-bind-gemini",
    liveDockerScriptCommand("test-live-acp-bind-docker.sh", "GRANTED_LIVE_ACP_BIND_AGENT=gemini"),
    {
      cacheKey: "acp-bind-gemini",
      provider: "google-gemini-cli",
      resources: ["npm"],
      timeoutMs: LIVE_ACP_TIMEOUT_MS,
      weight: 3,
    },
  ),
  liveLane(
    "live-acp-bind-opencode",
    liveDockerScriptCommand(
      "test-live-acp-bind-docker.sh",
      "GRANTED_LIVE_ACP_BIND_AGENT=opencode GRANTED_LIVE_ACP_BIND_REQUIRE_TRANSCRIPT=1",
    ),
    {
      cacheKey: "acp-bind-opencode",
      provider: "opencode",
      resources: ["npm"],
      timeoutMs: LIVE_ACP_TIMEOUT_MS,
      weight: 3,
    },
  ),
];

const scheduledLaneByName = new Map<string, DockerE2eLane>();
for (const entry of [...mainLanes, ...tailLanes]) {
  if (scheduledLaneByName.has(entry.name)) {
    throw new Error(`duplicate scheduled Docker E2E lane: ${entry.name}`);
  }
  scheduledLaneByName.set(entry.name, entry);
}

function scheduledLane(name: string, overrides: Partial<DockerE2eLane> = {}) {
  const entry = scheduledLaneByName.get(name);
  if (!entry) {
    throw new Error(`unknown scheduled Docker E2E lane: ${name}`);
  }
  return { ...entry, ...overrides };
}

function scheduledLaneList(...names: string[]) {
  return names.map((name) => scheduledLane(name));
}

const releasePathPluginRuntimePluginLanes = scheduledLaneList("plugins");
const releasePathPluginRuntimeServiceLanes = scheduledLaneList(
  "cron-mcp-cleanup",
  "kitchen-sink-rpc",
  "openai-web-search-minimal",
  "live-plugin-tool",
);

const releasePathPluginRuntimeCoreLanes = [
  ...releasePathPluginRuntimePluginLanes,
  ...releasePathPluginRuntimeServiceLanes,
];

const releasePathPluginRuntimeLanes = [
  ...releasePathPluginRuntimePluginLanes,
  ...bundledPluginInstallUninstallLanes,
  ...releasePathPluginRuntimeServiceLanes,
];

const releasePathBundledChannelLanes = scheduledLaneList("plugin-update");

// Public installer smoke needs a published, immutable package version. Keep it
// selectable for post-publish verification, but out of frozen-candidate CI.
export const publicInstallerLanes: DockerE2eLane[] = [
  liveLane(
    "install-e2e-openai",
    liveDockerScriptCommand(
      "test-install-sh-e2e-docker.sh",
      "GRANTED_INSTALL_TAG=beta GRANTED_E2E_MODELS=openai GRANTED_INSTALL_E2E_IMAGE=openclaw-install-e2e-openai:local GRANTED_INSTALL_E2E_AGENT_TOOL_SMOKE=0 GRANTED_INSTALL_E2E_OPENAI_MODEL=openai/gpt-5.4-mini GRANTED_INSTALL_E2E_AGENT_TURN_TIMEOUT_SECONDS=120 GRANTED_INSTALL_E2E_OPENAI_PROVIDER_TIMEOUT_SECONDS=120",
      { skipBuild: false },
    ),
    {
      e2eImageKind: "bare",
      provider: "openai",
      resources: ["npm", "service"],
      timeoutMs: 15 * 60 * 1000,
      weight: 3,
    },
  ),
  liveLane(
    "install-e2e-anthropic",
    liveDockerScriptCommand(
      "test-install-sh-e2e-docker.sh",
      "GRANTED_INSTALL_TAG=beta GRANTED_E2E_MODELS=anthropic GRANTED_INSTALL_E2E_IMAGE=openclaw-install-e2e-anthropic:local",
      { skipBuild: false },
    ),
    {
      e2eImageKind: "bare",
      provider: "claude",
      resources: ["npm", "service"],
      weight: 3,
    },
  ),
];

const releasePathPackageUpdateOpenAiLanes = [
  liveOpenAiChatToolsLane(),
  scheduledLane("live-codex-npm-plugin"),
  scheduledLane("codex-on-demand", { timeoutMs: 30 * 60 * 1000 }),
  scheduledLane("release-typed-onboarding"),
  // Use the shorter package row without changing npm weights or upgrade coverage.
  ...scheduledLaneList("root-managed-vps-upgrade", "update-restart-auth"),
];

// Balance the npm-limited rows without raising per-runner resource caps.
const releasePathPackageOnboardingLanes = scheduledLaneList(
  "npm-onboard-channel-agent",
  "npm-onboard-discord-channel-agent",
  "npm-onboard-slack-channel-agent",
  "doctor-switch",
  "skill-install",
);
const releasePathPackageMigrationLanes = scheduledLaneList(
  "update-channel-switch",
  "published-upgrade-survivor",
);
const releasePathPackageSelfUpgradeLanes = scheduledLaneList(
  "upgrade-survivor",
  "update-run-package-self-upgrade",
);
const releasePathPackageUpdateCoreLanes = [
  ...releasePathPackageOnboardingLanes,
  ...releasePathPackageMigrationLanes,
  ...releasePathPackageSelfUpgradeLanes,
];

const primaryReleasePathChunks: Record<string, DockerE2eLane[]> = {
  core: [
    scheduledLane("qr", { command: "GRANTED_SKIP_DOCKER_BUILD=1 pnpm test:docker:qr" }),
    ...scheduledLaneList(
      "onboard",
      "gateway-network",
      "config-reload",
      "session-runtime-context",
      "plugin-binding-command-escape",
      "agent-bundle-mcp-tools",
      "mcp-channels",
      "mcp-code-mode-gateway",
    ),
  ],
  "package-update-openai": releasePathPackageUpdateOpenAiLanes,
  "package-update-onboarding": releasePathPackageOnboardingLanes,
  "package-update-migrations": releasePathPackageMigrationLanes,
  "package-update-self-upgrade": releasePathPackageSelfUpgradeLanes,
  "plugins-runtime-plugins": releasePathPluginRuntimePluginLanes,
  "plugins-runtime-services": releasePathPluginRuntimeServiceLanes,
  "plugins-runtime-install-a": bundledPluginInstallUninstallLanes.slice(0, 3),
  "plugins-runtime-install-b": bundledPluginInstallUninstallLanes.slice(3, 6),
  "plugins-runtime-install-c": bundledPluginInstallUninstallLanes.slice(6, 9),
  "plugins-runtime-install-d": bundledPluginInstallUninstallLanes.slice(9, 12),
  "plugins-runtime-install-e": bundledPluginInstallUninstallLanes.slice(12, 15),
  "plugins-runtime-install-f": bundledPluginInstallUninstallLanes.slice(15, 18),
  "plugins-runtime-install-g": bundledPluginInstallUninstallLanes.slice(18, 21),
  "plugins-runtime-install-h": bundledPluginInstallUninstallLanes.slice(21),
  openwebui: [],
};

const primaryReleasePathChunkProfiles: Record<string, DockerE2eReleaseProfile[]> = {
  core: ["stable", "full"],
  "package-update-openai": ["beta", "stable", "full"],
  "package-update-onboarding": ["beta", "stable", "full"],
  "package-update-migrations": ["beta", "stable", "full"],
  "package-update-self-upgrade": ["beta", "stable", "full"],
  "plugins-runtime-plugins": ["stable", "full"],
  "plugins-runtime-services": ["stable", "full"],
  "plugins-runtime-install-a": ["stable", "full"],
  "plugins-runtime-install-b": ["stable", "full"],
  "plugins-runtime-install-c": ["stable", "full"],
  "plugins-runtime-install-d": ["stable", "full"],
  "plugins-runtime-install-e": ["stable", "full"],
  "plugins-runtime-install-f": ["stable", "full"],
  "plugins-runtime-install-g": ["stable", "full"],
  "plugins-runtime-install-h": ["stable", "full"],
  openwebui: ["stable", "full"],
};

const legacyReleasePathChunks: Record<string, DockerE2eLane[]> = {
  "package-update": [...releasePathPackageUpdateOpenAiLanes, ...releasePathPackageUpdateCoreLanes],
  "package-update-core": releasePathPackageUpdateCoreLanes,
  "plugins-runtime-core": releasePathPluginRuntimeCoreLanes,
  "plugins-runtime": releasePathPluginRuntimeLanes,
  "plugins-integrations": [...releasePathPluginRuntimeLanes, ...releasePathBundledChannelLanes],
  "bundled-channels": releasePathBundledChannelLanes,
};

export function normalizeReleaseProfile(raw: ReleaseProfileArg): DockerE2eReleaseProfile {
  const profile = (raw ?? "stable").trim() || "stable";
  if (profile === "minimum") {
    return "beta";
  }
  if (profile === "beta" || profile === "stable" || profile === "full") {
    return profile;
  }
  throw new Error(
    `release profile must be one of: beta, stable, full. Got: ${JSON.stringify(raw)}`,
  );
}

function chunkMatchesReleaseProfile(chunk: string, releaseProfile: DockerE2eReleaseProfile) {
  const profiles = primaryReleasePathChunkProfiles[chunk];
  return !profiles || profiles.includes(releaseProfile);
}

function openWebUILane() {
  return liveLane("openwebui", RELEASE_OPENWEBUI_COMMAND, {
    e2eImageKind: "functional",
    provider: "openai",
    resources: ["service"],
    timeoutMs: OPENWEBUI_TIMEOUT_MS,
    weight: 5,
  });
}

export function releasePathChunkLanes(
  chunk: string,
  options: { includeOpenWebUI?: boolean; releaseProfile?: DockerE2eReleaseProfileInput } = {},
): DockerE2eLane[] {
  const base = primaryReleasePathChunks[chunk] ?? legacyReleasePathChunks[chunk];
  if (!base) {
    throw new Error(
      `GRANTED_DOCKER_ALL_CHUNK must be one of: ${[
        ...Object.keys(primaryReleasePathChunks),
        ...Object.keys(legacyReleasePathChunks),
      ].join(", ")}. Got: ${JSON.stringify(chunk)}`,
    );
  }
  const releaseProfile = normalizeReleaseProfile(options.releaseProfile);
  if (!chunkMatchesReleaseProfile(chunk, releaseProfile)) {
    return [];
  }
  if (chunk === "openwebui") {
    return options.includeOpenWebUI ? [openWebUILane()] : [];
  }
  if (
    (chunk !== "plugins-runtime-core" &&
      chunk !== "plugins-runtime" &&
      chunk !== "plugins-integrations") ||
    !options.includeOpenWebUI
  ) {
    return base;
  }
  return [...base, openWebUILane()];
}

export function allReleasePathLanes(
  options: Parameters<typeof releasePathChunkLanes>[1] = {},
): DockerE2eLane[] {
  const releaseProfile = normalizeReleaseProfile(options.releaseProfile);
  return Object.keys(primaryReleasePathChunks).flatMap((chunk) =>
    releasePathChunkLanes(chunk, {
      includeOpenWebUI: options.includeOpenWebUI,
      releaseProfile,
    }),
  );
}
