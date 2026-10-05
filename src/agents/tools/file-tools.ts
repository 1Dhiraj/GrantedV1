/**
 * Direct file read/write/edit, so changing a file is not a shell command.
 *
 * Until now every file edit went through `exec`: a heredoc, Set-Content, a
 * Python one-liner. That puts a shell's quoting rules between the model and the
 * bytes it meant to write, and the shell wins. Backslash escapes collapse, `$`
 * expands, a stray smart quote lands in the file, and nothing reports an error
 * because the command itself succeeded. The content arrives here as a parameter
 * instead, so there is no escaping layer to lose it in.
 *
 * Three rules are carried over from tools that have already been load-bearing
 * elsewhere, each paying for a specific failure:
 *
 * - **Read before you change.** Overwriting a file nobody looked at is how an
 *   agent silently discards work it never knew was there.
 * - **Edit by exact, unique match.** A regex or a line number drifts; an exact
 *   string either matches or the edit fails loudly. Ambiguity is refused rather
 *   than guessed at, because the wrong one of two matches is a silent bug.
 * - **Notice if the file moved under you.** A read is a snapshot. If the file
 *   changed after it was read, the edit is built on a stale picture and is
 *   refused rather than applied blind.
 */
import fs from "node:fs";
import path from "node:path";
import { Type } from "typebox";
import type { AnyAgentTool } from "./common.js";
import { asToolParamsRecord, jsonResult, textResult, ToolInputError } from "./common.js";

/** Refuse to load something that is not a text file into the conversation. */
const MAX_READ_BYTES = 2_000_000;
const DEFAULT_READ_LINES = 2_000;

type ReadRecord = { mtimeMs: number; size: number };

/**
 * What this session has looked at, so an edit can tell "I know this file" from
 * "I am guessing". Keyed by session as well as path: one session reading a file
 * says nothing about what another session knows, and treating it as shared
 * would let an edit inherit a read it never did.
 */
const readsBySession = new Map<string, Map<string, ReadRecord>>();

function recordRead(sessionKey: string, filePath: string, stat: fs.Stats): void {
  let perSession = readsBySession.get(sessionKey);
  if (!perSession) {
    perSession = new Map();
    readsBySession.set(sessionKey, perSession);
  }
  perSession.set(filePath, { mtimeMs: stat.mtimeMs, size: stat.size });
}

function getRead(sessionKey: string, filePath: string): ReadRecord | undefined {
  return readsBySession.get(sessionKey)?.get(filePath);
}

/** Exposed for tests; a long-lived gateway should not grow this map forever. */
export function clearFileReadTracking(sessionKey?: string): void {
  if (sessionKey) {
    readsBySession.delete(sessionKey);
    return;
  }
  readsBySession.clear();
}

function resolveTarget(rawPath: unknown, label: string): string {
  const value = typeof rawPath === "string" ? rawPath.trim() : "";
  if (!value) {
    throw new ToolInputError(`${label} requires a file path`);
  }
  if (!path.isAbsolute(value)) {
    throw new ToolInputError(
      `${label} needs an absolute path; got ${JSON.stringify(value)}. Relative paths resolve against whichever directory the process happens to be in, which is not the one the user is thinking of.`,
    );
  }
  return path.resolve(value);
}

function requireString(params: Record<string, unknown>, key: string, label: string): string {
  const value = params[key];
  if (typeof value !== "string") {
    throw new ToolInputError(`${label} requires ${key} as a string`);
  }
  return value;
}

type FileToolOptions = { agentSessionKey?: string };

function sessionOf(options: FileToolOptions, label: string): string {
  const key = options.agentSessionKey?.trim();
  if (!key) {
    throw new ToolInputError(`${label} requires an agent session`);
  }
  return key;
}

const ReadSchema = Type.Object(
  {
    path: Type.String(),
    offset: Type.Optional(Type.Number()),
    limit: Type.Optional(Type.Number()),
  },
  { additionalProperties: false },
);

export function createFileReadTool(options: FileToolOptions = {}): AnyAgentTool {
  return {
    name: "read_file",
    label: "Read File",
    description:
      "Read a text file from disk. Prefer this over running `cat`/`Get-Content` through exec: it returns the content directly, with line numbers, and records that you have seen the file so edit_file will let you change it. Absolute path required. Reads the first 2000 lines by default; pass offset/limit for a slice of a long file. Reading a file you are about to edit is not optional — edit_file refuses to touch a file this session has not read.",
    parameters: ReadSchema,
    execute: async (_toolCallId, rawArgs) => {
      const sessionKey = sessionOf(options, "read_file");
      const params = asToolParamsRecord(rawArgs);
      const target = resolveTarget(params.path, "read_file");

      let stat: fs.Stats;
      try {
        stat = fs.statSync(target);
      } catch {
        throw new ToolInputError(`no such file: ${target}`);
      }
      if (stat.isDirectory()) {
        throw new ToolInputError(`${target} is a directory, not a file`);
      }
      if (stat.size > MAX_READ_BYTES) {
        throw new ToolInputError(
          `${target} is ${stat.size} bytes, over the ${MAX_READ_BYTES} limit — read a slice with offset/limit, or search it with exec instead of loading it whole.`,
        );
      }

      const content = fs.readFileSync(target, "utf8");
      const lines = content.split("\n");
      const offset = Math.max(0, Number(params.offset ?? 0) || 0);
      const limit = Math.max(1, Number(params.limit ?? DEFAULT_READ_LINES) || DEFAULT_READ_LINES);
      const slice = lines.slice(offset, offset + limit);
      // Numbered so a later edit can be described against what was seen; the
      // numbers are display only and never part of the text edit_file matches.
      const numbered = slice.map((line, index) => `${offset + index + 1}\t${line}`).join("\n");

      recordRead(sessionKey, target, stat);
      const truncated = offset + slice.length < lines.length;
      return textResult(
        truncated
          ? `${numbered}\n\n[showing lines ${offset + 1}-${offset + slice.length} of ${lines.length}; pass offset to continue]`
          : numbered,
        { path: target, totalLines: lines.length, shownLines: slice.length, truncated },
      );
    },
  };
}

const WriteSchema = Type.Object(
  { path: Type.String(), content: Type.String() },
  { additionalProperties: false },
);

export function createFileWriteTool(options: FileToolOptions = {}): AnyAgentTool {
  return {
    name: "write_file",
    label: "Write File",
    description:
      "Create a file, or replace one entirely, with the exact content given. Use this instead of echoing text through exec — content passed here reaches disk byte for byte, where a shell would mangle quotes, backslashes and $ along the way. Absolute path required; parent directories are created. Replacing a file that already exists requires reading it first, so nothing is overwritten unseen. For a change to part of a file, prefer edit_file.",
    parameters: WriteSchema,
    execute: async (_toolCallId, rawArgs) => {
      const sessionKey = sessionOf(options, "write_file");
      const params = asToolParamsRecord(rawArgs);
      const target = resolveTarget(params.path, "write_file");
      const content = requireString(params, "content", "write_file");

      const existing = fs.existsSync(target);
      if (existing) {
        const stat = fs.statSync(target);
        if (stat.isDirectory()) {
          throw new ToolInputError(`${target} is a directory`);
        }
        const seen = getRead(sessionKey, target);
        if (!seen) {
          throw new ToolInputError(
            `${target} already exists and this session has not read it. Read it first — overwriting a file you have not looked at discards whatever was in it, including work you did not know about.`,
          );
        }
        if (seen.mtimeMs !== stat.mtimeMs || seen.size !== stat.size) {
          throw new ToolInputError(
            `${target} changed since you read it. Read it again before replacing it; the version you are about to discard is not the one you saw.`,
          );
        }
      }

      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, "utf8");
      const stat = fs.statSync(target);
      recordRead(sessionKey, target, stat);
      return jsonResult({
        ok: true,
        path: target,
        created: !existing,
        bytes: stat.size,
        lines: content.split("\n").length,
      });
    },
  };
}

const EditSchema = Type.Object(
  {
    path: Type.String(),
    old_string: Type.String(),
    new_string: Type.String(),
    replace_all: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export function createFileEditTool(options: FileToolOptions = {}): AnyAgentTool {
  return {
    name: "edit_file",
    label: "Edit File",
    description:
      "Replace an exact string in a file. old_string must appear exactly once, or the edit is refused — ambiguity is reported rather than resolved by guessing, because changing the wrong one of two matches is a silent bug. Pass replace_all to change every occurrence deliberately. Requires that this session has read the file, and refuses if the file changed since that read. Include enough surrounding context in old_string to make it unique; strip the line-number prefix that read_file adds. Prefer this over sed/Set-Content through exec.",
    parameters: EditSchema,
    execute: async (_toolCallId, rawArgs) => {
      const sessionKey = sessionOf(options, "edit_file");
      const params = asToolParamsRecord(rawArgs);
      const target = resolveTarget(params.path, "edit_file");
      const oldString = requireString(params, "old_string", "edit_file");
      const newString = requireString(params, "new_string", "edit_file");
      const replaceAll = params.replace_all === true;

      if (oldString === newString) {
        throw new ToolInputError("old_string and new_string are identical — nothing to change");
      }
      if (!oldString) {
        throw new ToolInputError(
          "old_string is empty — use write_file to create or replace a whole file",
        );
      }

      let stat: fs.Stats;
      try {
        stat = fs.statSync(target);
      } catch {
        throw new ToolInputError(`no such file: ${target}`);
      }
      const seen = getRead(sessionKey, target);
      if (!seen) {
        throw new ToolInputError(
          `${target} has not been read in this session. Read it first — an edit written from memory of a file is an edit against a file that may not look like that any more.`,
        );
      }
      if (seen.mtimeMs !== stat.mtimeMs || seen.size !== stat.size) {
        throw new ToolInputError(
          `${target} changed since you read it. Read it again and rebuild the edit; applying this one would overwrite whatever changed.`,
        );
      }

      const content = fs.readFileSync(target, "utf8");
      const occurrences = content.split(oldString).length - 1;
      if (occurrences === 0) {
        throw new ToolInputError(
          `old_string was not found in ${target}. It must match the file exactly, including indentation — and without the line-number prefix read_file shows.`,
        );
      }
      if (occurrences > 1 && !replaceAll) {
        throw new ToolInputError(
          `old_string appears ${occurrences} times in ${target}. Add surrounding lines so it is unique, or pass replace_all to change all ${occurrences} on purpose.`,
        );
      }

      const updated = replaceAll
        ? content.split(oldString).join(newString)
        : content.replace(oldString, newString);
      fs.writeFileSync(target, updated, "utf8");
      const after = fs.statSync(target);
      recordRead(sessionKey, target, after);
      return jsonResult({
        ok: true,
        path: target,
        replaced: replaceAll ? occurrences : 1,
        bytes: after.size,
      });
    },
  };
}
