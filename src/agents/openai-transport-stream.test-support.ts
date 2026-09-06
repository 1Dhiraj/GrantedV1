import "./ai-transport-runtime-host.js";
import "@granted/ai/transports";

const responsesTesting = globalThis.openclawOpenAIResponsesTransportTestApi;
if (!responsesTesting) {
  throw new Error("OpenAI transport test APIs are unavailable outside test mode");
}

type OpenAIResponsesTransportTestApi = NonNullable<
  typeof globalThis.openclawOpenAIResponsesTransportTestApi
>;

// Keep declaration emit on the public test-API names instead of transport internals.
export const testing: OpenAIResponsesTransportTestApi = responsesTesting;
