// Discord plugin module implements approval runtime behavior.
export {
  isChannelExecApprovalClientEnabledFromConfig,
  matchesApprovalRequestFilters,
  getExecApprovalReplyMetadata,
} from "granted/plugin-sdk/approval-client-runtime";
export { resolveApprovalApprovers } from "granted/plugin-sdk/approval-auth-runtime";
export { createApproverRestrictedNativeApprovalCapability } from "granted/plugin-sdk/approval-delivery-runtime";
export {
  createChannelApproverDmTargetResolver,
  createChannelNativeOriginTargetResolver,
} from "granted/plugin-sdk/approval-native-runtime";
