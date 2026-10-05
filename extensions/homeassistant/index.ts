// Home Assistant plugin entrypoint registers its Granted integration.
import { definePluginEntry, type AnyAgentTool } from "granted/plugin-sdk/plugin-entry";
import { createHomeAssistantTool } from "./src/tool.js";

export default definePluginEntry({
  id: "homeassistant",
  name: "Home Assistant Plugin",
  description: "Read and control a Home Assistant install from the agent.",
  register(api) {
    api.registerTool(createHomeAssistantTool(api) as AnyAgentTool);
  },
});
