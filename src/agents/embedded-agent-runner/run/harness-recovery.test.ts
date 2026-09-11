import { describe, expect, it } from "vitest";
import {
  canRunHarnessRecovery,
  resolveHarnessRecoveryInstruction,
  type HarnessRecoveryEligibility,
} from "./harness-recovery.js";

const SAFE_RECOVERY: HarnessRecoveryEligibility = {
  requiresVisibleReply: true,
  settledTurnFinalizationAttempted: false,
  terminalInterrupted: false,
  hasPromptError: false,
  hasClientToolCalls: false,
  yielded: false,
  approvalPromptSent: false,
  messageDelivered: false,
  sourceReplyDelivered: false,
  mediaDelivered: false,
  heartbeatDelivered: false,
  acceptedSessionSpawnCount: 0,
  successfulCronAdds: 0,
  silentReply: false,
};

describe("harness recovery instruction", () => {
  it("prioritizes recovery after a failed mutating action", () => {
    const result = resolveHarnessRecoveryInstruction({
      attempt: {
        toolMetas: [{ toolName: "desktop", meta: "act", isError: true, mutating: true }],
        lastToolError: { toolName: "desktop", error: "button was stale" },
      },
      replyText: "I could not click the button.",
      attempts: 0,
    });

    expect(result?.kind).toBe("self_heal");
    expect(result?.prompt).toContain("button was stale");
    expect(result?.prompt).toContain("fresh look at the current state");
  });

  it("requests proof after an unchecked success claim", () => {
    const result = resolveHarnessRecoveryInstruction({
      attempt: {
        toolMetas: [{ toolName: "write", isError: false, mutating: true }],
      },
      replyText: "The file has been created.",
      attempts: 0,
    });

    expect(result?.kind).toBe("verify");
    expect(result?.prompt).toContain("nothing in this turn read the result back");
  });

  it("accepts deterministic desktop verification as evidence", () => {
    expect(
      resolveHarnessRecoveryInstruction({
        attempt: {
          toolMetas: [
            { toolName: "desktop", meta: "act", isError: false, mutating: true },
            { toolName: "desktop", meta: "verify", isError: false, mutating: false },
          ],
        },
        replyText: "The Save dialog has been opened.",
        attempts: 0,
      }),
    ).toBeNull();
  });

  it("recovers when desktop verification executes but its postcondition fails", () => {
    const result = resolveHarnessRecoveryInstruction({
      attempt: {
        toolMetas: [
          { toolName: "desktop", meta: "act", isError: false, mutating: true },
          {
            toolName: "desktop",
            meta: "verify",
            isError: false,
            mutating: false,
            verificationOutcome: { passed: false, error: "Save dialog did not appear" },
          },
        ],
      },
      replyText: "The Save dialog has been opened.",
      attempts: 0,
    });

    expect(result?.kind).toBe("self_heal");
    expect(result?.prompt).toContain("Save dialog did not appear");
  });

  it("stops after the bounded recovery budget", () => {
    expect(
      resolveHarnessRecoveryInstruction({
        attempt: {
          toolMetas: [{ toolName: "write", isError: false, mutating: true }],
        },
        replyText: "The file has been created.",
        attempts: 2,
      }),
    ).toBeNull();
  });
});

describe("harness recovery eligibility", () => {
  it("allows a clean interactive terminal turn", () => {
    expect(canRunHarnessRecovery(SAFE_RECOVERY)).toBe(true);
  });

  it.each([
    ["message delivery", { messageDelivered: true }],
    ["approval prompt", { approvalPromptSent: true }],
    ["terminal interrupt", { terminalInterrupted: true }],
    ["silent reply", { silentReply: true }],
  ])("blocks recovery after %s", (_label, override) => {
    expect(canRunHarnessRecovery({ ...SAFE_RECOVERY, ...override })).toBe(false);
  });
});
