// Memory Host SDK module implements embeddings debug behavior.
import { parseBoolean } from "@granted/normalization-core/boolean-coercion";
import { normalizeLowercaseStringOrEmpty } from "@granted/normalization-core/string-coerce";

// Lightweight debug logging for memory embedding internals.

const normalizedDebugEmbeddings = normalizeLowercaseStringOrEmpty(
  process.env.GRANTED_DEBUG_MEMORY_EMBEDDINGS,
);
const debugEmbeddings =
  parseBoolean(normalizedDebugEmbeddings) ?? ["1", "on", "yes"].includes(normalizedDebugEmbeddings);

/** Write embedding debug metadata when GRANTED_DEBUG_MEMORY_EMBEDDINGS is enabled. */
export function debugEmbeddingsLog(message: string, meta?: Record<string, unknown>): void {
  if (!debugEmbeddings) {
    return;
  }
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  console.warn(`${message}${suffix}`);
}
