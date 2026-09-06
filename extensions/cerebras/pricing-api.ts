import {
  normalizeModelPricingCatalog,
  normalizeOpenRouterModelPricing,
} from "granted/plugin-sdk/model-catalog-pricing";
import { asOptionalRecord } from "granted/plugin-sdk/string-coerce-runtime";

export function parseCerebrasPricingCatalog(payload: unknown) {
  return normalizeModelPricingCatalog(
    asOptionalRecord(payload)?.data,
    normalizeOpenRouterModelPricing,
  );
}
