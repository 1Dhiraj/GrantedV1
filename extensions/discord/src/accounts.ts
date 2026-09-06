// Discord plugin module implements accounts behavior.
import {
  createAccountActionGate,
  createAccountListHelpers,
} from "granted/plugin-sdk/account-helpers";
import { normalizeAccountId } from "granted/plugin-sdk/account-id";
import {
  mapAllowFromEntries,
  normalizeChannelDmPolicy,
  type ChannelDmPolicy,
} from "granted/plugin-sdk/channel-config-helpers";
import { resolveConfiguredFromCredentialStatuses } from "granted/plugin-sdk/channel-status";
import type {
  DiscordAccountConfig,
  DiscordActionConfig,
  GrantedConfig,
} from "granted/plugin-sdk/config-contracts";
import { resolveAccountEntry } from "granted/plugin-sdk/routing";
import { normalizeOptionalString } from "granted/plugin-sdk/string-coerce-runtime";
import { resolveDiscordAccountAvailability } from "./account-token-inspect.js";
import { selectDiscordRuntimeConfig } from "./runtime-config.js";
import { resolveDiscordToken, type DiscordCredentialStatus } from "./token.js";

export type ResolvedDiscordAccount = {
  accountId: string;
  enabled: boolean;
  name?: string;
  token: string;
  tokenSource: "env" | "config" | "none";
  tokenStatus: DiscordCredentialStatus;
  config: DiscordAccountConfig;
};

const {
  listAccountIds,
  resolveDefaultAccountId,
  resolveAccountConfig: resolveMergedDiscordAccountConfig,
} = createAccountListHelpers<DiscordAccountConfig>("discord", {
  implicitDefaultAccount: {
    channelKeys: ["token"],
    envVars: ["DISCORD_BOT_TOKEN"],
  },
  nestedObjectKeys: ["activities", "agentComponents", "botLoopProtection"],
});
export const listDiscordAccountIds = listAccountIds;
export const resolveDefaultDiscordAccountId = resolveDefaultAccountId;

export function resolveDiscordAccountConfig(
  cfg: GrantedConfig,
  accountId: string,
): DiscordAccountConfig | undefined {
  return resolveAccountEntry(cfg.channels?.discord?.accounts, accountId);
}

export function mergeDiscordAccountConfig(
  cfg: GrantedConfig,
  accountId: string,
): DiscordAccountConfig {
  return resolveMergedDiscordAccountConfig(cfg, accountId);
}

export function resolveDiscordAccountAllowFrom(params: {
  cfg: GrantedConfig;
  accountId?: string | null;
}): string[] | undefined {
  const accountId = normalizeAccountId(
    params.accountId ?? resolveDefaultDiscordAccountId(params.cfg),
  );
  const accountConfig = resolveDiscordAccountConfig(params.cfg, accountId);
  const rootConfig = params.cfg.channels?.discord as DiscordAccountConfig | undefined;
  const allowFrom = accountConfig?.allowFrom ?? rootConfig?.allowFrom;
  return allowFrom ? mapAllowFromEntries(allowFrom) : undefined;
}

export function resolveDiscordAccountDmPolicy(params: {
  cfg: GrantedConfig;
  accountId?: string | null;
}): ChannelDmPolicy | undefined {
  const accountId = normalizeAccountId(
    params.accountId ?? resolveDefaultDiscordAccountId(params.cfg),
  );
  const accountConfig = resolveDiscordAccountConfig(params.cfg, accountId);
  const rootConfig = params.cfg.channels?.discord as DiscordAccountConfig | undefined;
  return normalizeChannelDmPolicy(accountConfig?.dmPolicy ?? rootConfig?.dmPolicy ?? "pairing");
}

export function createDiscordActionGate(params: {
  cfg: GrantedConfig;
  accountId?: string | null;
}): (key: keyof DiscordActionConfig, defaultValue?: boolean) => boolean {
  const accountId = normalizeAccountId(
    params.accountId ?? resolveDefaultDiscordAccountId(params.cfg),
  );
  return createAccountActionGate({
    baseActions: params.cfg.channels?.discord?.actions,
    accountActions: resolveDiscordAccountConfig(params.cfg, accountId)?.actions,
  });
}

export function resolveDiscordAccount(params: {
  cfg: GrantedConfig;
  accountId?: string | null;
}): ResolvedDiscordAccount {
  const cfg = selectDiscordRuntimeConfig(params.cfg);
  const accountId = normalizeAccountId(params.accountId ?? resolveDefaultDiscordAccountId(cfg));
  const baseEnabled = cfg.channels?.discord?.enabled !== false;
  const merged = mergeDiscordAccountConfig(cfg, accountId);
  const accountEnabled = merged.enabled !== false;
  const enabled = baseEnabled && accountEnabled;
  const tokenResolution = resolveDiscordToken(cfg, { accountId });
  return {
    accountId,
    enabled,
    name: normalizeOptionalString(merged.name),
    token: tokenResolution.token,
    tokenSource: tokenResolution.source,
    tokenStatus: tokenResolution.tokenStatus,
    config: merged,
  };
}

export function resolveDiscordMaxLinesPerMessage(params: {
  cfg: GrantedConfig;
  discordConfig?: DiscordAccountConfig | null;
  accountId?: string | null;
}): number | undefined {
  if (typeof params.discordConfig?.maxLinesPerMessage === "number") {
    return params.discordConfig.maxLinesPerMessage;
  }
  return resolveDiscordAccount({
    cfg: params.cfg,
    accountId: params.accountId,
  }).config.maxLinesPerMessage;
}

function inspectDiscordRuntimeAvailability(account: ResolvedDiscordAccount, cfg: GrantedConfig) {
  return resolveDiscordAccountAvailability({
    account,
    resolveAccounts: () =>
      listDiscordAccountIds(cfg).map((accountId) => resolveDiscordAccount({ cfg, accountId })),
  });
}

export function isDiscordAccountEnabledForRuntime(
  account: ResolvedDiscordAccount,
  cfg: GrantedConfig,
): boolean {
  return inspectDiscordRuntimeAvailability(account, cfg).enabled;
}

export function resolveDiscordAccountDisabledReason(
  account: ResolvedDiscordAccount,
  cfg: GrantedConfig,
): string {
  return inspectDiscordRuntimeAvailability(account, cfg).stateReason ?? "disabled";
}

export function listEnabledDiscordAccounts(cfg: GrantedConfig): ResolvedDiscordAccount[] {
  return listDiscordAccountIds(cfg)
    .map((accountId) => resolveDiscordAccount({ cfg, accountId }))
    .filter((account) => isDiscordAccountEnabledForRuntime(account, cfg));
}

export function listDiscordStartupAccountIds(cfg: GrantedConfig): string[] {
  const startupAccountIds = listEnabledDiscordAccounts(cfg)
    .filter(
      (candidate) =>
        resolveConfiguredFromCredentialStatuses(candidate) ??
        Boolean(normalizeOptionalString(candidate.token)),
    )
    .map((candidate) => candidate.accountId);
  const defaultAccountId = resolveDefaultDiscordAccountId(cfg);
  // Promote only a gateway-eligible account; otherwise a disabled or unconfigured
  // default would waste the immediate startup slot while a real bot waits.
  if (!startupAccountIds.includes(defaultAccountId)) {
    return startupAccountIds;
  }
  return [
    defaultAccountId,
    ...startupAccountIds.filter((candidateId) => candidateId !== defaultAccountId),
  ];
}
