import type { OutboundDeliveryResult } from "granted/plugin-sdk/channel-send-result";
import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
import type { ReplyPayload } from "granted/plugin-sdk/reply-runtime";
import { registerSignalApprovalReactionTargetForDeliveredPayload } from "./approval-reactions.js";
import { registerSignalQuestionReactionTargetForDeliveredPayload } from "./question-reactions.js";

export function registerSignalReactionTargetsForDeliveredPayload(params: {
  cfg: GrantedConfig;
  target: { channel: string; to: string; accountId?: string | null };
  payload: ReplyPayload;
  results: readonly OutboundDeliveryResult[];
  targetAuthor?: string | null;
  targetAuthorUuid?: string | null;
}): void {
  registerSignalQuestionReactionTargetForDeliveredPayload(params);
  registerSignalApprovalReactionTargetForDeliveredPayload(params);
}
