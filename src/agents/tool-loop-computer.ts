import type { ToolCallRecord } from "../logging/diagnostic-session-state.js";
import { isPlainObject } from "../utils.js";
import { isComputerObservationAction } from "./tools/computer-tool-shared.js";

export const COMPUTER_NO_PROGRESS_LIMIT = 2;

export function readComputerNoProgressOutcome(
  details: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const nestedResult = isPlainObject(details.result) ? details.result : undefined;
  const effect = details.effect ?? nestedResult?.effect;
  if (effect !== "suspected_noop") {
    return undefined;
  }
  return {
    effect,
    escalation: details.escalation ?? nestedResult?.escalation ?? null,
  };
}

export function isComputerRecoveryObservation(params: unknown): boolean {
  if (!isPlainObject(params)) {
    return false;
  }
  return isComputerObservationAction(
    typeof params.action === "string" ? params.action : undefined,
    params.dialogAction,
  );
}

export function countConsecutiveComputerNoProgress(
  history: readonly ToolCallRecord[],
): number {
  let count = 0;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const record = history[index];
    if (!record || record.toolName !== "computer" || record.noProgress !== true) {
      break;
    }
    count += 1;
  }
  return count;
}
