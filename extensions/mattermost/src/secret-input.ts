// Mattermost plugin module implements secret input behavior.
export type { SecretInput } from "granted/plugin-sdk/secret-input";
export {
  buildSecretInputSchema,
  hasConfiguredSecretInput,
  resolveSecretInputString,
} from "granted/plugin-sdk/secret-input";
export type { SecretInputStringResolutionMode } from "granted/plugin-sdk/secret-input";
