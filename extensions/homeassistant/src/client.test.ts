import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BLOCKED_SERVICE_DOMAINS,
  callService,
  getState,
  HomeAssistantError,
  listEntities,
  listServices,
  summarizeStates,
} from "./client.js";

const cfg = {
  plugins: {
    entries: {
      homeassistant: {
        enabled: true,
        config: { url: "http://hass.test:8123/", token: "test-token" },
      },
    },
  },
} as unknown as GrantedConfig;

type Call = { url: string; headers: Record<string, string>; body: string };

function readUrl(input: string | URL | Request): string {
  if (typeof input === "string") {
    return input;
  }
  return input instanceof URL ? input.href : input.url;
}

function fakeFetch(payload: unknown, status = 200) {
  const calls: Call[] = [];
  const impl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: readUrl(input),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: typeof init?.body === "string" ? init.body : "",
    });
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const originalToken = process.env.HASS_TOKEN;
const originalUrl = process.env.HASS_URL;

beforeEach(() => {
  delete process.env.HASS_TOKEN;
  delete process.env.HASS_URL;
});

afterEach(() => {
  if (originalToken === undefined) {
    delete process.env.HASS_TOKEN;
  } else {
    process.env.HASS_TOKEN = originalToken;
  }
  if (originalUrl === undefined) {
    delete process.env.HASS_URL;
  } else {
    process.env.HASS_URL = originalUrl;
  }
});

describe("configuration", () => {
  it("uses the configured host, trims its trailing slash, and sends the token as a bearer", async () => {
    const { impl, calls } = fakeFetch([]);

    await listEntities({ cfg, fetchImpl: impl });

    expect(calls[0]?.url).toBe("http://hass.test:8123/api/states");
    expect(calls[0]?.headers.Authorization).toBe("Bearer test-token");
  });

  it("falls back to the environment when nothing is configured", async () => {
    process.env.HASS_URL = "http://env-host:8123";
    process.env.HASS_TOKEN = "env-token";
    const { impl, calls } = fakeFetch([]);

    await listEntities({ fetchImpl: impl });

    expect(calls[0]?.url).toBe("http://env-host:8123/api/states");
  });

  it("says what to set when there is no token, instead of calling without one", async () => {
    const { impl } = fakeFetch([]);

    await expect(listEntities({ fetchImpl: impl })).rejects.toThrow(/HASS_TOKEN/);
    expect(impl).not.toHaveBeenCalled();
  });
});

describe("input validation", () => {
  it("refuses an entity id that is not domain.object_id", async () => {
    const { impl } = fakeFetch({});

    for (const bad of ["../../api/config", "light", "Light.Living_Room", "light..x", ""]) {
      await expect(getState({ cfg, entityId: bad, fetchImpl: impl })).rejects.toThrow(
        HomeAssistantError,
      );
    }
    expect(impl).not.toHaveBeenCalled();
  });

  it("refuses a domain or service that could escape the service path", async () => {
    const { impl } = fakeFetch([]);

    for (const bad of ["../../api/config", "shell_command/../light", "light.turn_on", "Light"]) {
      await expect(
        callService({ cfg, domain: bad, service: "turn_on", fetchImpl: impl }),
      ).rejects.toThrow(HomeAssistantError);
      await expect(
        callService({ cfg, domain: "light", service: bad, fetchImpl: impl }),
      ).rejects.toThrow(HomeAssistantError);
    }
    expect(impl).not.toHaveBeenCalled();
  });

  it("accepts a valid call and posts the entity id in the body", async () => {
    const { impl, calls } = fakeFetch([
      { entity_id: "light.living_room", state: "on", attributes: { friendly_name: "Living Room" } },
    ]);

    const result = await callService({
      cfg,
      domain: "light",
      service: "turn_on",
      entityId: "light.living_room",
      data: { brightness: 180 },
      fetchImpl: impl,
    });

    expect(calls[0]?.url).toBe("http://hass.test:8123/api/services/light/turn_on");
    expect(JSON.parse(calls[0]?.body ?? "{}")).toEqual({
      brightness: 180,
      entity_id: "light.living_room",
    });
    expect(result.changed).toEqual([
      { entity_id: "light.living_room", state: "on", friendly_name: "Living Room" },
    ]);
  });
});

describe("blocked service domains", () => {
  it("refuses every domain that runs code on the Home Assistant host", async () => {
    const { impl } = fakeFetch([]);

    for (const domain of BLOCKED_SERVICE_DOMAINS) {
      await expect(callService({ cfg, domain, service: "run", fetchImpl: impl })).rejects.toThrow(
        /runs code on the Home Assistant host/,
      );
    }
    expect(impl).not.toHaveBeenCalled();
  });

  it("covers the domains Home Assistant exposes for execution", () => {
    // Losing one of these silently turns a lamp token into remote execution.
    expect([...BLOCKED_SERVICE_DOMAINS].toSorted()).toEqual([
      "command_line",
      "hassio",
      "pyscript",
      "python_script",
      "rest_command",
      "shell_command",
    ]);
  });

  it("marks a blocked domain in a service listing so no call is planned for it", async () => {
    const { impl } = fakeFetch([
      { domain: "light", services: { turn_on: {}, turn_off: {} } },
      { domain: "shell_command", services: { backup: {} } },
    ]);

    const result = await listServices({ cfg, fetchImpl: impl });

    expect(result.domains).toEqual([
      { domain: "light", services: ["turn_off", "turn_on"] },
      { domain: "shell_command", services: ["backup"], blocked: true },
    ]);
  });
});

describe("entity listings", () => {
  const states = [
    { entity_id: "light.kitchen", state: "on", attributes: { friendly_name: "Kitchen Light" } },
    { entity_id: "light.porch", state: "off", attributes: { friendly_name: "Porch" } },
    {
      entity_id: "sensor.kitchen_temp",
      state: "21.5",
      attributes: { friendly_name: "Kitchen Temp", area: "Kitchen" },
    },
  ];

  it("filters by domain and by area text", () => {
    expect(
      summarizeStates({ states, domain: "light", maxEntities: 10 }).entities.map(
        (e) => e.entity_id,
      ),
    ).toEqual(["light.kitchen", "light.porch"]);
    expect(
      summarizeStates({ states, area: "kitchen", maxEntities: 10 }).entities.map(
        (e) => e.entity_id,
      ),
    ).toEqual(["light.kitchen", "sensor.kitchen_temp"]);
  });

  it("caps the listing and says it was capped", () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      entity_id: `light.lamp_${index}`,
      state: "off",
      attributes: {},
    }));

    const result = summarizeStates({ states: many, maxEntities: 5 });

    expect(result).toMatchObject({ count: 5, total: 12, truncated: true });
  });

  it("keeps a full listing unmarked", () => {
    expect(summarizeStates({ states, maxEntities: 10 })).toMatchObject({
      count: 3,
      total: 3,
      truncated: false,
    });
  });
});

describe("transport failures", () => {
  it("names the auth problem on 401 and 403", async () => {
    for (const status of [401, 403]) {
      const { impl } = fakeFetch({}, status);
      await expect(listEntities({ cfg, fetchImpl: impl })).rejects.toThrow(/rejected the token/);
    }
  });

  it("reports an unreachable host without leaking the token", async () => {
    const impl = vi.fn(async () => {
      throw new Error("connect ECONNREFUSED 10.0.0.5:8123");
    }) as unknown as typeof fetch;

    await expect(listEntities({ cfg, fetchImpl: impl })).rejects.toThrow(
      /could not be reached: connect ECONNREFUSED/,
    );
    await expect(listEntities({ cfg, fetchImpl: impl })).rejects.not.toThrow(/test-token/);
  });

  it("reports a non-JSON body as such", async () => {
    const impl = vi.fn(
      async () => new Response("<html>nope</html>", { status: 200 }),
    ) as unknown as typeof fetch;

    await expect(listEntities({ cfg, fetchImpl: impl })).rejects.toThrow(/non-JSON response/);
  });
});
