import crypto from "node:crypto";
import { stableStringify } from "@openclaw/normalization-core";
import { redactConfigObject } from "../../config/redact-snapshot.js";
import type { GrantedConfig } from "../../config/types.openclaw.js";

let configFingerprints = new WeakMap<GrantedConfig, string>();

export function fingerprintSkillSnapshotConfig(config: GrantedConfig): string {
  const cached = configFingerprints.get(config);
  if (cached) {
    return cached;
  }
  const fingerprint = crypto
    .createHash("sha256")
    .update(stableStringify(redactConfigObject(config)))
    .digest("hex");
  configFingerprints.set(config, fingerprint);
  return fingerprint;
}

export function resetSkillSnapshotConfigFingerprintCache(): void {
  configFingerprints = new WeakMap();
}
