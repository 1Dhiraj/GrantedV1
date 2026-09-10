import fs from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import { clearNodeSqliteKyselyCacheForDatabase } from "../infra/kysely-sync.js";
import { openNodeSqliteDatabase } from "../infra/node-sqlite.js";
import { normalizeAgentId } from "../routing/session-key.js";
import type {
  GrantedAgentDatabase,
  GrantedAgentDatabaseOptions,
} from "./granted-agent-db-contract.js";
import {
  assertCanonicalAgentPersistenceVersion,
  assertExistingAgentSchemaOwner,
  assertSupportedAgentSchemaVersion,
  readExistingAgentSchemaMeta,
} from "./granted-agent-db-schema-helpers.js";
import { getOpenClawAgentDatabaseIfOpen } from "./granted-agent-db.js";
import {
  isIncognitoOpenClawAgentSqlitePath,
  resolveOpenClawAgentSqlitePath,
} from "./granted-agent-db.paths.js";
import { GRANTED_SQLITE_BUSY_TIMEOUT_MS } from "./granted-state-db-contract.js";

type GrantedAgentReadOnlyDatabase = {
  agentId: string;
  db: DatabaseSync;
  path: string;
};

type GrantedAgentDatabaseReadOnlyResult<T> =
  | { found: true; value: T }
  | { found: false; reason: "database-missing" | "schema-missing" | "table-missing" };

/**
 * Look up a process-held handle without adopting writer-side failures.
 *
 * Read-only reads are meant to survive a latched open failure or an ownership
 * mismatch that only the writable lifecycle cares about; those callers fall
 * back to a fresh connection, which reports the precise reason.
 */
function findOpenAgentDatabase(
  options: GrantedAgentDatabaseOptions,
): GrantedAgentDatabase | undefined {
  try {
    return getOpenClawAgentDatabaseIfOpen(options);
  } catch {
    return undefined;
  }
}

/** Read agent state without creating, registering, migrating, or joining its writable lifecycle. */
export function withOpenClawAgentDatabaseReadOnly<T>(
  operation: (database: GrantedAgentReadOnlyDatabase) => T,
  options: GrantedAgentDatabaseOptions,
  behavior: { throwOnMissingTable?: boolean; allowExtension?: boolean } = {},
): GrantedAgentDatabaseReadOnlyResult<T> {
  const agentId = normalizeAgentId(options.agentId);
  const pathname = resolveOpenClawAgentSqlitePath({ ...options, agentId });
  if (isIncognitoOpenClawAgentSqlitePath(pathname, { agentId, env: options.env })) {
    // Read-only misses must not create process-lifetime handles; only creation and
    // write paths may materialize the process-held incognito database.
    const database = getOpenClawAgentDatabaseIfOpen({ ...options, agentId });
    if (database && behavior.allowExtension) {
      throw new Error("Extension-capable read-only access is unavailable for incognito databases.");
    }
    return database
      ? { found: true, value: operation(database) }
      : { found: false, reason: "database-missing" };
  }
  // Borrow only outside a transaction so readers see committed rows.
  // The writer owns reused handles; this call closes only fresh connections.
  const opened = behavior.allowExtension
    ? undefined
    : findOpenAgentDatabase({ ...options, agentId });
  const reusable = opened && !opened.db.isTransaction ? opened : undefined;
  if (!reusable && !fs.existsSync(pathname)) {
    return { found: false, reason: "database-missing" };
  }
  const database = reusable ?? {
    agentId,
    db: openNodeSqliteDatabase(pathname, {
      readOnly: true,
      ...(behavior.allowExtension ? { allowExtension: true } : {}),
    }),
    path: pathname,
  };
  const { db } = database;
  try {
    if (!reusable) {
      db.exec(`PRAGMA busy_timeout = ${GRANTED_SQLITE_BUSY_TIMEOUT_MS};`);
    }
    // Share only this admission's fresh value; a later read must check again.
    const userVersion = assertSupportedAgentSchemaVersion(db, pathname);
    assertCanonicalAgentPersistenceVersion(db, pathname, userVersion);
    if (!reusable) {
      const schemaMeta = readExistingAgentSchemaMeta(db);
      if (!schemaMeta) {
        return { found: false, reason: "schema-missing" };
      }
      assertExistingAgentSchemaOwner(schemaMeta, agentId, pathname);
    }
    try {
      return { found: true, value: operation(database) };
    } catch (error) {
      if (
        error instanceof Error &&
        (error as NodeJS.ErrnoException).code === "ERR_SQLITE_ERROR" &&
        /\bno such table:/iu.test(error.message) &&
        !behavior.throwOnMissingTable
      ) {
        return { found: false, reason: "table-missing" };
      }
      throw error;
    }
  } finally {
    if (!reusable) {
      clearNodeSqliteKyselyCacheForDatabase(db);
      db.close();
    }
  }
}
