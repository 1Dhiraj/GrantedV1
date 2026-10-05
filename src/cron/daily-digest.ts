/**
 * Daily digest for scheduled agent turns.
 *
 * An agentTurn message may contain {{dailyDigest}}; the run expands it with a
 * code-built summary of the last 24 hours of scheduled runs (counts, failures,
 * run time). The agent then writes around real numbers instead of inventing
 * them, which is what makes a "morning briefing" job trustworthy.
 */
import type { GrantedConfig } from "../config/types.granted.js";
import type { CronRunLogEntry } from "./run-log-types.js";

export const DAILY_DIGEST_PLACEHOLDER = "{{dailyDigest}}";

const DAILY_DIGEST_WINDOW_MS = 24 * 60 * 60 * 1000;
const DAILY_DIGEST_MAX_RUNS = 200;
const DAILY_DIGEST_ERROR_CHARS = 160;

export function messageHasDailyDigestPlaceholder(message: string): boolean {
  return message.includes(DAILY_DIGEST_PLACEHOLDER);
}

export function expandDailyDigestPlaceholder(message: string, digest: string): string {
  return message.replaceAll(DAILY_DIGEST_PLACEHOLDER, digest);
}

type JobSummary = {
  name: string;
  ok: number;
  error: number;
  skipped: number;
  lastError?: string;
  totalDurationMs: number;
};

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 90) {
    return `${seconds}s`;
  }
  const minutes = Math.round(seconds / 60);
  return minutes < 90 ? `${minutes}m` : `${Math.round(minutes / 60)}h`;
}

/** Summarizes run-history entries at or after `sinceMs`, most-failing jobs first. */
export function summarizeCronRunEntries(params: {
  entries: readonly CronRunLogEntry[];
  sinceMs: number;
  jobNameById?: Record<string, string>;
}): string {
  const windowed = params.entries.filter((entry) => entry.ts >= params.sinceMs);
  if (windowed.length === 0) {
    return "No scheduled runs in the last 24 hours.";
  }
  const byJob = new Map<string, JobSummary>();
  const totals = { ok: 0, error: 0, skipped: 0 };
  for (const entry of windowed) {
    const job = byJob.get(entry.jobId) ?? {
      name: params.jobNameById?.[entry.jobId] ?? entry.jobId,
      ok: 0,
      error: 0,
      skipped: 0,
      totalDurationMs: 0,
    };
    if (entry.status === "error") {
      job.error += 1;
      totals.error += 1;
      // Entries arrive newest first, so the first error seen is the latest.
      job.lastError ??= entry.error;
    } else if (entry.status === "skipped") {
      job.skipped += 1;
      totals.skipped += 1;
    } else {
      job.ok += 1;
      totals.ok += 1;
    }
    if (typeof entry.durationMs === "number" && Number.isFinite(entry.durationMs)) {
      job.totalDurationMs += Math.max(0, entry.durationMs);
    }
    byJob.set(entry.jobId, job);
  }
  const lines = [
    `Scheduled runs in the last 24h: ${windowed.length} total - ${totals.ok} ok` +
      (totals.error > 0 ? `, ${totals.error} failed` : "") +
      (totals.skipped > 0 ? `, ${totals.skipped} skipped` : "") +
      ".",
  ];
  const jobs = [...byJob.values()].toSorted((a, b) => b.error - a.error || b.ok - a.ok);
  for (const job of jobs) {
    const parts = [
      job.ok > 0 ? `${job.ok} ok` : undefined,
      job.error > 0 ? `${job.error} failed` : undefined,
      job.skipped > 0 ? `${job.skipped} skipped` : undefined,
      job.totalDurationMs > 0 ? `~${formatDuration(job.totalDurationMs)} run time` : undefined,
    ].filter(Boolean);
    const lastError = job.lastError?.replace(/\s+/g, " ").trim().slice(0, DAILY_DIGEST_ERROR_CHARS);
    lines.push(
      `- ${job.name}: ${parts.join(", ")}${lastError ? ` - last error: ${lastError}` : ""}`,
    );
  }
  return lines.join("\n");
}

/** Builds the last-24h digest from the configured cron store's run history. */
export async function buildCronDailyDigest(params: {
  cfg: GrantedConfig;
  now: number;
}): Promise<string> {
  try {
    // Loaded only when a message asks for a digest; most cron runs never do.
    const [{ loadCronJobsStore, resolveCronJobsStorePathFromConfig }, { cronStoreKey }, history] =
      await Promise.all([
        import("./store.js"),
        import("./store/key.js"),
        import("./task-run-history.js"),
      ]);
    const storePath = resolveCronJobsStorePathFromConfig(params.cfg);
    const store = await loadCronJobsStore(storePath);
    const jobNameById = Object.fromEntries(store.jobs.map((job) => [job.id, job.name]));
    const page = history.readCronTaskRunHistoryPage({
      storeKey: cronStoreKey(storePath),
      limit: DAILY_DIGEST_MAX_RUNS,
      sortDir: "desc",
    });
    return summarizeCronRunEntries({
      entries: page.entries,
      sinceMs: params.now - DAILY_DIGEST_WINDOW_MS,
      jobNameById,
    });
  } catch {
    // A digest is context, not a precondition: the job still runs without it.
    return "No scheduled run history available.";
  }
}

/** Expands {{dailyDigest}} in a scheduled message; other messages pass through untouched. */
export async function expandCronDailyDigest(
  message: string,
  cfg: GrantedConfig,
  now: number,
): Promise<string> {
  if (!messageHasDailyDigestPlaceholder(message)) {
    return message;
  }
  return expandDailyDigestPlaceholder(message, await buildCronDailyDigest({ cfg, now }));
}
