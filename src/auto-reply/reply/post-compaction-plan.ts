/**
 * Puts the unfinished plan back in front of the model after a compaction.
 *
 * The progress card is a one-way surface: the model writes it and the operator
 * reads it, but nothing feeds it back. Compaction drops the transcript that held
 * the plan, so a long task loses its own thread and either repeats finished work
 * or drifts off it. This re-injects the steps that are still open - and only
 * those, because replaying completed steps makes models redo them.
 */
import { truncateUtf16Safe } from "@granted/normalization-core/utf16-slice";
import type {
  ProgressCard,
  ProgressCardStep,
} from "../../../packages/gateway-protocol/src/index.js";

/** Marks the injected block so a later compaction can refresh it instead of stacking another copy. */
export const POST_COMPACTION_PLAN_HEADER =
  "[Your active plan was preserved across context compaction]";

const MAX_INJECTED_STEPS = 20;
const MAX_STEP_CHARS = 160;

const STEP_MARKERS: Record<ProgressCardStep["status"], string> = {
  in_progress: "[>]",
  pending: "[ ]",
  completed: "[x]",
};

/** Renders the open steps of a plan, numbered as the operator's card numbers them. */
export function formatPostCompactionPlan(steps: readonly ProgressCardStep[]): string | null {
  const open = steps
    .map((step, index) => ({ step, position: index + 1 }))
    .filter(({ step }) => step.status !== "completed");
  if (open.length === 0) {
    return null;
  }
  const shown = open.slice(0, MAX_INJECTED_STEPS);
  const lines = [POST_COMPACTION_PLAN_HEADER, ""];
  for (const { step, position } of shown) {
    const text = step.step.replace(/\s+/g, " ").trim();
    const capped =
      text.length > MAX_STEP_CHARS ? `${truncateUtf16Safe(text, MAX_STEP_CHARS)}...` : text;
    lines.push(`- ${STEP_MARKERS[step.status]} ${position}. ${capped}`);
  }
  if (open.length > shown.length) {
    lines.push(`- ...and ${open.length - shown.length} more open steps on the card.`);
  }
  lines.push(
    "",
    "Completed steps are omitted. Continue from the steps above and keep the card current with progress_card.",
  );
  return lines.join("\n");
}

/**
 * Reads the session's card and renders its open steps, or null when there is no
 * plan to restore. A missing card, a card without steps, and an unreadable store
 * are all "nothing to restore": a refresh block is context, never a precondition.
 */
export async function readPostCompactionPlan(params: {
  sessionKey?: string;
  readCard?: (sessionKey: string) => ProgressCard | null;
}): Promise<string | null> {
  const sessionKey = params.sessionKey?.trim();
  if (!sessionKey) {
    return null;
  }
  try {
    const readCard = params.readCard ?? (await resolveDefaultCardReader());
    const card = readCard(sessionKey);
    return card?.steps?.length ? formatPostCompactionPlan(card.steps) : null;
  } catch {
    return null;
  }
}

/**
 * Drops an earlier injected plan block so repeated compactions refresh the plan
 * rather than accumulate stale copies of it. The block is always appended last,
 * so everything from its header onward belongs to it.
 */
export function stripPostCompactionPlan(text: string | undefined): string | undefined {
  if (!text) {
    return text;
  }
  const index = text.indexOf(POST_COMPACTION_PLAN_HEADER);
  if (index < 0) {
    return text;
  }
  const kept = text.slice(0, index).trimEnd();
  return kept.length > 0 ? kept : undefined;
}

async function resolveDefaultCardReader(): Promise<(sessionKey: string) => ProgressCard | null> {
  // Loaded lazily: most turns never compact, and this pulls in the agent database.
  const { progressCardStore } = await import("../../gateway/progress-card-store.js");
  return (sessionKey) => progressCardStore.get(sessionKey);
}
