import type { ComputerActResult } from "../plugins/computer-use-contract.js";
import { isPlainObject } from "../utils.js";
import { readToolResultDetails } from "./tool-result-error.js";

type ComputerEffect = NonNullable<ComputerActResult["effect"]>;
type ComputerEscalationTarget = NonNullable<
  ComputerActResult["escalation"]
>["recommended"];

const COMPUTER_EFFECTS = new Set<ComputerEffect>([
  "confirmed",
  "unverifiable",
  "suspected_noop",
]);
const COMPUTER_ROUTES = new Set([
  "accessibility",
  "synthetic_events",
  "global_input",
  "system_api",
  "dom",
  "trusted_input",
]);
const COMPUTER_DELIVERY_MODES = new Set([
  "background",
  "foreground",
  "not_applicable",
  "unknown",
]);
const COMPUTER_ESCALATION_TARGETS = new Set<ComputerEscalationTarget>([
  "window-pixel",
  "foreground",
  "desktop",
]);
const SAFE_REASON_CODE = /^[A-Za-z0-9_.:-]{1,120}$/u;

export type ComputerActionDiagnostic = {
  computerAction: string;
  computerEffect?: ComputerEffect;
  computerRoute?: string;
  computerDeliveryMode?: string;
  computerEscalation?: ComputerEscalationTarget;
  computerEscalationReason?: string;
};

function allowedString<const Value extends string>(
  value: unknown,
  allowed: ReadonlySet<Value>,
): Value | undefined {
  return typeof value === "string" && allowed.has(value as Value) ? (value as Value) : undefined;
}

/** Projects bounded, non-content computer outcome fields for metrics and support bundles. */
export function projectComputerActionDiagnostic(
  toolName: string,
  params: unknown,
  result: unknown,
): ComputerActionDiagnostic | undefined {
  if (toolName !== "computer" || !isPlainObject(params)) {
    return undefined;
  }
  const action = typeof params.action === "string" ? params.action.trim() : "";
  if (!action || action.length > 64) {
    return undefined;
  }

  const details = readToolResultDetails(result) ?? {};
  const nestedResult = isPlainObject(details.result) ? details.result : undefined;
  const driverDetails = isPlainObject(nestedResult?.details) ? nestedResult.details : undefined;
  const escalationValue = details.escalation ?? nestedResult?.escalation;
  const escalation = isPlainObject(escalationValue) ? escalationValue : undefined;
  const escalationReason = escalation?.reasonCode;
  const effect = allowedString(details.effect ?? nestedResult?.effect, COMPUTER_EFFECTS);
  const route = allowedString(details.route ?? driverDetails?.route, COMPUTER_ROUTES);
  const deliveryMode = allowedString(
    details.deliveryMode ?? driverDetails?.deliveryMode,
    COMPUTER_DELIVERY_MODES,
  );
  const escalationTarget = allowedString(
    escalation?.recommended,
    COMPUTER_ESCALATION_TARGETS,
  );
  return {
    computerAction: action,
    ...(effect ? { computerEffect: effect } : {}),
    ...(route ? { computerRoute: route } : {}),
    ...(deliveryMode ? { computerDeliveryMode: deliveryMode } : {}),
    ...(escalationTarget ? { computerEscalation: escalationTarget } : {}),
    ...(typeof escalationReason === "string" && SAFE_REASON_CODE.test(escalationReason)
      ? { computerEscalationReason: escalationReason }
      : {}),
  };
}
