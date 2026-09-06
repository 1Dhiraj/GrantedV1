// Verifies model-selection CLI provider detection from plugin metadata.
import { describe, expect, it } from "vitest";
import type { GrantedConfig } from "../config/types.js";
import { isCliProvider } from "./model-selection-cli.js";

describe("isCliProvider", () => {
  it("returns true for setup-registered cli backends", () => {
    expect(isCliProvider("claude-cli", {} as GrantedConfig)).toBe(true);
  });

  it("returns false for provider ids", () => {
    expect(isCliProvider("example-cli", {} as GrantedConfig)).toBe(false);
  });
});
