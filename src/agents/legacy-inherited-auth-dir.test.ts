import { describe, expect, it } from "vitest";
import type { GrantedConfig } from "../config/types.granted.js";
import { resolveLegacyInheritedAuthAgentId } from "./legacy-inherited-auth-dir.js";

describe("legacy inherited auth ownership", () => {
  it("uses the raw legacy marker owner for direct config inputs", () => {
    const cfg: GrantedConfig = {
      agents: { entries: { main: {}, ops: { default: true } } },
    };

    expect(resolveLegacyInheritedAuthAgentId(cfg)).toBe("ops");
  });
});
