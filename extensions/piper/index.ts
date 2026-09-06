import { definePluginEntry } from "granted/plugin-sdk/plugin-entry";
import { buildPiperSpeechProvider } from "./piper-provider.js";

export default definePluginEntry({
  id: "piper",
  name: "Piper (local voice)",
  description: "Local, offline neural text-to-speech — permanently free, low latency, CPU-only",
  register(api) {
    api.registerSpeechProvider(buildPiperSpeechProvider());
  },
});
