// Private runtime barrel for the bundled Feishu extension.
// Keep this barrel thin and generic-only.

export type {
  AllowlistMatch,
  AnyAgentTool,
  BaseProbeResult,
  ChannelGroupContext,
  ChannelMessageActionName,
  ChannelMeta,
  ChannelOutboundAdapter,
  ChannelPlugin,
  HistoryEntry,
  GrantedConfig,
  GrantedPluginApi,
  OutboundIdentity,
  PluginRuntime,
  ReplyPayload,
} from "granted/plugin-sdk/core";
export type { GrantedConfig as ClawdbotConfig } from "granted/plugin-sdk/core";
export type RuntimeEnv = {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  exit: (code: number) => void;
};
export type { GroupToolPolicyConfig } from "granted/plugin-sdk/config-contracts";
export {
  DEFAULT_ACCOUNT_ID,
  buildChannelConfigSchema,
  createActionGate,
  createDedupeCache,
} from "granted/plugin-sdk/core";
export {
  PAIRING_APPROVED_MESSAGE,
  buildProbeChannelStatusSummary,
  createDefaultChannelRuntimeState,
} from "granted/plugin-sdk/channel-status";
export { createChannelPairingController } from "granted/plugin-sdk/channel-pairing";
export { createReplyPrefixContext } from "granted/plugin-sdk/channel-outbound";
export {
  evaluateSupplementalContextVisibility,
  filterSupplementalContextItems,
  resolveChannelContextVisibilityMode,
} from "granted/plugin-sdk/context-visibility-runtime";
export { getSessionEntry } from "granted/plugin-sdk/session-store-runtime";
export { readJsonFileWithFallback } from "granted/plugin-sdk/json-store";
export { normalizeAgentId } from "granted/plugin-sdk/routing";
export { chunkTextForOutbound } from "granted/plugin-sdk/text-chunking";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
  requestBodyErrorToText,
} from "granted/plugin-sdk/webhook-ingress";
export { setFeishuRuntime } from "./src/runtime.js";
