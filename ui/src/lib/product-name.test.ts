// The product display name exists in two places because the UI bundle cannot
// import from src/. This keeps the copies honest.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PRODUCT_DISPLAY_NAME } from "./product-name.js";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

function readServerDisplayName(): string {
  const source = fs.readFileSync(path.join(repoRoot, "src/compat/legacy-names.ts"), "utf8");
  // Read the literal out of the source rather than importing it: crossing the
  // ui -> src boundary is exactly what this file exists to avoid.
  const match = source.match(/PRODUCT_DISPLAY_NAME\s*=\s*"([^"]+)"/u);
  return match?.[1] ?? "";
}

describe("product display name", () => {
  it("is the product's own name, not the upstream one", () => {
    expect(PRODUCT_DISPLAY_NAME).toBe("Granted");
  });

  it("matches the server-side constant so the two cannot drift", () => {
    expect(readServerDisplayName()).toBe(PRODUCT_DISPLAY_NAME);
  });

  it("leaves the lowercase identifier alone", () => {
    // `openclaw` stays the manifest key, import path, and CLI binary until the
    // full rename at cut-over; renaming it would break installed plugins.
    const source = fs.readFileSync(path.join(repoRoot, "src/compat/legacy-names.ts"), "utf8");
    expect(source).toContain('const PROJECT_NAME = "openclaw"');
  });
});
