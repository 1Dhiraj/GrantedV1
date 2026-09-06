// Verifies legacy public names still map to current exports where supported.
import { describe, expect, it } from "vitest";
import { LEGACY_MANIFEST_KEYS, MANIFEST_KEY, readManifestSection } from "./legacy-names.js";

describe("compat/legacy-names", () => {
  it("keeps the current manifest key primary while exposing legacy fallbacks", () => {
    expect(MANIFEST_KEY).toBe("granted");
    expect(LEGACY_MANIFEST_KEYS).toEqual(["openclaw", "clawdbot"]);
  });

  describe("readManifestSection", () => {
    it("reads the section written under the current key", () => {
      expect(readManifestSection({ granted: { extensions: ["./a.js"] } })).toEqual({
        extensions: ["./a.js"],
      });
    });

    it("still reads packages published under the previous keys", () => {
      // Every bundled extension's package.json declares `openclaw`; ignoring it
      // would make those plugins invisible rather than merely misnamed.
      expect(readManifestSection({ openclaw: { extensions: ["./a.js"] } })).toEqual({
        extensions: ["./a.js"],
      });
      expect(readManifestSection({ clawdbot: { extensions: ["./a.js"] } })).toEqual({
        extensions: ["./a.js"],
      });
    });

    it("prefers the current key over a legacy one", () => {
      expect(
        readManifestSection({
          clawdbot: { id: "oldest" },
          granted: { id: "current" },
          openclaw: { id: "old" },
        }),
      ).toEqual({ id: "current" });
    });

    it("returns undefined for absent, null, and non-object sources", () => {
      expect(readManifestSection({ name: "no-manifest" })).toBeUndefined();
      expect(readManifestSection({ granted: null })).toBeUndefined();
      expect(readManifestSection(undefined)).toBeUndefined();
      expect(readManifestSection("granted")).toBeUndefined();
    });
  });
});
