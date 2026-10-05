import { describe, expect, it, vi } from "vitest";
import type { ProgressCard } from "../../../packages/gateway-protocol/src/index.js";
import {
  formatPostCompactionPlan,
  POST_COMPACTION_PLAN_HEADER,
  readPostCompactionPlan,
  stripPostCompactionPlan,
} from "./post-compaction-plan.js";

function card(steps: ProgressCard["steps"]): ProgressCard {
  return { sessionKey: "agent:main:x", revision: 1, updatedAt: 1, ...(steps ? { steps } : {}) };
}

describe("formatPostCompactionPlan", () => {
  it("keeps open steps with the card's own numbering", () => {
    const block = formatPostCompactionPlan([
      { step: "Read the failing test", status: "completed" },
      { step: "Fix the resolver", status: "in_progress" },
      { step: "Run the suite", status: "pending" },
    ]);

    expect(block).toContain(POST_COMPACTION_PLAN_HEADER);
    expect(block).toContain("- [>] 2. Fix the resolver");
    expect(block).toContain("- [ ] 3. Run the suite");
    // Replaying finished steps is what makes models redo them.
    expect(block).not.toContain("Read the failing test");
    expect(block).toContain("keep the card current with progress_card");
  });

  it("returns nothing when every step is done", () => {
    expect(formatPostCompactionPlan([{ step: "Ship it", status: "completed" }])).toBeNull();
    expect(formatPostCompactionPlan([])).toBeNull();
  });

  it("caps the list and the length of one step", () => {
    const steps = Array.from({ length: 25 }, (_, index) => ({
      step: `step ${index + 1}`,
      status: "pending" as const,
    }));

    const block = formatPostCompactionPlan(steps) ?? "";

    expect(block).toContain("- [ ] 20. step 20");
    expect(block).not.toContain("21. step 21");
    expect(block).toContain("...and 5 more open steps on the card.");

    const long = formatPostCompactionPlan([{ step: "x".repeat(400), status: "pending" }]) ?? "";
    expect(long).toContain("...");
    expect(long.length).toBeLessThan(400);
  });

  it("flattens multi-line step text so one step stays one line", () => {
    const block = formatPostCompactionPlan([{ step: "fix\n  the\n  thing", status: "pending" }]);

    expect(block).toContain("- [ ] 1. fix the thing");
  });
});

describe("readPostCompactionPlan", () => {
  it("renders the stored card's open steps", async () => {
    const readCard = vi.fn(() => card([{ step: "Wire the runner", status: "pending" }]));

    await expect(
      readPostCompactionPlan({ sessionKey: "agent:main:x", readCard }),
    ).resolves.toContain("- [ ] 1. Wire the runner");
    expect(readCard).toHaveBeenCalledWith("agent:main:x");
  });

  it("treats a missing session, a missing card, an empty plan, and a broken store as nothing to restore", async () => {
    await expect(readPostCompactionPlan({ readCard: () => card([]) })).resolves.toBeNull();
    await expect(
      readPostCompactionPlan({ sessionKey: "  ", readCard: () => card([]) }),
    ).resolves.toBeNull();
    await expect(
      readPostCompactionPlan({ sessionKey: "agent:main:x", readCard: () => null }),
    ).resolves.toBeNull();
    await expect(
      readPostCompactionPlan({ sessionKey: "agent:main:x", readCard: () => card(undefined) }),
    ).resolves.toBeNull();
    await expect(
      readPostCompactionPlan({
        sessionKey: "agent:main:x",
        readCard: () => {
          throw new Error("database is locked");
        },
      }),
    ).resolves.toBeNull();
  });
});

describe("stripPostCompactionPlan", () => {
  it("removes an earlier plan block and keeps what came before it", () => {
    const earlier = `Critical rules from AGENTS.md:\n\nbe careful\n\n${POST_COMPACTION_PLAN_HEADER}\n\n- [ ] 1. old step`;

    expect(stripPostCompactionPlan(earlier)).toBe("Critical rules from AGENTS.md:\n\nbe careful");
  });

  it("leaves text without a plan block untouched, and drops a prompt that was only a plan", () => {
    expect(stripPostCompactionPlan("just a prompt")).toBe("just a prompt");
    expect(stripPostCompactionPlan(undefined)).toBeUndefined();
    expect(
      stripPostCompactionPlan(`${POST_COMPACTION_PLAN_HEADER}\n\n- [ ] 1. only`),
    ).toBeUndefined();
  });
});
