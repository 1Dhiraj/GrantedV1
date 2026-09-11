import { readToolResultDetails } from "./tool-result-error.js";

const DEFAULT_VERIFICATION_FAILURE = "The requested postcondition was not satisfied.";
const MAX_VERIFICATION_ERROR_CHARS = 1_000;

export type ToolVerificationOutcome = {
  passed: boolean;
  error?: string;
};

/** Reads a tool's explicit postcondition verdict without treating execution itself as failed. */
export function readToolVerificationOutcome(
  action: string | undefined,
  result: unknown,
): ToolVerificationOutcome | undefined {
  if (action?.trim().toLowerCase() !== "verify") {
    return undefined;
  }
  const details = readToolResultDetails(result);
  if (typeof details?.verified !== "boolean") {
    return undefined;
  }
  if (details.verified) {
    return { passed: true };
  }
  const hint = typeof details.hint === "string" ? details.hint.trim() : "";
  return {
    passed: false,
    error: hint.slice(0, MAX_VERIFICATION_ERROR_CHARS) || DEFAULT_VERIFICATION_FAILURE,
  };
}
