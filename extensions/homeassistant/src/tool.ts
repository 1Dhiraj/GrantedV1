// Home Assistant plugin module implements the agent-facing tool.
import type { GrantedPluginApi } from "granted/plugin-sdk/plugin-runtime";
import { jsonResult, readStringParam } from "granted/plugin-sdk/provider-web-search";
import { Type } from "typebox";
import { callService, getState, HomeAssistantError, listEntities, listServices } from "./client.js";

const HomeAssistantToolSchema = Type.Object(
  {
    action: Type.String({
      enum: ["list_entities", "get_state", "call_service", "list_services"],
      description: "What to do.",
    }),
    entity_id: Type.Optional(
      Type.String({
        description: 'Entity, as "domain.object_id" (for example "light.living_room").',
      }),
    ),
    domain: Type.Optional(
      Type.String({ description: 'Service or entity domain (for example "light").' }),
    ),
    service: Type.Optional(
      Type.String({ description: 'Service to call (for example "turn_on").' }),
    ),
    area: Type.Optional(
      Type.String({ description: "Filter list_entities by area or friendly-name text." }),
    ),
    data: Type.Optional(
      Type.Object({}, { additionalProperties: true, description: "Extra service data." }),
    ),
  },
  { additionalProperties: false },
);

function readDataParam(rawParams: Record<string, unknown>): Record<string, unknown> | undefined {
  const value = rawParams.data;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function createHomeAssistantTool(api: GrantedPluginApi) {
  return {
    name: "homeassistant",
    label: "Home Assistant",
    resultContentSource: "network" as const,
    description:
      "Read and control a Home Assistant install: list_entities (filter by domain/area), get_state, call_service, list_services. The instance address and token come from operator config, and service domains that execute code on the Home Assistant host are refused.",
    parameters: HomeAssistantToolSchema,
    execute: async (
      _toolCallId: string,
      rawParams: Record<string, unknown>,
      signal?: AbortSignal,
    ) => {
      signal?.throwIfAborted();
      const action = readStringParam(rawParams, "action", { required: true });
      const context = { cfg: api.config, ...(signal ? { signal } : {}) };
      const domain = readStringParam(rawParams, "domain");
      const entityId = readStringParam(rawParams, "entity_id");
      const service = readStringParam(rawParams, "service");
      const area = readStringParam(rawParams, "area");

      try {
        switch (action) {
          case "list_entities":
            return jsonResult(
              await listEntities({
                ...context,
                ...(domain ? { domain } : {}),
                ...(area ? { area } : {}),
              }),
            );
          case "get_state": {
            if (!entityId) {
              throw new HomeAssistantError("get_state needs entity_id.");
            }
            return jsonResult(await getState({ ...context, entityId }));
          }
          case "call_service": {
            if (!domain || !service) {
              throw new HomeAssistantError("call_service needs domain and service.");
            }
            const data = readDataParam(rawParams);
            return jsonResult(
              await callService({
                ...context,
                domain,
                service,
                ...(entityId ? { entityId } : {}),
                ...(data ? { data } : {}),
              }),
            );
          }
          case "list_services":
            return jsonResult(await listServices({ ...context, ...(domain ? { domain } : {}) }));
          default:
            throw new HomeAssistantError(
              `Unknown action "${action}". Use list_entities, get_state, call_service or list_services.`,
            );
        }
      } catch (error) {
        if (error instanceof HomeAssistantError) {
          // A refusal or a misconfiguration is the model's problem to correct, so it
          // comes back as a readable result rather than a thrown tool failure.
          return jsonResult({ error: error.message });
        }
        throw error;
      }
    },
  };
}

export const HOMEASSISTANT_TOOL_NAME = "homeassistant";
