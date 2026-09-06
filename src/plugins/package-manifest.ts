import { normalizeOptionalString } from "../../packages/normalization-core/src/string-coerce.js";
import { readManifestSection } from "../compat/legacy-names.js";
import { isRecord } from "../utils.js";
import type {
  GrantedPackageManifest,
  PackageExtensionResolution,
  PackageManifest,
} from "./package-manifest.types.js";

export type * from "./package-manifest.types.js";

export const DEFAULT_PLUGIN_ENTRY_CANDIDATES = [
  "index.ts",
  "index.js",
  "index.mjs",
  "index.cjs",
] as const;

export function getPackageManifestMetadata(
  manifest: PackageManifest | undefined,
): GrantedPackageManifest | undefined {
  if (!manifest) {
    return undefined;
  }
  return readManifestSection(manifest) as GrantedPackageManifest | undefined;
}

export function resolvePackageExtensionEntries(
  manifest: PackageManifest | undefined,
): PackageExtensionResolution {
  const rawOpenClaw = readManifestSection(manifest);
  if (rawOpenClaw === undefined || rawOpenClaw === null) {
    return { status: "missing", entries: [] };
  }
  if (!isRecord(rawOpenClaw)) {
    return {
      status: "invalid",
      entries: [],
      error: "package.json openclaw must be an object",
    };
  }
  const raw = rawOpenClaw.extensions;
  if (raw === undefined || raw === null) {
    return { status: "missing", entries: [] };
  }
  if (!Array.isArray(raw)) {
    return {
      status: "invalid",
      entries: [],
      error: "package.json openclaw.extensions must be an array",
    };
  }
  const entries: string[] = [];
  for (const [index, entry] of raw.entries()) {
    const normalized = normalizeOptionalString(entry);
    if (!normalized) {
      return {
        status: "invalid",
        entries: [],
        error: `package.json openclaw.extensions[${index}] must be a non-empty string`,
      };
    }
    entries.push(normalized);
  }
  if (entries.length === 0) {
    return { status: "empty", entries: [] };
  }
  return { status: "ok", entries };
}
