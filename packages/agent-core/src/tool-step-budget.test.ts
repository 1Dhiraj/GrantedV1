// Covers the per-run tool-step budget and the closing turn it forces.
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { runAgentLoop } from "./agent-loop.js";
import { Agent } from "./agent.js";
import { type AssistantMessage, createAssistantMessageEventStream, type Model } from "./llm.js";
import { createToolStepBudget, STEP_BUDGET_NOTE_TYPE } from "./tool-step-budget.js";
import type { AgentEvent, AgentMessage, AgentTool, StreamFn } from "./types.js";

const model: Model = {
  id: "test-model",
  name: "Test Model",
  api: "test-api",
  provider: "test-provider",
  baseUrl: "https://example.test",
  reasoning: false,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 1000,
  maxTokens: 1000,
};

const TEST_USAGE = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

describe("createToolStepBudget", () => {
  it("treats an unset, zero, or negative cap as unlimited", () => {
    for (const maxToolSteps of [undefined, 0, -5, Number.NaN]) {
      const budget = createToolStepBudget({ maxToolSteps });
      for (let step = 0; step < 50; step += 1) {
        budget.recordToolStep();
        expect(budget.afterToolBatch(true)).toBe("continue");
      }
      expect(budget.maxToolSteps).toBeUndefined();
      expect(budget.isClosing()).toBe(false);
    }
  });

  it("asks for the closing summary at the cap, then refuses to dispatch again", () => {
    const budget = createToolStepBudget({ maxToolSteps: 2 });

    budget.recordToolStep();
    expect(budget.afterToolBatch(true)).toBe("continue");
    budget.recordToolStep();
    expect(budget.afterToolBatch(true)).toBe("request-summary");
    expect(budget.isClosing()).toBe(true);
    // A model that keeps calling tools against the withheld set ends the run.
    expect(budget.afterToolBatch(true)).toBe("stop");
    expect(budget.afterToolBatch(false)).toBe("stop");
  });

  it("does not spend the budget on a turn that stops on its own", () => {
    const budget = createToolStepBudget({ maxToolSteps: 1 });
    budget.recordToolStep();

    expect(budget.afterToolBatch(false)).toBe("continue");
    expect(budget.isClosing()).toBe(false);
  });

  it("refills for a queued follow-up task", () => {
    const budget = createToolStepBudget({ maxToolSteps: 1 });
    budget.recordToolStep();
    expect(budget.afterToolBatch(true)).toBe("request-summary");

    budget.resetForNextTask();

    expect(budget.isClosing()).toBe(false);
    expect(budget.usedSteps()).toBe(0);
    budget.recordToolStep();
    expect(budget.afterToolBatch(true)).toBe("request-summary");
  });

  it("shares spend with the caller's state so a retry cannot refill it", () => {
    const state = { usedSteps: 0 };
    createToolStepBudget({ maxToolSteps: 3, state }).recordToolStep();
    const retry = createToolStepBudget({ maxToolSteps: 3, state });
    retry.recordToolStep();
    retry.recordToolStep();

    expect(retry.usedSteps()).toBe(3);
    expect(retry.afterToolBatch(true)).toBe("request-summary");
  });

  it("names the spend and the cap in the summary request", () => {
    const budget = createToolStepBudget({ maxToolSteps: 4 });
    for (let step = 0; step < 4; step += 1) {
      budget.recordToolStep();
    }
    const request = budget.createSummaryRequest(1234);

    expect(request).toMatchObject({
      role: "custom",
      customType: STEP_BUDGET_NOTE_TYPE,
      display: true,
      timestamp: 1234,
    });
    expect(request).toMatchObject({ content: expect.stringContaining("4 of 4 steps") });
    expect(request).toMatchObject({ content: expect.stringContaining("what is unfinished") });
  });
});

type LoopRun = {
  messages: AgentMessage[];
  offeredToolCounts: number[];
  executed: number;
};

/** A model that calls a tool on every turn it is offered one. */
function createAlwaysToolCallingStream(params: {
  offeredToolCounts: number[];
  /** Emit tool calls even when no tools are offered, the pathological case. */
  ignoreWithheldTools?: boolean;
  /** Safety valve so an unbudgeted run in a test still terminates. */
  stopAfterTurns?: number;
}): StreamFn {
  let turn = 0;
  return (_activeModel, context) => {
    turn += 1;
    const offered = context.tools?.length ?? 0;
    params.offeredToolCounts.push(offered);
    const exhaustedTestTurns = params.stopAfterTurns !== undefined && turn > params.stopAfterTurns;
    const callsTool = !exhaustedTestTurns && (offered > 0 || params.ignoreWithheldTools === true);
    const message: AssistantMessage = {
      role: "assistant",
      content: callsTool
        ? [{ type: "toolCall", id: `call-${turn}`, name: "noop", arguments: {} }]
        : [{ type: "text", text: "Here is what I did and what is left." }],
      api: model.api,
      provider: model.provider,
      model: model.id,
      usage: TEST_USAGE,
      stopReason: callsTool ? "toolUse" : "stop",
      timestamp: turn,
    };
    const stream = createAssistantMessageEventStream();
    queueMicrotask(() => {
      stream.push({ type: "done", reason: callsTool ? "toolUse" : "stop", message });
      stream.end();
    });
    return stream;
  };
}

async function runLoopWithBudget(params: {
  maxToolSteps?: number;
  ignoreWithheldTools?: boolean;
  stopAfterTurns?: number;
}): Promise<LoopRun> {
  let executed = 0;
  const noop: AgentTool = {
    name: "noop",
    label: "noop",
    description: "Does nothing.",
    parameters: Type.Object({}, { additionalProperties: false }),
    execute: async () => {
      executed += 1;
      return { content: [{ type: "text", text: "ok" }], details: {} };
    },
  };
  const offeredToolCounts: number[] = [];
  let messages: AgentMessage[] = [];
  await runAgentLoop(
    [{ role: "user", content: "keep going forever", timestamp: 1 }],
    { systemPrompt: "test", messages: [], tools: [noop] },
    {
      model,
      convertToLlm: (agentMessages: AgentMessage[]) => agentMessages as never,
      ...(params.maxToolSteps === undefined ? {} : { maxToolSteps: params.maxToolSteps }),
    },
    (event: AgentEvent) => {
      if (event.type === "agent_end") {
        messages = event.messages;
      }
    },
    undefined,
    createAlwaysToolCallingStream({
      offeredToolCounts,
      ...(params.ignoreWithheldTools === undefined
        ? {}
        : { ignoreWithheldTools: params.ignoreWithheldTools }),
      ...(params.stopAfterTurns === undefined ? {} : { stopAfterTurns: params.stopAfterTurns }),
    }),
  );
  return { messages, offeredToolCounts, executed };
}

function findBudgetNote(messages: AgentMessage[]): AgentMessage | undefined {
  return messages.find(
    (message) => message.role === "custom" && message.customType === STEP_BUDGET_NOTE_TYPE,
  );
}

describe("agent loop tool-step budget", () => {
  it("stops a never-ending tool caller at the cap and closes with a report", async () => {
    const run = await runLoopWithBudget({ maxToolSteps: 3 });

    expect(run.executed).toBe(3);
    // Three budgeted turns with tools, then one closing turn with none.
    expect(run.offeredToolCounts).toEqual([1, 1, 1, 0]);
    const note = findBudgetNote(run.messages);
    expect(note).toBeDefined();
    const last = run.messages.at(-1);
    expect(last).toMatchObject({ role: "assistant", stopReason: "stop" });
    expect(last).toMatchObject({
      content: [{ type: "text", text: "Here is what I did and what is left." }],
    });
  });

  it("ends the run when the model calls tools that the closing turn withheld", async () => {
    const run = await runLoopWithBudget({ maxToolSteps: 2, ignoreWithheldTools: true });

    // Two budgeted steps plus the closing turn: no unbounded not-found loop.
    expect(run.offeredToolCounts).toEqual([1, 1, 0]);
    expect(run.executed).toBe(2);
  });

  it("carries the Agent option into the run and refills it per prompt", async () => {
    let executed = 0;
    const noop: AgentTool = {
      name: "noop",
      label: "noop",
      description: "Does nothing.",
      parameters: Type.Object({}, { additionalProperties: false }),
      execute: async () => {
        executed += 1;
        return { content: [{ type: "text", text: "ok" }], details: {} };
      },
    };
    const offeredToolCounts: number[] = [];
    const agent = new Agent({
      initialState: { model, systemPrompt: "", tools: [noop], messages: [] },
      convertToLlm: (messages) => messages as never,
      streamFn: createAlwaysToolCallingStream({ offeredToolCounts }),
      maxToolSteps: 2,
    });

    await agent.prompt("keep going forever");

    expect(executed).toBe(2);
    expect(offeredToolCounts).toEqual([1, 1, 0]);
    expect(findBudgetNote(agent.state.messages)).toBeDefined();

    // A second prompt is a new task, so it gets the full budget again.
    await agent.prompt("again, keep going forever");

    expect(executed).toBe(4);
    expect(offeredToolCounts).toEqual([1, 1, 0, 1, 1, 0]);
  });

  it("leaves an unbudgeted run's tools in place", async () => {
    const run = await runLoopWithBudget({ stopAfterTurns: 6 });

    // Unlimited by default: tools stay offered past any cap the budget would set.
    expect(run.offeredToolCounts).toEqual([1, 1, 1, 1, 1, 1, 1]);
    expect(run.executed).toBe(6);
    expect(findBudgetNote(run.messages)).toBeUndefined();
  });
});
