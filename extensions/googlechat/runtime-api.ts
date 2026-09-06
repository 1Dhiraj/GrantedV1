// Private runtime barrel for the bundled Google Chat extension.
// Keep this barrel thin and avoid broad plugin-sdk surfaces during bootstrap.

export { DEFAULT_ACCOUNT_ID } from "granted/plugin-sdk/account-id";
export {
  createActionGate,
  jsonResult,
  readNumberParam,
  readReactionParams,
  readStringParam,
} from "granted/plugin-sdk/channel-actions";
export { buildChannelConfigSchema, GoogleChatConfigSchema } from "./config-api.js";
export type {
  ChannelMessageActionAdapter,
  ChannelMessageActionName,
  ChannelStatusIssue,
} from "granted/plugin-sdk/channel-contract";
export { missingTargetError } from "granted/plugin-sdk/channel-feedback";
export {
  createAccountStatusSink,
  runPassiveAccountLifecycle,
} from "granted/plugin-sdk/channel-outbound";
export { createChannelPairingController } from "granted/plugin-sdk/channel-pairing";
export { createChannelMessageReplyPipeline } from "granted/plugin-sdk/channel-outbound";
export { PAIRING_APPROVED_MESSAGE } from "granted/plugin-sdk/channel-status";
export { chunkTextForOutbound } from "granted/plugin-sdk/text-chunking";
export type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "granted/plugin-sdk/runtime-group-policy";
export { isDangerousNameMatchingEnabled } from "granted/plugin-sdk/dangerous-name-runtime";
export type { PluginRuntime } from "granted/plugin-sdk/runtime-store";
export { fetchWithSsrFGuard } from "granted/plugin-sdk/ssrf-runtime";
export type {
  GoogleChatAccountConfig,
  GoogleChatConfig,
} from "granted/plugin-sdk/config-contracts";
export { extractToolSend } from "granted/plugin-sdk/tool-send";
export { resolveInboundMentionDecision } from "granted/plugin-sdk/channel-inbound";
export { resolveWebhookPath } from "granted/plugin-sdk/webhook-ingress";
export {
  registerWebhookTargetWithPluginRoute,
  resolveWebhookTargetWithAuthOrReject,
  withResolvedWebhookRequestPipeline,
} from "granted/plugin-sdk/webhook-targets";
export {
  createWebhookInFlightLimiter,
  readJsonWebhookBodyOrReject,
  type WebhookInFlightLimiter,
} from "granted/plugin-sdk/webhook-request-guards";
export { setGoogleChatRuntime } from "./src/runtime.js";
