import { describe, expect, it } from "vitest";
import { buildToolVerificationMetadata } from "./tool-verification-targets.js";

describe("tool verification resource identities", () => {
  it("matches Windows path aliases without changing POSIX case", () => {
    expect(
      buildToolVerificationMetadata("write_file", { file_path: "C:/Work/../Work/REPORT.txt" }),
    ).toEqual(buildToolVerificationMetadata("read", { path: "c:/work/report.txt" }));
    expect(buildToolVerificationMetadata("write", { path: "/Work/REPORT.txt" })).not.toEqual(
      buildToolVerificationMetadata("read", { path: "/work/report.txt" }),
    );
  });
  it("keeps an explicit target per window or browser tab", () => {
    expect(buildToolVerificationMetadata("desktop", { action: "act", title: "Editor" })).toEqual({
      toolAction: "act",
      verificationTargets: ["tool:desktop:title:Editor"],
    });
    expect(
      buildToolVerificationMetadata("browser", { action: "snapshot", targetId: "tab-2" }),
    ).not.toEqual(
      buildToolVerificationMetadata("browser", { action: "snapshot", targetId: "tab-1" }),
    );
  });
  it("does not derive resource identities from commands, content or invalid arguments", () => {
    expect(
      buildToolVerificationMetadata("exec", {
        command: "cat /work/output.txt",
        text: "secret",
        path: 3,
      }),
    ).toEqual({});
  });
});
