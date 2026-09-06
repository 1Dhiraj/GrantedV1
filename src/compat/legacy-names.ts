// Product/package naming constants. `granted` is the current identifier;
// earlier names are accepted only so existing installs and third-party plugins
// keep loading.
export const PROJECT_NAME = "granted" as const;

/**
 * The product name shown to people: window titles, CLI banner, UI chrome.
 *
 * Kept separate from PROJECT_NAME above: that one is the identifier written
 * into manifests, import paths and env-var prefixes, while this one is only
 * ever printed. They now agree, but the distinction still matters — the
 * identifier has to stay stable for compatibility, the display name does not.
 *
 * The UI bundle cannot import from src/, so it keeps its own copy in
 * ui/src/lib/product-name.ts; a test asserts the two never drift apart.
 */
export const PRODUCT_DISPLAY_NAME = "Granted" as const;

// Accepted on read so plugins and configs written for the previous names keep
// working; nothing is written under them.
export const LEGACY_PROJECT_NAMES = ["openclaw", "clawdbot"] as const;

export const MANIFEST_KEY = PROJECT_NAME;

/** Manifest keys accepted only for legacy compatibility. */
export const LEGACY_MANIFEST_KEYS = LEGACY_PROJECT_NAMES;

/** Manifest keys in precedence order: the current name first, then the old ones. */
export const MANIFEST_KEYS = [MANIFEST_KEY, ...LEGACY_MANIFEST_KEYS] as const;

/**
 * Reads a package/catalog manifest section by whichever name it was written
 * under. Packages published before the rename — including every bundled
 * extension's package.json — still declare `openclaw`, so reading only the
 * current key would make them invisible rather than merely misnamed.
 */
export function readManifestSection(source: unknown): unknown {
  if (!source || typeof source !== "object") {
    return undefined;
  }
  for (const key of MANIFEST_KEYS) {
    const candidate = (source as Record<string, unknown>)[key];
    if (candidate !== undefined && candidate !== null) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Home-scoped state directory name (`~/.granted`) and the ones used before the
 * rename, newest first. Derived from the names above so a future rename is one
 * edit rather than a hunt through path literals.
 */
export const STATE_DIRNAME = `.${PROJECT_NAME}`;
export const LEGACY_STATE_DIRNAMES: readonly string[] = LEGACY_PROJECT_NAMES.map(
  (name) => `.${name}`,
);

/** Config filename inside the state directory, plus the ones still read. */
export const CONFIG_FILENAME = `${PROJECT_NAME}.json`;
export const LEGACY_CONFIG_FILENAMES: readonly string[] = LEGACY_PROJECT_NAMES.map(
  (name) => `${name}.json`,
);
