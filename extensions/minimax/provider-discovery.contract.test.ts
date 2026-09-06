// Minimax tests cover provider discovery.contract plugin behavior.
import { describeMinimaxProviderDiscoveryContract } from "granted/plugin-sdk/provider-test-contracts";

describeMinimaxProviderDiscoveryContract(() => import("./index.js"));
