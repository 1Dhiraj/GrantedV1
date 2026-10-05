import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_TOOL_STEPS,
  DEFAULT_SUBAGENT_MAX_TOOL_STEPS,
  resolveMaxToolSteps,
} from "./agent-step-budget.js";
import type { GrantedConfig } from "./types.js";

describe("resolveMaxToolSteps", () => {
  it("caps unconfigured runs, tighter for spawned sub-agents", () => {
    expect(resolveMaxToolSteps({})).toBe(DEFAULT_MAX_TOOL_STEPS);
    expect(resolveMaxToolSteps({ isSubagent: true })).toBe(DEFAULT_SUBAGENT_MAX_TOOL_STEPS);
  });

  it("uses agents.defaults for both run kinds until subagents overrides it", () => {
    const cfg = { agents: { defaults: { maxToolSteps: 30 } } } as GrantedConfig;

    expect(resolveMaxToolSteps({ cfg })).toBe(30);
    expect(resolveMaxToolSteps({ cfg, isSubagent: true })).toBe(30);

    const withSubagents = {
      agents: { defaults: { maxToolSteps: 30, subagents: { maxToolSteps: 5 } } },
    } as GrantedConfig;

    expect(resolveMaxToolSteps({ cfg: withSubagents })).toBe(30);
    expect(resolveMaxToolSteps({ cfg: withSubagents, isSubagent: true })).toBe(5);
  });

  it("lets the agent's own setting win over both", () => {
    const cfg = {
      agents: {
        defaults: { maxToolSteps: 30, subagents: { maxToolSteps: 5 } },
        list: [{ id: "builder", maxToolSteps: 90 }],
      },
    } as GrantedConfig;

    expect(resolveMaxToolSteps({ cfg, agentId: "builder" })).toBe(90);
    expect(resolveMaxToolSteps({ cfg, agentId: "builder", isSubagent: true })).toBe(90);
    expect(resolveMaxToolSteps({ cfg, agentId: "other" })).toBe(30);
  });

  it("reads zero as no cap at whichever level sets it", () => {
    expect(
      resolveMaxToolSteps({ cfg: { agents: { defaults: { maxToolSteps: 0 } } } as GrantedConfig }),
    ).toBeUndefined();
    expect(
      resolveMaxToolSteps({
        cfg: {
          agents: { defaults: { maxToolSteps: 30, subagents: { maxToolSteps: 0 } } },
        } as GrantedConfig,
        isSubagent: true,
      }),
    ).toBeUndefined();
    expect(
      resolveMaxToolSteps({
        cfg: {
          agents: { defaults: { maxToolSteps: 30 }, list: [{ id: "free", maxToolSteps: 0 }] },
        } as GrantedConfig,
        agentId: "free",
      }),
    ).toBeUndefined();
  });

  it("floors fractional caps and ignores unusable numbers", () => {
    const fractional = { agents: { defaults: { maxToolSteps: 12.7 } } } as GrantedConfig;
    expect(resolveMaxToolSteps({ cfg: fractional })).toBe(12);

    const broken = {
      agents: { defaults: { maxToolSteps: Number.NaN } },
    } as unknown as GrantedConfig;
    expect(resolveMaxToolSteps({ cfg: broken })).toBe(DEFAULT_MAX_TOOL_STEPS);
  });
});
