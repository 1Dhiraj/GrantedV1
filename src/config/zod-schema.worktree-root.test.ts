import path from "node:path";
import { describe, expect, it } from "vitest";
import { GrantedSchema } from "./zod-schema.js";

describe("GrantedSchema worktreeRoot", () => {
  it("keeps the default implicit and accepts an absolute or home-relative root", () => {
    expect(GrantedSchema.parse({}).worktreeRoot).toBeUndefined();
    const roots = [path.resolve("worktrees"), "~/worktrees", "~"];
    if (path.sep === "\\") {
      roots.push("~\\worktrees");
    }
    for (const worktreeRoot of roots) {
      expect(GrantedSchema.parse({ worktreeRoot }).worktreeRoot).toBe(worktreeRoot);
    }
  });

  it.each([
    "",
    "  ",
    "worktrees",
    "./worktrees",
    "../worktrees",
    "~someone/worktrees",
    ...(path.sep === "/" ? ["~\\worktrees"] : []),
    42,
    null,
  ])("rejects an empty, relative, or non-string root: %j", (worktreeRoot) => {
    expect(GrantedSchema.safeParse({ worktreeRoot }).success).toBe(false);
  });

  it("keeps the retired worktrees namespace invalid", () => {
    expect(GrantedSchema.safeParse({ worktrees: { root: "~/worktrees" } }).success).toBe(false);
  });
});
