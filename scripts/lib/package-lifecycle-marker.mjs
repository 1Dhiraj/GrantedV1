export const PACKAGE_LIFECYCLE_MARKER_CONTRACT_RELATIVE_PATH =
  "scripts/lib/package-lifecycle-marker.mjs";
export const PACKAGE_LIFECYCLE_PENDING_RELATIVE_PATH = ".granted-lifecycle-pending";
export const PACKAGE_LIFECYCLE_LOCK_RELATIVE_PATH = ".granted-lifecycle-lock";
const LEGACY_PROJECT_NAME = ["open", "claw"].join("");
export const LEGACY_PACKAGE_LIFECYCLE_PENDING_RELATIVE_PATH = `.${LEGACY_PROJECT_NAME}-lifecycle-pending`;
// 2026.8.1 shipped this path. Remove after the supported upgrade floor moves past that release.
export const LEGACY_PACKAGE_INSTALL_GUARD_RELATIVE_PATH = `dist/${LEGACY_PROJECT_NAME}-install-guard`;
