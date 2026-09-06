// Line plugin module implements group policy behavior.
import {
  buildChannelGroupsScopeTree,
  resolveScopeRequireMention,
} from "granted/plugin-sdk/channel-policy";
import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
import { resolveExactLineGroupConfigKey } from "./group-keys.js";

type LineGroupContext = { cfg: GrantedConfig; accountId?: string | null; groupId?: string | null };

export function resolveLineGroupRequireMention(params: LineGroupContext): boolean {
  const tree = buildChannelGroupsScopeTree(params.cfg, "line", params.accountId);
  const matchedKey = resolveExactLineGroupConfigKey({
    groups: tree.scopes,
    groupId: params.groupId,
  });
  return resolveScopeRequireMention({
    tree,
    path: matchedKey ? [matchedKey] : [],
  });
}
