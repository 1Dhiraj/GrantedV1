// Zai tests cover provider runtime.contract plugin behavior.
import { describeZAIProviderRuntimeContract } from "granted/plugin-sdk/provider-test-contracts";

describeZAIProviderRuntimeContract(() => import("./index.js"));
