import os from "node:os";
import path from "node:path";
import { jsonResult, readStringParam } from "granted/plugin-sdk/agent-runtime";
import {
  imageResultFromFile,
  optionalStringEnum,
  stringEnum,
} from "granted/plugin-sdk/channel-actions";
import type { AnyAgentTool } from "granted/plugin-sdk/plugin-entry";
import { Type } from "typebox";
import { runPowerShellJson } from "./powershell.js";
import { SET_VALUE_SCRIPT } from "./scripts-set-value.js";
import {
  APPS_SCRIPT,
  CLICK_SCRIPT,
  CLIPBOARD_SCRIPT,
  DRAG_SCRIPT,
  FIND_SCRIPT,
  FOCUS_SCRIPT,
  KEY_SCRIPT,
  LAUNCH_SCRIPT,
  MOVE_SCRIPT,
  PASTE_SCRIPT,
  PATTERN_SCRIPT,
  READ_SCRIPT,
  SCREENSHOT_SCRIPT,
  SCROLL_SCRIPT,
  SNAPSHOT_SCRIPT,
  STATUS_SCRIPT,
  TYPE_SCRIPT,
  WAIT_SCRIPT,
  WINDOW_SCRIPT,
} from "./scripts.js";
import {
  buildDesktopVerificationRequest,
  DESKTOP_VERIFY_CONDITIONS,
  normalizeDesktopTimeout,
} from "./verification.js";

const DESKTOP_ACTIONS = [
  "status",
  "apps",
  "focus",
  "launch",
  "snapshot",
  "find",
  "act",
  "read",
  "window",
  "wait",
  "verify",
  "clipboard",
  "screenshot",
] as const;

const DESKTOP_ACT_KINDS = [
  "settext",
  "click",
  "type",
  "paste",
  "key",
  "scroll",
  "move",
  "drag",
  "invoke",
  "toggle",
  "expand",
  "collapse",
  "select",
] as const;

const WINDOW_OPS = ["maximize", "minimize", "restore", "close", "move", "resize"] as const;
const UIA_PATTERN_KINDS = new Set(["invoke", "toggle", "expand", "collapse", "select"]);

// The kinds that reach the desktop through synthesized input rather than UI
// Automation. They take the user's real mouse and keyboard for as long as they
// run, so each one is gated behind an explicit foreground=true.
const FOREGROUND_ACT_KINDS = new Set(["click", "type", "paste", "key", "scroll", "move", "drag"]);

// Named per kind, because a refusal that only says "not allowed" invites a
// retry with the flag set; one that names the replacement gets the job done.
const FOREGROUND_ALTERNATIVES: Record<string, string> = {
  type: 'Use act kind=settext (title=<window>, text=<value>) instead - it writes through UI Automation into a background window, confirms by reading the value back, and leaves the user their keyboard. Only if settext answers "no writable ValuePattern control" is type justified.',
  paste:
    "Use act kind=settext instead; it handles long and multiline text without the clipboard and without taking the foreground.",
  click:
    "Snapshot or find the element, then use act kind=invoke on its ref (or toggle/select/expand for checkboxes, combos and tree nodes). Invoking a control through UI Automation avoids screen hit-testing. If its provider changes focus, the tool reports background-focus-changed; choose another route.",
  key: "If this is an app shortcut, look for the same command as a control in the snapshot and invoke it on its ref. Keyboard shortcuts go to whatever window is focused, which may not be the one you mean.",
  scroll:
    "Prefer read on the element ref, which returns content without scrolling. Scrolling only matters when something must be brought on-screen for a human to see.",
  move: "Pointer movement alone rarely accomplishes anything; drive the control directly with invoke/toggle/select on its ref.",
  drag: "Check whether the target exposes a UI Automation pattern first - many drag interactions have an invoke or select equivalent that cannot miss.",
};

const FOREGROUND_DEFAULT_HINT =
  "Prefer the background actions: settext for text, invoke/toggle/select on a ref for controls, read for content.";

const DesktopToolSchema = Type.Object(
  {
    action: stringEnum(DESKTOP_ACTIONS),
    title: Type.Optional(
      Type.String({
        description:
          "Window title substring. Required for background window operations; use action=apps to discover actual titles. Omit only with foreground=true to deliberately inspect the active window. Never guess a title or assume a background launch changed the foreground.",
      }),
    ),
    app: Type.Optional(
      Type.String({
        description: 'Executable name or path for launch (e.g. "notepad", "calc", "chrome").',
      }),
    ),
    appArgs: Type.Optional(Type.String({ description: "Arguments passed to the launched app." })),
    kind: optionalStringEnum(DESKTOP_ACT_KINDS, {
      description: "Interaction kind for act.",
    }),
    foreground: Type.Optional(
      Type.Boolean({
        description:
          "Explicit opt-in to target the active window without a title or use real mouse/keyboard input (click, type, paste, key, scroll, move, drag). Input requires task permission for desktop interruption; explicit permission already given does not need to be requested again. A failed background action alone does not authorize taking over. While a foreground action runs the user cannot use their machine, and it aborts if they move the mouse.",
      }),
    ),
    ref: Type.Optional(
      Type.String({ description: "Element ref from the LATEST snapshot (e.g. e12)." }),
    ),
    x: Type.Optional(Type.Number({ description: "Screen X coordinate (click/scroll/move)." })),
    y: Type.Optional(Type.Number({ description: "Screen Y coordinate (click/scroll/move)." })),
    text: Type.Optional(Type.String({ description: "Text to type into the focused control." })),
    keys: Type.Optional(
      Type.String({ description: 'Key or combo, e.g. "enter", "ctrl+s", "alt+f4", "win".' }),
    ),
    button: optionalStringEnum(["left", "right", "middle"] as const, {
      description: "Mouse button for click (default left).",
    }),
    doubleClick: Type.Optional(Type.Boolean({ description: "Double-click instead of single." })),
    scrollDelta: Type.Optional(
      Type.Number({ description: "Wheel notches: positive scrolls up, negative scrolls down." }),
    ),
    toRef: Type.Optional(
      Type.String({ description: "Drag destination element ref from the latest snapshot." }),
    ),
    toX: Type.Optional(Type.Number({ description: "Drag destination X (when no toRef)." })),
    toY: Type.Optional(Type.Number({ description: "Drag destination Y (when no toRef)." })),
    windowOp: optionalStringEnum(WINDOW_OPS, {
      description: "Window operation for action=window.",
    }),
    width: Type.Optional(Type.Number({ description: "Window width for windowOp=resize." })),
    height: Type.Optional(Type.Number({ description: "Window height for windowOp=resize." })),
    clipboardOp: optionalStringEnum(["get", "set"] as const, {
      description: "Clipboard operation for action=clipboard (default get).",
    }),
    name: Type.Optional(
      Type.String({
        description: "Element name/value substring for find and wait (case-insensitive).",
      }),
    ),
    role: Type.Optional(
      Type.String({ description: 'Optional role filter for find/wait (e.g. "Button", "Edit").' }),
    ),
    timeoutMs: Type.Optional(
      Type.Number({
        minimum: 1,
        maximum: 30_000,
        description: "Wait timeout in ms (default 10000, max 30000).",
      }),
    ),
    condition: optionalStringEnum(DESKTOP_VERIFY_CONDITIONS, {
      description: "Expected postcondition for action=verify (default element_exists).",
    }),
    maxChars: Type.Optional(
      Type.Number({ description: "Max characters returned by action=read (default 2000)." }),
    ),
    annotate: Type.Optional(
      Type.Boolean({
        description:
          "For screenshot: draw labeled red boxes for every ref from the latest snapshot/find, so the image and refs line up.",
      }),
    ),
    grid: Type.Optional(
      Type.Boolean({
        description:
          "For screenshot: overlay a labeled 100px coordinate grid. Use when the snapshot has no elements (canvas/GPU apps) — read the target's x,y off the grid, then act kind=click x=.. y=..",
      }),
    ),
    window: Type.Optional(
      Type.Boolean({
        description:
          "For screenshot: capture only the TARGET window's own pixels (set title to pick it, else the foreground window). Works even when that window is BEHIND others / not in the foreground — use this to see a background app. Coordinates in the image are relative to the window (its screen position is returned in rect).",
      }),
    ),
  },
  { additionalProperties: false },
);

const VK_CODES: Record<string, number> = {
  enter: 0x0d,
  return: 0x0d,
  tab: 0x09,
  escape: 0x1b,
  esc: 0x1b,
  backspace: 0x08,
  delete: 0x2e,
  del: 0x2e,
  insert: 0x2d,
  space: 0x20,
  up: 0x26,
  down: 0x28,
  left: 0x25,
  right: 0x27,
  home: 0x24,
  end: 0x23,
  pageup: 0x21,
  pagedown: 0x22,
  ctrl: 0x11,
  control: 0x11,
  alt: 0x12,
  shift: 0x10,
  win: 0x5b,
  meta: 0x5b,
  capslock: 0x14,
  printscreen: 0x2c,
};
for (let i = 1; i <= 24; i++) {
  VK_CODES[`f${i}`] = 0x70 + (i - 1);
}
for (let c = 0; c < 26; c++) {
  VK_CODES[String.fromCharCode(97 + c)] = 0x41 + c;
}
for (let d = 0; d <= 9; d++) {
  VK_CODES[String(d)] = 0x30 + d;
}

const MODIFIER_KEYS = new Set(["ctrl", "control", "alt", "shift", "win", "meta"]);

function parseKeyCombo(combo: string): { modifiers: number[]; key: number; label: string } {
  const parts = combo
    .toLowerCase()
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    throw new Error(`desktop: empty key combo`);
  }
  const keyName = parts[parts.length - 1] ?? "";
  const modifierNames = parts.slice(0, -1);
  const key = VK_CODES[keyName];
  if (key === undefined) {
    throw new Error(
      `desktop: unknown key "${keyName}". Use names like enter, tab, esc, ctrl+s, alt+f4, win.`,
    );
  }
  const modifiers: number[] = [];
  for (const mod of modifierNames) {
    if (!MODIFIER_KEYS.has(mod)) {
      throw new Error(`desktop: unknown modifier "${mod}" (use ctrl, alt, shift, win).`);
    }
    const vk = VK_CODES[mod];
    if (vk !== undefined) {
      modifiers.push(vk);
    }
  }
  return { modifiers, key, label: combo };
}

type SnapshotElement = {
  role: string;
  name: string;
  value: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  enabled: boolean;
  backgroundActions?: string[];
  runtimeId?: string;
  processId?: number;
};

type SnapshotPayload = {
  ok: boolean;
  error?: string;
  window?: { title: string; processId: number };
  elements?: SnapshotElement[];
  truncated?: boolean;
  hint?: string;
};

type RefEntry = {
  runtimeId?: string;
  processId?: number;
  x: number;
  y: number;
  w: number;
  h: number;
  role: string;
  name: string;
};

// Refs from the most recent snapshot. The gateway process is long-lived, so a
// module-level cache survives across tool calls within a run. Refs go stale on
// every new snapshot, mirroring the browser tool's behavior.
let lastRefs = new Map<string, RefEntry>();
let lastRefsWindowTitle = "";

function formatSnapshot(payload: SnapshotPayload): string {
  const lines: string[] = [];
  const win = payload.window;
  lines.push(`window "${win?.title ?? "?"}" (pid ${win?.processId ?? "?"})`);
  const elements = payload.elements ?? [];
  const refs = new Map<string, RefEntry>();
  let n = 0;
  for (const el of elements) {
    n += 1;
    const ref = `e${n}`;
    refs.set(ref, {
      x: el.x,
      y: el.y,
      w: el.w,
      h: el.h,
      role: el.role,
      name: el.name,
      runtimeId: el.runtimeId,
      processId: el.processId,
    });
    const valuePart = el.value ? ` value=${JSON.stringify(el.value)}` : "";
    const capabilityPart = el.backgroundActions
      ? ` backgroundActions=${JSON.stringify(el.backgroundActions)}`
      : " backgroundActions=unknown";
    const disabledPart = !el.enabled ? " [disabled]" : "";
    const namePart = el.name ? ` ${JSON.stringify(el.name)}` : "";
    lines.push(
      `- ${ref} ${el.role}${namePart}${valuePart} (${el.x},${el.y})${disabledPart}${capabilityPart}`,
    );
  }
  lastRefs = refs;
  lastRefsWindowTitle = win?.title ?? "";
  if (payload.truncated) {
    lines.push(`(truncated — element budget reached; focus a narrower window or use title)`);
  }
  if (n === 0) {
    lines.push(
      payload.hint
        ? `(no readable elements — ${payload.hint})`
        : "(no readable elements — the app renders via canvas/GPU; VISION FALLBACK: action=screenshot grid=true, read the target's x,y from the grid labels, then act kind=click x=.. y=..)",
    );
  } else {
    lines.push(
      `Interact with: act kind=invoke/toggle/select ref=eN, then re-snapshot after UI changes.`,
    );
  }
  return lines.join("\n");
}

function requireNumber(params: Record<string, unknown>, key: string): number {
  const value = params[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`desktop: "${key}" (number) is required for this act kind.`);
  }
  return value;
}

/** Resolve a screen point from a snapshot ref, or fall back to explicit coordinates. */
function resolvePoint(
  params: Record<string, unknown>,
  refKey: string,
  xKey: string,
  yKey: string,
): { x: number; y: number } {
  const ref = readStringParam(params, refKey) || undefined;
  if (ref) {
    const entry = lastRefs.get(ref);
    if (!entry) {
      throw new Error(
        `desktop: unknown ref "${ref}" — take a new snapshot first (refs are valid only for the latest snapshot${lastRefsWindowTitle ? ` of "${lastRefsWindowTitle}"` : ""}).`,
      );
    }
    if (entry.w <= 0 || entry.h <= 0) {
      throw new Error(
        "desktop: this control has no visible screen rectangle; use its UI Automation ref with invoke/read instead.",
      );
    }
    return { x: entry.x, y: entry.y };
  }
  return { x: requireNumber(params, xKey), y: requireNumber(params, yKey) };
}

/** Resolve UI Automation identity without hit-testing an overlapping window. */
function resolveElement(params: Record<string, unknown>): { runtimeId: string; processId: number } {
  const ref = readStringParam(params, "ref", { required: true });
  const entry = lastRefs.get(ref);
  if (!entry?.runtimeId || !entry.processId) {
    throw new Error(
      `desktop: ref "${ref}" has no current UI Automation identity; take a new snapshot.`,
    );
  }
  return { runtimeId: entry.runtimeId, processId: entry.processId };
}

export function createDesktopTool(opts?: {
  maxSnapshotElements?: number;
  maxSnapshotDepth?: number;
  platform?: NodeJS.Platform;
  runPowerShellJson?: typeof runPowerShellJson;
}): AnyAgentTool {
  const maxElements = opts?.maxSnapshotElements ?? 300;
  const maxDepth = opts?.maxSnapshotDepth ?? 15;
  const platform = opts?.platform ?? process.platform;
  const runPowerShell = opts?.runPowerShellJson ?? runPowerShellJson;
  return {
    label: "Desktop",
    name: "desktop",
    description: [
      "Control the local Windows desktop (any app) via UI Automation. Windows only; cannot reach UAC/elevated prompts. Use file, command, app API, or dedicated browser capabilities first when they can satisfy the request. For native Windows UI work, prefer this tool over screenshot-and-click input: its background actions drive apps through UI Automation without touching the real mouse or keyboard, so the user keeps working while the task runs. A screenshot-and-click tool uses the shared mouse and keyboard. UI Automation is preferable when supported, but app providers can still activate their own windows.",
      "BACKGROUND FIRST, FOREGROUND LAST. The background actions - settext, invoke, toggle, expand, collapse, select, read, find, snapshot with an explicit title - do not request focus or synthesize input, so reach for them immediately and without apology. launch is background by default too: the script minimizes its window and checks foreground restoration; apps may take focus transiently during launch. Do not call focus to 'make sure' - raising a window moves the user's caret mid-sentence, and snapshot/find/settext accept a title and read/pattern actions use refs. UI Automation providers that change focus report a background failure and must use another route. The foreground actions - type, key, click, move, drag, paste, scroll, and focus - take over the real mouse and keyboard; those are the genuine last resort, because they stop the user working and they abort if the user touches the mouse. Before any FOREGROUND action, ask what replaces it: settext instead of type, invoke on a ref instead of click, or no GUI at all - write the file directly, run a CLI, call an API, edit config on disk. Preserve the requested outcome and app constraints; choose a file/API route only when it satisfies them. Explicit task permission to use foreground mouse/keyboard already counts; do not ask for the same permission again. Otherwise use foreground input only when the user has agreed to desktop interruption; a background failure alone is not authorization. Keep that session as short as possible.",
      "Flow: inspect available capabilities for the requested outcome, without app-specific rules. Snapshot/find/read report backgroundActions supported by each control. Use only advertised operations; an empty list means no supported mutation pattern, while unknown means inspect further. These are provider capabilities, not a guarantee of focus preservation; verify action results. A minimized window can still expose controls; do not restore it merely to inspect or use supported patterns. First determine whether the request needs a native app. If it does, launch without foreground, list apps to discover its actual title, then snapshot with that title, act on refs (e12) from the LATEST snapshot, and verify the postcondition. Never inspect the foreground as a substitute for locating the launched window. Prefer UI Automation controls over keyboard shortcuts. Use find (name, optional role) instead of a full snapshot in dense apps. Refs go stale after any layout change — re-snapshot.",
      "ACTIONS: apps (list windows) · launch (app) · focus (title) · snapshot (title for background) · find (name, role) · act · read (ref, maxChars) · window (windowOp=maximize|minimize|restore|close|move|resize) · wait (name/role, timeoutMs) · verify (name, role, condition=element_exists|element_absent) · clipboard (clipboardOp=get|set) · screenshot.",
      "VERIFICATION: after an action, use verify with a specific element name/role. A false result is recoverable: snapshot the current state, retry once with fresh refs, then choose another method or escalate.",
      "SAFETY: launch returns ok:false with reusedExistingWindow=true when the app was ALREADY running — you are looking at the user's own open document, not a blank one. Never type or send keys then: open a fresh document first (act kind=key keys=ctrl+n) and snapshot to confirm it is empty. You share the real keyboard, so a wrong keystroke edits the user's work.",
      'ACT KINDS: settext (PREFERRED for entering text: title=window, text=value, optional name/role to pick the control — writes via UI Automation into a BACKGROUND window, without synthesizing keystrokes; reads the value back and checks foreground focus. Some providers activate themselves: a background-focus-changed result means use a file/API or isolated route, not a blind retry. Falls back to type only when it reports no writable control) · click (ref or x/y) · type (synthesized keystrokes: TAKES THE FOREGROUND and the real keyboard — use only when settext says the control is not writable; pass title to name the window you mean so it refuses with aborted="wrong-window" rather than typing into whatever the user clicked into) · paste (prefer for long/multiline text) · key (e.g. "ctrl+s") · scroll (scrollDelta) · move · drag (ref→toRef) · invoke/toggle/expand/collapse/select (UIA patterns on a ref — more reliable than click for checkboxes/combos/tree nodes).',
      "SCREENSHOT (only when the tree is empty/insufficient, e.g. canvas/GPU apps): grid=true overlays a coordinate grid → read x,y and act kind=click x/y. window=true title=<app> captures a background window's own pixels. annotate=true labels the latest refs.",
    ].join(" "),
    parameters: DesktopToolSchema,
    execute: async (_toolCallId, args) => {
      if (platform !== "win32") {
        throw new Error("desktop: this tool only runs on Windows hosts.");
      }
      const params = args as Record<string, unknown>;
      const action = readStringParam(params, "action", { required: true });

      // A background launch leaves the user's own window in front. Never let
      // target discovery silently turn that window into the task's next target.
      const targetsWindow =
        ["snapshot", "find", "wait", "verify", "window"].includes(action) ||
        (action === "screenshot" && params.window === true);
      if (
        targetsWindow &&
        !readStringParam(params, "title")?.trim() &&
        params.foreground !== true
      ) {
        return jsonResult({
          ok: false,
          refused: "background-target-required",
          action,
          hint: "List apps, then pass the intended window title. A background launch does not make that app the foreground window. Use foreground=true only when deliberately targeting the user's active window.",
        });
      }

      switch (action) {
        case "status": {
          return jsonResult(await runPowerShell(STATUS_SCRIPT, {}, 20_000));
        }
        case "apps": {
          return jsonResult(await runPowerShell(APPS_SCRIPT, {}, 20_000));
        }
        case "focus": {
          // Raising a window IS seizing the screen: the user's caret moves
          // mid-sentence into whatever was raised. Nothing that only reads or
          // writes through UI Automation needs focus, so this is gated like the
          // foreground act kinds rather than being free.
          if (params.foreground !== true) {
            return jsonResult({
              ok: false,
              refused: "foreground-not-requested",
              action: "focus",
              hint: "Focus is rarely needed: snapshot, find, read and act kind=settext/invoke all take a title and work on a background window. Pass the window title to those instead of raising it.",
              retryWith:
                "Re-send with foreground=true only when the user has agreed to desktop interruption. A failed background action alone does not authorize it.",
            });
          }
          const title = readStringParam(params, "title") || "";
          return jsonResult(await runPowerShell(FOCUS_SCRIPT, { title }, 20_000));
        }
        case "launch": {
          const app = readStringParam(params, "app", { required: true });
          const appArgs = readStringParam(params, "appArgs") || undefined;
          // Apps can activate themselves during launch; the script minimizes
          // and checks restoration of the original foreground afterward.
          const foreground = params.foreground === true;
          return jsonResult(
            await runPowerShell(LAUNCH_SCRIPT, { app, appArgs, foreground }, 30_000),
          );
        }
        case "snapshot": {
          const title = readStringParam(params, "title") || undefined;
          const payload = await runPowerShell<SnapshotPayload>(
            SNAPSHOT_SCRIPT,
            { title, maxElements, maxDepth },
            60_000,
          );
          if (!payload.ok) {
            throw new Error(`desktop: ${payload.error ?? "snapshot failed"}`);
          }
          return {
            content: [{ type: "text" as const, text: formatSnapshot(payload) }],
            details: { window: payload.window, count: payload.elements?.length ?? 0 },
          };
        }
        case "act": {
          const kind = readStringParam(params, "kind", { required: true });
          if (kind === "settext") {
            // Routed before the point-based patterns: this one addresses a
            // window by title rather than by screen position, because a
            // background window has no useful coordinates.
            const text = readStringParam(params, "text", { required: true });
            const title = readStringParam(params, "title", { required: true });
            const name = readStringParam(params, "name") || "";
            const role = readStringParam(params, "role") || "";
            return jsonResult(
              await runPowerShell(
                SET_VALUE_SCRIPT,
                { text, title, name, role, foreground: params.foreground === true },
                30_000,
              ),
            );
          }
          if (UIA_PATTERN_KINDS.has(kind)) {
            const element = resolveElement(params);
            return jsonResult(
              await runPowerShell(
                PATTERN_SCRIPT,
                { ...element, op: kind, foreground: params.foreground === true },
                30_000,
              ),
            );
          }
          // Everything past this point drives the real mouse and keyboard, which
          // stops the user working and aborts the moment they touch the mouse.
          // A description asking the model to prefer the background actions was
          // not enough on its own - it read the warning, decided the GUI route
          // was simpler, and took the foreground anyway. So the refusal is
          // structural: the caller has to say foreground=true, and the message
          // names the background action that would have worked instead.
          if (FOREGROUND_ACT_KINDS.has(kind) && params.foreground !== true) {
            return jsonResult({
              ok: false,
              refused: "foreground-not-requested",
              kind,
              hint: FOREGROUND_ALTERNATIVES[kind] ?? FOREGROUND_DEFAULT_HINT,
              retryWith:
                "Re-send with foreground=true only when the user has agreed to desktop interruption. Otherwise use a file, command, app API, or isolated execution route.",
            });
          }
          switch (kind) {
            case "click": {
              const point = resolvePoint(params, "ref", "x", "y");
              const button = readStringParam(params, "button") || "left";
              const double = params.doubleClick === true;
              return jsonResult(
                await runPowerShell(CLICK_SCRIPT, { ...point, button, double }, 20_000),
              );
            }
            case "type": {
              const text = readStringParam(params, "text", { required: true });
              const timeout = Math.max(20_000, text.length * 30 + 10_000);
              // Naming the target window turns a silent misfire into a refusal:
              // without it the script types into whatever is in front, which is
              // the user's own window whenever they clicked away after focus.
              const expectTitle = readStringParam(params, "title") || "";
              return jsonResult(await runPowerShell(TYPE_SCRIPT, { text, expectTitle }, timeout));
            }
            case "paste": {
              const text = readStringParam(params, "text", { required: true });
              return jsonResult(await runPowerShell(PASTE_SCRIPT, { text }, 30_000));
            }
            case "key": {
              const keys = readStringParam(params, "keys", { required: true });
              const combo = parseKeyCombo(keys);
              return jsonResult(
                await runPowerShell(
                  KEY_SCRIPT,
                  { modifiers: combo.modifiers, key: combo.key, label: combo.label },
                  20_000,
                ),
              );
            }
            case "scroll": {
              const delta = requireNumber(params, "scrollDelta");
              const x = typeof params.x === "number" ? params.x : undefined;
              const y = typeof params.y === "number" ? params.y : undefined;
              return jsonResult(await runPowerShell(SCROLL_SCRIPT, { delta, x, y }, 20_000));
            }
            case "move": {
              const x = requireNumber(params, "x");
              const y = requireNumber(params, "y");
              return jsonResult(await runPowerShell(MOVE_SCRIPT, { x, y }, 20_000));
            }
            case "drag": {
              const from = resolvePoint(params, "ref", "x", "y");
              const to = resolvePoint(params, "toRef", "toX", "toY");
              return jsonResult(
                await runPowerShell(
                  DRAG_SCRIPT,
                  { x: from.x, y: from.y, toX: to.x, toY: to.y },
                  30_000,
                ),
              );
            }
            default:
              throw new Error(`desktop: unknown act kind "${kind}".`);
          }
        }
        case "read": {
          const point = params.ref ? resolveElement(params) : resolvePoint(params, "ref", "x", "y");
          const maxChars = typeof params.maxChars === "number" ? params.maxChars : undefined;
          return jsonResult(await runPowerShell(READ_SCRIPT, { ...point, maxChars }, 30_000));
        }
        case "window": {
          const op = readStringParam(params, "windowOp", { required: true });
          const title = readStringParam(params, "title") || "";
          const windowArgs: Record<string, unknown> = { title, op };
          if (op === "move") {
            windowArgs.x = requireNumber(params, "x");
            windowArgs.y = requireNumber(params, "y");
          }
          if (op === "resize") {
            windowArgs.width = requireNumber(params, "width");
            windowArgs.height = requireNumber(params, "height");
          }
          return jsonResult(await runPowerShell(WINDOW_SCRIPT, windowArgs, 20_000));
        }
        case "wait": {
          const title = readStringParam(params, "title") || "";
          const name = readStringParam(params, "name") || undefined;
          const role = readStringParam(params, "role") || undefined;
          const timeoutMs = typeof params.timeoutMs === "number" ? params.timeoutMs : undefined;
          const budget = normalizeDesktopTimeout(timeoutMs);
          return jsonResult(
            await runPowerShell(
              WAIT_SCRIPT,
              { title, name, role, timeoutMs: budget },
              budget + 15_000,
            ),
          );
        }
        case "verify": {
          const title = readStringParam(params, "title") || "";
          const name = readStringParam(params, "name", { required: true });
          const role = readStringParam(params, "role") || undefined;
          const condition = readStringParam(params, "condition") || "element_exists";
          const timeoutMs = typeof params.timeoutMs === "number" ? params.timeoutMs : undefined;
          const verification = buildDesktopVerificationRequest({
            title,
            name,
            role,
            condition,
            timeoutMs,
          });
          return jsonResult(
            await runPowerShell(WAIT_SCRIPT, verification.args, verification.processTimeoutMs),
          );
        }
        case "clipboard": {
          const op = readStringParam(params, "clipboardOp") || "get";
          const text = readStringParam(params, "text") || "";
          if (op === "set" && !text) {
            throw new Error('desktop: clipboard set requires "text".');
          }
          return jsonResult(await runPowerShell(CLIPBOARD_SCRIPT, { op, text }, 20_000));
        }
        case "find": {
          const title = readStringParam(params, "title") || "";
          const name = readStringParam(params, "name", { required: true });
          const role = readStringParam(params, "role") || undefined;
          const payload = await runPowerShell<SnapshotPayload>(
            FIND_SCRIPT,
            { title, name, role, maxResults: 50 },
            60_000,
          );
          if (!payload.ok) {
            throw new Error(`desktop: ${payload.error ?? "find failed"}`);
          }
          return {
            content: [{ type: "text" as const, text: formatSnapshot(payload) }],
            details: { window: payload.window, count: payload.elements?.length ?? 0 },
          };
        }
        case "screenshot": {
          const file = path.join(
            os.tmpdir(),
            `granted-desktop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`,
          );
          const annotate = params.annotate === true;
          const grid = params.grid === true;
          const windowOnly = params.window === true;
          const title = readStringParam(params, "title") || "";
          const marks = annotate
            ? [...lastRefs.entries()].slice(0, 150).map(([ref, entry]) => ({
                ref,
                x: entry.x,
                y: entry.y,
                w: entry.w,
                h: entry.h,
              }))
            : undefined;
          const payload = await runPowerShell<{
            ok: boolean;
            path: string;
            marked?: number;
            window?: boolean;
            title?: string;
            rect?: { x: number; y: number; w: number; h: number };
            hint?: string;
            error?: string;
            minimized?: boolean;
          }>(SCREENSHOT_SCRIPT, { path: file, marks, grid, window: windowOnly, title }, 30_000);
          if (!payload.ok) {
            // Window capture can fail recoverably (not found / minimized) — surface
            // the reason so the model can restore/focus and retry instead of giving up.
            return jsonResult({
              status: "error",
              error: payload.error ?? "screenshot failed",
              ...(payload.minimized ? { minimized: true } : {}),
            });
          }
          const extraParts: string[] = [];
          if (payload.window) {
            const r = payload.rect;
            extraParts.push(
              `Capture of window "${payload.title || title || "foreground"}"${
                r ? ` (screen ${r.x},${r.y}, size ${r.w}x${r.h})` : ""
              } — captured even though it need not be in the foreground. Image x,y are relative to the window's top-left; add the window's screen x,y to click on screen.`,
            );
            if (payload.hint) {
              extraParts.push(payload.hint);
            }
          } else {
            if (annotate) {
              extraParts.push(
                `Primary screen capture with ${payload.marked ?? 0} labeled boxes; labels match the refs from the latest snapshot (act kind=click ref=eN).`,
              );
            }
            if (grid) {
              extraParts.push(
                "A cyan coordinate grid is overlaid: lines every 100px, labels every 200px showing x,y. Read your target's position from the nearest labels and use act kind=click x=.. y=.. (screen coordinates).",
              );
            }
            if (extraParts.length === 0) {
              extraParts.push("Primary screen capture. Prefer snapshot (text) when possible.");
            }
          }
          return await imageResultFromFile({
            label: "desktop screenshot",
            path: payload.path,
            extraText: extraParts.join(" "),
          });
        }
        default:
          throw new Error(`desktop: unknown action "${action}".`);
      }
    },
  } as AnyAgentTool;
}
