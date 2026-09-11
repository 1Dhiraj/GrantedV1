import { describe, expect, it } from "vitest";
import {
  isTrajectoryPointerSchema,
  isTrajectorySchema,
  TRAJECTORY_POINTER_SCHEMA,
  TRAJECTORY_SCHEMA,
} from "./types.js";

describe("trajectory schema identity", () => {
  it("uses Granted identifiers for new trajectory data", () => {
    expect(TRAJECTORY_SCHEMA).toBe("granted-trajectory");
    expect(TRAJECTORY_POINTER_SCHEMA).toBe("granted-trajectory-pointer");
  });

  it("continues to recognize recordings created before the rename", () => {
    expect(isTrajectorySchema("openclaw-trajectory")).toBe(true);
    expect(isTrajectoryPointerSchema("openclaw-trajectory-pointer")).toBe(true);
  });

  it("rejects unrelated schemas", () => {
    expect(isTrajectorySchema("other-trajectory")).toBe(false);
    expect(isTrajectoryPointerSchema("other-pointer")).toBe(false);
  });
});
