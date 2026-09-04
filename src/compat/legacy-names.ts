// Product/package naming constants that bridge current OpenClaw manifests with
// legacy Clawdbot keys still seen in older configs and packages.
const PROJECT_NAME = "openclaw" as const;

/**
 * The product name shown to people: window titles, CLI banner, UI chrome.
 *
 * Deliberately separate from PROJECT_NAME above. That one is an *identifier* —
 * the manifest key, the plugin import path, the env-var prefix — and renaming
 * it would break every installed plugin and conflict with each upstream merge.
 * This one is only ever printed, so it can carry the product's own name.
 *
 * The UI bundle cannot import from src/, so it keeps its own copy in
 * ui/src/lib/product-name.ts; a test asserts the two never drift apart.
 */
export const PRODUCT_DISPLAY_NAME = "Granted" as const;

const LEGACY_PROJECT_NAMES = ["clawdbot"] as const;

export const MANIFEST_KEY = PROJECT_NAME;

/** Manifest keys accepted only for legacy compatibility. */
export const LEGACY_MANIFEST_KEYS = LEGACY_PROJECT_NAMES;
