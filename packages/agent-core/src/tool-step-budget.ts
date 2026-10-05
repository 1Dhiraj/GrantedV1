/**
 * Step budget for one agent run.
 *
 * The loop dispatches tools until the model stops asking, the caller aborts, or
 * a timeout fires. A stuck agent therefore spends the whole run without ever
 * reporting: the caller sees a timeout, not a reason. The budget spends the last
 * step on a wrap-up instead - tools are withheld for one turn and the model is
 * asked what it did, what it verified, and what is left - so a run that hits the
 * cap still ends with a named stop.
 *
 * The cap is per run. Steering messages do not refill it; a follow-up drained
 * after the run would have ended is a new task and does.
 */
import type { AgentMessage, ToolStepBudgetState } from "./types.js";

/** Transcript type carrying the closing turn's instruction. */
export const STEP_BUDGET_NOTE_TYPE = "openclaw:step-budget";

/** What the loop does after an assistant turn that dispatched tools. */
export type ToolStepBudgetOutcome =
  /** Budget left, or none configured: keep going. */
  | "continue"
  /** Budget spent: withhold tools and ask for a closing report. */
  | "request-summary"
  /** The closing turn already happened: end the run without dispatching again. */
  | "stop";

export type ToolStepBudget = {
  /** Effective cap, or undefined when this run is unlimited. */
  readonly maxToolSteps: number | undefined;
  usedSteps: () => number;
  /** True once the closing turn has been requested. */
  isClosing: () => boolean;
  /** Counts one assistant turn that dispatched tools. */
  recordToolStep: () => void;
  /** Decides what happens after a dispatched batch. */
  afterToolBatch: (hasMoreToolCalls: boolean) => ToolStepBudgetOutcome;
  /** Refills the budget so a queued follow-up task starts clean. */
  resetForNextTask: () => void;
  /** Instruction shown to the model on the tool-free closing turn. */
  createSummaryRequest: (now?: number) => AgentMessage;
};

/** A non-positive or non-finite cap means unlimited, the pre-budget behavior. */
function resolveCap(maxToolSteps: number | undefined): number | undefined {
  if (typeof maxToolSteps !== "number" || !Number.isFinite(maxToolSteps) || maxToolSteps <= 0) {
    return undefined;
  }
  return Math.floor(maxToolSteps);
}

export function buildStepBudgetSummaryRequest(params: {
  usedSteps: number;
  maxToolSteps: number;
}): string {
  return [
    "<step_budget_reached>",
    `This run has spent its tool-step budget (${params.usedSteps} of ${params.maxToolSteps} steps), so no tools are available for this reply.`,
    "Close out instead:",
    "- what you did, and which parts you verified, naming the evidence",
    "- what is unfinished, and the next concrete step to resume it",
    "Do not claim a result you did not verify, and do not ask for more steps: the operator can continue the run.",
    "</step_budget_reached>",
  ].join("\n");
}

export function createToolStepBudget(params: {
  maxToolSteps?: number;
  /** Shared across Agent.continue() retries so a retry cannot refill the cap. */
  state?: ToolStepBudgetState;
}): ToolStepBudget {
  const state: ToolStepBudgetState = params.state ?? { usedSteps: 0 };
  const maxToolSteps = resolveCap(params.maxToolSteps);
  return {
    maxToolSteps,
    usedSteps: () => state.usedSteps,
    isClosing: () => state.summaryRequested === true,
    recordToolStep: () => {
      state.usedSteps += 1;
    },
    afterToolBatch: (hasMoreToolCalls) => {
      if (state.summaryRequested === true) {
        // The closing turn asked for prose. Anything else ends the run, so a
        // model that keeps emitting calls against an empty tool set cannot spin.
        return "stop";
      }
      if (maxToolSteps === undefined || !hasMoreToolCalls || state.usedSteps < maxToolSteps) {
        return "continue";
      }
      state.summaryRequested = true;
      return "request-summary";
    },
    resetForNextTask: () => {
      state.usedSteps = 0;
      state.summaryRequested = false;
    },
    createSummaryRequest: (now) => ({
      role: "custom",
      customType: STEP_BUDGET_NOTE_TYPE,
      content: buildStepBudgetSummaryRequest({
        usedSteps: state.usedSteps,
        maxToolSteps: maxToolSteps ?? state.usedSteps,
      }),
      // Visible: the operator should see why the run stopped even if the model's
      // own closing report is thin.
      display: true,
      timestamp: now ?? Date.now(),
    }),
  };
}
