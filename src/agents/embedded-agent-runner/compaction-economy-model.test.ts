// Compaction is background work, so it falls back to the configured economy
// model when no explicit compaction model is set.
import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { resolveEmbeddedCompactionTarget } from "./compaction-runtime-context.js";

const configWith = (defaults: Record<string, unknown>) =>
  ({ agents: { defaults } }) as unknown as OpenClawConfig;

const target = (config: OpenClawConfig, overrides: Record<string, unknown> = {}) =>
  resolveEmbeddedCompactionTarget({
    config,
    provider: "openai",
    modelId: "gpt-5.4",
    defaultProvider: "openai",
    defaultModel: "gpt-5.4",
    ...overrides,
  });

describe("compaction target economy-model fallback", () => {
  it("summarizes with the economy model when no compaction model is set", () => {
    expect(target(configWith({ economyModel: "google/gemini-3.5-flash" }))).toMatchObject({
      provider: "google",
      model: "gemini-3.5-flash",
    });
  });

  it("keeps an explicit compaction model ahead of the economy model", () => {
    // Per-role settings are the user's specific intent; the economy model is
    // only the fallback for roles they did not configure.
    expect(
      target(
        configWith({
          compaction: { model: "anthropic/claude-opus-4-6" },
          economyModel: "google/gemini-3.5-flash",
        }),
      ),
    ).toMatchObject({ provider: "anthropic", model: "claude-opus-4-6" });
  });

  it("stays on the session model when no economy model is configured", () => {
    expect(target(configWith({}))).toMatchObject({ provider: "openai", model: "gpt-5.4" });
  });

  it("does not override a model-locked session", () => {
    // A locked session pins its model deliberately; cost policy must not
    // silently move that work to another provider.
    expect(
      target(configWith({ economyModel: "google/gemini-3.5-flash" }), {
        modelSelectionLocked: true,
      }),
    ).toMatchObject({ provider: "openai", model: "gpt-5.4" });
  });
});
