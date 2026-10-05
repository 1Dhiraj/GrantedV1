// Prompt limit tests cover the shared skills-catalog budget and its droppable notes.
import { describe, expect, it } from "vitest";
import type { Skill } from "./skill-contract.js";
import { formatSkillsForPromptBounded } from "./skill-prompt-limits.js";

function skill(name: string): Skill {
  return {
    name,
    description: `${name} description`,
    filePath: `/root/skills/${name}/SKILL.md`,
    baseDir: `/root/skills/${name}`,
    source: "openclaw-workspace",
  } as Skill;
}

describe("skills prompt search hint", () => {
  it("puts the hint outside the catalog block so catalog parsers are unaffected", () => {
    const prompt = formatSkillsForPromptBounded({
      skills: [skill("listed")],
      searchableNote: "7 more skills are installed but not listed here, under /root/skills.",
    });

    const hintIndex = prompt.indexOf("7 more skills");
    const catalogIndex = prompt.indexOf("<available_skills>");
    expect(hintIndex).toBeGreaterThanOrEqual(0);
    expect(hintIndex).toBeLessThan(catalogIndex);
    expect(prompt).toContain("<name>listed</name>");
  });

  it("drops the hint before it will shorten or truncate the catalog", () => {
    const skills = [skill("alpha"), skill("beta")];
    const withoutHint = formatSkillsForPromptBounded({ skills });

    const prompt = formatSkillsForPromptBounded({
      skills,
      searchableNote: "x".repeat(200),
      maxSkillsPromptChars: withoutHint.length + 10,
    });

    // The catalog is the contract; the hint is context.
    expect(prompt).not.toContain("x".repeat(200));
    expect(prompt).toContain("<name>alpha</name>");
    expect(prompt).toContain("<name>beta</name>");
  });

  it("keeps the catalog unchanged when no hint is supplied", () => {
    const skills = [skill("alpha")];

    expect(formatSkillsForPromptBounded({ skills })).toContain("<name>alpha</name>");
  });
});
