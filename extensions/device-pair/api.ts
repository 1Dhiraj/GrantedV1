// Device Pair API module exposes the plugin public contract.
export {
  approveDevicePairing,
  clearDeviceBootstrapTokens,
  issueDeviceBootstrapToken,
  PAIRING_SETUP_BOOTSTRAP_PROFILE,
  listDevicePairing,
  revokeDeviceBootstrapToken,
  type DeviceBootstrapProfile,
} from "granted/plugin-sdk/device-bootstrap";
export { definePluginEntry, type GrantedPluginApi } from "granted/plugin-sdk/plugin-entry";
export {
  resolveGatewayBindUrl,
  resolveTailnetHostWithRunner,
  resolveTailscaleServeGatewayUrlsWithRunner,
} from "granted/plugin-sdk/core";
export { resolveAdvertisedLanHost } from "granted/plugin-sdk/gateway-runtime";
export {
  resolvePreferredGrantedTmpDir,
  runPluginCommandWithTimeout,
} from "granted/plugin-sdk/sandbox";
export { resolveGatewayPort } from "granted/plugin-sdk/gateway-config-runtime";
export { renderQrPngBase64, renderQrPngDataUrl, writeQrPngTempFile } from "./qr-image.js";
