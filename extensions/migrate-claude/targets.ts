// Migrate Claude plugin re-exports the shared migration target resolution.
export {
  resolvePlannedMigrationTargets as resolveTargets,
  type PlannedMigrationTargets as PlannedTargets,
} from "granted/plugin-sdk/migration-runtime";
