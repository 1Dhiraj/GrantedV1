import { describe, expect, it } from "vitest";
import { readToolVerificationOutcome } from "./tool-verification-outcome.js";

describe("tool verification outcome", () => {
  it("records a satisfied postcondition", () => {
    expect(
      readToolVerificationOutcome("browser", "verify", { details: { verified: true } }),
    ).toEqual({
      passed: true,
    });
  });

  it("preserves a bounded recovery hint for a failed postcondition", () => {
    expect(
      readToolVerificationOutcome("browser", "verify", {
        details: { verified: false, hint: " inspect the current window and retry " },
      }),
    ).toEqual({ passed: false, error: "inspect the current window and retry" });
  });

  it("uses a deterministic failure when the tool omits its hint", () => {
    expect(
      readToolVerificationOutcome("browser", "verify", { details: { verified: false } }),
    ).toEqual({
      passed: false,
      error: "The requested postcondition was not satisfied.",
    });
  });

  it("ignores ordinary actions and unverifiable results", () => {
    expect(
      readToolVerificationOutcome("browser", "act", { details: { verified: false } }),
    ).toBeUndefined();
    expect(readToolVerificationOutcome("browser", "verify", { details: {} })).toBeUndefined();
  });

  it("records a confirmed computer action as verified", () => {
    expect(
      readToolVerificationOutcome("computer", "left_click", {
        details: { effect: "confirmed" },
      }),
    ).toEqual({ passed: true });
  });

  it("turns a suspected computer no-op into a recovery outcome", () => {
    expect(
      readToolVerificationOutcome("computer", "left_click", {
        details: { effect: "suspected_noop" },
      }),
    ).toEqual({
      passed: false,
      error:
        "Computer action produced no observable effect. Take a fresh observation, correct the target or arguments, and try a different safe action.",
    });
  });

  it("uses the driver's recommended escalation route for computer recovery", () => {
    expect(
      readToolVerificationOutcome("computer", "set_value", {
        details: {
          effect: "suspected_noop",
          escalation: { recommended: "foreground", reasonCode: "delivery_failed" },
        },
      }),
    ).toEqual({
      passed: false,
      error:
        'Computer action produced no observable effect. Bring the target window to front and retry with `deliveryMode:"foreground"`. Driver reason: delivery_failed.',
    });
  });

  it("reads outcomes nested under the projected computer result", () => {
    expect(
      readToolVerificationOutcome("computer", "set_value", {
        details: { result: { effect: "suspected_noop" } },
      }),
    ).toMatchObject({ passed: false });
  });

  it("leaves unverifiable computer actions for end-state verification", () => {
    expect(
      readToolVerificationOutcome("computer", "type", {
        details: { effect: "unverifiable" },
      }),
    ).toBeUndefined();
  });

  it("ignores computer-style effects from other tools", () => {
    expect(
      readToolVerificationOutcome("browser", "click", {
        details: { effect: "suspected_noop" },
      }),
    ).toBeUndefined();
  });

  it("turns structured computer refusals into bounded recovery guidance", () => {
    const outcome = readToolVerificationOutcome("computer", "set_value", {
      details: {
        result: {
          details: {
            refusal: { code: "foreground_denied", message: "Window rejected input" },
          },
        },
      },
    });

    expect(outcome).toEqual({
      passed: false,
      error:
        "Computer action was refused: foreground_denied: Window rejected input. Take a fresh observation, correct the target or arguments, and try a different safe action.",
    });
  });
});
