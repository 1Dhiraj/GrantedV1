// Resolves the product name shown to people, allowing an operator to override it.
import { PRODUCT_CREATOR, PRODUCT_DISPLAY_NAME } from "../compat/legacy-names.js";
import type { GrantedConfig } from "./types.granted.js";

/**
 * Only the slice of config this reads. Taken from the real type rather than
 * restated structurally, so it cannot drift from the schema.
 */
type BrandingConfigLike = Pick<GrantedConfig, "branding">;

/**
 * The name to print: `branding.productName` when an operator set one, otherwise
 * {@link PRODUCT_DISPLAY_NAME}.
 *
 * This is only ever the *displayed* name. It must not reach manifest keys,
 * import paths, env-var prefixes or the state directory — those follow
 * PROJECT_NAME and have to stay stable for installs and third-party plugins to
 * keep loading. Renaming a value while a lookup keeps the old spelling is how
 * this repo previously lost every workspace template at once.
 *
 * Blank and whitespace-only values fall back rather than printing an empty
 * product name; the schema trims and rejects empty strings, but config reaches
 * here from migrations and tests too.
 */
export function resolveProductName(cfg: BrandingConfigLike | undefined): string {
  const configured = cfg?.branding?.productName?.trim();
  return configured && configured.length > 0 ? configured : PRODUCT_DISPLAY_NAME;
}

/**
 * Who made this product, for when someone asks the assistant directly.
 *
 * Configurable for the same reason the name is: an operator shipping under their
 * own brand is not going to want our author's name in the answer. Default stays
 * truthful rather than blank, because "I don't know who made me" is a worse
 * answer than a name the operator can override.
 */
export function resolveProductCreator(cfg: BrandingConfigLike | undefined): string {
  const configured = cfg?.branding?.creator?.trim();
  return configured && configured.length > 0 ? configured : PRODUCT_CREATOR;
}
