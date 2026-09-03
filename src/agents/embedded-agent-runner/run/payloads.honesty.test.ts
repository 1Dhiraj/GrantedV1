// Honesty gates in reply payloads: unverified claims, described-but-unapplied
// changes, and hallucinated tool calls must reach the user as a short note.
import { describe, expect, it } from "vitest";
import { buildPayloads } from "./payloads.test-helpers.js";

describe("hallucinated tool call warning", () => {
  it("warns when the model claims success over a tool that does not exist", () => {
    // Regression: model called nonexistent `write_file`, and the reply still
    // announced "It has been saved." The intended action never ran, so the
    // confident reply must not stand unchallenged.
    const payloads = buildPayloads({
      assistantTexts: [
        "The 20th Fibonacci number is 4181. It has been saved to C:\\temp\\f2-proof.txt.",
      ],
      lastToolError: { toolName: "write_file", error: "Tool write_file not found" },
      verboseLevel: "off",
    });
    expect(payloads).toHaveLength(2);
    expect(payloads[1]?.isError).toBe(true);
    expect(payloads[1]?.text).toContain("write_file");
  });

  it("surfaces a hallucinated tool call even with no assistant reply", () => {
    const payloads = buildPayloads({
      lastToolError: { toolName: "save_note", error: "Tool save_note not found" },
      verboseLevel: "off",
    });
    expect(payloads).toHaveLength(1);
    expect(payloads[0]?.isError).toBe(true);
    expect(payloads[0]?.text).toContain("save_note");
  });

  it("surfaces a hallucinated tool call even when tool-error warnings are suppressed", () => {
    const payloads = buildPayloads({
      assistantTexts: ["Done, the note is saved."],
      lastToolError: { toolName: "save_note", error: "Tool save_note not found" },
      suppressToolErrorWarnings: true,
    });
    expect(payloads.some((p) => p.isError && p.text?.includes("save_note"))).toBe(true);
  });
});

describe("unverified-claim warning", () => {
  it("marks a claimed file write that was never read back", () => {
    const payloads = buildPayloads({
      assistantTexts: ["The file has been created and contains: hello."],
      toolMetas: [{ toolName: "write", mutating: true }],
    });
    expect(payloads.some((p) => p.text?.includes("Unverified"))).toBe(true);
  });

  it("stays silent once the agent read the result back", () => {
    const payloads = buildPayloads({
      assistantTexts: ["The file has been created and contains: hello."],
      toolMetas: [
        { toolName: "write", mutating: true },
        { toolName: "read", mutating: false },
      ],
    });
    expect(payloads.some((p) => p.text?.includes("Unverified"))).toBe(false);
  });

  it("stays silent for a plain conversational answer", () => {
    const payloads = buildPayloads({
      assistantTexts: ["Paris is the capital of France."],
      toolMetas: [],
    });
    expect(payloads.some((p) => p.text?.includes("Unverified"))).toBe(false);
  });

  it("stays silent when the turn admits the failure instead of claiming success", () => {
    const payloads = buildPayloads({
      assistantTexts: ["I tried to save the file but the write failed with a permission error."],
      toolMetas: [{ toolName: "write", mutating: true, isError: true }],
    });
    expect(payloads.some((p) => p.text?.includes("Unverified"))).toBe(false);
  });
});

describe("unapplied-change warning", () => {
  it("flags a turn that prints the fix and promises to apply it without writing", () => {
    const payloads = buildPayloads({
      assistantTexts: [
        "The bug is in add(). Here is the fix:\n```js\nreturn a + b;\n```\nNow let's run the test again.",
      ],
      toolMetas: [{ toolName: "exec", meta: "npm test", mutating: false, isError: true }],
    });
    expect(payloads.some((p) => p.text?.includes("no file was modified"))).toBe(true);
  });

  it("stays silent when the turn actually edited a file", () => {
    const payloads = buildPayloads({
      assistantTexts: ["Fixed add():\n```js\nreturn a + b;\n```\nNow let's run the test again."],
      toolMetas: [
        { toolName: "edit", mutating: true },
        { toolName: "exec", meta: "npm test", mutating: false },
      ],
    });
    expect(payloads.some((p) => p.text?.includes("no file was modified"))).toBe(false);
  });
});
