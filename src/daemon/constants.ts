/** Cross-platform daemon service names, labels, and profile-aware descriptions. */
import { normalizeLowercaseStringOrEmpty } from "@granted/normalization-core/string-coerce";

// Default service labels (canonical + legacy compatibility)
export const GATEWAY_LAUNCH_AGENT_LABEL = "ai.granted.gateway";
const GATEWAY_SYSTEMD_SERVICE_NAME = "granted-gateway";
const GATEWAY_WINDOWS_TASK_NAME = "Granted Gateway";
export const GATEWAY_SERVICE_MARKER = "granted";
/**
 * Markers stamped into services installed under the project's previous names.
 * Recognized on read so an existing LaunchAgent, systemd unit or scheduled task
 * is still claimed as ours instead of being treated as a stranger's service and
 * left behind as a duplicate.
 */
export const LEGACY_GATEWAY_SERVICE_MARKERS = ["openclaw", "clawdbot"] as const;

/** Every marker this project has ever stamped, current first. */
export const GATEWAY_SERVICE_MARKERS = [
  GATEWAY_SERVICE_MARKER,
  ...LEGACY_GATEWAY_SERVICE_MARKERS,
] as const;
export const GATEWAY_SERVICE_KIND = "gateway";
export const GATEWAY_SERVICE_RUNTIME_PID_ENV = "GRANTED_GATEWAY_SERVICE_PID";
export const GATEWAY_SERVICE_SELECTOR_ENV_KEYS = [
  "GRANTED_STATE_DIR",
  "GRANTED_CONFIG_PATH",
  "GRANTED_PROFILE",
  "GRANTED_GATEWAY_PORT",
  "GRANTED_LAUNCHD_LABEL",
  "GRANTED_SYSTEMD_UNIT",
  "GRANTED_WINDOWS_TASK_NAME",
] as const;

/** True when a marker value names this project, current or previous. */
export function isGatewayServiceMarker(marker: string | undefined): boolean {
  const trimmed = marker?.trim();
  if (!trimmed) {
    return false;
  }
  return GATEWAY_SERVICE_MARKERS.some((known) => known === trimmed);
}

export function isGatewayServiceEnv(env: Record<string, string | undefined>): boolean {
  if (!isGatewayServiceMarker(env.GRANTED_SERVICE_MARKER)) {
    return false;
  }
  const serviceKind = env.GRANTED_SERVICE_KIND?.trim();
  return !serviceKind || serviceKind === GATEWAY_SERVICE_KIND;
}

const NODE_LAUNCH_AGENT_LABEL = "ai.granted.node";
const NODE_SYSTEMD_SERVICE_NAME = "granted-node";
const NODE_WINDOWS_TASK_NAME = "Granted Node";
const NODE_SERVICE_MARKER = GATEWAY_SERVICE_MARKER;
export const NODE_SERVICE_KIND = "node";
const NODE_WINDOWS_TASK_SCRIPT_NAME = "node.cmd";
// Unit names left behind by installs under previous names; removed on install.
export const LEGACY_GATEWAY_SYSTEMD_SERVICE_NAMES: string[] = [
  "openclaw-gateway",
  "clawdbot-gateway",
];

function normalizeGatewayProfile(profile?: string): string | null {
  const trimmed = profile?.trim();
  if (!trimmed || normalizeLowercaseStringOrEmpty(trimmed) === "default") {
    // The default profile keeps the historical unqualified service names.
    return null;
  }
  return trimmed;
}

export function resolveGatewayProfileSuffix(profile?: string): string {
  const normalized = normalizeGatewayProfile(profile);
  return normalized ? `-${normalized}` : "";
}

export function resolveGatewayLaunchAgentLabel(profile?: string): string {
  const normalized = normalizeGatewayProfile(profile);
  if (!normalized) {
    return GATEWAY_LAUNCH_AGENT_LABEL;
  }
  return `ai.granted.${normalized}`;
}

/**
 * LaunchAgent labels this gateway used to install under. Install removes them so
 * a machine set up before the rename does not end up running two agents.
 */
export function resolveLegacyGatewayLaunchAgentLabels(profile?: string): string[] {
  const normalized = normalizeGatewayProfile(profile);
  return LEGACY_GATEWAY_SERVICE_MARKERS.map((marker) =>
    normalized ? `ai.${marker}.${normalized}` : `ai.${marker}.gateway`,
  );
}

export function resolveGatewaySystemdServiceName(profile?: string): string {
  const suffix = resolveGatewayProfileSuffix(profile);
  if (!suffix) {
    return GATEWAY_SYSTEMD_SERVICE_NAME;
  }
  return `granted-gateway${suffix}`;
}

export function resolveGatewayWindowsTaskName(profile?: string): string {
  const normalized = normalizeGatewayProfile(profile);
  if (!normalized) {
    return GATEWAY_WINDOWS_TASK_NAME;
  }
  return `Granted Gateway (${normalized})`;
}

type GatewayNativeServiceIdentityConflict = {
  envKey: "GRANTED_LAUNCHD_LABEL" | "GRANTED_SYSTEMD_UNIT" | "GRANTED_WINDOWS_TASK_NAME";
  expected: string;
};

export function resolveGatewayNativeServiceIdentityConflict(
  env: Record<string, string | undefined>,
  platform: NodeJS.Platform = process.platform,
): GatewayNativeServiceIdentityConflict | null {
  const profile = normalizeGatewayProfile(env.GRANTED_PROFILE);
  if (!profile) {
    return null;
  }

  if (platform === "darwin") {
    const envKey = "GRANTED_LAUNCHD_LABEL";
    const actual = env[envKey]?.trim();
    const expected = resolveGatewayLaunchAgentLabel(profile);
    return actual && actual !== expected ? { envKey, expected } : null;
  }
  if (platform === "linux") {
    const envKey = "GRANTED_SYSTEMD_UNIT";
    const actual = env[envKey]?.trim();
    const normalizedActual = actual?.endsWith(".service") ? actual : actual && `${actual}.service`;
    const expected = `${resolveGatewaySystemdServiceName(profile)}.service`;
    return normalizedActual && normalizedActual !== expected ? { envKey, expected } : null;
  }
  if (platform === "win32") {
    const envKey = "GRANTED_WINDOWS_TASK_NAME";
    const actual = env[envKey]?.trim();
    const expected = resolveGatewayWindowsTaskName(profile);
    return actual && actual !== expected ? { envKey, expected } : null;
  }
  return null;
}

function formatGatewayServiceDescription(profile?: string): string {
  const normalized = normalizeGatewayProfile(profile);
  if (!normalized) {
    return "Granted Gateway";
  }
  return `Granted Gateway (profile: ${normalized})`;
}

export function resolveGatewayServiceDescription(params: {
  env: Record<string, string | undefined>;
  description?: string;
}): string {
  return params.description ?? formatGatewayServiceDescription(params.env.GRANTED_PROFILE);
}

export function resolveNodeLaunchAgentLabel(): string {
  return NODE_LAUNCH_AGENT_LABEL;
}

export function resolveNodeSystemdServiceName(): string {
  return NODE_SYSTEMD_SERVICE_NAME;
}

export function resolveNodeWindowsTaskName(): string {
  return NODE_WINDOWS_TASK_NAME;
}

export function resolveNodeServiceIdentityEnvironment(): Record<string, string> {
  return {
    GRANTED_LAUNCHD_LABEL: resolveNodeLaunchAgentLabel(),
    GRANTED_SYSTEMD_UNIT: resolveNodeSystemdServiceName(),
    GRANTED_WINDOWS_TASK_NAME: resolveNodeWindowsTaskName(),
    GRANTED_WINDOWS_TASK_HIDDEN_LAUNCHER: "1",
    GRANTED_TASK_SCRIPT_NAME: NODE_WINDOWS_TASK_SCRIPT_NAME,
    GRANTED_LOG_PREFIX: "node",
    GRANTED_SERVICE_MARKER: NODE_SERVICE_MARKER,
    GRANTED_SERVICE_KIND: NODE_SERVICE_KIND,
  };
}
