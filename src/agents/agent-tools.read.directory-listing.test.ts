import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAutoCleanupTempDirTracker } from "../../test/helpers/temp-dir.js";
import "./test-helpers/fast-coding-tools.js";
import "./test-helpers/fast-granted-tools.js";
import { createOpenClawCodingTools } from "./agent-tools.js";
import { wrapReadToolWithDirectoryListing } from "./agent-tools.read.directory-listing.js";
import type { AnyAgentTool } from "./agent-tools.types.js";
import { expectReadWriteEditTools, getTextContent } from "./test-helpers/agent-tools-fs-helpers.js";

const tempDirs = useAutoCleanupTempDirTracker(afterEach);

function createBaseReadTool() {
  const execute = vi.fn(async () => ({ content: [{ type: "text", text: "file contents" }] }));
  const tool = {
    name: "read",
    description: "Read a file",
    inputSchema: { type: "object", properties: {} },
    execute,
  } as unknown as AnyAgentTool;
  return { execute, tool };
}

async function makeWorkspace(): Promise<string> {
  const root = tempDirs.make("granted-read-dir-");
  await fs.mkdir(path.join(root, "jobs", "archive"), { recursive: true });
  await fs.writeFile(path.join(root, "jobs", "b-task.md"), "- [ ] step", "utf8");
  await fs.writeFile(path.join(root, "jobs", "a-task.md"), "- [x] step", "utf8");
  await fs.writeFile(path.join(root, "note.txt"), "hello", "utf8");
  return root;
}

describe("wrapReadToolWithDirectoryListing", () => {
  it("lists a directory, folders first and sorted", async () => {
    const root = await makeWorkspace();
    const { execute, tool } = createBaseReadTool();

    const result = await wrapReadToolWithDirectoryListing(tool, root).execute("tc1", {
      path: path.join(root, "jobs"),
    });

    expect(execute).not.toHaveBeenCalled();
    const text = getTextContent(result as never);
    expect(text).toContain("3 entries");
    expect(text.split("\n").slice(1)).toEqual(["archive/", "a-task.md", "b-task.md"]);
    expect(result.details).toMatchObject({ directory: true, entries: 3 });
  });

  it("resolves a relative directory against the working directory", async () => {
    const root = await makeWorkspace();
    const { execute, tool } = createBaseReadTool();

    const result = await wrapReadToolWithDirectoryListing(tool, root).execute("tc2", {
      path: "jobs",
    });

    expect(execute).not.toHaveBeenCalled();
    expect(getTextContent(result as never)).toContain("a-task.md");
  });

  it("reports an empty directory", async () => {
    const root = await makeWorkspace();
    const { tool } = createBaseReadTool();

    const result = await wrapReadToolWithDirectoryListing(tool, root).execute("tc3", {
      path: path.join(root, "jobs", "archive"),
    });

    expect(getTextContent(result as never)).toContain("is empty");
  });

  it("leaves files and missing paths to the reader", async () => {
    const root = await makeWorkspace();
    const { execute, tool } = createBaseReadTool();
    const wrapped = wrapReadToolWithDirectoryListing(tool, root);

    await wrapped.execute("tc4", { path: path.join(root, "note.txt") });
    await wrapped.execute("tc5", { path: path.join(root, "missing.txt") });

    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("tells the model a directory path returns a listing", () => {
    const { tool } = createBaseReadTool();

    expect(wrapReadToolWithDirectoryListing(tool, "/unused").description).toContain(
      "directory path returns its listing",
    );
  });
});

describe("host read tool directory listing", () => {
  it.each([false, true])(
    "lists a workspace folder with workspaceOnly=%s",
    async (workspaceOnly) => {
      const workspaceDir = await makeWorkspace();
      const { readTool } = expectReadWriteEditTools(
        createOpenClawCodingTools({ workspaceDir, config: { tools: { fs: { workspaceOnly } } } }),
      );

      const text = getTextContent(await readTool.execute("host-list", { path: "jobs" }));

      expect(text).toContain("archive/");
      expect(text).toContain("a-task.md");
    },
  );

  it("still refuses to list a folder outside the workspace when workspaceOnly is set", async () => {
    const workspaceDir = await makeWorkspace();
    const outside = tempDirs.make("granted-read-dir-outside-");
    await fs.writeFile(path.join(outside, "private.txt"), "not yours", "utf8");
    const { readTool } = expectReadWriteEditTools(
      createOpenClawCodingTools({
        workspaceDir,
        config: { tools: { fs: { workspaceOnly: true } } },
      }),
    );

    await expect(readTool.execute("host-escape", { path: outside })).rejects.toThrow(
      /Path escapes (workspace|sandbox) root/,
    );
  });
});
