import { readToolResultDetails } from "./tool-result-error.js";

const DEFAULT_VERIFICATION_FAILURE = "The requested postcondition was not satisfied.";
const COMPUTER_REFUSAL_FAILURE =
  "Computer action was refused. Take a fresh observation and try another advertised delivery method.";
const MAX_VERIFICATION_ERROR_CHARS = 1_000;

export type ToolVerificationOutcome = {
  passed: boolean;
  error?: string;
};

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readBoundedString(value: unknown): string | undefined {
  return typeof value === "string"
    ? value.trim().slice(0, MAX_VERIFICATION_ERROR_CHARS) || undefined
    : undefined;
}

function describeComputerRecovery(escalation: unknown): string {
  const record = readRecord(escalation);
  const recommended = readBoundedString(record?.recommended);
  const reasonCode = readBoundedString(record?.reasonCode);
  const instruction =
    recommended === "window-pixel"
      ? "Take a fresh `get_window_state` observation and retry using current window pixels."
      : recommended === "foreground"
        ? 'Bring the target window to front and retry with `deliveryMode:"foreground"`.'
        : recommended === "desktop"
          ? "Take a fresh `screenshot` and retry using current desktop coordinates."
          : "Take a fresh observation, correct the target or arguments, and try a different safe action.";
  return reasonCode ? `${instruction} Driver reason: ${reasonCode}.` : instruction;
}

function describeComputerRefusal(value: unknown, escalation: unknown): string {
  const direct = readBoundedString(value);
  if (direct) {
    return `Computer action was refused: ${direct}. ${describeComputerRecovery(escalation)}`.slice(
      0,
      MAX_VERIFICATION_ERROR_CHARS,
    );
  }
  const refusal = readRecord(value);
  if (!refusal) {
    return COMPUTER_REFUSAL_FAILURE;
  }
  const parts = [refusal.code, refusal.message, refusal.reason]
    .map(readBoundedString)
    .filter((part): part is string => Boolean(part));
  const explanation = [...new Set(parts)].join(": ");
  return explanation
    ? `Computer action was refused: ${explanation}. ${describeComputerRecovery(escalation)}`.slice(
        0,
        MAX_VERIFICATION_ERROR_CHARS,
      )
    : COMPUTER_REFUSAL_FAILURE;
}

/** Reads explicit and computer-driver verdicts without treating execution itself as failed. */
export function readToolVerificationOutcome(
  toolName: string | undefined,
  action: string | undefined,
  result: unknown,
): ToolVerificationOutcome | undefined {
  const details = readToolResultDetails(result);
  if (action?.trim().toLowerCase() === "verify") {
    if (typeof details?.verified !== "boolean") {
      return undefined;
    }
    if (details.verified) {
      return { passed: true };
    }
    const hint = readBoundedString(details.hint);
    return {
      passed: false,
      error: hint || DEFAULT_VERIFICATION_FAILURE,
    };
  }

  if (toolName?.trim().toLowerCase() !== "computer" || !details) {
    return undefined;
  }

  const nestedResult = readRecord(details.result);
  const nestedDriverDetails = readRecord(nestedResult?.details);
  const escalation = details.escalation ?? nestedResult?.escalation;
  const refusal = details.refusal ?? nestedResult?.refusal ?? nestedDriverDetails?.refusal;
  if (refusal !== undefined) {
    return { passed: false, error: describeComputerRefusal(refusal, escalation) };
  }

  const effect = details.effect ?? nestedResult?.effect;
  if (effect === "confirmed") {
    return { passed: true };
  }
  if (effect === "suspected_noop") {
    return {
      passed: false,
      error: `Computer action produced no observable effect. ${describeComputerRecovery(escalation)}`,
    };
  }
  return undefined;
}
