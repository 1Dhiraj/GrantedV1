#!/usr/bin/env node
/**
 * Build, then restart the local gateway onto what was just built.
 *
 * This exists because the same mistake happened three times in two days: a fix
 * was edited, typechecked, tested green, and handed over for testing while the
 * running gateway still held code from hours earlier. Every one of those tests
 * measured the old build and looked like the fix had failed.
 *
 * `granted gateway restart` cannot be used here. The service on this machine
 * was installed by an older version and its persisted command is a batch label
 * (`:granted_loop`), so restart reports a mismatch and start tries to spawn the
 * label as an executable. Killing the listener and letting the Startup-folder
 * wrapper respawn it is what actually works.
 *
 *   node scripts/deploy-local.mjs            # build, restart, verify
 *   node scripts/deploy-local.mjs --no-build # restart only
 */

import { execFileSync, execSync } from "node:child_process";
import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.env.GRANTED_GATEWAY_PORT ?? "18789";
const SENTINEL = path.join(ROOT, "dist", "index.js");

function powershell(script) {
  return execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    windowsHide: true,
  }).trim();
}

function listenerPid() {
  const out = powershell(
    `$c = Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; ` +
      `if ($c) { $c.OwningProcess } else { '' }`,
  );
  const pid = Number.parseInt(out, 10);
  return Number.isFinite(pid) && pid > 0 ? pid : null;
}

function startedAt(pid) {
  const out = powershell(
    `$p = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" -ErrorAction SilentlyContinue; ` +
      `if ($p) { $p.CreationDate.ToString('o') } else { '' }`,
  );
  return out ? new Date(out) : null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const skipBuild = process.argv.includes("--no-build");

  // Stop the gateway BEFORE building, not after. `clean:dist` is the build's
  // first step: it deletes dist/ out from under a running gateway, which then
  // fails with "ENOENT: no such file or directory" on its next import. Building
  // first and restarting afterwards therefore breaks the very session someone
  // is using while they wait for the fix.
  const before = listenerPid();
  if (before) {
    const was = startedAt(before);
    console.log(
      `stopping gateway pid ${before}${was ? ` (started ${was.toISOString()})` : ""} before the build`,
    );
    powershell(`Stop-Process -Id ${before} -Force -ErrorAction SilentlyContinue`);
  } else {
    console.log("no gateway currently listening");
  }

  if (!skipBuild) {
    console.log("building ...");
    // The Startup wrapper retries every 5s, so it will try to come back while
    // dist/ is still half-written and crash-loop for the duration. That is
    // noisy in the gateway log but self-correcting: the first attempt after the
    // build completes succeeds, and the wait below is what confirms it.
    // Inherit stdio: a build that fails must be visible, not summarised.
    execSync("pnpm build", { cwd: ROOT, stdio: "inherit" });
  }

  const builtAt = statSync(SENTINEL).mtime;
  console.log(`built at ${builtAt.toISOString()}`);

  // The Startup wrapper retries every 5s, so this waits rather than assuming.
  process.stdout.write("waiting for it to come back ");
  for (let attempt = 0; attempt < 24; attempt += 1) {
    await sleep(2500);
    process.stdout.write(".");
    const pid = listenerPid();
    // A pid equal to `before` cannot happen after a kill, but a pid whose start
    // time predates the build can: the wrapper may have won a race during the
    // build. The start-time check below is the one that actually decides.
    if (pid && pid !== before) {
      const now = startedAt(pid);
      console.log("");
      if (now && now < builtAt) {
        console.error(
          `gateway pid ${pid} started ${now.toISOString()}, BEFORE the build. Still stale.`,
        );
        process.exitCode = 1;
        return;
      }
      console.log(`gateway pid ${pid} running code built at ${builtAt.toISOString()} — deployed`);
      return;
    }
  }
  console.log("");
  console.error("gateway did not come back within 60s; start it by hand and check the log");
  process.exitCode = 1;
}

await main();
