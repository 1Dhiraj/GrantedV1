// Imessage API module exposes the plugin public contract.
import type { GrantedConfig as RuntimeApiOpenClawConfig } from "granted/plugin-sdk/config-contracts";

export {
  DEFAULT_ACCOUNT_ID,
  getChatChannelMeta,
  type ChannelPlugin,
} from "granted/plugin-sdk/core";
export { buildChannelConfigSchema, IMessageConfigSchema } from "./config-api.js";
export { PAIRING_APPROVED_MESSAGE } from "granted/plugin-sdk/channel-status";
export {
  buildComputedAccountStatusSnapshot,
  collectStatusIssuesFromLastError,
} from "granted/plugin-sdk/status-helpers";
export { formatTrimmedAllowFromEntries } from "granted/plugin-sdk/channel-config-helpers";
export {
  resolveIMessageConfigAllowFrom,
  resolveIMessageConfigDefaultTo,
} from "./src/config-accessors.js";
export { looksLikeIMessageTargetId, normalizeIMessageMessagingTarget } from "./src/normalize.js";
export { resolveChannelMediaMaxBytes } from "granted/plugin-sdk/account-helpers";
export {
  resolveIMessageGroupRequireMention,
  resolveIMessageGroupToolPolicy,
} from "./src/group-policy.js";

export { monitorIMessageProvider } from "./src/monitor.js";
export type { MonitorIMessageOpts } from "./src/monitor.js";
export { probeIMessage } from "./src/probe.js";
export type { IMessageProbe } from "./src/probe.js";
export { sendMessageIMessage } from "./src/send.js";
export { imessageMessageActions } from "./src/actions.js";
export { setIMessageRuntime } from "./src/runtime.js";
export { chunkTextForOutbound } from "granted/plugin-sdk/text-chunking";
export type IMessageAccountConfig = Omit<
  NonNullable<NonNullable<RuntimeApiOpenClawConfig["channels"]>["imessage"]>,
  "accounts" | "defaultAccount"
>;
