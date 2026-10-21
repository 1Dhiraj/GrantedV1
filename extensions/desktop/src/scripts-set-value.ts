import { PREAMBLE, UIA_HELPERS } from "./scripts-shared.js";

// Sets text through UI Automation instead of the keyboard.
//
// The type action synthesizes keystrokes, which go to whatever window has focus.
// UI Automation avoids synthesized keystrokes, but providers can activate their
// own windows. Read the value back and verify foreground preservation rather
// than assuming the action is safe to run alongside the user's work.
// Unsupported controls and focus changes must select another execution route.
export const SET_VALUE_SCRIPT =
  PREAMBLE +
  UIA_HELPERS +
  `
$title = [string]$A.title
$h = Find-WindowHandle $title
if ($h -eq [IntPtr]::Zero) {
  @{ ok = $false; error = ("no window matching '" + $title + "'") } | ConvertTo-Json -Compress
  exit 0
}
$root = [System.Windows.Automation.AutomationElement]::FromHandle($h)
if ($null -eq $root) {
  @{ ok = $false; error = 'window has no automation tree' } | ConvertTo-Json -Compress
  exit 0
}

# Named control when the caller named one, otherwise the first editable thing in
# the window - which is what "type into Notepad" means in practice.
$name = if ($A.name) { [string]$A.name } else { '' }
$role = if ($A.role) { [string]$A.role } else { '' }
$cands = @(Search-Elements $root $name $role 40 12)
$target = $null
foreach ($c in $cands) {
  try {
    $el = Resolve-Element $c
    if ($null -eq $el) { continue }
    $vp = $el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
    if (-not $vp.Current.IsReadOnly) { $target = $el; break }
  } catch { }
}
if ($null -eq $target -and -not $name -and -not $role) {
  try {
    $vp = $root.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
    if (-not $vp.Current.IsReadOnly) { $target = $root }
  } catch { }
}
if ($null -eq $target) {
  @{
    ok = $false
    refused = 'background-pattern-unavailable'
    error = 'No writable ValuePattern control found in the inspected window. Inspect other controls or available app capabilities; this does not establish that every route requires foreground input.'
  } | ConvertTo-Json -Compress
  exit 0
}

$vp = $target.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
$foregroundBefore = [DeskNative]::GetForegroundWindow()
$vp.SetValue([string]$A.text)
Start-Sleep -Milliseconds 80
# Read it back: SetValue can silently no-op on a control that accepted the call.
$after = ''
try { $after = [string]$vp.Current.Value } catch { }
$info = Get-ElementInfo $target 120
$verified = ($after -eq [string]$A.text)
$result = @{
  ok = $verified
  verification = @{ passed = $verified }
  valueVerified = $verified
  wrote = [string]$A.text
  readBack = $after
  target = @{ name = $info.name; role = $info.role }
  foregroundUnchanged = ([DeskNative]::GetForegroundWindow() -eq $foregroundBefore)
  note = 'Set via UI Automation without requesting focus or sending keyboard input.'
}
if (-not $verified) { $result.error = 'ValuePattern accepted the write but readback did not match; inspect the control before retrying.' }
Confirm-BackgroundForeground $result $foregroundBefore $h ($A.foreground -eq $true)
$result | ConvertTo-Json -Compress -Depth 4
`;
