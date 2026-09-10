// Novita plugin entrypoint registers its OpenClaw integration.
import { readConfiguredProviderCatalogEntries } from "granted/plugin-sdk/provider-catalog-shared";
import { defineSingleProviderPluginEntry } from "granted/plugin-sdk/provider-entry";
import { buildProviderReplayFamilyHooks } from "granted/plugin-sdk/provider-model-shared";
import { buildProviderToolCompatFamilyHooks } from "granted/plugin-sdk/provider-tools";
import manifest from "./granted.plugin.json" with { type: "json" };

const PROVIDER_ID = "novita";

export default defineSingleProviderPluginEntry({
  id: PROVIDER_ID,
  name: "NovitaAI Provider",
  description: "Official OpenClaw NovitaAI provider plugin",
  manifest,
  provider: {
    label: "NovitaAI",
    docsPath: "/providers/novita",
    aliases: ["novita-ai", "novitaai"],
    manifestAuth: {
      noteTitle: "NovitaAI",
      noteMessage: "Manage API keys at https://novita.ai/settings/key-management",
    },
    catalog: {
      allowExplicitBaseUrl: true,
      liveModelDiscovery: true,
    },
    augmentModelCatalog: ({ config }) =>
      readConfiguredProviderCatalogEntries({
        config,
        providerId: PROVIDER_ID,
      }),
    ...buildProviderReplayFamilyHooks({
      family: "openai-compatible",
      dropReasoningFromHistory: false,
    }),
    ...buildProviderToolCompatFamilyHooks("openai"),
  },
});
