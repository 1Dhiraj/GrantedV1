import { describe, expect, it } from "vitest";
import { resolveEconomyModelRef } from "./economy-model.js";
import { FIELD_HELP } from "./schema.help.js";
import { FIELD_LABELS } from "./schema.labels.js";
import type { GrantedConfig } from "./types.granted.js";

const cfgWith = (economyModel?: string): GrantedConfig =>
  ({ agents: { defaults: { economyModel } } }) as GrantedConfig;

describe("resolveEconomyModelRef", () => {
  it("returns the configured routine-work model", () => {
    expect(resolveEconomyModelRef(cfgWith("google/gemini-3.5-flash"))).toBe(
      "google/gemini-3.5-flash",
    );
  });

  it("describes both foreground routing and background fallback in config metadata", () => {
    expect(FIELD_LABELS["agents.defaults.economyModel"]).toBe("Economy Model (Routine Work)");
    expect(FIELD_HELP["agents.defaults.economyModel"]).toContain("ordinary chat");
    expect(FIELD_HELP["agents.defaults.economyModel"]).toContain("Background turns");
  });

  it("trims surrounding whitespace so a padded config value still resolves", () => {
    expect(resolveEconomyModelRef(cfgWith("  google/gemini-3.5-flash  "))).toBe(
      "google/gemini-3.5-flash",
    );
  });

  it("treats unset, empty, and whitespace-only as no economy model", () => {
    // Callers use `?? next` chains, so every "not configured" shape must be
    // undefined rather than an empty string that would win the chain.
    expect(resolveEconomyModelRef(cfgWith(undefined))).toBeUndefined();
    expect(resolveEconomyModelRef(cfgWith(""))).toBeUndefined();
    expect(resolveEconomyModelRef(cfgWith("   "))).toBeUndefined();
  });

  it("survives a missing config or missing agent defaults", () => {
    expect(resolveEconomyModelRef(undefined)).toBeUndefined();
    expect(resolveEconomyModelRef({} as GrantedConfig)).toBeUndefined();
    expect(resolveEconomyModelRef({ agents: {} } as GrantedConfig)).toBeUndefined();
  });

  it("ignores a non-string value instead of throwing", () => {
    // Config reaches this helper from disk and from plugin-provided objects, so
    // a wrong-typed value must degrade to "not configured".
    expect(
      resolveEconomyModelRef({ agents: { defaults: { economyModel: 42 } } } as never),
    ).toBeUndefined();
  });
});
