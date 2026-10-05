// Qianfan plugin entrypoint registers its Granted integration.
import { defineSingleProviderPluginEntry } from "granted/plugin-sdk/provider-entry";
import manifest from "./granted.plugin.json" with { type: "json" };
import { applyQianfanConfig, QIANFAN_DEFAULT_MODEL_REF } from "./onboard.js";

const PROVIDER_ID = "qianfan";

export default defineSingleProviderPluginEntry({
  id: PROVIDER_ID,
  name: "Qianfan Provider",
  description: "Bundled Qianfan provider plugin",
  manifest,
  provider: {
    label: "Qianfan",
    docsPath: "/providers/qianfan",
    manifestAuth: {
      defaultModel: QIANFAN_DEFAULT_MODEL_REF,
      applyConfig: applyQianfanConfig,
    },
    catalog: { liveModelDiscovery: true },
  },
});
