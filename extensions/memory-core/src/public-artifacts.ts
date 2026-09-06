// Memory Core plugin module implements public artifacts behavior.
import {
  listMemoryHostPublicArtifacts,
  type MemoryPluginPublicArtifact,
} from "granted/plugin-sdk/memory-host-core";
import type { GrantedConfig } from "../api.js";

export async function listMemoryCorePublicArtifacts(params: {
  cfg: GrantedConfig;
}): Promise<MemoryPluginPublicArtifact[]> {
  return await listMemoryHostPublicArtifacts(params);
}
