// Anthropic tests cover provider runtime.contract plugin behavior.
import { describeAnthropicProviderRuntimeContract } from "granted/plugin-sdk/provider-test-contracts";

describeAnthropicProviderRuntimeContract(() => import("./index.js"));
