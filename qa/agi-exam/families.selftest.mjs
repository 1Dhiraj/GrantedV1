// Tests the exam itself, with no agent involved. A checker that passes untouched
// work would score fakes as successes; one that fails the reference solution
// would score real work as failures. Both are ruled out here for many seeds.
//
//   node --test qa/agi-exam/families.selftest.mjs

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { families } from "./families.mjs";

/** Everything the agent would see: file paths and contents, minus the temp dir. */
function fingerprint(dir) {
  const parts = [];
  const walk = (current) => {
    for (const entry of fs
      .readdirSync(current, { withFileTypes: true })
      .toSorted((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        parts.push(`${path.relative(dir, full)}:${fs.readFileSync(full, "utf8")}`);
      }
    }
  };
  walk(dir);
  return parts.join("|");
}

const SEEDS = Array.from({ length: 25 }, (_, i) => 1000 + i * 7919);

for (const family of families) {
  test(`${family.id}: fails untouched work, passes the reference solution`, () => {
    const instances = new Set();
    for (const seed of SEEDS) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agi-exam-"));
      try {
        const instance = family.make(seed, dir);
        instances.add(instance.prompt.replaceAll(dir, "") + fingerprint(dir));
        assert.equal(instance.check().ok, false, `seed ${seed}: untouched work passed`);
        instance.solve();
        const result = instance.check();
        assert.equal(result.ok, true, `seed ${seed}: reference failed (${result.evidence})`);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
    // Fresh instances must actually differ, or repeats measure memory, not skill.
    assert.ok(instances.size > SEEDS.length / 3, `only ${instances.size} distinct instances`);
  });
}
