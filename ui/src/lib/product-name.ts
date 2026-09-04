/**
 * The product name shown to people in the Control UI.
 *
 * Mirrors PRODUCT_DISPLAY_NAME in src/compat/legacy-names.ts. The UI bundle
 * cannot import from src/, so this is a deliberate second copy and
 * product-name.test.ts fails if the two ever disagree.
 *
 * This is the display name only. The lowercase `openclaw` used in commands,
 * custom element prefixes, and package names is an identifier and stays as it
 * is until the full rename at cut-over.
 */
export const PRODUCT_DISPLAY_NAME = "Granted";
