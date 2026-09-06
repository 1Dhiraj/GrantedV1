// Telegram plugin module implements send behavior.
export { requireRuntimeConfig } from "granted/plugin-sdk/plugin-config-runtime";
export { resolveMarkdownTableMode } from "granted/plugin-sdk/markdown-table-runtime";
export type { GrantedConfig } from "granted/plugin-sdk/config-contracts";
export type { PollInput } from "granted/plugin-sdk/media-runtime";
export {
  buildOutboundMediaLoadOptions,
  getImageMetadata,
  normalizePollInput,
  probeVideoDimensions,
} from "granted/plugin-sdk/media-runtime";
export { loadWebMedia } from "granted/plugin-sdk/web-media";
