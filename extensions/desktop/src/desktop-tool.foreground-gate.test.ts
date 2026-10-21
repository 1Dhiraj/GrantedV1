import { describe, expect, it, vi } from "vitest";
import { createDesktopTool } from "./desktop-tool.js";
import { SNAPSHOT_SCRIPT, READ_SCRIPT, PATTERN_SCRIPT } from "./scripts.js";

/**
 * The foreground gate exists because a description was not enough.
 *
 * The tool already told the model that settext writes in the background and
 * that type seizes the real keyboard. The model read that, judged the GUI route
 * simpler, and typed anyway - so a user watching their own screen lost control
 * of it mid-task and the run aborted the moment they touched the mouse.
 *
 * These tests pin the structural version: the kinds that drive synthesized
 * input refuse unless the caller explicitly asks for the foreground, and the
 * refusal names the background action that would have worked.
 */

function toolWithFakeShell() {
  const runPowerShellJson = vi.fn(async () => ({ ok: true }));
  const tool = createDesktopTool({
    platform: "win32",
    runPowerShellJson: runPowerShellJson as never,
  });
  return { tool, runPowerShellJson };
}

async function act(tool: ReturnType<typeof createDesktopTool>, params: Record<string, unknown>) {
  // jsonResult carries the payload on `details` as well as stringifying it into
  // `content`, so read the object rather than re-parsing the rendered text.
  const result = (await tool.execute("call-1", { action: "act", ...params } as never)) as {
    details?: Record<string, unknown>;
  };
  return result.details ?? {};
}

describe("desktop foreground gate", () => {
  it.each([
    { backgroundActions: ["invoke"], expected: 'backgroundActions=["invoke"]' },
    { backgroundActions: [], expected: "backgroundActions=[]" },
    { backgroundActions: undefined, expected: "backgroundActions=unknown" },
  ])(
    "exposes observed control capabilities without inferring them from role: $expected",
    async ({ backgroundActions, expected }) => {
      const runPowerShellJson = vi.fn(async () => ({
        ok: true,
        window: { title: "Target", processId: 123 },
        elements: [
          {
            role: "Button",
            name: "Custom",
            value: null,
            x: 0,
            y: 0,
            w: 0,
            h: 0,
            enabled: true,
            backgroundActions,
          },
        ],
      }));
      const tool = createDesktopTool({
        platform: "win32",
        runPowerShellJson: runPowerShellJson as never,
      });
      const result = await tool.execute("snapshot", {
        action: "snapshot",
        title: "Target",
      } as never);
      expect(result.content).toEqual([
        expect.objectContaining({ type: "text", text: expect.stringContaining(expected) }),
      ]);
      expect(runPowerShellJson).toHaveBeenCalledOnce();
    },
  );

  it.each(["snapshot", "find", "wait", "verify", "window", "screenshot"])(
    "requires a background window target for %s instead of following the foreground",
    async (action) => {
      const { tool, runPowerShellJson } = toolWithFakeShell();
      const result = await tool.execute("target", { action, window: true } as never);
      expect(result.details).toMatchObject({ ok: false, refused: "background-target-required" });
      expect(runPowerShellJson).not.toHaveBeenCalled();
    },
  );

  it("allows intentionally inspecting the foreground window", async () => {
    const { tool, runPowerShellJson } = toolWithFakeShell();
    await tool.execute("snapshot", { action: "snapshot", foreground: true } as never);
    expect(runPowerShellJson).toHaveBeenCalledOnce();
  });

  it("does not activate the target while snapshotting, and records stable identities", () => {
    expect(SNAPSHOT_SCRIPT).not.toContain("[DeskNative]::FocusWindow($h)");
    expect(SNAPSHOT_SCRIPT).toContain("runtimeId = ($el.GetRuntimeId() -join ',')");
    expect(READ_SCRIPT).toContain("$el = Resolve-Element $A");
    expect(PATTERN_SCRIPT).toContain("$el = Resolve-Element $A");
  });

  it("refuses coordinate-only background invocation", async () => {
    const { tool, runPowerShellJson } = toolWithFakeShell();
    await expect(act(tool, { kind: "invoke", x: 10, y: 20 })).rejects.toThrow();
    expect(runPowerShellJson).not.toHaveBeenCalled();
  });

  it("advertises background text entry in the model-facing schema", () => {
    const { tool } = toolWithFakeShell();
    expect(JSON.stringify(tool.parameters)).toContain('"settext"');
  });

  it("targets background refs by UI Automation identity, not the visible screen point", async () => {
    const runPowerShellJson = vi.fn(async (_script: string, _args: unknown) => ({
      ok: true,
      window: { title: "Target", processId: 123 },
      elements: [
        {
          role: "Button",
          name: "Save",
          value: null,
          x: 10,
          y: 20,
          w: 30,
          h: 40,
          enabled: true,
          runtimeId: "42,7,9",
          processId: 123,
        },
      ],
    }));
    const tool = createDesktopTool({
      platform: "win32",
      runPowerShellJson: runPowerShellJson as never,
    });
    await tool.execute("snapshot", { action: "snapshot", title: "Target" } as never);
    await act(tool, { kind: "invoke", ref: "e1" });
    expect(runPowerShellJson.mock.calls.at(-1)?.[1]).toMatchObject({
      runtimeId: "42,7,9",
      processId: 123,
      op: "invoke",
    });
  });

  it("refuses to type without an explicit foreground opt-in, and points at settext", async () => {
    const { tool, runPowerShellJson } = toolWithFakeShell();

    const result = await act(tool, { kind: "type", text: "hello", title: "Notepad" });

    expect(result.ok).toBe(false);
    expect(result.refused).toBe("foreground-not-requested");
    expect(result.hint).toContain("settext");
    // The point of the gate: nothing reached the desktop at all.
    expect(runPowerShellJson).not.toHaveBeenCalled();
  });

  it("points click at invoke rather than at coordinates", async () => {
    const { tool, runPowerShellJson } = toolWithFakeShell();

    const result = await act(tool, { kind: "click", x: 10, y: 20 });

    expect(result.refused).toBe("foreground-not-requested");
    expect(result.hint).toContain("invoke");
    expect(runPowerShellJson).not.toHaveBeenCalled();
  });

  it("lets the foreground through once it is asked for explicitly", async () => {
    const { tool, runPowerShellJson } = toolWithFakeShell();

    await act(tool, { kind: "type", text: "hello", title: "Notepad", foreground: true });

    // The gate is an opt-in, not a ban: a user who asked to watch the GUI, or a
    // control that settext has already reported it cannot write to, must still
    // have a route through.
    expect(runPowerShellJson).toHaveBeenCalled();
  });

  it("never gates the background actions", async () => {
    for (const params of [{ kind: "settext", title: "Notepad", text: "hello" }]) {
      const { tool, runPowerShellJson } = toolWithFakeShell();
      await act(tool, params);
      // These reach the desktop through UI Automation without touching the
      // user's mouse or keyboard, so asking permission for them would only
      // teach the model that the flag is a formality.
      expect(runPowerShellJson, `${params.kind} should not be gated`).toHaveBeenCalled();
    }
  });
});
