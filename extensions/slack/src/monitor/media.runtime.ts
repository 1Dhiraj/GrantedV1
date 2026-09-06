// Slack plugin module implements media behavior.
import { createSubsystemLogger } from "granted/plugin-sdk/runtime-env";

export const slackMediaLog = createSubsystemLogger("gateway/channels/slack").child("media");
export { fetchWithRuntimeDispatcher } from "granted/plugin-sdk/runtime-fetch";
export type { FetchLike } from "granted/plugin-sdk/media-runtime";
export { saveRemoteMedia } from "granted/plugin-sdk/media-runtime";
