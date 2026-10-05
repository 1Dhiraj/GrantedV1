import fs from "node:fs/promises";
import path from "node:path";
import { getToolParamsRecord } from "./agent-tools.params.js";
import type { AnyAgentTool } from "./agent-tools.types.js";

const MAX_DIRECTORY_LISTING_ENTRIES = 300;

const DIRECTORY_LISTING_HINT = "A directory path returns its listing (folders end with /).";

/**
 * Lets a host read tool answer a directory path with a listing.
 *
 * The agent has no separate list tool, so reading a folder was a dead end: the
 * reader rejects directories and the only other way to see a folder's contents
 * is a shell command, which may need approval. This must wrap the base reader
 * *inside* any workspace guard, so a workspace-only policy still decides which
 * folders can be listed. Sandboxed readers must not use it: it stats host paths.
 */
export function wrapReadToolWithDirectoryListing(tool: AnyAgentTool, cwd: string): AnyAgentTool {
  return {
    ...tool,
    description: tool.description
      ? `${tool.description} ${DIRECTORY_LISTING_HINT}`
      : DIRECTORY_LISTING_HINT,
    execute: async (toolCallId, args, signal, onUpdate) => {
      const requested = getToolParamsRecord(args)?.path;
      if (typeof requested === "string" && requested.trim()) {
        const listing = await readDirectoryListing(path.resolve(cwd, requested));
        if (listing) {
          return listing;
        }
      }
      return tool.execute(toolCallId, args, signal, onUpdate);
    },
  };
}

async function readDirectoryListing(
  directory: string,
): Promise<Awaited<ReturnType<AnyAgentTool["execute"]>> | null> {
  let entries: import("node:fs").Dirent[];
  try {
    if (!(await fs.stat(directory)).isDirectory()) {
      return null;
    }
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    // Missing or unreadable: let the reader report the error it normally would.
    return null;
  }
  entries.sort((left, right) => {
    if (left.isDirectory() !== right.isDirectory()) {
      return left.isDirectory() ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });
  const shown = entries.slice(0, MAX_DIRECTORY_LISTING_ENTRIES);
  const lines = shown.map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name));
  const hidden = entries.length - shown.length;
  const text =
    entries.length === 0
      ? `Directory ${directory} is empty.`
      : `Directory ${directory} (${entries.length} entries):\n${lines.join("\n")}${
          hidden > 0 ? `\n[${hidden} more entries not shown]` : ""
        }`;
  return {
    content: [{ type: "text", text }],
    details: { directory: true, path: directory, entries: entries.length },
  };
}
