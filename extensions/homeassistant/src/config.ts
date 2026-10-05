// Home Assistant plugin module resolves its base URL and token.
import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
import { normalizeSecretInput } from "granted/plugin-sdk/secret-input";
import { resolveReadOnlyEnvSecretRef } from "granted/plugin-sdk/secret-ref-readonly";

export const HASS_URL_ENV_VAR = "HASS_URL";
export const HASS_TOKEN_ENV_VAR = "HASS_TOKEN";
export const DEFAULT_HASS_URL = "http://homeassistant.local:8123";

type HomeAssistantPluginConfig =
  | {
      url?: string;
      token?: unknown;
      timeoutSeconds?: number;
      maxEntities?: number;
    }
  | undefined;

function readPluginConfig(cfg?: GrantedConfig): HomeAssistantPluginConfig {
  const entry = cfg?.plugins?.entries?.homeassistant?.config as HomeAssistantPluginConfig;
  return entry && typeof entry === "object" && !Array.isArray(entry) ? entry : undefined;
}

/**
 * The instance address is operator-owned on purpose.
 *
 * Entity, domain and service names come from the model, but the host never does:
 * a model-supplied base URL would turn this tool into an SSRF primitive against
 * whatever the gateway can reach.
 */
export function resolveHomeAssistantUrl(cfg?: GrantedConfig): string {
  const configured = readPluginConfig(cfg)?.url?.trim();
  const fromEnv = process.env[HASS_URL_ENV_VAR]?.trim();
  return (configured || fromEnv || DEFAULT_HASS_URL).replace(/\/+$/, "");
}

export function resolveHomeAssistantToken(cfg?: GrantedConfig): string | undefined {
  const configured = readPluginConfig(cfg)?.token;
  const resolved = resolveReadOnlyEnvSecretRef({
    value: configured,
    path: "plugins.entries.homeassistant.config.token",
    cfg,
    expectedEnvId: HASS_TOKEN_ENV_VAR,
    normalizeValue: normalizeSecretInput,
  });
  if (resolved.status === "available") {
    return resolved.value;
  }
  const fromEnv = process.env[HASS_TOKEN_ENV_VAR]?.trim();
  return fromEnv ? fromEnv : undefined;
}

export function resolveHomeAssistantTimeoutMs(cfg?: GrantedConfig): number {
  const configured = readPluginConfig(cfg)?.timeoutSeconds;
  const seconds =
    typeof configured === "number" && Number.isFinite(configured) && configured > 0
      ? configured
      : 15;
  return Math.round(seconds * 1000);
}

/** A large installation has thousands of entities; a listing must stay answerable. */
export function resolveHomeAssistantMaxEntities(cfg?: GrantedConfig): number {
  const configured = readPluginConfig(cfg)?.maxEntities;
  if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) {
    return Math.floor(configured);
  }
  return 200;
}
