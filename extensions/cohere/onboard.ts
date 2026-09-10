import { readManifestProviderDefaultModelRef } from "granted/plugin-sdk/provider-catalog-shared";
import { createModelCatalogPresetAppliers } from "granted/plugin-sdk/provider-onboard";
import { buildCohereCatalogModels, COHERE_BASE_URL } from "./models.js";
import manifest from "./granted.plugin.json" with { type: "json" };

const COHERE_DEFAULT_MODEL_REF = readManifestProviderDefaultModelRef(manifest, "cohere")!;

export const { applyConfig: applyCohereConfig } = createModelCatalogPresetAppliers<[]>({
  primaryModelRef: COHERE_DEFAULT_MODEL_REF,
  resolveParams: () => ({
    providerId: "cohere",
    api: "openai-completions",
    baseUrl: COHERE_BASE_URL,
    catalogModels: buildCohereCatalogModels(),
    aliases: [{ modelRef: COHERE_DEFAULT_MODEL_REF, alias: "Cohere Command A+" }],
  }),
});
