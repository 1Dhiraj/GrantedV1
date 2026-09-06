// Google tests cover provider runtime.contract plugin behavior.
import { describeGoogleProviderRuntimeContract } from "granted/plugin-sdk/provider-test-contracts";

describeGoogleProviderRuntimeContract(() => import("./index.js"));
