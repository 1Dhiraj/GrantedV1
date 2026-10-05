// Bundled frontmatter tests cover metadata validity for bundled skills.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseSkillFrontmatter } from "./frontmatter.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

describe("bundled skill library frontmatter", () => {
  it("keeps every shipped skill parseable, named after its directory, and described", async () => {
    const skillsDir = path.join(repoRoot, "skills");
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

    expect(directories.length).toBeGreaterThan(0);
    for (const directory of directories) {
      const relativePath = path.join("skills", directory, "SKILL.md");
      const raw = await fs.readFile(path.join(repoRoot, relativePath), "utf8");
      const frontmatter = parseSkillFrontmatter(raw);

      // A skill whose name drifts from its directory loads under the wrong id.
      expect(frontmatter.name, relativePath).toBe(directory);
      expect(frontmatter.description?.trim(), relativePath).toBeTruthy();
    }
  });
});

describe("bundled taskflow skill frontmatter", () => {
  it("keeps the taskflow skills parseable from their shipped files", async () => {
    const skillPaths = [
      "skills/taskflow/SKILL.md",
      "skills/taskflow-inbox-triage/SKILL.md",
    ] as const;

    for (const relativePath of skillPaths) {
      const raw = await fs.readFile(path.join(repoRoot, relativePath), "utf8");
      const frontmatter = parseSkillFrontmatter(raw);

      expect(frontmatter.name, relativePath).toBeTypeOf("string");
      expect(frontmatter.name?.trim(), relativePath).not.toBe("");
      expect(frontmatter.description, relativePath).toBeTypeOf("string");
      expect(frontmatter.description?.trim(), relativePath).not.toBe("");
    }
  });
});
