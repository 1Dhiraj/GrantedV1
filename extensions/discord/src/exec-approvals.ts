// Discord plugin module implements exec approvals behavior.
import type { ChannelOutboundPayloadHint } from "granted/plugin-sdk/channel-contract";
import type {
  GrantedConfig,
  DiscordExecApprovalConfig,
} from "granted/plugin-sdk/config-contracts";
import type { ReplyPayload } from "granted/plugin-sdk/reply-dispatch-runtime";
import { resolveDiscordAccount } from "./accounts.js";
import {
  getExecApprovalReplyMetadata,
  isChannelExecApprovalClientEnabledFromConfig,
  matchesApprovalRequestFilters,
  resolveApprovalApprovers,
} from "./approval-runtime.js";
import { parseDiscordTarget } from "./target-parsing.js";

function normalizeDiscordApproverId(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const target = parseDiscordTarget(trimmed);
    return target?.kind === "user" ? target.id : undefined;
  } catch {
    return undefined;
  }
}

function resolveDiscordOwnerApprovers(cfg: GrantedConfig): string[] {
  const ownerAllowFrom = cfg.commands?.ownerAllowFrom;
  if (!Array.isArray(ownerAllowFrom) || ownerAllowFrom.length === 0) {
    return [];
  }
  return resolveApprovalApprovers({
    explicit: ownerAllowFrom,
    normalizeApprover: (value) => normalizeDiscordApproverId(String(value)),
  });
}

export function getDiscordExecApprovalApprovers(params: {
  cfg: GrantedConfig;
  accountId?: string | null;
  configOverride?: DiscordExecApprovalConfig | null;
}): string[] {
  return resolveApprovalApprovers({
    explicit:
      params.configOverride?.approvers ??
      resolveDiscordAccount(params).config.execApprovals?.approvers ??
      resolveDiscordOwnerApprovers(params.cfg),
    normalizeApprover: (value) => normalizeDiscordApproverId(String(value)),
  });
}

export function isDiscordExecApprovalClientEnabled(params: {
  cfg: GrantedConfig;
  accountId?: string | null;
  configOverride?: DiscordExecApprovalConfig | null;
}): boolean {
  const config = params.configOverride ?? resolveDiscordAccount(params).config.execApprovals;
  return isChannelExecApprovalClientEnabledFromConfig({
    enabled: config?.enabled,
    approverCount: getDiscordExecApprovalApprovers({
      cfg: params.cfg,
      accountId: params.accountId,
      configOverride: params.configOverride,
    }).length,
  });
}

export function isDiscordExecApprovalApprover(params: {
  cfg: GrantedConfig;
  accountId?: string | null;
  senderId?: string | null;
  configOverride?: DiscordExecApprovalConfig | null;
}): boolean {
  const senderId = params.senderId?.trim();
  if (!senderId) {
    return false;
  }
  return getDiscordExecApprovalApprovers({
    cfg: params.cfg,
    accountId: params.accountId,
    configOverride: params.configOverride,
  }).includes(senderId);
}

export function shouldSuppressLocalDiscordExecApprovalPrompt(params: {
  cfg: GrantedConfig;
  accountId?: string | null;
  payload: ReplyPayload;
  hint?: ChannelOutboundPayloadHint;
}): boolean {
  const metadata = getExecApprovalReplyMetadata(params.payload);
  const config = resolveDiscordAccount(params).config.execApprovals;
  return (
    params.hint?.kind === "approval-pending" &&
    params.hint.nativeRouteActive === true &&
    isDiscordExecApprovalClientEnabled(params) &&
    metadata !== null &&
    matchesApprovalRequestFilters({
      request: {
        agentId: metadata.agentId,
        sessionKey: metadata.sessionKey,
      },
      agentFilter: config?.agentFilter,
      sessionFilter: config?.sessionFilter,
    })
  );
}
