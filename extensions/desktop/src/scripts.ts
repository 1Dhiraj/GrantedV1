// Desktop action scripts. Each constant is a complete PowerShell program built on
// the shared preamble and UI Automation helpers in ./scripts-shared.ts.
import { PREAMBLE, UIA_HELPERS } from "./scripts-shared.js";

export const STATUS_SCRIPT =
  PREAMBLE +
  `
Add-Type -AssemblyName System.Windows.Forms
$fg = Get-ForegroundInfo
$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$secureDesktopHint = $false
if ($fg.hwnd -eq 0) { $secureDesktopHint = $true }
@{ ok = $true; platform = 'windows'; screen = @{ width = $b.Width; height = $b.Height }; foreground = $fg; secureDesktopHint = $secureDesktopHint } | ConvertTo-Json -Compress -Depth 5
`;

export const APPS_SCRIPT =
  PREAMBLE +
  `
$fg = [DeskNative]::GetForegroundWindow()
$list = @(Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle } | ForEach-Object {
  @{ processId = $_.Id; process = $_.ProcessName; title = $_.MainWindowTitle; foreground = ($_.MainWindowHandle -eq $fg) }
})
@{ ok = $true; windows = $list } | ConvertTo-Json -Compress -Depth 5
`;

export const FOCUS_SCRIPT =
  PREAMBLE +
  `
$h = Find-WindowHandle ([string]$A.title)
if ($h -eq [IntPtr]::Zero) {
  @{ ok = $false; error = 'window not found: ' + [string]$A.title } | ConvertTo-Json -Compress
  exit 0
}
$focused = [DeskNative]::FocusWindow($h)
Start-Sleep -Milliseconds 250
$fg = Get-ForegroundInfo
$result = @{ ok = $true; focused = $focused; foreground = $fg }
if (-not $focused -or ($fg.hwnd -ne [int64]$h)) {
  $procId = [uint32]0
  [void][DeskNative]::GetWindowThreadProcessId($h, [ref]$procId)
  $elevated = Test-ProcessElevated ([int]$procId)
  if ($elevated -eq $true) {
    $result.hint = 'target process is elevated (admin) — Windows blocks input injection across integrity levels (UIPI); run the gateway elevated or interact with a non-elevated window'
  }
}
$result | ConvertTo-Json -Compress -Depth 5
`;

export const LAUNCH_SCRIPT =
  PREAMBLE +
  `
# Record every window that exists BEFORE launching. Single-instance apps
# (Notepad, Word, Chrome) do not open a second window - they focus the one the
# user already had open, holding the user's own unsaved document. Without this
# snapshot, "the app is focused" is indistinguishable from "I am pointed at the
# user's work", and the next keystroke edits their file.
$preExistingWindows = @{}
foreach ($p in @(Get-Process | Where-Object { $_.MainWindowHandle -ne 0 })) {
  $preExistingWindows[[int64]$p.MainWindowHandle] = $true
}

if ($A.appArgs) {
  $proc = Start-Process -FilePath ([string]$A.app) -ArgumentList ([string]$A.appArgs) -PassThru
} else {
  $proc = Start-Process -FilePath ([string]$A.app) -PassThru
}

# Wait for the app's OWN window instead of sleeping a fixed interval and hoping.
# A blind sleep returns while the previous app still holds focus, and the caller
# then types into whatever window happens to be in front — someone else's editor.
$deadline = (Get-Date).AddMilliseconds(10000)
$h = [IntPtr]::Zero
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 200
  try { $proc.Refresh() } catch { }
  if ($proc -and -not $proc.HasExited -and $proc.MainWindowHandle -ne 0) {
    $h = $proc.MainWindowHandle
    break
  }
  # UWP/store apps and single-instance apps hand off to a host process and the
  # process we started exits immediately, so match the window by name instead.
  $base = [System.IO.Path]::GetFileNameWithoutExtension([string]$A.app)
  $byName = Find-WindowHandle $base
  if ($byName -ne [IntPtr]::Zero) { $h = $byName; break }
}

$focused = $false
if ($h -ne [IntPtr]::Zero) {
  $focused = [DeskNative]::FocusWindow($h)
  Start-Sleep -Milliseconds 250
}
$fg = Get-ForegroundInfo
# Only claim success when the launched window is genuinely in front. Anything
# else must be reported so the caller focuses or snapshots before acting.
$isFront = ($h -ne [IntPtr]::Zero) -and ($fg.hwnd -eq [int64]$h)
$reusedExisting = ($h -ne [IntPtr]::Zero) -and $preExistingWindows.ContainsKey([int64]$h)
$result = @{
  ok = ($isFront -and -not $reusedExisting)
  launched = [string]$A.app
  focused = $isFront
  reusedExistingWindow = $reusedExisting
  foreground = $fg
}
if ($h -ne [IntPtr]::Zero) { $result.windowHandle = [int64]$h }
if (-not $isFront) {
  $result.error = 'launched "' + [string]$A.app + '" but its window is not in the foreground (front window: "' + $fg.title + '"). DO NOT type yet - it would go to that window. Use action=focus with the app title, then snapshot to confirm, before acting.'
} elseif ($reusedExisting) {
  # Typing here would edit whatever the user already had open. Refuse loudly.
  $result.error = 'no new window was created - "' + [string]$A.app + '" was already running and this focused an EXISTING window ("' + $fg.title + '") that may contain the user''s own unsaved work. DO NOT type or send keys into it. Open a fresh document first (for a text editor, act kind=key keys=ctrl+n), then snapshot to confirm the new window is empty before typing.'
}
$result | ConvertTo-Json -Compress -Depth 5
`;

export const SNAPSHOT_SCRIPT =
  PREAMBLE +
  `
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$maxElements = if ($A.maxElements) { [int]$A.maxElements } else { 300 }
$maxDepth = if ($A.maxDepth) { [int]$A.maxDepth } else { 15 }

$h = Find-WindowHandle ([string]$A.title)
if ($h -eq [IntPtr]::Zero) {
  @{ ok = $false; error = 'window not found: ' + [string]$A.title } | ConvertTo-Json -Compress
  exit 0
}

# When a title is given, bring that window to the foreground before reading it
# so the refs the model acts on belong to the window that will receive input.
if ($A.title) {
  [void][DeskNative]::FocusWindow($h)
}

$root = [System.Windows.Automation.AutomationElement]::FromHandle($h)
$walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker

$sb = New-Object System.Text.StringBuilder 512
[void][DeskNative]::GetWindowText($h, $sb, 512)
$procId = [uint32]0
[void][DeskNative]::GetWindowThreadProcessId($h, [ref]$procId)

$interactive = @('Button','Edit','MenuItem','ListItem','CheckBox','RadioButton','ComboBox','Hyperlink','TabItem','Document','SplitButton','Slider','Spinner','TreeItem','DataItem','HeaderItem','Thumb','Text')

$elements = New-Object System.Collections.ArrayList
$queue = New-Object System.Collections.Queue
$queue.Enqueue(@($root, 0))
$visited = 0
$truncated = $false

while ($queue.Count -gt 0) {
  if ($elements.Count -ge $maxElements) { $truncated = $true; break }
  $pair = $queue.Dequeue()
  $el = $pair[0]
  $depth = [int]$pair[1]
  $visited++
  if ($visited -gt 3000) { $truncated = $true; break }

  $cur = $el.Current
  $offscreen = $false
  try { $offscreen = $cur.IsOffscreen } catch { }
  if ($offscreen -and $depth -gt 0) { continue }

  $role = ''
  try { $role = $cur.ControlType.ProgrammaticName -replace '^ControlType\\.', '' } catch { }
  $name = ''
  try { $name = [string]$cur.Name } catch { }
  if ($name.Length -gt 80) { $name = $name.Substring(0, 80) }

  $value = $null
  try {
    $vp = $el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
    $value = [string]$vp.Current.Value
  } catch { }
  if ($null -eq $value -and ($role -eq 'Document' -or $role -eq 'Edit')) {
    try {
      $tp = $el.GetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern)
      $value = $tp.DocumentRange.GetText(400)
    } catch { }
  }
  if ($value -and $value.Length -gt 200) { $value = $value.Substring(0, 200) }

  $rect = $cur.BoundingRectangle
  $hasRect = -not ([double]::IsNaN($rect.X) -or [double]::IsInfinity($rect.X) -or $rect.Width -le 0)

  $include = $depth -gt 0 -and $hasRect -and (($name -ne '') -or ($interactive -contains $role) -or ($null -ne $value))
  if ($include) {
    $enabled = $true
    try { $enabled = $cur.IsEnabled } catch { }
    [void]$elements.Add(@{
      role = $role
      name = $name
      value = $value
      x = [int]($rect.X + $rect.Width / 2)
      y = [int]($rect.Y + $rect.Height / 2)
      w = [int]$rect.Width
      h = [int]$rect.Height
      enabled = $enabled
    })
  }

  if ($depth -lt $maxDepth) {
    try {
      $child = $walker.GetFirstChild($el)
      while ($null -ne $child) {
        $queue.Enqueue(@($child, ($depth + 1)))
        $child = $walker.GetNextSibling($child)
      }
    } catch { }
  }
}

$payload = @{
  ok = $true
  window = @{ title = $sb.ToString(); processId = [int]$procId }
  elements = @($elements)
  truncated = $truncated
}
if ($elements.Count -eq 0) {
  $elevated = Test-ProcessElevated ([int]$procId)
  if ($elevated -eq $true) {
    $payload.hint = 'window belongs to an elevated (admin) process — UI Automation cannot read it from a non-elevated gateway; interact with a non-elevated window or run the gateway elevated'
  } elseif ([DeskNative]::IsIconic($h)) {
    $payload.hint = 'window is minimized and could not be restored — try action=window windowOp=restore first'
  }
}
$payload | ConvertTo-Json -Compress -Depth 6
`;

export const CLICK_SCRIPT =
  PREAMBLE +
  `
[void][DeskNative]::SetCursorPos([int]$A.x, [int]$A.y)
Start-Sleep -Milliseconds 60
$btn = [string]$A.button
$down = 0x0002
$up = 0x0004
if ($btn -eq 'right') { $down = 0x0008; $up = 0x0010 }
if ($btn -eq 'middle') { $down = 0x0020; $up = 0x0040 }
[DeskNative]::mouse_event($down, 0, 0, 0, [UIntPtr]::Zero)
# A real press has a measurable hold. Some controls ignore a down/up pair sent in
# the same instant, which looked like "the click did nothing".
Start-Sleep -Milliseconds 40
[DeskNative]::mouse_event($up, 0, 0, 0, [UIntPtr]::Zero)
if ($A.double) {
  Start-Sleep -Milliseconds 80
  [DeskNative]::mouse_event($down, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 40
  [DeskNative]::mouse_event($up, 0, 0, 0, [UIntPtr]::Zero)
}
# Clicking cannot know whether the right thing was hit, so report where the
# pointer actually was and which window ended up in front instead of asserting
# success. The caller verifies by reading the UI back.
Start-Sleep -Milliseconds 80
$fgAfter = [DeskNative]::GetForegroundWindow()
$sb = New-Object System.Text.StringBuilder 512
[void][DeskNative]::GetWindowText($fgAfter, $sb, 512)
@{
  ok = $true
  clicked = @{ x = [int]$A.x; y = [int]$A.y; button = $(if ($btn) { $btn } else { 'left' }) }
  windowAfter = $sb.ToString()
  note = 'Input was sent; this does NOT confirm the intended control was hit. Verify by reading the UI (snapshot/read) before reporting the result.'
} | ConvertTo-Json -Compress -Depth 4
`;

export const TYPE_SCRIPT =
  PREAMBLE +
  `
$r = [DeskNative]::TypeText([string]$A.text)
$parts = $r.Split('|')
$typed = [int]$parts[0]
$status = $parts[1]
if ($status -eq 'ok') {
  @{ ok = $true; typedChars = $typed } | ConvertTo-Json -Compress
} else {
  $why = if ($status -eq 'focus-changed') { 'foreground window changed mid-type (popup or app stole focus) — keystrokes stopped to avoid typing into the wrong window; re-focus and retry' } else { 'the human moved the mouse — typing stopped to yield control; retry when the user is idle' }
  @{ ok = $false; typedChars = $typed; aborted = $status; error = $why } | ConvertTo-Json -Compress
}
`;

export const KEY_SCRIPT =
  PREAMBLE +
  `
# Shortcuts are the most destructive input this tool sends: ctrl+s overwrites a
# file, alt+f4 closes an app, ctrl+n discards nothing but changes the target.
# TypeText already refuses to keep typing when focus moves or the human grabs the
# mouse; sending keys had no such guard and always reported success, so a
# mistimed ctrl+s could land in the user's own document. Same protection here.
$fgBefore = [DeskNative]::GetForegroundWindow()

$mods = @()
if ($A.modifiers) { $mods = @($A.modifiers | ForEach-Object { [byte]$_ }) }
$vk = [byte]$A.key

# Re-check right before pressing: focus can move between the caller deciding to
# send and the keystroke actually landing.
$fgNow = [DeskNative]::GetForegroundWindow()
if ($fgNow -ne $fgBefore) {
  @{
    ok = $false
    pressed = $null
    aborted = 'focus-changed'
    error = 'the foreground window changed before the shortcut was sent - it was NOT pressed, because it would have gone to the wrong window. Re-focus the target and retry.'
  } | ConvertTo-Json -Compress
  exit 0
}

foreach ($m in $mods) { [DeskNative]::keybd_event($m, 0, 0, [UIntPtr]::Zero) }
Start-Sleep -Milliseconds 30
[DeskNative]::keybd_event($vk, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 30
[DeskNative]::keybd_event($vk, 0, 2, [UIntPtr]::Zero)
[array]::Reverse($mods)
foreach ($m in $mods) { [DeskNative]::keybd_event($m, 0, 2, [UIntPtr]::Zero) }

# Report where it actually landed so the caller can verify rather than assume.
$sb = New-Object System.Text.StringBuilder 512
[void][DeskNative]::GetWindowText($fgNow, $sb, 512)
@{ ok = $true; pressed = [string]$A.label; targetWindow = $sb.ToString() } | ConvertTo-Json -Compress
`;

export const SCROLL_SCRIPT =
  PREAMBLE +
  `
if ($null -ne $A.x -and $null -ne $A.y) {
  [void][DeskNative]::SetCursorPos([int]$A.x, [int]$A.y)
  Start-Sleep -Milliseconds 40
}
$delta = [int]$A.delta * 120
[DeskNative]::mouse_event(0x0800, 0, 0, $delta, [UIntPtr]::Zero)
@{ ok = $true; scrolled = [int]$A.delta } | ConvertTo-Json -Compress
`;

export const MOVE_SCRIPT =
  PREAMBLE +
  `
[void][DeskNative]::SetCursorPos([int]$A.x, [int]$A.y)
@{ ok = $true; moved = @{ x = [int]$A.x; y = [int]$A.y } } | ConvertTo-Json -Compress -Depth 4
`;

export const DRAG_SCRIPT =
  PREAMBLE +
  `
[DeskNative]::DragMouse([int]$A.x, [int]$A.y, [int]$A.toX, [int]$A.toY, 16, 20)
@{ ok = $true; dragged = @{ from = @{ x = [int]$A.x; y = [int]$A.y }; to = @{ x = [int]$A.toX; y = [int]$A.toY } } } | ConvertTo-Json -Compress -Depth 5
`;

export const CLIPBOARD_SCRIPT =
  PREAMBLE +
  `
Add-Type -AssemblyName System.Windows.Forms
$op = [string]$A.op
if ($op -eq 'set') {
  $text = [string]$A.text
  if ($text) {
    [System.Windows.Forms.Clipboard]::SetText($text)
  } else {
    [System.Windows.Forms.Clipboard]::Clear()
  }
  @{ ok = $true; set = $true; chars = $text.Length } | ConvertTo-Json -Compress
} else {
  # Reading the clipboard can genuinely fail (wrong threading model, another app
  # holding it open). Swallowing that and returning an empty string made a
  # failure indistinguishable from an empty clipboard, so the caller would report
  # "the clipboard is empty" when it had simply never been read.
  $text = ''
  $readOk = $true
  $readErr = ''
  try { $text = [System.Windows.Forms.Clipboard]::GetText() } catch { $readOk = $false; $readErr = $_.Exception.Message }
  if (-not $readOk) {
    @{ ok = $false; error = 'could not read the clipboard: ' + $readErr } | ConvertTo-Json -Compress
    exit 0
  }
  if ($null -eq $text) { $text = '' }
  $truncated = $false
  if ($text.Length -gt 8000) { $text = $text.Substring(0, 8000); $truncated = $true }
  @{ ok = $true; text = $text; truncated = $truncated; empty = ($text.Length -eq 0) } | ConvertTo-Json -Compress
}
`;

export const PASTE_SCRIPT =
  PREAMBLE +
  `
Add-Type -AssemblyName System.Windows.Forms

# Ctrl+V goes wherever focus is. Same hazard as any other shortcut: if focus
# moved between deciding to paste and pasting, the text lands in the user's own
# window. Refuse rather than guess.
$fgBefore = [DeskNative]::GetForegroundWindow()

# The clipboard belongs to the user, not to us. Pasting used to overwrite
# whatever they had copied and never put it back, silently destroying their
# clipboard as a side effect of an unrelated task.
$previousClipboard = $null
$hadPrevious = $false
try { $previousClipboard = [System.Windows.Forms.Clipboard]::GetText(); $hadPrevious = $true } catch { }

[System.Windows.Forms.Clipboard]::SetText([string]$A.text)
Start-Sleep -Milliseconds 150

$fgNow = [DeskNative]::GetForegroundWindow()
if ($fgNow -ne $fgBefore) {
  if ($hadPrevious -and $previousClipboard) { try { [System.Windows.Forms.Clipboard]::SetText($previousClipboard) } catch { } }
  @{
    ok = $false
    aborted = 'focus-changed'
    error = 'the foreground window changed before pasting - nothing was pasted, because it would have gone to the wrong window. Re-focus the target and retry.'
  } | ConvertTo-Json -Compress
  exit 0
}

[DeskNative]::keybd_event(0x11, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 30
[DeskNative]::keybd_event(0x56, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 30
[DeskNative]::keybd_event(0x56, 0, 2, [UIntPtr]::Zero)
[DeskNative]::keybd_event(0x11, 0, 2, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 150

$restored = $false
if ($hadPrevious -and $previousClipboard) {
  try { [System.Windows.Forms.Clipboard]::SetText($previousClipboard); $restored = $true } catch { }
}
$sb = New-Object System.Text.StringBuilder 512
[void][DeskNative]::GetWindowText($fgNow, $sb, 512)
@{
  ok = $true
  pastedChars = ([string]$A.text).Length
  targetWindow = $sb.ToString()
  clipboardRestored = $restored
  note = 'Keys were sent; verify the text actually landed by reading the field back.'
} | ConvertTo-Json -Compress
`;

export const READ_SCRIPT =
  PREAMBLE +
  UIA_HELPERS +
  `
$maxChars = if ($A.maxChars) { [int]$A.maxChars } else { 2000 }
$el = Get-ElementAtPoint ([int]$A.x) ([int]$A.y)
if ($null -eq $el) {
  @{ ok = $false; error = 'no UI element at that point' } | ConvertTo-Json -Compress
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
$el = Get-ElementAtPoint ([int]$A.x) ([int]$A.y)
if ($null -eq $el) {
  @{ ok = $false; error = 'no UI element at that point' } | ConvertTo-Json -Compress
  exit 0
}
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
  $result = @{ ok = $false; error = ('element does not support ' + $op + ' (' + $_.Exception.Message + ') — fall back to act kind=click') }
}
$result | ConvertTo-Json -Compress -Depth 4
`;

export const WINDOW_SCRIPT =
  PREAMBLE +
  `
$h = Find-WindowHandle ([string]$A.title)
if ($h -eq [IntPtr]::Zero) {
  @{ ok = $false; error = 'window not found: ' + [string]$A.title } | ConvertTo-Json -Compress
  exit 0
}
$op = [string]$A.op
$SWP_NOZORDER = 0x0004
$SWP_NOSIZE = 0x0001
$SWP_NOMOVE = 0x0002
switch ($op) {
  'maximize' { [void][DeskNative]::ShowWindowAsync($h, 3) }
  'minimize' { [void][DeskNative]::ShowWindowAsync($h, 6) }
  'restore'  { [void][DeskNative]::ShowWindowAsync($h, 9) }
  'close'    { [void][DeskNative]::PostMessage($h, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) }
  'move'     { [void][DeskNative]::SetWindowPos($h, [IntPtr]::Zero, [int]$A.x, [int]$A.y, 0, 0, ($SWP_NOZORDER -bor $SWP_NOSIZE)) }
  'resize'   { [void][DeskNative]::SetWindowPos($h, [IntPtr]::Zero, 0, 0, [int]$A.width, [int]$A.height, ($SWP_NOZORDER -bor $SWP_NOMOVE)) }
  default {
    @{ ok = $false; error = ('unknown window op: ' + $op) } | ConvertTo-Json -Compress
    exit 0
  }
}
Start-Sleep -Milliseconds 350
$rect = New-Object 'DeskNative+RECT'
$hasRect = [DeskNative]::GetWindowRect($h, [ref]$rect)
$payload = @{ ok = $true; op = $op }
if ($hasRect -and $op -ne 'close') {
  $payload.window = @{ x = $rect.Left; y = $rect.Top; width = ($rect.Right - $rect.Left); height = ($rect.Bottom - $rect.Top) }
}
$payload | ConvertTo-Json -Compress -Depth 4
`;

export const WAIT_SCRIPT =
  PREAMBLE +
  UIA_HELPERS +
  `
$timeoutMs = if ($A.timeoutMs) { [Math]::Min([int]$A.timeoutMs, 30000) } else { 10000 }
$deadline = [DateTime]::UtcNow.AddMilliseconds($timeoutMs)
$start = [DateTime]::UtcNow
$found = $false
$element = $null
while ([DateTime]::UtcNow -lt $deadline) {
  $h = Find-WindowHandle ([string]$A.title)
  if ($h -ne [IntPtr]::Zero) {
    if (-not $A.name) {
      $found = $true
      break
    }
    try {
      $root = [System.Windows.Automation.AutomationElement]::FromHandle($h)
      $hits = @(Search-Elements $root ([string]$A.name) ([string]$A.role) 1 18)
      if ($hits.Count -gt 0) {
        $found = $true
        $element = $hits[0]
        break
      }
    } catch { }
  }
  Start-Sleep -Milliseconds 400
}
$elapsed = [int]([DateTime]::UtcNow - $start).TotalMilliseconds
$payload = @{ ok = $true; found = $found; elapsedMs = $elapsed }
if ($element) { $payload.element = $element }
if (-not $found) { $payload.hint = 'not found within ' + $timeoutMs + 'ms — the window/element may not exist yet; re-check with apps or snapshot' }
$payload | ConvertTo-Json -Compress -Depth 5
`;

export const FIND_SCRIPT =
  PREAMBLE +
  UIA_HELPERS +
  `
$h = Find-WindowHandle ([string]$A.title)
if ($h -eq [IntPtr]::Zero) {
  @{ ok = $false; error = 'window not found: ' + [string]$A.title } | ConvertTo-Json -Compress
  exit 0
}
if ($A.title) { [void][DeskNative]::FocusWindow($h) }
$sb = New-Object System.Text.StringBuilder 512
[void][DeskNative]::GetWindowText($h, $sb, 512)
$procId = [uint32]0
[void][DeskNative]::GetWindowThreadProcessId($h, [ref]$procId)
$root = [System.Windows.Automation.AutomationElement]::FromHandle($h)
$maxResults = if ($A.maxResults) { [int]$A.maxResults } else { 50 }
$hits = @(Search-Elements $root ([string]$A.name) ([string]$A.role) $maxResults 20)
@{
  ok = $true
  window = @{ title = $sb.ToString(); processId = [int]$procId }
  elements = $hits
  truncated = ($hits.Count -ge $maxResults)
} | ConvertTo-Json -Compress -Depth 6
`;

export const SCREENSHOT_SCRIPT =
  PREAMBLE +
  `
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
if ($A.window) {
  # Capture ONE window's own pixels via PrintWindow — works even when the window
  # is behind others / not in the foreground. (Foreground-free, like the browser.)
  $hwnd = Find-WindowHandle ([string]$A.title)
  if ($hwnd -eq [IntPtr]::Zero) {
    @{ ok = $false; error = ('window not found: ' + [string]$A.title) } | ConvertTo-Json -Compress
    exit 0
  }
  if ([DeskNative]::IsIconic($hwnd)) {
    @{ ok = $false; error = 'window is minimized — restore it first (action=window windowOp=restore), or read it with snapshot (UIA works while minimized)'; minimized = $true } | ConvertTo-Json -Compress
    exit 0
  }
  $rect = New-Object 'DeskNative+RECT'
  [void][DeskNative]::GetWindowRect($hwnd, [ref]$rect)
  $ww = $rect.Right - $rect.Left
  $wh = $rect.Bottom - $rect.Top
  if ($ww -le 0 -or $wh -le 0) {
    @{ ok = $false; error = 'window has no drawable area' } | ConvertTo-Json -Compress
    exit 0
  }
  $wbmp = New-Object System.Drawing.Bitmap($ww, $wh)
  $wg = [System.Drawing.Graphics]::FromImage($wbmp)
  $whdc = $wg.GetHdc()
  $printed = [DeskNative]::PrintWindow($hwnd, $whdc, 2)
  $wg.ReleaseHdc($whdc)
  # Detect a blank/black capture (some GPU/DirectX apps can't be PrintWindow'd).
  $blank = $true
  foreach ($pt in @(@(2, 2), @([int]($ww / 2), [int]($wh / 2)), @($ww - 3, $wh - 3), @([int]($ww / 2), 2))) {
    $cx = [Math]::Min([Math]::Max([int]$pt[0], 0), $ww - 1)
    $cy = [Math]::Min([Math]::Max([int]$pt[1], 0), $wh - 1)
    $px = $wbmp.GetPixel($cx, $cy)
    if ($px.R -gt 8 -or $px.G -gt 8 -or $px.B -gt 8) { $blank = $false; break }
  }
  $wbmp.Save([string]$A.path, [System.Drawing.Imaging.ImageFormat]::Png)
  $wg.Dispose(); $wbmp.Dispose()
  $wsb = New-Object System.Text.StringBuilder 512
  [void][DeskNative]::GetWindowText($hwnd, $wsb, 512)
  $wres = @{ ok = $true; path = [string]$A.path; width = $ww; height = $wh; window = $true; title = $wsb.ToString(); rect = @{ x = $rect.Left; y = $rect.Top; w = $ww; h = $wh } }
  if (-not $printed -or $blank) {
    $wres.hint = 'capture looks blank — this window is likely GPU/hardware-rendered, which PrintWindow cannot read. Bring it to the foreground (action=focus) then use a full-screen screenshot, or use snapshot (UIA reads it in the background).'
  }
  $wres | ConvertTo-Json -Compress -Depth 4
  exit 0
}
$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($b.Width, $b.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($b.X, $b.Y, 0, 0, $b.Size)
if ($A.grid) {
  # Vision-fallback aid: a labeled 100px coordinate grid lets an image model
  # READ click coordinates off the screenshot instead of estimating pixels.
  $gridPen = New-Object System.Drawing.Pen -ArgumentList ([System.Drawing.Color]::FromArgb(90, 0, 200, 255)), 1
  $gridFont = New-Object System.Drawing.Font -ArgumentList 'Consolas', 8, ([System.Drawing.FontStyle]::Bold)
  $gridBg = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(170, 0, 0, 0))
  $gridFg = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(255, 0, 255, 255))
  for ($gx = 100; $gx -lt $b.Width; $gx += 100) { $g.DrawLine($gridPen, $gx, 0, $gx, $b.Height) }
  for ($gy = 100; $gy -lt $b.Height; $gy += 100) { $g.DrawLine($gridPen, 0, $gy, $b.Width, $gy) }
  for ($gx = 200; $gx -lt $b.Width; $gx += 200) {
    for ($gy = 200; $gy -lt $b.Height; $gy += 200) {
      $label = "$gx,$gy"
      $size = $g.MeasureString($label, $gridFont)
      $g.FillRectangle($gridBg, $gx + 2, $gy + 2, $size.Width, $size.Height)
      $g.DrawString($label, $gridFont, $gridFg, $gx + 2, $gy + 2)
    }
  }
}
$marked = 0
if ($A.marks) {
  $pen = New-Object System.Drawing.Pen -ArgumentList ([System.Drawing.Color]::Red), 2
  $font = New-Object System.Drawing.Font -ArgumentList 'Segoe UI', 9, ([System.Drawing.FontStyle]::Bold)
  $bgBrush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(230, 200, 0, 0))
  foreach ($m in $A.marks) {
    $w = [Math]::Max([int]$m.w, 8)
    $h = [Math]::Max([int]$m.h, 8)
    $left = [int]($m.x - $w / 2)
    $top = [int]($m.y - $h / 2)
    $g.DrawRectangle($pen, $left, $top, $w, $h)
    $label = [string]$m.ref
    $size = $g.MeasureString($label, $font)
    $ly = [Math]::Max(0, $top - $size.Height)
    $g.FillRectangle($bgBrush, $left, $ly, $size.Width, $size.Height)
    $g.DrawString($label, $font, [System.Drawing.Brushes]::White, $left, $ly)
    $marked++
  }
}
$bmp.Save([string]$A.path, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
@{ ok = $true; path = [string]$A.path; width = $b.Width; height = $b.Height; marked = $marked } | ConvertTo-Json -Compress
`;
