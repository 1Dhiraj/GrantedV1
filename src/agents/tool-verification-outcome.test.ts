import { describe, expect, it } from "vitest";
import { readToolVerificationOutcome } from "./tool-verification-outcome.js";

describe("tool verification outcome", () => {
  it("records a satisfied postcondition", () => {
    expect(readToolVerificationOutcome("verify", { details: { verified: true } })).toEqual({
      passed: true,
    });
  });

  it("preserves a bounded recovery hint for a failed postcondition", () => {
    expect(
      readToolVerificationOutcome("verify", {
        details: { verified: false, hint: " inspect the current window and retry " },
      }),
    ).toEqual({ passed: false, error: "inspect the current window and retry" });
  });

  it("uses a deterministic failure when the tool omits its hint", () => {
    expect(readToolVerificationOutcome("verify", { details: { verified: false } })).toEqual({
      passed: false,
      error: "The requested postcondition was not satisfied.",
    });
  });

  it("ignores ordinary actions and unverifiable results", () => {
    expect(readToolVerificationOutcome("act", { details: { verified: false } })).toBeUndefined();
    expect(readToolVerificationOutcome("verify", { details: {} })).toBeUndefined();
  });
});
