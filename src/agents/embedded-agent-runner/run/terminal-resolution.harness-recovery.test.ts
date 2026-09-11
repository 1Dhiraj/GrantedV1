import { describe, expect, it, vi } from "vitest";
import {
  buildEmbeddedRunnerAssistant,
  makeEmbeddedRunnerAttempt,
} from "../../test-helpers/embedded-agent-runner-e2e-fixtures.js";
import { resolveEmbeddedRunTerminal } from "./terminal-resolution.js";
import { makeTerminalInput } from "./terminal-resolution.test-support.js";
import { createEmbeddedRunTerminalRetryState } from "./terminal-retry-state.js";

vi.mock("./auth-profile-success.js", () => ({
  markEmbeddedRunAuthProfileSuccess: vi.fn(),
  reportEmbeddedRunSuccessfulAuthBinding: vi.fn(),
}));

function createSuccessClaimAttempt() {
  const text = "The file has been created.";
  const assistant = buildEmbeddedRunnerAssistant({ content: [{ type: "text", text }] });
  return {
    assistant,
    attempt: makeEmbeddedRunnerAttempt({
      assistantTexts: [text],
      lastAssistant: assistant,
      currentAttemptAssistant: assistant,
      toolMetas: [{ toolName: "write", isError: false, replaySafe: false, mutating: true }],
      replayMetadata: { hadPotentialSideEffects: true, replaySafe: false },
      currentAttemptReplayMetadata: { hadPotentialSideEffects: true, replaySafe: false },
    }),
    text,
  };
}

describe("terminal harness recovery", () => {
  it("continues an interactive turn to verify an unchecked success claim", async () => {
    const { assistant, attempt, text } = createSuccessClaimAttempt();
    const activateInternalPrompt = vi.fn();
    const input = makeTerminalInput({
      attempt,
      attemptAssistant: assistant,
      finalAssistantVisibleText: text,
      payloadsWithToolMedia: [{ text }],
      activateInternalPrompt,
    });

    await expect(resolveEmbeddedRunTerminal(input)).resolves.toEqual({ action: "retry" });
    expect(input.retryState.harnessRecoveryAttempts).toBe(1);
    expect(activateInternalPrompt).toHaveBeenCalledWith(
      expect.stringContaining("nothing in this turn read the result back"),
    );
  });

  it("delivers after the bounded recovery budget is exhausted", async () => {
    const { assistant, attempt, text } = createSuccessClaimAttempt();
    const input = makeTerminalInput({
      attempt,
      attemptAssistant: assistant,
      finalAssistantVisibleText: text,
      payloadsWithToolMedia: [{ text }],
      retryState: { ...createEmbeddedRunTerminalRetryState(), harnessRecoveryAttempts: 2 },
    });

    const result = await resolveEmbeddedRunTerminal(input);

    expect(result.action).toBe("complete");
    expect(input.activateInternalPrompt).not.toHaveBeenCalled();
  });

  it("never starts a recovery pass after a committed message delivery", async () => {
    const { assistant, attempt, text } = createSuccessClaimAttempt();
    attempt.didSendViaMessagingTool = true;
    attempt.messagingToolSentTexts = [text];
    const input = makeTerminalInput({
      attempt,
      attemptAssistant: assistant,
      finalAssistantVisibleText: text,
      payloadsWithToolMedia: [{ text }],
    });

    const result = await resolveEmbeddedRunTerminal(input);

    expect(result.action).toBe("complete");
    expect(input.activateInternalPrompt).not.toHaveBeenCalled();
  });
});
