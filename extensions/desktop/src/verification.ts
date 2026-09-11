export const DESKTOP_VERIFY_CONDITIONS = ["element_exists", "element_absent"] as const;

export type DesktopVerifyCondition = (typeof DESKTOP_VERIFY_CONDITIONS)[number];

type VerificationRequest = {
  title: string;
  name: string;
  role?: string;
  condition?: string;
  timeoutMs?: number;
};

export function normalizeDesktopTimeout(timeoutMs: number | undefined): number {
  if (timeoutMs === undefined || !Number.isFinite(timeoutMs)) {
    return 10_000;
  }
  return Math.max(1, Math.min(Math.trunc(timeoutMs), 30_000));
}

export function buildDesktopVerificationRequest(request: VerificationRequest): {
  args: {
    title: string;
    name: string;
    role: string | undefined;
    timeoutMs: number;
    requirePresent: boolean;
  };
  processTimeoutMs: number;
} {
  const condition = request.condition ?? "element_exists";
  if (!DESKTOP_VERIFY_CONDITIONS.includes(condition as DesktopVerifyCondition)) {
    throw new Error(`desktop: unknown verification condition "${condition}".`);
  }
  const timeoutMs = normalizeDesktopTimeout(request.timeoutMs);
  return {
    args: {
      title: request.title,
      name: request.name,
      role: request.role,
      timeoutMs,
      requirePresent: condition === "element_exists",
    },
    processTimeoutMs: timeoutMs + 15_000,
  };
}
