import { executeSqliteQuerySync, getNodeSqliteKysely } from "../infra/kysely-sync.js";
import { tableExists } from "./granted-state-db-schema-helpers.js";
import type { DB } from "./granted-state-db.generated.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
} from "./granted-state-db.js";

/** Permanent session deletion owns all retained receipts, including pre-reset incarnations. */
export function deletePersonalGitHubSessionReceipts(params: {
  agentId: string;
  sessionKeys: readonly string[];
  env?: NodeJS.ProcessEnv;
}): void {
  const database = openOpenClawStateDatabase({ env: params.env });
  if (
    !tableExists(database.db, "github_personal_publication_requests") ||
    params.sessionKeys.length === 0
  ) {
    return;
  }
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      executeSqliteQuerySync(
        db,
        getNodeSqliteKysely<Pick<DB, "github_personal_publication_requests">>(db)
          .deleteFrom("github_personal_publication_requests")
          .where("agent_id", "=", params.agentId)
          .where("session_key", "in", params.sessionKeys),
      );
    },
    { database },
    { operationLabel: "github-personal-publication.session-delete" },
  );
}
