// Workspace skill prompt helpers render bounded catalogs and reusable snapshots.
import path from "node:path";
import type { GrantedConfig } from "../../config/types.granted.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import type { PluginMetadataSnapshot } from "../../plugins/plugin-metadata-snapshot.types.js";
import { resolveEffectiveAgentSkillsLimits } from "../discovery/agent-filter.js";
import {
  filterPromptVisibleSkillEntries,
  filterSearchListedSkillEntries,
} from "../discovery/skill-index.js";
import type { SkillEligibilityContext, SkillEntry, SkillSnapshot } from "../types.js";
import { WORKSPACE_SKILLS_PROMPT_FORMAT_VERSION } from "../types.js";
import { hasUnavailableSkillSecretOwners, isSkillSecretOwnerUnavailable } from "./config.js";
import { resolveSkillKey } from "./frontmatter.js";
import { escapeSkillXml, type Skill } from "./skill-contract.js";
import { compactPromptSkills } from "./skill-paths.js";
import { prepareSkillsForPrompt } from "./skill-prompt-limits.js";
import { resolveWorkspaceSkillPromptEntries } from "./workspace-skill-loader.js";

const skillsLogger = createSubsystemLogger("skills");

type WorkspaceSkillBuildOptions = {
  config?: GrantedConfig;
  managedSkillsDir?: string;
  bundledSkillsDir?: string;
  entries?: SkillEntry[];
  agentId?: string;
  skillFilter?: string[];
  skillOverrides?: Record<string, boolean>;
  eligibility?: SkillEligibilityContext;
  preserveEntryOrder?: boolean;
  pluginMetadataSnapshot?: PluginMetadataSnapshot;
};

const MAX_LISTED_SEARCH_ROOTS = 2;

/**
 * One line for skills the model may use that the catalog deliberately omits.
 *
 * Every catalog entry costs tokens on every turn, so a large library cannot be
 * listed up front. Naming the count and the directory lets the model find the
 * rest with the search tools it already has instead of guessing that they exist.
 */
function buildSearchableSkillsNote(entries: readonly SkillEntry[]): string | undefined {
  const searchable = filterSearchListedSkillEntries(entries);
  if (searchable.length === 0) {
    return undefined;
  }
  const roots = [
    ...new Set(searchable.map((entry) => path.dirname(path.dirname(entry.skill.filePath)))),
  ];
  const listedRoots = roots.slice(0, MAX_LISTED_SEARCH_ROOTS).join(", ");
  const remainder = roots.length > MAX_LISTED_SEARCH_ROOTS ? " and other skill roots" : "";
  const plural = searchable.length === 1 ? "skill" : "skills";
  return (
    `${searchable.length} more ${plural} are installed but not listed here, under ${listedRoots}${remainder}. ` +
    "When nothing above fits, search those SKILL.md files for a keyword and read the best match."
  );
}

function resolveWorkspaceSkillPromptState(
  workspaceDir: string,
  opts?: WorkspaceSkillBuildOptions,
): { eligible: SkillEntry[]; prompt: string; resolvedSkills: Skill[]; skillFilter?: string[] } {
  const { eligible, skillFilter } = resolveWorkspaceSkillPromptEntries(workspaceDir, opts);
  const promptEntries = filterPromptVisibleSkillEntries(eligible);
  const remoteNote = opts?.eligibility?.remote?.note?.trim();
  const resolvedSkills = promptEntries.map((entry) => entry.skill);
  const limits = opts?.config?.skills?.limits;
  const agentLimits = resolveEffectiveAgentSkillsLimits(opts?.config, opts?.agentId);
  const searchableNote = buildSearchableSkillsNote(eligible);
  const prepared = prepareSkillsForPrompt({
    skills: compactPromptSkills(resolvedSkills),
    maxSkillsInPrompt: limits?.maxSkillsInPrompt,
    maxSkillsPromptChars: agentLimits?.maxSkillsPromptChars ?? limits?.maxSkillsPromptChars,
    remoteNote,
    ...(searchableNote ? { searchableNote } : {}),
    preserveOrder: opts?.preserveEntryOrder,
  });
  const byName = new Map(resolvedSkills.map((skill) => [skill.name, skill]));
  return {
    eligible,
    prompt: prepared.prompt,
    resolvedSkills: prepared.skills.map((skill) => byName.get(skill.name)!),
    skillFilter,
  };
}

export function buildSkillSnapshot(
  workspaceDir: string,
  opts?: WorkspaceSkillBuildOptions & { snapshotVersion?: number },
): SkillSnapshot {
  const { eligible, prompt, resolvedSkills, skillFilter } = resolveWorkspaceSkillPromptState(
    workspaceDir,
    opts,
  );
  return {
    prompt,
    skills: eligible.map((entry) => ({
      name: entry.skill.name,
      skillKey: resolveSkillKey(entry.skill, entry),
      primaryEnv: entry.metadata?.primaryEnv,
      requiredEnv: entry.metadata?.requires?.env?.slice(),
    })),
    ...(skillFilter === undefined ? {} : { skillFilter }),
    ...(opts?.skillOverrides ? { skillOverrides: opts.skillOverrides } : {}),
    ...(opts?.eligibility?.nodeSkills
      ? { nodeSkillsEligibility: opts.eligibility.nodeSkills }
      : {}),
    resolvedSkills,
    version: opts?.snapshotVersion,
    promptFormatVersion: WORKSPACE_SKILLS_PROMPT_FORMAT_VERSION,
  };
}

type ResolveSkillsPromptParams = {
  skillsSnapshot?: SkillSnapshot;
  entries?: SkillEntry[];
  config?: GrantedConfig;
  workspaceDir: string;
  agentId?: string;
  eligibility?: SkillEligibilityContext;
  loadEntries?: () => SkillEntry[];
  preserveEntryOrder?: boolean;
};

function buildSkillsPromptFromEntries(
  params: ResolveSkillsPromptParams,
  entries: SkillEntry[] | undefined,
): string {
  if (!entries || entries.length === 0) {
    return "";
  }
  const prompt = buildSkillSnapshot(params.workspaceDir, {
    entries,
    config: params.config,
    agentId: params.agentId,
    eligibility: params.eligibility,
    preserveEntryOrder: params.preserveEntryOrder,
  }).prompt;
  return prompt.trim() ? prompt : "";
}

function rebuildAfterUnsafeSnapshot(
  params: ResolveSkillsPromptParams,
  reason: "unsupported-prompt-format" | "legacy-skill-identity" | "invalid-catalog-structure",
): string {
  skillsLogger.warn(
    "Cached skills prompt could not be safely filtered; rebuilding from current skill entries.",
    { reason },
  );
  const sourceEntries = params.entries ?? params.loadEntries?.();
  const entries = sourceEntries?.filter(
    (entry) => !isSkillSecretOwnerUnavailable(resolveSkillKey(entry.skill, entry)),
  );
  return buildSkillsPromptFromEntries(params, entries);
}

export function resolveSkillsPrompt(params: ResolveSkillsPromptParams): string {
  const snapshotPrompt = params.skillsSnapshot?.prompt?.trim();
  if (params.skillsSnapshot && !snapshotPrompt) {
    return "";
  }
  const snapshotHasLegacySkillIdentity = params.skillsSnapshot?.skills.some(
    (skill) => !skill.skillKey,
  );
  if (snapshotPrompt) {
    const snapshotHasUnavailableSkill =
      params.skillsSnapshot?.skills.some((skill) =>
        isSkillSecretOwnerUnavailable(skill.skillKey ?? skill.name),
      ) ||
      (snapshotHasLegacySkillIdentity && hasUnavailableSkillSecretOwners());
    if (
      snapshotHasUnavailableSkill &&
      params.skillsSnapshot?.promptFormatVersion !== WORKSPACE_SKILLS_PROMPT_FORMAT_VERSION
    ) {
      return rebuildAfterUnsafeSnapshot(params, "unsupported-prompt-format");
    }
    if (snapshotHasLegacySkillIdentity && hasUnavailableSkillSecretOwners()) {
      return rebuildAfterUnsafeSnapshot(params, "legacy-skill-identity");
    }
    const unavailableNames = new Set(
      params.skillsSnapshot?.skills
        .filter(
          (skill) => skill.skillKey !== undefined && isSkillSecretOwnerUnavailable(skill.skillKey),
        )
        .map((skill) => escapeSkillXml(skill.name)),
    );
    if (unavailableNames.size === 0) {
      return snapshotPrompt;
    }
    const catalogOpen = "<available_skills>";
    const catalogClose = "</available_skills>";
    const catalogStart = snapshotPrompt.indexOf(catalogOpen);
    const catalogEnd = snapshotPrompt.indexOf(catalogClose, catalogStart + catalogOpen.length);
    if (
      catalogStart < 0 ||
      catalogEnd < 0 ||
      snapshotPrompt.includes(catalogOpen, catalogStart + catalogOpen.length) ||
      snapshotPrompt.includes(catalogClose, catalogEnd + catalogClose.length)
    ) {
      return rebuildAfterUnsafeSnapshot(params, "invalid-catalog-structure");
    }
    const bodyStart = catalogStart + catalogOpen.length;
    const catalogBody = snapshotPrompt.slice(bodyStart, catalogEnd);
    const blockPattern = /\n[ ]{2}<skill>\n[\s\S]*?\n[ ]{2}<\/skill>/g;
    let cursor = 0;
    let filteredBody = "";
    for (const match of catalogBody.matchAll(blockPattern)) {
      const gap = catalogBody.slice(cursor, match.index);
      const block = match[0];
      const name = /^[ ]{4}<name>(.*)<\/name>$/m.exec(block)?.[1];
      if (gap.trim() || !name) {
        return rebuildAfterUnsafeSnapshot(params, "invalid-catalog-structure");
      }
      filteredBody += gap;
      if (!unavailableNames.has(name)) {
        filteredBody += block;
      }
      cursor = (match.index ?? 0) + block.length;
    }
    const tail = catalogBody.slice(cursor);
    if (tail.trim()) {
      return rebuildAfterUnsafeSnapshot(params, "invalid-catalog-structure");
    }
    return `${snapshotPrompt.slice(0, bodyStart)}${filteredBody}${tail}${snapshotPrompt.slice(catalogEnd)}`.trim();
  }
  return buildSkillsPromptFromEntries(params, params.entries);
}
