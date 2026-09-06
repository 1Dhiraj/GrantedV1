/**
 * Browser-local SDK setup/tooling bridge for CLI, media, and action helpers.
 */
export {
  callGatewayTool,
  hasGatewayToolRoutingContext,
  listNodes,
  resolveNodeIdFromList,
} from "granted/plugin-sdk/agent-harness-runtime";
export type { AnyAgentTool } from "granted/plugin-sdk/agent-harness-runtime";
export {
  imageResultFromFile,
  jsonResult,
  readPositiveIntegerParam,
  readStringParam,
} from "granted/plugin-sdk/channel-actions";
export { formatCliCommand, note } from "granted/plugin-sdk/cli-runtime";
export {
  IMAGE_REDUCE_QUALITY_STEPS,
  buildImageResizeSideGrid,
  getImageMetadata,
  isImageProcessorUnavailableError,
  resizeToJpeg,
} from "granted/plugin-sdk/media-runtime";
export { detectMime } from "granted/plugin-sdk/media-mime";
export { ensureMediaDir, saveMediaBuffer } from "granted/plugin-sdk/media-runtime";
export { describeImageFile } from "granted/plugin-sdk/media-understanding-runtime";
