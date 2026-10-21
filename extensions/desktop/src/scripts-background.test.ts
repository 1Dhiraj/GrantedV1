import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { SET_VALUE_SCRIPT } from "./scripts-set-value.js";
import { PREAMBLE, UIA_HELPERS } from "./scripts-shared.js";
import { FIND_SCRIPT, LAUNCH_SCRIPT, SNAPSHOT_SCRIPT } from "./scripts.js";

// Execute the real script bodies with simulated platform objects, never UIA or
// user windows. Metadata deliberately has no GetCurrentPattern method.
function executeBody(body: string, fixture: string, args: Record<string, unknown>) {
  const script = `$ErrorActionPreference = 'Stop'
$A = '${JSON.stringify(args).replaceAll("'", "''")}' | ConvertFrom-Json
${fixture}
${body}`;
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-EncodedCommand",
      Buffer.from(script, "utf16le").toString("base64"),
    ],
    { encoding: "utf8", windowsHide: true, timeout: 10_000 },
  );
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout.trim()) as Record<string, unknown>;
}

const valueFixture = `
class DeskNative {
  static [IntPtr]$foreground = [IntPtr]11
  static [IntPtr] GetForegroundWindow() { return [DeskNative]::foreground }
  static [bool] SetForegroundWindow([IntPtr]$h) { [DeskNative]::foreground = $h; return $true }
}
class FakeElement { static [object] FromHandle([IntPtr]$h) { return $global:root } }
class FakePattern { static [string]$Pattern = 'Value' }
function Find-WindowHandle($title) { return [IntPtr]22 }
function Start-Sleep { }
$global:pattern = [pscustomobject]@{ Current = [pscustomobject]@{ IsReadOnly = $false; Value = '' } }
$global:pattern | Add-Member ScriptMethod SetValue { param($text) $this.Current.Value = $text }
$global:writableElement = [pscustomobject]@{ name = 'Editor'; role = 'Edit' }
$global:writableElement | Add-Member ScriptMethod GetCurrentPattern { param($p) return $global:pattern }
$global:root = [pscustomobject]@{}
$global:root | Add-Member ScriptMethod GetCurrentPattern { throw 'root is not editable' }
function Search-Elements { return @{ runtimeId = '42,7'; processId = 123 } }
function Resolve-Element($info) {
  if ($info.runtimeId -ne '42,7' -or $info.processId -ne 123) { throw 'lost identity' }
  return $global:writableElement
}
function Get-ElementInfo($el) { return @{ name = $el.name; role = $el.role } }
`;
const foregroundCheck = UIA_HELPERS.slice(
  UIA_HELPERS.indexOf("function Confirm-BackgroundForeground"),
  UIA_HELPERS.indexOf("function Get-ElementAtPoint"),
);
const valueBody = (foregroundCheck + SET_VALUE_SCRIPT.slice(PREAMBLE.length + UIA_HELPERS.length))
  .replaceAll("System.Windows.Automation.AutomationElement", "FakeElement")
  .replaceAll("System.Windows.Automation.ValuePattern", "FakePattern");

const launchFixture = `
class DeskNative {
  static [IntPtr]$foreground = [IntPtr]11
  static [bool]$hidden = $false
  static [bool]$restoreWorks = $true
  static [bool]$minimizeWorks = $true
  static [IntPtr] GetForegroundWindow() { return [DeskNative]::foreground }
  static [int] IdleMilliseconds() { return 99999 }
  static [bool] ShowWindowAsync([IntPtr]$h, [int]$op) {
    [DeskNative]::hidden = [DeskNative]::minimizeWorks
    return $true
  }
  static [bool] IsIconic([IntPtr]$h) { return [DeskNative]::hidden }
  static [bool] SetForegroundWindow([IntPtr]$h) {
    if ([DeskNative]::restoreWorks) { [DeskNative]::foreground = $h }
    return [DeskNative]::restoreWorks
  }
  static [bool] FocusWindow([IntPtr]$h) { [DeskNative]::foreground = $h; return $true }
}
function Get-Process { return @() }
function Start-Sleep { }
function Start-Process {
  [DeskNative]::foreground = [IntPtr]22
  $proc = [pscustomobject]@{ HasExited = $false; MainWindowHandle = [IntPtr]22 }
  $proc | Add-Member ScriptMethod Refresh { }
  return $proc
}
function Get-ForegroundInfo { return @{ hwnd = [int64][DeskNative]::foreground; title = 'Simulated' } }
`;

describe("background read scripts", () => {
  it.each([FIND_SCRIPT, SNAPSHOT_SCRIPT])(
    "does not request activation when reading a tree",
    (script) => {
      const body = script.slice(PREAMBLE.length).replace(UIA_HELPERS, "");
      expect(body).not.toMatch(/\[DeskNative\]::(?:FocusWindow|SetForegroundWindow|SetCursorPos)/);
    },
  );
});

describe.skipIf(process.platform !== "win32")(
  "background PowerShell outcomes without UI actions",
  () => {
    it("resolves search metadata to the writable control and verifies the write", () => {
      expect(
        executeBody(valueBody, valueFixture, { title: "Target", text: "hello" }),
      ).toMatchObject({ ok: true, readBack: "hello", target: { name: "Editor", role: "Edit" } });
    });

    it("reports a failed self-check when a provider silently ignores SetValue", () => {
      const fixture =
        valueFixture +
        `
$global:pattern | Add-Member ScriptMethod SetValue { param($text) } -Force
`;
      expect(executeBody(valueBody, fixture, { title: "Target", text: "hello" })).toMatchObject({
        ok: false,
        verification: { passed: false },
        readBack: "",
      });
    });

    it("reports and restores a provider that activates its own window", () => {
      const fixture =
        valueFixture +
        `
$global:pattern | Add-Member ScriptMethod SetValue { param($text) $this.Current.Value = $text; [DeskNative]::foreground = [IntPtr]22 } -Force
`;
      expect(executeBody(valueBody, fixture, { title: "Target", text: "hello" })).toMatchObject({
        ok: false,
        valueVerified: true,
        refused: "background-focus-changed",
        focusRestored: true,
        verification: { passed: false },
      });
    });

    it("does not substitute the root when a named control is unavailable", () => {
      const fixture =
        valueFixture +
        `
function Resolve-Element { return $null }
$global:root = $global:writableElement
`;
      expect(
        executeBody(valueBody, fixture, { title: "Target", name: "Missing", text: "hello" }).ok,
      ).toBe(false);
    });

    it.each([
      { foreground: false, ok: true, hidden: true, focused: false },
      { foreground: true, ok: true, hidden: false, focused: true },
    ])("honors foreground=$foreground even for an idle user", ({ foreground, ...expected }) => {
      expect(
        executeBody(LAUNCH_SCRIPT.slice(PREAMBLE.length), launchFixture, {
          app: "simulated",
          foreground,
        }),
      ).toMatchObject(expected);
    });

    it.each(["[DeskNative]::restoreWorks = $false", "[DeskNative]::minimizeWorks = $false"])(
      "reports an unsuccessful background launch when %s",
      (fault) => {
        expect(
          executeBody(LAUNCH_SCRIPT.slice(PREAMBLE.length), launchFixture + fault, {
            app: "simulated",
          }).ok,
        ).toBe(false);
      },
    );
  },
);

describe.skipIf(process.platform !== "win32")("reported provider capabilities", () => {
  it.each([
    {
      supported: ["InvokePattern", "ValuePattern"],
      readOnly: false,
      expected: ["invoke", "settext"],
    },
    { supported: ["ValuePattern"], readOnly: true, expected: [] },
    { supported: [], readOnly: false, expected: [] },
  ])(
    "queries the provider and excludes read-only values: $supported / $readOnly",
    ({ supported, readOnly, expected }) => {
      const probe = UIA_HELPERS.slice(
        UIA_HELPERS.indexOf("function Get-BackgroundActions("),
        UIA_HELPERS.indexOf("function Get-ElementInfo("),
      );
      const fixture = `Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$global:supported = @($A.supported)
$global:readOnly = [bool]$A.readOnly
$el = New-Object PSObject
$el | Add-Member ScriptMethod TryGetCurrentPattern {
  param($id, $out)
  $name = $id.ProgrammaticName -replace 'Identifiers.Pattern$', ''
  if ($global:supported -notcontains $name) { return $false }
  $out.Value = @{ Current = @{ IsReadOnly = $global:readOnly } }
  return $true
}
`;
      const result = executeBody(
        probe + "@{ actions = @(Get-BackgroundActions $el) } | ConvertTo-Json -Compress",
        fixture,
        { supported, readOnly },
      );
      expect(result.actions).toEqual(expected);
    },
  );
});
