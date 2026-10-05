import { registerSecretValueForRedaction } from "../logging/secret-redaction-registry.js";
import { looksLikeSecretSentinel } from "../secrets/sentinel.js";
import { isNonSecretApiKeyMarker } from "./model-auth-markers.js";

/**
 * Registers a resolved provider API key for exact-value log redaction.
 *
 * Keys that come through the protected secret store are registered there, but
 * a key read from an inline auth profile, an env var such as NVIDIA_API_KEY, or
 * provider config never passes through it. The pattern layer only catches text
 * that looks like a secret, so a bare key echoed by a tool result or an error
 * message would otherwise be logged in full.
 */
export function registerResolvedProviderApiKey(apiKey: string | undefined): void {
  const value = apiKey?.trim();
  if (!value) {
    return;
  }
  // Markers such as "ollama-local" are documented placeholders, not secrets;
  // registering one would mask that word in every log line.
  if (isNonSecretApiKeyMarker(value)) {
    return;
  }
  // Minting a sentinel already registered the real value behind it.
  if (looksLikeSecretSentinel(value)) {
    return;
  }
  registerSecretValueForRedaction(value);
}
