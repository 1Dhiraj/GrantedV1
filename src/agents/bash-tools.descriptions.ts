/**
 * Tool descriptions for bash exec and process-control tools.
 * Descriptions include platform-specific guidance and approved executable
 * hints that are safe to show to the model.
 */
import path from "node:path";
import { loadExecApprovals, resolveExecApprovalsFromFile } from "../infra/exec-approvals.js";

/**
 * Show the exact approved token in hints. Absolute paths stay absolute so the
 * hint cannot imply an equivalent PATH lookup that resolves to a different binary.
 */
function deriveExecShortName(fullPath: string): string {
  if (path.isAbsolute(fullPath)) {
    return fullPath;
  }
  const base = path.basename(fullPath);
  return base.replace(/\.exe$/i, "") || base;
}

// Weaker models given a shell tool still answer "run this command" or claim to
// be on a remote server. Where the command lands (this host, a sandbox, or a
// paired node) is decided per call, so this says only what is always true.
const EXEC_OPERATOR_FRAMING =
  "Commands really run (this host, or a sandbox/node when routed). Asked to run, open, install, or check something: do it here; never tell the user what to type.";

/** Builds the model-facing exec tool description for the current platform/config. */
export function describeExecTool(params?: {
  agentId?: string;
  hasCronTool?: boolean;
  hasProcessTool?: boolean;
}): string {
  const continuation =
    params?.hasProcessTool === false
      ? ["Run shell and wait for completion."]
      : [
          "Run shell now; background continuation supported.",
          "Use yieldMs/background, then process for logs/status/input/intervention.",
          "Long run: automatic completion wake when enabled and output/failure occurs; otherwise process confirms completion.",
        ];
  const base = [
    EXEC_OPERATOR_FRAMING,
    ...continuation,
    params?.hasCronTool ? "No sleep loops for reminders/follow-ups; use automations." : undefined,
    "TTY CLI/UI/coding agent: pty=true.",
  ]
    .filter(Boolean)
    .join(" ");
  if (process.platform !== "win32") {
    return `${base} Quote arguments containing shell metacharacters, including URL query strings with \`?\` or \`&\`.`;
  }
  const lines: string[] = [base];
  lines.push(
    "IMPORTANT (Windows): Run executables directly; do NOT wrap commands in `cmd /c`, `powershell -Command`, `& ` prefix, or WSL. Use backslash paths (C:\\path), not forward slashes. Use short executable names (e.g. `node`, `python3`) instead of full paths.",
  );
  try {
    const approvalsFile = loadExecApprovals();
    const approvals = resolveExecApprovalsFromFile({
      file: approvalsFile,
      agentId: params?.agentId,
    });
    const allowlist = approvals.allowlist.filter((entry) => {
      const pattern = entry.pattern?.trim() ?? "";
      return (
        pattern.length > 0 &&
        pattern !== "*" &&
        !pattern.startsWith("=command:") &&
        (pattern.includes("/") || pattern.includes("\\") || pattern.includes("~"))
      );
    });
    if (allowlist.length > 0) {
      lines.push(
        "Pre-approved executables (exact arguments are enforced at runtime; no approval prompt needed when args match):",
      );
      for (const entry of allowlist.slice(0, 10)) {
        const shortName = deriveExecShortName(entry.pattern);
        const argNote = entry.argPattern ? "(restricted args)" : "(any arguments)";
        lines.push(`  ${shortName} ${argNote}`);
      }
    }
  } catch {
    // Allowlist loading is best-effort; don't block tool creation.
  }
  return lines.join("\n");
}

/** Builds the model-facing process-control tool description. */
export function describeProcessTool(params?: { hasCronTool?: boolean }): string {
  return [
    "Control existing exec: list, poll, log, write, send-keys, submit, paste, kill.",
    "poll/log: status, output, quiet success, completion without auto-wake, input hints. Others: input/intervention.",
    params?.hasCronTool
      ? "No polling as timer/reminder; scheduled follow-up uses automations."
      : undefined,
  ]
    .filter(Boolean)
    .join(" ");
}
