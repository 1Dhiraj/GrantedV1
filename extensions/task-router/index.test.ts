import fs from "node:fs";
import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
import type { GrantedPluginApi } from "granted/plugin-sdk/core";
import { createTestPluginApi } from "granted/plugin-sdk/plugin-test-api";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prepareSimpleModel = vi.hoisted(() =>
  vi.fn(async () => ({ model: { id: "cheap/model" }, auth: "test-auth" })),
);
const completeSimpleModel = vi.hoisted(() => vi.fn(async () => ({ ok: true })));

vi.mock("granted/plugin-sdk/simple-completion-runtime", () => ({
  prepareSimpleCompletionModelForAgent: prepareSimpleModel,
  completeWithPreparedSimpleCompletionModel: completeSimpleModel,
  extractAssistantText: () => "Hello!",
}));

import plugin from "./index.js";

type CapturedHook = (event: Record<string, unknown>, ctx: Record<string, unknown>) => unknown;

const config = {
  agents: {
    defaults: {
      model: { primary: "premium/model" },
      economyModel: "cheap/model",
    },
  },
} satisfies GrantedConfig;

function registerTaskRouter() {
  const hooks = new Map<string, CapturedHook>();
  const runtime = { config: { current: () => config } } as unknown as GrantedPluginApi["runtime"];
  plugin.register(
    createTestPluginApi({
      config,
      runtime,
      on: ((name: string, handler: unknown) => {
        hooks.set(name, handler as CapturedHook);
      }) as GrantedPluginApi["on"],
    }),
  );
  return hooks;
}

describe("task-router defaults", () => {
  beforeEach(() => {
    prepareSimpleModel.mockClear();
    completeSimpleModel.mockClear();
  });

  it("ships enabled so economy routing works without plugin setup", () => {
    const manifest = JSON.parse(
      fs.readFileSync(new URL("./granted.plugin.json", import.meta.url), "utf8"),
    ) as { enabledByDefault?: unknown };
    expect(manifest.enabledByDefault).toBe(true);
  });

  it("routes ordinary chat to the economy model but keeps automation on the primary", async () => {
    const hooks = registerTaskRouter();
    const route = hooks.get("before_model_resolve");
    expect(route).toBeDefined();
    const context = {
      trigger: "user",
      agentId: "main",
      modelProviderId: "premium",
      modelId: "model",
    };

    await expect(route?.({ prompt: "what is the capital of France?" }, context)).resolves.toEqual({
      providerOverride: "cheap",
      modelOverride: "model",
    });
    await expect(
      route?.({ prompt: "open notepad and type hello" }, context),
    ).resolves.toBeUndefined();
  });

  it("answers trivial messages directly with the economy model", async () => {
    const hooks = registerTaskRouter();
    const reply = hooks.get("before_agent_reply");
    expect(reply).toBeDefined();

    await expect(
      reply?.({ cleanedBody: "hi" }, { trigger: "user", agentId: "main" }),
    ).resolves.toEqual({
      handled: true,
      reply: { text: "Hello!" },
      reason: "trivial-lite",
    });
    expect(prepareSimpleModel).toHaveBeenCalledWith(
      expect.objectContaining({ modelRef: "cheap/model" }),
    );
    expect(completeSimpleModel).toHaveBeenCalledOnce();
  });
});
