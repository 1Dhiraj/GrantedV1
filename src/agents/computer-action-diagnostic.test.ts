import { describe, expect, it } from "vitest";
import { projectComputerActionDiagnostic } from "./computer-action-diagnostic.js";

describe("computer action diagnostics", () => {
  it("projects bounded driver outcome fields", () => {
    expect(
      projectComputerActionDiagnostic(
        "computer",
        { action: "set_value", value: "secret user content" },
        {
          details: {
            effect: "suspected_noop",
            route: "accessibility",
            deliveryMode: "background",
            escalation: { recommended: "foreground", reasonCode: "delivery_failed" },
          },
        },
      ),
    ).toEqual({
      computerAction: "set_value",
      computerEffect: "suspected_noop",
      computerRoute: "accessibility",
      computerDeliveryMode: "background",
      computerEscalation: "foreground",
      computerEscalationReason: "delivery_failed",
    });
  });

  it("reads direct-observation outcomes nested under result", () => {
    expect(
      projectComputerActionDiagnostic("computer", { action: "get_window_state" }, {
        details: {
          result: {
            effect: "confirmed",
            details: { route: "system_api", deliveryMode: "not_applicable" },
          },
        },
      }),
    ).toEqual({
      computerAction: "get_window_state",
      computerEffect: "confirmed",
      computerRoute: "system_api",
      computerDeliveryMode: "not_applicable",
    });
  });

  it("drops content and unknown driver values", () => {
    expect(
      projectComputerActionDiagnostic("computer", { action: "type", text: "private text" }, {
        details: {
          effect: "invented",
          route: "untrusted-route",
          escalation: { recommended: "unknown", reasonCode: "contains spaces" },
        },
      }),
    ).toEqual({ computerAction: "type" });
    expect(projectComputerActionDiagnostic("browser", { action: "click" }, {})).toBeUndefined();
  });
});
