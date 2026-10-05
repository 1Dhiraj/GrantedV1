import { PREAMBLE, UIA_HELPERS } from "./scripts-shared.js";

// Sets text through UI Automation instead of the keyboard.
//
// The type action synthesizes keystrokes, which go to whatever window has focus.
// That forces the app in front of the user, takes their keyboard for the
// duration, and corrupts the result if they touch anything meanwhile. For any
// control that exposes ValuePattern - most edit boxes, address bars, form fields
// - UIA can write the value directly into a background window: no focus, no
// keystrokes, no collision, and it completes in one call instead of one per
// character.
//
// Not every control supports it (canvas editors and some modern rich-text
// surfaces do not), so the failure says so plainly and names the keystroke path
// as the fallback rather than pretending nothing happened.
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
    $vp = $c.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
    if (-not $vp.Current.IsReadOnly) { $target = $c; break }
  } catch { }
}
if ($null -eq $target) {
  try {
    $vp = $root.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
    if (-not $vp.Current.IsReadOnly) { $target = $root }
  } catch { }
}
if ($null -eq $target) {
  @{
    ok = $false
    error = 'no writable ValuePattern control found in that window - this app cannot be typed into without focus; fall back to act kind=type (which takes the foreground)'
  } | ConvertTo-Json -Compress
  exit 0
}

$vp = $target.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
$vp.SetValue([string]$A.text)
Start-Sleep -Milliseconds 80
# Read it back: SetValue can silently no-op on a control that accepted the call.
$after = ''
try { $after = [string]$vp.Current.Value } catch { }
$info = Get-ElementInfo $target 120
@{
  ok = ($after -eq [string]$A.text)
  wrote = [string]$A.text
  readBack = $after
  target = @{ name = $info.name; role = $info.role }
  foregroundUnchanged = $true
  note = 'Set via UI Automation: the window was not focused and the keyboard was not used.'
} | ConvertTo-Json -Compress -Depth 4
`;
