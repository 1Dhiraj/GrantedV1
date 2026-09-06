// Venice tests cover provider runtime.contract plugin behavior.
import { describeVeniceProviderRuntimeContract } from "granted/plugin-sdk/provider-test-contracts";
import manifest from "./openclaw.plugin.json" with { type: "json" };

describeVeniceProviderRuntimeContract(
  () => import("./index.js"),
  manifest.modelCatalog.providers.venice,
);
