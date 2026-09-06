// Tavily helper module supports config behavior.
import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
import { resolvePositiveTimeoutSeconds } from "granted/plugin-sdk/provider-web-search";
import { normalizeSecretInput } from "granted/plugin-sdk/secret-input";
import { resolveReadOnlyEnvSecretRef } from "granted/plugin-sdk/secret-ref-readonly";
import { normalizeOptionalString } from "granted/plugin-sdk/string-coerce-runtime";

export const DEFAULT_TAVILY_BASE_URL = "https://api.tavily.com";
const DEFAULT_TAVILY_SEARCH_TIMEOUT_SECONDS = 30;
const DEFAULT_TAVILY_EXTRACT_TIMEOUT_SECONDS = 60;
const TAVILY_API_KEY_ENV_VAR = "TAVILY_API_KEY";
export const TAVILY_API_KEY_CONFIG_PATH = "plugins.entries.tavily.config.webSearch.apiKey";

type TavilySearchConfig =
  | {
      apiKey?: unknown;
      baseUrl?: string;
    }
  | undefined;

type PluginEntryConfig = {
  webSearch?: {
    apiKey?: unknown;
    baseUrl?: string;
  };
};

function resolveTavilySearchConfig(cfg?: GrantedConfig): TavilySearchConfig {
  const pluginConfig = cfg?.plugins?.entries?.tavily?.config as PluginEntryConfig;
  const pluginWebSearch = pluginConfig?.webSearch;
  if (pluginWebSearch && typeof pluginWebSearch === "object" && !Array.isArray(pluginWebSearch)) {
    return pluginWebSearch;
  }
  return undefined;
}

function resolveConfiguredSecret(value: unknown, path: string, cfg?: GrantedConfig) {
  return resolveReadOnlyEnvSecretRef({
    value,
    path,
    cfg,
    expectedEnvId: TAVILY_API_KEY_ENV_VAR,
    normalizeValue: normalizeSecretInput,
  });
}

export function resolveTavilyApiKey(cfg?: GrantedConfig): string | undefined {
  const search = resolveTavilySearchConfig(cfg);
  const resolved = resolveConfiguredSecret(search?.apiKey, TAVILY_API_KEY_CONFIG_PATH, cfg);
  if (resolved.status === "available") {
    return resolved.value;
  }
  if (resolved.status === "blocked") {
    return undefined;
  }
  return normalizeSecretInput(process.env.TAVILY_API_KEY) || undefined;
}

export function resolveTavilyBaseUrl(cfg?: GrantedConfig): string {
  const search = resolveTavilySearchConfig(cfg);
  const configured =
    (normalizeOptionalString(search?.baseUrl) ?? "") ||
    normalizeSecretInput(process.env.TAVILY_BASE_URL) ||
    "";
  return configured || DEFAULT_TAVILY_BASE_URL;
}

export function resolveTavilySearchTimeoutSeconds(override?: number): number {
  return resolvePositiveTimeoutSeconds(override, DEFAULT_TAVILY_SEARCH_TIMEOUT_SECONDS);
}

export function resolveTavilyExtractTimeoutSeconds(override?: number): number {
  return resolvePositiveTimeoutSeconds(override, DEFAULT_TAVILY_EXTRACT_TIMEOUT_SECONDS);
}
