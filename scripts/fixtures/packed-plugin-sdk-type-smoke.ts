// Packed Plugin Sdk Type Smoke script supports OpenClaw repository automation.
import type { ChannelMessagingAdapter } from "granted/plugin-sdk/core";
type PublicPluginSdkModules = [
  typeof import("granted/plugin-sdk/core"),
  typeof import("granted/plugin-sdk/channel-entry-contract"),
  typeof import("granted/plugin-sdk/config-contracts"),
  typeof import("granted/plugin-sdk/plugin-entry"),
  typeof import("granted/plugin-sdk/runtime-env"),
];

const resolvedModules = null as unknown as PublicPluginSdkModules;
const routeOwnerResolver: NonNullable<
  ChannelMessagingAdapter["resolveConversationRouteOwner"]
> = () => ({ kind: "unavailable" });

void resolvedModules;
void routeOwnerResolver;
