import { describe, expect, it } from "vitest";
import { buildDesktopVerificationRequest, normalizeDesktopTimeout } from "./verification.js";

describe("desktop verification policy", () => {
  it("defaults to checking that an element appears", () => {
    expect(
      buildDesktopVerificationRequest({ title: "Save As", name: "Save", role: "Button" }),
    ).toEqual({
      args: {
        title: "Save As",
        name: "Save",
        role: "Button",
        timeoutMs: 10_000,
        requirePresent: true,
      },
      processTimeoutMs: 25_000,
    });
  });

  it("can require an element to disappear", () => {
    expect(
      buildDesktopVerificationRequest({
        title: "",
        name: "Uploading",
        condition: "element_absent",
        timeoutMs: 2_000,
      }),
    ).toEqual({
      args: {
        title: "",
        name: "Uploading",
        role: undefined,
        timeoutMs: 2_000,
        requirePresent: false,
      },
      processTimeoutMs: 17_000,
    });
  });

  it("rejects unknown conditions instead of treating them as absence", () => {
    expect(() =>
      buildDesktopVerificationRequest({
        title: "",
        name: "Ready",
        condition: "maybe",
      }),
    ).toThrow('unknown verification condition "maybe"');
  });

  it("bounds finite timeout values and defaults invalid values", () => {
    expect(normalizeDesktopTimeout(0)).toBe(1);
    expect(normalizeDesktopTimeout(45_000)).toBe(30_000);
    expect(normalizeDesktopTimeout(1_234.9)).toBe(1_234);
    expect(normalizeDesktopTimeout(Number.NaN)).toBe(10_000);
  });
});
