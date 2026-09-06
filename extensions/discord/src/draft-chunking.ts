// Discord plugin module implements draft chunking behavior.
import {
  resolveChannelDraftStreamingChunking,
  type ChannelDraftStreamingChunking,
} from "granted/plugin-sdk/channel-outbound";
import type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
import { DISCORD_TEXT_CHUNK_LIMIT } from "./outbound-adapter.js";

export function resolveDiscordDraftStreamingChunking(
  cfg: GrantedConfig,
  accountId?: string | null,
): ChannelDraftStreamingChunking {
  return resolveChannelDraftStreamingChunking(cfg, "discord", accountId, {
    fallbackLimit: DISCORD_TEXT_CHUNK_LIMIT,
  });
}
