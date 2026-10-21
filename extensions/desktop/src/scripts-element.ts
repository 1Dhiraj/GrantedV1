import { PREAMBLE, UIA_HELPERS } from "./scripts-shared.js";

export const READ_SCRIPT =
  PREAMBLE +
  UIA_HELPERS +
  `
$maxChars = if ($A.maxChars) { [int]$A.maxChars } else { 2000 }
$el = Resolve-Element $A
if ($null -eq $el) {
  @{ ok = $false; error = 'UI element unavailable or stale; take a new snapshot' } | ConvertTo-Json -Compress
  exit 0
}
$info = Get-ElementInfo $el $maxChars
$info.Remove('hasRect')
@{ ok = $true; element = $info } | ConvertTo-Json -Compress -Depth 5
`;

export const PATTERN_SCRIPT =
  PREAMBLE +
  UIA_HELPERS +
  `
$op = [string]$A.op
$el = Resolve-Element $A
if ($null -eq $el) {
  @{ ok = $false; error = 'UI element unavailable or stale; take a new snapshot' } | ConvertTo-Json -Compress
  exit 0
}
$foregroundBefore = [DeskNative]::GetForegroundWindow()
$result = @{ ok = $true; op = $op }
try {
  switch ($op) {
    'invoke' {
      $p = $el.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
      $p.Invoke()
    }
    'toggle' {
      $p = $el.GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern)
      $p.Toggle()
      Start-Sleep -Milliseconds 150
      $result.state = [string]$p.Current.ToggleState
    }
    'expand' {
      $p = $el.GetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern)
      $p.Expand()
    }
    'collapse' {
      $p = $el.GetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern)
      $p.Collapse()
    }
    'select' {
      $p = $el.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)
      $p.Select()
    }
    default {
      $result = @{ ok = $false; error = ('unknown pattern op: ' + $op) }
    }
  }
} catch {
  $result = @{ ok = $false; refused = 'background-pattern-unavailable'; backgroundActions = @(Get-BackgroundActions $el); error = ('Could not apply ' + $op + ' through this control provider. Inspect the current control and supported actions; this failure does not establish that the whole app requires foreground input.') }
}
$targetWindow = [IntPtr]::Zero
$foregroundNow = [DeskNative]::GetForegroundWindow()
$foregroundPid = [uint32]0
[void][DeskNative]::GetWindowThreadProcessId($foregroundNow, [ref]$foregroundPid)
if ([int]$foregroundPid -eq $el.Current.ProcessId) { $targetWindow = $foregroundNow }
Confirm-BackgroundForeground $result $foregroundBefore $targetWindow ($A.foreground -eq $true)
$result | ConvertTo-Json -Compress -Depth 4
`;
