import { buildSelfHealNudge } from "../../self-heal.js";
import { buildVerifyOnStopNudge, type TurnToolCall } from "../../verify-on-stop.js";
import type { EmbeddedRunAttemptResult } from "./types.js";

export const DEFAULT_MAX_HARNESS_RECOVERY_ATTEMPTS = 2;

export type HarnessRecoveryInstruction = {
  kind: "self_heal" | "verify";
  prompt: string;
};

export type HarnessRecoveryEligibility = {
  requiresVisibleReply: boolean;
  settledTurnFinalizationAttempted: boolean;
  terminalInterrupted: boolean;
  hasPromptError: boolean;
  hasClientToolCalls: boolean;
  yielded: boolean;
  approvalPromptSent: boolean;
  messageDelivered: boolean;
  sourceReplyDelivered: boolean;
  mediaDelivered: boolean;
  heartbeatDelivered: boolean;
  acceptedSessionSpawnCount: number;
  successfulCronAdds: number;
  silentReply: boolean;
};

type HarnessRecoveryAttempt = Pick<EmbeddedRunAttemptResult, "lastToolError" | "toolMetas">;

/** Prevents an internal retry after the turn has committed externally visible work. */
export function canRunHarnessRecovery(input: HarnessRecoveryEligibility): boolean {
  return (
    input.requiresVisibleReply &&
    !input.settledTurnFinalizationAttempted &&
    !input.terminalInterrupted &&
    !input.hasPromptError &&
    !input.hasClientToolCalls &&
    !input.yielded &&
    !input.approvalPromptSent &&
    !input.messageDelivered &&
    !input.sourceReplyDelivered &&
    !input.mediaDelivered &&
    !input.heartbeatDelivered &&
    input.acceptedSessionSpawnCount === 0 &&
    input.successfulCronAdds === 0 &&
    !input.silentReply
  );
}

function projectToolCalls(attempt: HarnessRecoveryAttempt): TurnToolCall[] {
  const lastError = attempt.lastToolError;
  return attempt.toolMetas.map((entry) => ({
    name: entry.toolName,
    action: entry.meta,
    command: entry.meta,
    isError: entry.isError,
    mutating: entry.mutating,
    error:
      entry.isError === true && lastError?.toolName === entry.toolName
        ? lastError.error
        : undefined,
  }));
}

/** Selects one bounded recovery pass, prioritizing an actual failure over missing proof. */
export function resolveHarnessRecoveryInstruction(params: {
  attempt: HarnessRecoveryAttempt;
  replyText: string;
  attempts: number;
  maxAttempts?: number;
}): HarnessRecoveryInstruction | null {
  const maxAttempts = params.maxAttempts ?? DEFAULT_MAX_HARNESS_RECOVERY_ATTEMPTS;
  if (params.attempts >= maxAttempts) {
    return null;
  }
  const toolCalls = projectToolCalls(params.attempt);
  const selfHeal = buildSelfHealNudge({
    toolCalls,
    replyText: params.replyText,
    attempts: params.attempts,
    maxAttempts,
  });
  if (selfHeal) {
    return { kind: "self_heal", prompt: selfHeal };
  }
  const verify = buildVerifyOnStopNudge({
    toolCalls,
    replyText: params.replyText,
    attempts: params.attempts,
    maxAttempts,
  });
  return verify ? { kind: "verify", prompt: verify } : null;
}
