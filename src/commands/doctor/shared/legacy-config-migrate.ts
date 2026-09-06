// Validating legacy config migration wrapper used by doctor config flow.
import type { LegacyConfigMigrationContext } from "../../../config/legacy.shared.js";
import type { GrantedConfig } from "../../../config/types.js";
import { validateConfigObjectWithPlugins } from "../../../config/validation.js";
import { applyLegacyDoctorMigrations } from "./legacy-config-compat.js";

/** Apply legacy migrations and validate the resulting OpenClaw config shape when possible. */
export function migrateLegacyConfig(
  raw: unknown,
  context?: LegacyConfigMigrationContext,
): {
  config: GrantedConfig | null;
  sourceConfig?: GrantedConfig;
  changes: string[];
  partiallyValid?: boolean;
} {
  const { next, changes } = applyLegacyDoctorMigrations(raw, context);
  if (!next) {
    return { config: null, changes: [] };
  }
  const resolvedCandidate = context
    ? (applyLegacyDoctorMigrations(context.resolvedRaw, context).next ?? context.resolvedRaw)
    : next;
  const validated = validateConfigObjectWithPlugins(resolvedCandidate);
  if (!validated.ok) {
    changes.push("Migration applied; other validation issues remain — run doctor to review.");
    return { config: next as GrantedConfig, changes, partiallyValid: true };
  }
  return { config: validated.config, sourceConfig: next as GrantedConfig, changes };
}
