import { safeParseJson } from "@granted/normalization-core";
import { isRecord } from "@granted/normalization-core/record-coerce";
import { normalizeSqliteNumber } from "../../infra/sqlite-number.js";

export function tryParseJsonObject(raw: string): Record<string, unknown> | undefined {
  const parsed = safeParseJson(raw);
  return isRecord(parsed) ? parsed : undefined;
}

/** Normalizes SQLite number/bigint columns into JavaScript numbers. */
export { normalizeSqliteNumber as normalizeNumber };
