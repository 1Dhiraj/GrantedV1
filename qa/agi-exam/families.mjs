// AGI exam task families.
//
// The capability suite asks the same 16 questions every run, so once the agent
// passes them the score stops moving and can no longer show progress. A family
// is a task *shape* that builds a fresh instance from a seed: different data,
// names and answers each time, the same skill underneath. Repeating a family
// therefore measures whether the agent got better at the skill, not whether it
// remembered last week's answer.
//
// Every family returns { prompt, check, solve }:
//   prompt  what a user would ask, naming only paths inside the instance dir
//   check   verifies the effect on disk and never reads the agent's reply
//   solve   a reference solution, so the exam can test its own checkers

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Small deterministic PRNG: the same seed always builds the same instance. */
export function rng(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    shuffle: (items) => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

const WORDS = [
  "amber",
  "basil",
  "cedar",
  "delta",
  "ember",
  "fjord",
  "garnet",
  "harbor",
  "indigo",
  "juniper",
  "kestrel",
  "lumen",
  "maple",
  "nectar",
  "onyx",
  "pepper",
  "quartz",
  "raven",
  "saffron",
  "tundra",
  "umber",
  "violet",
  "willow",
  "zephyr",
];

function write(dir, name, text) {
  const file = path.join(dir, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
  return file;
}

function readTrimmed(file) {
  try {
    // Strip a BOM: GUI editors add one and it is not part of the answer.
    return fs.readFileSync(file, "utf8").replace(/^﻿/, "").trim();
  } catch {
    return null;
  }
}

function listTree(dir) {
  const out = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        out.push(path.relative(dir, full).split(path.sep).join("/"));
      }
    }
  };
  walk(dir);
  return out.toSorted();
}

export const families = [
  {
    id: "data.column-total",
    area: "data",
    level: 1,
    make(seed, dir) {
      const r = rng(seed);
      const column = r.pick(["amount", "price", "units", "hours", "weight"]);
      const rows = r.shuffle(WORDS).slice(0, r.int(5, 12));
      const values = rows.map(() => r.int(10, 5000));
      const total = values.reduce((sum, value) => sum + value, 0);
      const csv = write(
        dir,
        "data.csv",
        [`name,${column}`, ...rows.map((name, i) => `${name},${values[i]}`)].join("\n") + "\n",
      );
      const out = path.join(dir, "answer.txt");
      return {
        prompt: `Add up the ${column} column in ${csv} and write only the total to ${out}.`,
        check() {
          const got = readTrimmed(out);
          return {
            ok: got !== null && Number(got.replace(/[,\s]/g, "")) === total,
            evidence: `answer.txt=${JSON.stringify(got)} want ${total}`,
          };
        },
        solve: () => write(dir, "answer.txt", `${total}\n`),
      };
    },
  },
  {
    id: "code.fix-bug",
    area: "code",
    level: 2,
    make(seed, dir) {
      const r = rng(seed);
      const name = `${r.pick(WORDS)}${r.pick(["Score", "Total", "Count", "Limit"])}`;
      // Each bug is a plausible slip; the test is correct and only the source is wrong.
      const bug = r.pick([
        { good: "return a + b;", bad: "return a - b;", call: "(4, 3)", want: 7 },
        { good: "return a * b;", bad: "return a + b;", call: "(4, 3)", want: 12 },
        { good: "return a > b ? a : b;", bad: "return a < b ? a : b;", call: "(4, 9)", want: 9 },
        { good: "return a % b;", bad: "return a / b;", call: "(17, 5)", want: 2 },
      ]);
      const src = (body) => `export function ${name}(a, b) {\n  ${body}\n}\n`;
      write(dir, "lib.mjs", src(bug.bad));
      write(
        dir,
        "test.mjs",
        `import { ${name} } from "./lib.mjs";\n` +
          `const got = ${name}${bug.call};\n` +
          `if (got !== ${bug.want}) { console.error("FAIL: got " + got); process.exit(1); }\n` +
          `console.log("PASS");\n`,
      );
      return {
        prompt: `In ${dir}, "node test.mjs" fails. Find the bug, fix it, and run the test to prove it passes.`,
        check() {
          // Run the real test, and keep the test file honest: editing the test is not a fix.
          const testIntact = readTrimmed(path.join(dir, "test.mjs"))?.includes(`!== ${bug.want}`);
          try {
            execFileSync(process.execPath, ["test.mjs"], {
              cwd: dir,
              timeout: 15_000,
              stdio: "pipe",
            });
            return {
              ok: Boolean(testIntact),
              evidence: testIntact ? "test passes" : "test file was edited",
            };
          } catch (error) {
            return {
              ok: false,
              evidence: `test fails: ${String(error.stderr ?? error).slice(0, 80)}`,
            };
          }
        },
        solve: () => write(dir, "lib.mjs", src(bug.good)),
      };
    },
  },
  {
    id: "files.sort-by-type",
    area: "files",
    level: 2,
    make(seed, dir) {
      const r = rng(seed);
      const kinds = { images: ["png", "jpg"], docs: ["txt", "md"], data: ["csv", "json"] };
      const files = r
        .shuffle(WORDS)
        .slice(0, r.int(6, 10))
        .map((word) => {
          const folder = r.pick(Object.keys(kinds));
          return { name: `${word}.${r.pick(kinds[folder])}`, folder };
        });
      const inbox = path.join(dir, "inbox");
      for (const file of files) {
        write(inbox, file.name, `${file.name}\n`);
      }
      const want = files.map((file) => `${file.folder}/${file.name}`).toSorted();
      return {
        prompt:
          `Tidy ${inbox}: move every image (png, jpg) into a subfolder "images", every document ` +
          `(txt, md) into "docs" and every data file (csv, json) into "data". Leave nothing else in it.`,
        check() {
          const got = listTree(inbox);
          const ok = JSON.stringify(got) === JSON.stringify(want);
          return { ok, evidence: ok ? `${want.length} files placed` : `got ${got.join(", ")}` };
        },
        solve() {
          for (const file of files) {
            fs.mkdirSync(path.join(inbox, file.folder), { recursive: true });
            fs.renameSync(path.join(inbox, file.name), path.join(inbox, file.folder, file.name));
          }
        },
      };
    },
  },
  {
    id: "research.find-fact",
    area: "research",
    level: 2,
    make(seed, dir) {
      const r = rng(seed);
      const [target, ...others] = r.shuffle(WORDS).slice(0, 8);
      const code = `${r.pick(WORDS).toUpperCase()}-${r.int(100, 999)}`;
      // The fact sits in one of many notes, and decoys mention other projects' codes.
      const notesDir = path.join(dir, "notes");
      const carrier = r.int(0, others.length - 1);
      others.forEach((other, i) => {
        const lines = [
          `Meeting notes ${i + 1}.`,
          `Project ${other} uses access code ${other.toUpperCase()}-${r.int(100, 999)}.`,
        ];
        if (i === carrier) {
          lines.push(`Separately, project ${target} was assigned access code ${code}.`);
        }
        write(notesDir, `note-${i + 1}.txt`, lines.join("\n") + "\n");
      });
      const out = path.join(dir, "answer.txt");
      return {
        prompt: `Somewhere in the notes in ${notesDir} is the access code for project ${target}. Write only that code to ${out}.`,
        check() {
          const got = readTrimmed(out);
          return { ok: got === code, evidence: `answer.txt=${JSON.stringify(got)} want ${code}` };
        },
        solve: () => write(dir, "answer.txt", `${code}\n`),
      };
    },
  },
  {
    id: "recovery.blocked-path",
    area: "recovery",
    level: 3,
    make(seed, dir) {
      const r = rng(seed);
      const item = r.pick(WORDS);
      const count = r.int(2, 999);
      // The named file does not exist; the data lives under a nearby name the agent must find.
      const realName = r.pick([`${item}-backup.txt`, `old/${item}.txt`, `${item}.bak`]);
      write(dir, realName, `${item}: ${count}\n`);
      const out = path.join(dir, "answer.txt");
      return {
        prompt: `Read ${path.join(dir, `${item}.txt`)} and write just the ${item} count to ${out}. If that file is missing, find the data elsewhere in ${dir}.`,
        check() {
          const got = readTrimmed(out);
          return {
            ok: got === String(count),
            evidence: `answer.txt=${JSON.stringify(got)} want ${count}`,
          };
        },
        solve: () => write(dir, "answer.txt", `${count}\n`),
      };
    },
  },
];
