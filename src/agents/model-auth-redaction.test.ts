import { describe, expect, it } from "vitest";
import { redactSensitiveText } from "../logging/redact.js";
import { isSecretValueRegisteredForRedaction } from "../logging/secret-redaction-registry.js";
import { sealSecretSentinel } from "../secrets/sentinel.js";
import { registerResolvedProviderApiKey } from "./model-auth-redaction.js";

describe("registerResolvedProviderApiKey", () => {
  it("masks a bare provider key that has no secret-like shape", () => {
    // A key read back verbatim from a file carries no "apiKey:" or "Bearer"
    // prefix, so only exact-value redaction can catch it.
    const key = "nvbare7QpL2xWm9RkT4vZs1Y";
    registerResolvedProviderApiKey(key);

    const logged = redactSensitiveText(`tool output: ${key}\n`, { mode: "off" });

    expect(logged).not.toContain(key);
  });

  it("ignores documented placeholder markers", () => {
    registerResolvedProviderApiKey("ollama-local");

    expect(isSecretValueRegisteredForRedaction("ollama-local")).toBe(false);
  });

  it("does not register a sentinel in place of the value it stands for", () => {
    const sentinel = sealSecretSentinel("sentinel-backed-provider-key", { label: "test" });
    registerResolvedProviderApiKey(sentinel);

    expect(isSecretValueRegisteredForRedaction(sentinel)).toBe(false);
  });

  it("ignores missing and blank keys", () => {
    expect(() => registerResolvedProviderApiKey(undefined)).not.toThrow();
    expect(() => registerResolvedProviderApiKey("   ")).not.toThrow();
  });
});
