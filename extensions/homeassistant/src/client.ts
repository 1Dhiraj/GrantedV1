/**
 * Home Assistant REST client for the agent-facing tool.
 *
 * Home Assistant has no service-level access control: a long-lived token that can
 * turn on a lamp can also call services that run shell commands on the host. The
 * guards here are therefore the whole safety story, and they are deliberately
 * strict about what a model may name:
 *
 * - entity ids and domain/service names are pattern-checked, so nothing can walk
 *   out of `/api/services/{domain}/{service}` into another endpoint;
 * - the domains that execute code or issue requests from the Home Assistant host
 *   are refused outright;
 * - the base URL comes from operator config, never from the model.
 */
import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
import {
  resolveHomeAssistantMaxEntities,
  resolveHomeAssistantTimeoutMs,
  resolveHomeAssistantToken,
  resolveHomeAssistantUrl,
} from "./config.js";

/** e.g. light.living_room, sensor.temperature_1 */
const ENTITY_ID_PATTERN = /^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/;
/** e.g. light, turn_on. No dots or slashes: those would escape the service path. */
const SERVICE_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * Service domains that run code or make requests on the Home Assistant host.
 * Calling these through an agent turns a lamp token into remote execution, so
 * they stay refused even when the operator's token would allow them.
 */
export const BLOCKED_SERVICE_DOMAINS: ReadonlySet<string> = new Set([
  "shell_command", // arbitrary shell commands on the Home Assistant host
  "command_line", // sensors and switches that execute shell commands
  "python_script", // sandboxed, but can escalate through hass.services.call()
  "pyscript", // scripting integration with broader access
  "hassio", // add-on control, host shutdown and reboot
  "rest_command", // HTTP requests issued by the Home Assistant host
]);

export class HomeAssistantError extends Error {}

export type HomeAssistantState = {
  entity_id: string;
  state: string;
  attributes?: Record<string, unknown>;
  last_changed?: string;
};

export type HomeAssistantRequestContext = {
  cfg?: GrantedConfig;
  signal?: AbortSignal;
  /** Injected in tests; production uses global fetch. */
  fetchImpl?: typeof fetch;
};

type RequestParams = HomeAssistantRequestContext & {
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
};

function readAttribute(state: HomeAssistantState, key: string): string {
  const value = state.attributes?.[key];
  return typeof value === "string" ? value : "";
}

async function request<T>(params: RequestParams): Promise<T> {
  const token = resolveHomeAssistantToken(params.cfg);
  if (!token) {
    throw new HomeAssistantError(
      "Home Assistant needs a long-lived access token. Set HASS_TOKEN in the gateway environment, or configure plugins.entries.homeassistant.config.token.",
    );
  }
  const baseUrl = resolveHomeAssistantUrl(params.cfg);
  const fetchImpl = params.fetchImpl ?? fetch;
  const timeoutMs = resolveHomeAssistantTimeoutMs(params.cfg);
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = params.signal ? AbortSignal.any([params.signal, timeoutSignal]) : timeoutSignal;

  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}${params.path}`, {
      method: params.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(params.body === undefined ? {} : { body: JSON.stringify(params.body) }),
      signal,
    });
  } catch (error) {
    // The token must never reach a log line or a tool result.
    const reason = error instanceof Error ? error.message : String(error);
    throw new HomeAssistantError(`Home Assistant at ${baseUrl} could not be reached: ${reason}`);
  }

  if (response.status === 401 || response.status === 403) {
    throw new HomeAssistantError(
      `Home Assistant rejected the token (HTTP ${response.status}). Check HASS_TOKEN.`,
    );
  }
  if (!response.ok) {
    throw new HomeAssistantError(
      `Home Assistant returned HTTP ${response.status} for ${params.path}.`,
    );
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new HomeAssistantError(`Home Assistant returned a non-JSON response for ${params.path}.`);
  }
}

export type EntitySummary = {
  entity_id: string;
  state: string;
  friendly_name: string;
};

export type ListEntitiesResult = {
  count: number;
  total: number;
  truncated: boolean;
  entities: EntitySummary[];
};

/** Filters raw states by domain and area, then trims them to a readable summary. */
export function summarizeStates(params: {
  states: readonly HomeAssistantState[];
  domain?: string;
  area?: string;
  maxEntities: number;
}): ListEntitiesResult {
  let states = [...params.states];
  if (params.domain) {
    const prefix = `${params.domain}.`;
    states = states.filter((state) => state.entity_id.startsWith(prefix));
  }
  if (params.area) {
    const area = params.area.toLowerCase();
    states = states.filter(
      (state) =>
        readAttribute(state, "friendly_name").toLowerCase().includes(area) ||
        readAttribute(state, "area").toLowerCase().includes(area),
    );
  }
  const total = states.length;
  const kept = states.slice(0, params.maxEntities);
  return {
    count: kept.length,
    total,
    truncated: total > kept.length,
    entities: kept.map((state) => ({
      entity_id: state.entity_id,
      state: state.state,
      friendly_name: readAttribute(state, "friendly_name"),
    })),
  };
}

export async function listEntities(
  params: HomeAssistantRequestContext & { domain?: string; area?: string },
): Promise<ListEntitiesResult> {
  if (params.domain && !SERVICE_NAME_PATTERN.test(params.domain)) {
    throw new HomeAssistantError(
      `Invalid domain "${params.domain}". Use lowercase letters, digits and underscores, for example "light".`,
    );
  }
  const states = await request<HomeAssistantState[]>({ ...params, path: "/api/states" });
  return summarizeStates({
    states: Array.isArray(states) ? states : [],
    ...(params.domain ? { domain: params.domain } : {}),
    ...(params.area ? { area: params.area } : {}),
    maxEntities: resolveHomeAssistantMaxEntities(params.cfg),
  });
}

export async function getState(
  params: HomeAssistantRequestContext & { entityId: string },
): Promise<HomeAssistantState> {
  if (!ENTITY_ID_PATTERN.test(params.entityId)) {
    throw new HomeAssistantError(
      `Invalid entity_id "${params.entityId}". Expected the form "domain.object_id", for example "light.living_room".`,
    );
  }
  return await request<HomeAssistantState>({
    ...params,
    path: `/api/states/${params.entityId}`,
  });
}

export type CallServiceResult = {
  domain: string;
  service: string;
  changed: EntitySummary[];
};

export async function callService(
  params: HomeAssistantRequestContext & {
    domain: string;
    service: string;
    entityId?: string;
    data?: Record<string, unknown>;
  },
): Promise<CallServiceResult> {
  for (const [label, value] of [
    ["domain", params.domain],
    ["service", params.service],
  ] as const) {
    if (!SERVICE_NAME_PATTERN.test(value)) {
      throw new HomeAssistantError(
        `Invalid ${label} "${value}". Use lowercase letters, digits and underscores, for example "turn_on".`,
      );
    }
  }
  if (BLOCKED_SERVICE_DOMAINS.has(params.domain)) {
    throw new HomeAssistantError(
      `The "${params.domain}" domain runs code on the Home Assistant host and is refused here. Ask the operator to run it themselves if it is really needed.`,
    );
  }
  if (params.entityId !== undefined && !ENTITY_ID_PATTERN.test(params.entityId)) {
    throw new HomeAssistantError(
      `Invalid entity_id "${params.entityId}". Expected the form "domain.object_id".`,
    );
  }
  const body: Record<string, unknown> = { ...params.data };
  if (params.entityId) {
    body.entity_id = params.entityId;
  }
  const changed = await request<HomeAssistantState[]>({
    ...params,
    path: `/api/services/${params.domain}/${params.service}`,
    method: "POST",
    body,
  });
  return {
    domain: params.domain,
    service: params.service,
    // Home Assistant answers a service call with the states it changed, which is
    // the only evidence available that the call did anything.
    changed: (Array.isArray(changed) ? changed : []).map((state) => ({
      entity_id: state.entity_id,
      state: state.state,
      friendly_name: readAttribute(state, "friendly_name"),
    })),
  };
}

export type ServiceDomainSummary = {
  domain: string;
  services: string[];
  blocked?: true;
};

export async function listServices(
  params: HomeAssistantRequestContext & { domain?: string },
): Promise<{ count: number; domains: ServiceDomainSummary[] }> {
  if (params.domain && !SERVICE_NAME_PATTERN.test(params.domain)) {
    throw new HomeAssistantError(
      `Invalid domain "${params.domain}". Use lowercase letters, digits and underscores.`,
    );
  }
  const raw = await request<Array<{ domain?: string; services?: Record<string, unknown> }>>({
    ...params,
    path: "/api/services",
  });
  const domains: ServiceDomainSummary[] = [];
  for (const entry of Array.isArray(raw) ? raw : []) {
    const domain = typeof entry.domain === "string" ? entry.domain : "";
    if (!domain || (params.domain && domain !== params.domain)) {
      continue;
    }
    const services = entry.services && typeof entry.services === "object" ? entry.services : {};
    domains.push({
      domain,
      services: Object.keys(services).toSorted((a, b) => a.localeCompare(b, "en")),
      // Listed but marked, so the model does not plan a call that will be refused.
      ...(BLOCKED_SERVICE_DOMAINS.has(domain) ? { blocked: true as const } : {}),
    });
  }
  domains.sort((a, b) => a.domain.localeCompare(b.domain, "en"));
  return { count: domains.length, domains };
}
