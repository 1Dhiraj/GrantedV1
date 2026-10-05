import { describe, expect, it } from "vitest";
import {
  DAILY_DIGEST_PLACEHOLDER,
  expandCronDailyDigest,
  expandDailyDigestPlaceholder,
  messageHasDailyDigestPlaceholder,
  summarizeCronRunEntries,
} from "./daily-digest.js";
import type { CronRunLogEntry } from "./run-log-types.js";

const HOUR = 60 * 60 * 1000;

function entry(partial: Partial<CronRunLogEntry> & { ts: number; jobId: string }): CronRunLogEntry {
  return { action: "finished", status: "ok", ...partial };
}

describe("daily digest", () => {
  it("detects and expands the placeholder", () => {
    const message = `Data:\n${DAILY_DIGEST_PLACEHOLDER}\nRewrite it.`;

    expect(messageHasDailyDigestPlaceholder(message)).toBe(true);
    expect(messageHasDailyDigestPlaceholder("plain message")).toBe(false);
    expect(expandDailyDigestPlaceholder(message, "DIGEST")).toBe("Data:\nDIGEST\nRewrite it.");
  });

  it("summarizes runs in the window, failing jobs first", () => {
    const now = Date.now();
    // Newest first, the order run history returns.
    const digest = summarizeCronRunEntries({
      sinceMs: now - 24 * HOUR,
      jobNameById: { a: "watch-inbox", b: "backup" },
      entries: [
        entry({ ts: now - HOUR, jobId: "a", status: "error", error: "latest  failure\nhere" }),
        entry({ ts: now - 2 * HOUR, jobId: "a", status: "ok", durationMs: 30_000 }),
        entry({ ts: now - 3 * HOUR, jobId: "a", status: "error", error: "older failure" }),
        entry({ ts: now - 4 * HOUR, jobId: "b", status: "ok" }),
        entry({ ts: now - 30 * HOUR, jobId: "b", status: "error", error: "outside window" }),
      ],
    });

    expect(digest).toContain("4 total - 2 ok, 2 failed");
    expect(digest).toContain("watch-inbox: 1 ok, 2 failed, ~30s run time");
    expect(digest).toContain("last error: latest failure here");
    expect(digest).not.toContain("older failure");
    expect(digest).toContain("- backup: 1 ok");
    expect(digest).not.toContain("outside window");
    expect(digest.indexOf("watch-inbox")).toBeLessThan(digest.indexOf("- backup"));
  });

  it("reports an empty window rather than inventing activity", () => {
    expect(summarizeCronRunEntries({ sinceMs: Date.now(), entries: [] })).toBe(
      "No scheduled runs in the last 24 hours.",
    );
  });

  it("leaves messages without the placeholder untouched", async () => {
    await expect(expandCronDailyDigest("Check the inbox.", {}, Date.now())).resolves.toBe(
      "Check the inbox.",
    );
  });
});
