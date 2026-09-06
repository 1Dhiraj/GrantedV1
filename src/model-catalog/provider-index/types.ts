// Provider-index types describe install hints, auth choices, and preview catalogs for discoverable providers.
import type { ModelCatalogProvider } from "@openclaw/model-catalog-core/model-catalog-types";

// Normalized provider-index schema. It describes providers discoverable before
// plugin install, including install hints, auth choices, and preview catalogs.
export type GrantedProviderIndexPluginInstall = {
  clawhubSpec?: string;
  npmSpec?: string;
  defaultChoice?: "clawhub" | "npm";
  minHostVersion?: string;
  expectedIntegrity?: string;
};

export type GrantedProviderIndexPlugin = {
  id: string;
  package?: string;
  source?: string;
  install?: GrantedProviderIndexPluginInstall;
};

export type GrantedProviderIndexProviderAuthChoice = {
  method: string;
  choiceId: string;
  choiceLabel: string;
  choiceHint?: string;
  assistantPriority?: number;
  assistantVisibility?: "visible" | "manual-only";
  groupId?: string;
  groupLabel?: string;
  groupHint?: string;
  optionKey?: string;
  cliFlag?: string;
  cliOption?: string;
  cliDescription?: string;
  onboardingScopes?: readonly ("text-inference" | "image-generation" | "music-generation")[];
};

export type GrantedProviderIndexProvider = {
  id: string;
  name: string;
  plugin: GrantedProviderIndexPlugin;
  docs?: string;
  categories?: readonly string[];
  authChoices?: readonly GrantedProviderIndexProviderAuthChoice[];
  previewCatalog?: ModelCatalogProvider;
};

export type GrantedProviderIndex = {
  version: number;
  providers: Readonly<Record<string, GrantedProviderIndexProvider>>;
};
