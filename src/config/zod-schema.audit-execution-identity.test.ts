import { describe, expect, it } from "vitest";
import { GrantedSchema } from "./zod-schema.js";

describe("logging.audit.executionIdentity", () => {
  it("accepts only the explicit boolean config surface", () => {
    expect(
      GrantedSchema.safeParse({
        logging: { audit: { executionIdentity: true } },
      }).success,
    ).toBe(true);
    expect(
      GrantedSchema.safeParse({
        logging: { audit: { executionIdentity: false } },
      }).success,
    ).toBe(true);
    expect(
      GrantedSchema.safeParse({
        logging: { audit: { executionIdentity: "true" } },
      }).success,
    ).toBe(false);
    expect(
      GrantedSchema.safeParse({
        logging: { audit: { execution_identity: true } },
      }).success,
    ).toBe(false);
  });
});
