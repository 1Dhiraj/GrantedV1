import { describe, expect, it } from "vitest";
import { GrantedSchema } from "./zod-schema.js";

describe("GrantedSchema cron gates", () => {
  it.each([undefined, false, true])(
    "accepts skipMissedJobs=%s without changing its default",
    (skipMissedJobs) => {
      expect(GrantedSchema.parse({ cron: { skipMissedJobs } }).cron?.skipMissedJobs).toBe(
        skipMissedJobs,
      );
    },
  );

  it("rejects a non-boolean skipMissedJobs", () => {
    expect(GrantedSchema.safeParse({ cron: { skipMissedJobs: "true" } }).success).toBe(false);
  });

  it("accepts the strict trigger gate", () => {
    expect(GrantedSchema.parse({ cron: { triggers: { enabled: true } } }).cron?.triggers).toEqual({
      enabled: true,
    });
  });

  it("rejects invalid and unknown trigger settings", () => {
    expect(
      GrantedSchema.safeParse({ cron: { triggers: { enabled: true, extra: true } } }).success,
    ).toBe(false);
  });
});
