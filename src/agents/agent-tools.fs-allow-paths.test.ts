import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { useAutoCleanupTempDirTracker } from "../../test/helpers/temp-dir.js";
import "./test-helpers/fast-coding-tools.js";
import "./test-helpers/fast-granted-tools.js";
import { createOpenClawCodingTools } from "./agent-tools.js";
import { expectReadWriteEditTools, getTextContent } from "./test-helpers/agent-tools-fs-helpers.js";
import { normalizeFsAllowPaths, resolveToolFsConfig } from "./tool-fs-policy.js";

const tempDirs = useAutoCleanupTempDirTracker(afterEach);

function makeLayout() {
  const base = tempDirs.make("granted-allowpaths-");
  const layout = {
    workspaceDir: path.join(base, "workspace"),
    allowedDir: path.join(base, "allowed"),
    forbiddenFile: path.join(base, "forbidden.txt"),
  };
  return fs
    .mkdir(layout.workspaceDir)
    .then(() => fs.mkdir(layout.allowedDir))
    .then(() => layout);
}

function toolsFor(workspaceDir: string, allowedDir: string) {
  return expectReadWriteEditTools(
    createOpenClawCodingTools({
      workspaceDir,
      config: { tools: { fs: { workspaceOnly: true, allowPaths: [allowedDir] } } },
    }),
  );
}

describe("workspace-only file tools with tools.fs.allowPaths", () => {
  it("writes, reads, and edits inside an allowed folder", async () => {
    const { workspaceDir, allowedDir } = await makeLayout();
    const { readTool, writeTool, editTool } = toolsFor(workspaceDir, allowedDir);
    const target = path.join(allowedDir, "notes", "plan.txt");

    await writeTool.execute("ap-write", { path: target, content: "draft" });
    await editTool.execute("ap-edit", {
      path: target,
      edits: [{ oldText: "draft", newText: "final" }],
    });

    await expect(fs.readFile(target, "utf8")).resolves.toBe("final");
    expect(getTextContent(await readTool.execute("ap-read", { path: target }))).toContain("final");
  });

  it("keeps the workspace itself usable", async () => {
    const { workspaceDir, allowedDir } = await makeLayout();
    const { writeTool } = toolsFor(workspaceDir, allowedDir);

    await writeTool.execute("ap-ws", { path: "inside.txt", content: "workspace" });

    await expect(fs.readFile(path.join(workspaceDir, "inside.txt"), "utf8")).resolves.toBe(
      "workspace",
    );
  });

  it("accepts a relative path that lands in an allowed folder", async () => {
    const { workspaceDir, allowedDir } = await makeLayout();
    const { writeTool } = toolsFor(workspaceDir, allowedDir);

    await writeTool.execute("ap-rel", {
      path: path.join("..", "allowed", "via-relative.txt"),
      content: "relative",
    });

    await expect(fs.readFile(path.join(allowedDir, "via-relative.txt"), "utf8")).resolves.toBe(
      "relative",
    );
  });

  it("still blocks paths outside the workspace and every allowed folder", async () => {
    const { workspaceDir, allowedDir, forbiddenFile } = await makeLayout();
    const { readTool, writeTool } = toolsFor(workspaceDir, allowedDir);
    await fs.writeFile(forbiddenFile, "secret", "utf8");

    await expect(
      writeTool.execute("ap-block-write", { path: forbiddenFile, content: "nope" }),
    ).rejects.toThrow(/Path escapes (workspace|sandbox) root/);
    await expect(readTool.execute("ap-block-read", { path: forbiddenFile })).rejects.toThrow(
      /Path escapes (workspace|sandbox) root/,
    );
    await expect(fs.readFile(forbiddenFile, "utf8")).resolves.toBe("secret");
  });
});

describe("normalizeFsAllowPaths", () => {
  it("expands ~ to the home directory", () => {
    expect(normalizeFsAllowPaths(["~"])).toEqual([path.resolve(os.homedir())]);
    expect(normalizeFsAllowPaths(["~/projects"])).toEqual([path.resolve(os.homedir(), "projects")]);
  });

  it("drops relative and blank entries instead of guessing a base", () => {
    expect(normalizeFsAllowPaths(["relative/dir", "", "   "])).toEqual([]);
  });

  it("resolves and de-duplicates absolute entries", () => {
    const absolute = path.join(os.tmpdir(), "granted-allowed");
    expect(normalizeFsAllowPaths([absolute, `${absolute}${path.sep}`])).toEqual([
      path.resolve(absolute),
    ]);
  });
});

describe("resolveToolFsConfig allowPaths", () => {
  it("adds agent folders to the global list", () => {
    const globalDir = path.resolve(os.tmpdir(), "global-dir");
    const agentDir = path.resolve(os.tmpdir(), "agent-dir");
    const cfg = {
      tools: { fs: { workspaceOnly: true, allowPaths: [globalDir] } },
      agents: { list: [{ id: "main", tools: { fs: { allowPaths: [agentDir] } } }] },
    } as never;

    expect(resolveToolFsConfig({ cfg, agentId: "main" }).allowPaths).toEqual([globalDir, agentDir]);
  });

  it("omits allowPaths when none are configured", () => {
    const cfg = { tools: { fs: { workspaceOnly: true } } } as never;

    expect(resolveToolFsConfig({ cfg }).allowPaths).toBeUndefined();
  });
});
