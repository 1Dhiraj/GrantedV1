import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectEnvVarNames,
  isCountedSourcePath,
  main,
} from "../../scripts/check-env-var-count.mts";
import { withEnv } from "../../src/test-utils/env.js";
import { useAutoCleanupTempDirTracker } from "../helpers/temp-dir.js";

const tempDirs = useAutoCleanupTempDirTracker(afterEach);

function createRepo(files: Record<string, string> = {}) {
  const root = tempDirs.make("openclaw-env-count-");
  const git = (...args: string[]) =>
    execFileSync(
      "git",
      ["-c", "user.name=OpenClaw", "-c", "user.email=test@openclaw.local", ...args],
      { cwd: root, stdio: "ignore" },
    );
  const write = (file: string, source: string) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), source);
  };
  git("init");
  for (const [file, source] of Object.entries(files)) {
    write(file, source);
  }
  return { root, git, write };
}

describe("check-env-var-count", () => {
  it("counts production source and excludes tests and QA Lab", () => {
    expect(isCountedSourcePath("src/config/paths.ts")).toBe(true);
    expect(isCountedSourcePath("packages/api/src/index.ts")).toBe(true);
    expect(isCountedSourcePath("extensions/demo/src/index.ts")).toBe(true);
    expect(isCountedSourcePath("src/config/paths.test.ts")).toBe(false);
    expect(isCountedSourcePath("extensions/qa-lab/src/index.ts")).toBe(false);
  });

  it("keeps an empty index separate from untracked worktree sources", () => {
    const { root, write } = createRepo();
    expect(collectEnvVarNames(root, { staged: true })).toEqual([]);
    write("src/runtime.ts", "GRANTED_UNTRACKED");
    expect(collectEnvVarNames(root, { staged: true })).toEqual([]);
    expect(collectEnvVarNames(root)).toEqual(["GRANTED_UNTRACKED"]);
  });

  it("collects distinct names from the whole selected snapshot without crossing file boundaries", () => {
    const { root, git, write } = createRepo({
      ".gitignore": "src/ignored.ts\n",
      "src/partial.ts": "GRANTED_HEAD",
      "src/modified.ts": "GRANTED_OLD",
      "src/removed.ts": "GRANTED_REMOVED",
      "src/gone.ts": "GRANTED_GONE",
      "src/empty.ts": "",
      "src/boundary-a.ts": "GRANTED_",
      "src/boundary-b.ts": "BOUNDARY_TRAP",
      "src/unchanged.ts": "é 🦞 東京\nGRANTED_SHARED\0GRANTED_UNICODE",
      "packages/api/index.mts": "GRANTED_SHARED GRANTED_SHARED",
      "extensions/demo/index.cjs": "GRANTED_PLUGIN",
      "src/runtime.test.ts": "GRANTED_EXCLUDED",
      "src/__tests__/index.ts": "GRANTED_EXCLUDED",
      "packages/api/test/index.ts": "GRANTED_EXCLUDED",
      "extensions/demo/index.spec.ts": "GRANTED_EXCLUDED",
      "extensions/qa-lab/index.ts": "GRANTED_EXCLUDED",
      "extensions/test-support/index.ts": "GRANTED_EXCLUDED",
      "src/runtime.json": "GRANTED_EXCLUDED",
      "ui/src/runtime.ts": "GRANTED_EXCLUDED",
    });
    git("add", ".");
    git("commit", "-m", "base");
    write("src/partial.ts", "GRANTED_INDEX");
    write("src/modified.ts", "GRANTED_MODIFIED");
    write("src/added.ts", "GRANTED_ADDED");
    git("add", ".");
    write("src/partial.ts", "GRANTED_WORKTREE");
    write("src/added.ts", "GRANTED_UNSTAGED_ADDITION");
    git("rm", "--cached", "src/removed.ts");
    fs.rmSync(path.join(root, "src/gone.ts"));
    write("src/untracked.ts", "GRANTED_UNTRACKED");
    write("src/ignored.ts", "GRANTED_IGNORED");

    const shared = ["GRANTED_MODIFIED", "GRANTED_PLUGIN", "GRANTED_SHARED", "GRANTED_UNICODE"];
    expect(collectEnvVarNames(root, { staged: true })).toEqual(
      [...shared, "GRANTED_ADDED", "GRANTED_GONE", "GRANTED_INDEX"].toSorted(),
    );
    expect(collectEnvVarNames(root)).toEqual(
      [
        ...shared,
        "GRANTED_REMOVED",
        "GRANTED_UNSTAGED_ADDITION",
        "GRANTED_UNTRACKED",
        "GRANTED_WORKTREE",
      ].toSorted(),
    );
  });

  it("uses a constant number of Git processes as the staged source set grows", () => {
    const counts = [8, 16].map((fileCount) => {
      const names = Array.from({ length: fileCount }, (_, index) => `GRANTED_N${index}`);
      const { root, git } = createRepo(
        Object.fromEntries(names.map((name, index) => [`src/file-${index}.ts`, name])),
      );
      git("add", ".");
      const traceFile = path.join(root, "git-trace.jsonl");
      const collected = withEnv({ GIT_TRACE2_EVENT: traceFile }, () =>
        collectEnvVarNames(root, { staged: true }),
      );
      expect(collected).toEqual(names.toSorted());
      return fs
        .readFileSync(traceFile, "utf8")
        .trim()
        .split("\n")
        .filter((line) => JSON.parse(line).event === "start").length;
    });
    expect(Math.min(...counts)).toBeGreaterThan(0);
    expect(Math.max(...counts)).toBeLessThanOrEqual(2);
    expect(new Set(counts).size).toBe(1);
  });

  it.skipIf(process.platform === "win32")("preserves valid unusual staged filenames", () => {
    const { root, git } = createRepo({
      "src/space name.ts": "GRANTED_SPACE",
      "packages/api/tab\tname.ts": "GRANTED_TAB",
      "extensions/demo/newline\nname.ts": "GRANTED_NEWLINE",
      "src/conflict blob 0\n\nx blob 0\n\nx blob 0\n\n.ts": "GRANTED_HEADER",
    });
    git("add", ".");
    expect(collectEnvVarNames(root, { staged: true })).toEqual([
      "GRANTED_HEADER",
      "GRANTED_NEWLINE",
      "GRANTED_SPACE",
      "GRANTED_TAB",
    ]);
  });

  it.each([
    "src/conflict.ts",
    ...(process.platform === "win32" ? [] : ["src/conflict blob 0\n\nx blob 0\n\nx blob 0\n\n.ts"]),
  ])("rejects an unresolved stage-zero source: %s", (file) => {
    const { root } = createRepo({ [file]: "GRANTED_WORKTREE" });
    const oid = execFileSync("git", ["hash-object", "-w", "--stdin"], {
      cwd: root,
      input: "GRANTED_CONFLICT",
      encoding: "utf8",
    }).trim();
    execFileSync("git", ["update-index", "-z", "--index-info"], {
      cwd: root,
      input: [1, 2, 3].map((stage) => `100644 ${oid} ${stage}\t${file}\0`).join(""),
    });
    expect(() => collectEnvVarNames(root, { staged: true })).toThrow();
  });

  it("fails closed when the base ref cannot be resolved", () => {
    const { root } = createRepo({ "config/env-var-count-budget.txt": "0\n" });
    expect(() => main(["--base", "missing"], root)).toThrow(/Could not resolve/u);
  });

  it("still checks the budget when the base shares no reachable ancestor", () => {
    // Shallow clones and grafted agent checkouts resolve the base but truncate its history.
    const { root, git, write } = createRepo({
      "config/env-var-count-budget.txt": "1\n",
      "src/runtime.ts": "process.env.GRANTED_ONLY;\n",
    });
    git("add", ".");
    git("commit", "-m", "detached base");
    // Name the base explicitly; init.defaultBranch varies by environment.
    git("branch", "-M", "severed-base");
    git("checkout", "--orphan", "severed");
    git("add", ".");
    git("commit", "-m", "severed history");
    expect(() => main(["--base", "severed-base"], root)).not.toThrow();

    write("src/runtime.ts", "process.env.GRANTED_ONE; process.env.GRANTED_TWO;\n");
    expect(() => main(["--base", "severed-base"], root)).toThrow(/exceeds budget/u);
  });

  it("compares against the fork budget when the base branch later shrinks", () => {
    const { root, git, write } = createRepo({
      "config/env-var-count-budget.txt": "2\n",
      "src/runtime.ts": "process.env.GRANTED_ONE; process.env.GRANTED_TWO;\n",
    });
    git("add", ".");
    git("commit", "-m", "base");
    git("branch", "release");
    write("config/env-var-count-budget.txt", "1\n");
    write("src/runtime.ts", "process.env.GRANTED_ONE;\n");
    git("add", ".");
    git("commit", "-m", "shrink main");
    git("branch", "moving-main");
    git("checkout", "release");
    expect(() => main(["--base", "moving-main"], root)).not.toThrow();
  });

  describe.each([false, true])("budget enforcement with staged=%s", (staged) => {
    it.each([
      { name: "exact count", base: 2, budget: 2, count: 2, error: undefined },
      { name: "count growth", base: 2, budget: 2, count: 3, error: /exceeds budget/u },
      { name: "stale headroom", base: 2, budget: 2, count: 1, error: /is below budget/u },
      {
        name: "retired 501 to 502 increase",
        base: 501,
        budget: 502,
        count: 502,
        error: /budget grew/u,
      },
      {
        name: "retired 502 to 503 increase",
        base: 502,
        budget: 503,
        count: 503,
        error: /budget grew/u,
      },
    ])("checks $name", ({ base, budget, count, error }) => {
      const { root, git, write } = createRepo({
        "config/env-var-count-budget.txt": `${base}\n`,
        "src/runtime.ts": Array.from({ length: base }, (_, index) => `GRANTED_BASE_${index}`).join(
          "\n",
        ),
      });
      git("add", ".");
      git("commit", "-m", "base");
      write("config/env-var-count-budget.txt", `${budget}\n`);
      write(
        "src/runtime.ts",
        Array.from({ length: count }, (_, index) => `GRANTED_NEXT_${index}`).join("\n"),
      );
      if (staged) {
        git("add", ".");
        write("config/env-var-count-budget.txt", "0\n");
        write("src/runtime.ts", "");
      }
      const run = () => main([...(staged ? ["--staged"] : []), "--base", "HEAD"], root);
      if (error) {
        expect(run).toThrow(error);
      } else {
        expect(run()).toBe(count);
      }
    });
  });
});
