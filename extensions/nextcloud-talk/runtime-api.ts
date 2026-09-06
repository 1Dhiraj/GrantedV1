// Private runtime barrel for the bundled Nextcloud Talk extension.
// Keep this barrel thin and aligned with the local extension surface.

export type { AllowlistMatch } from "granted/plugin-sdk/allow-from";
export type { ChannelGroupContext } from "granted/plugin-sdk/channel-contract";
export { logInboundDrop } from "granted/plugin-sdk/channel-inbound";
export { createChannelPairingController } from "granted/plugin-sdk/channel-pairing";
export type {
  BlockStreamingCoalesceConfig,
  DmConfig,
  DmPolicy,
  GroupPolicy,
  GroupToolPolicyConfig,
  GrantedConfig,
} from "granted/plugin-sdk/config-contracts";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "granted/plugin-sdk/runtime-group-policy";
export { createChannelMessageReplyPipeline } from "granted/plugin-sdk/channel-outbound";
export type { OutboundReplyPayload } from "granted/plugin-sdk/reply-payload";
export { deliverFormattedTextWithAttachments } from "granted/plugin-sdk/reply-payload";
export type { PluginRuntime } from "granted/plugin-sdk/runtime-store";
export type { RuntimeEnv } from "granted/plugin-sdk/runtime";
export type { SecretInput } from "granted/plugin-sdk/secret-input";
export { fetchWithSsrFGuard } from "granted/plugin-sdk/ssrf-runtime";
export { setNextcloudTalkRuntime } from "./src/runtime.js";
