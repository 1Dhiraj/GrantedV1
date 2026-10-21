import { readToolVerificationOutcome } from "./tool-verification-outcome.js";
import { buildToolVerificationMetadata } from "./tool-verification-targets.js";
import { isMutatingCall } from "./verify-on-stop.js";

/** Keep argument identity, mutation classification and the owner verdict together. */
export function buildVerificationReceipt(
  toolName: string,
  args: Record<string, unknown>,
  result: unknown,
  mutating: boolean,
) {
  const metadata = buildToolVerificationMetadata(toolName, args);
  const verificationOutcome = readToolVerificationOutcome(toolName, metadata.toolAction, result);
  return {
    ...metadata,
    mutating: mutating || isMutatingCall({ name: toolName, action: metadata.toolAction }),
    ...(verificationOutcome ? { verificationOutcome } : {}),
  };
}
