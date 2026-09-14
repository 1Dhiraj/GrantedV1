import { readToolResultDetails } from "./tool-result-error.js";

const DEFAULT_VERIFICATION_FAILURE = "The requested postcondition was not satisfied.";
const COMPUTER_NOOP_FAILURE =
  "Computer action produced no observable effect. Take a fresh observation, correct the target or arguments, and try a different safe action.";
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

function describeComputerRefusal(value: unknown): string {
  const direct = readBoundedString(value);
  if (direct) {
    return direct;
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
    ? `Computer action was refused: ${explanation}. Take a fresh observation and try another advertised delivery method.`.slice(
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
  const refusal = details.refusal ?? nestedResult?.refusal ?? nestedDriverDetails?.refusal;
  if (refusal !== undefined) {
    return { passed: false, error: describeComputerRefusal(refusal) };
  }

  const effect = details.effect ?? nestedResult?.effect;
  if (effect === "confirmed") {
    return { passed: true };
  }
  if (effect === "suspected_noop") {
    return { passed: false, error: COMPUTER_NOOP_FAILURE };
  }
  return undefined;
}
