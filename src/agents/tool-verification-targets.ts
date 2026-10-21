import path from "node:path";

/** Resource identities recorded from executed arguments, never display summaries. */
export type ToolVerificationMetadata = {
  verificationTargets?: readonly string[];
  toolAction?: string;
};

function normalizeFileTarget(value: string): string {
  // Preserve POSIX case; Windows drive and UNC paths are case-insensitive.
  return /^[a-z]:[\\/]|^\\\\/i.test(value)
    ? path.win32.normalize(value).replaceAll("\\", "/").toLowerCase()
    : path.posix.normalize(value);
}

export function buildToolVerificationMetadata(
  toolName: string,
  args: Record<string, unknown>,
): ToolVerificationMetadata {
  const targets = new Set<string>();
  const normalizedName = toolName.trim().toLowerCase();
  for (const key of ["path", "file_path", "filePath"] as const) {
    const value = args[key];
    if (typeof value === "string" && value.trim()) {
      targets.add(`file:${normalizeFileTarget(value)}`);
    }
  }
  for (const key of ["targetId", "windowId", "title", "sessionKey"] as const) {
    const value = args[key];
    if (typeof value === "string" && value.trim()) {
      targets.add(`tool:${normalizedName}:${key}:${value.trim()}`);
    }
  }
  const action = typeof args.action === "string" ? args.action.trim().toLowerCase() : undefined;
  return {
    ...(targets.size ? { verificationTargets: [...targets].toSorted() } : {}),
    ...(action ? { toolAction: action } : {}),
  };
}
