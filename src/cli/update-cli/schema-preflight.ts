import {
  GRANTED_DATABASE_SCHEMA_DOCS_URL,
  preflightOpenClawDatabaseSchemas,
  type IncompatibleOpenClawDatabase,
  type IndeterminateOpenClawDatabase,
  type GrantedDatabaseSchemaPreflight,
} from "../../state/granted-database-preflight.js";
import type { GrantedSchemaVersions } from "../../state/granted-schema-versions.js";

export function formatSchemaRefusalLines(
  schemas: {
    incompatible: readonly IncompatibleOpenClawDatabase[];
    indeterminate: readonly IndeterminateOpenClawDatabase[];
  },
  dryRun = false,
): string[] {
  const prefix = dryRun ? "Would refuse update" : "Update refused";
  return [
    ...schemas.incompatible.map((database) => {
      const agent = database.agentId ? ` (agent ${database.agentId})` : "";
      return `${prefix}: ${database.kind} database${agent} ${database.path} has schema ${database.foundVersion}; target supports ${database.supportedVersion}; writer build ${database.writerAppVersion ?? "unknown"}.`;
    }),
    ...schemas.indeterminate.map(
      (database) =>
        `${prefix}: could not inspect ${database.kind} database ${database.path}: ${database.reason}; retry once the gateway releases it.`,
    ),
    GRANTED_DATABASE_SCHEMA_DOCS_URL,
    "Installing manually via npm bypasses this guard; back up first and verify compatibility.",
  ];
}

export function checkTargetDatabaseSchemas(
  supportedVersions: GrantedSchemaVersions | undefined,
  env: NodeJS.ProcessEnv = process.env,
): GrantedDatabaseSchemaPreflight {
  return supportedVersions
    ? preflightOpenClawDatabaseSchemas({ env, supportedVersions })
    : { incompatible: [], indeterminate: [] };
}

export function hasSchemaRefusal(schemas: GrantedDatabaseSchemaPreflight): boolean {
  return schemas.incompatible.length > 0 || schemas.indeterminate.length > 0;
}
