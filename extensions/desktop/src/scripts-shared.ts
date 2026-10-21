/**
 * Static PowerShell scripts for Windows desktop automation.
 * Dynamic values are read from the GRANTED_DESKTOP_ARGS env var (JSON) so the
 * scripts never need string interpolation. Each script prints exactly one
 * compact JSON line on success.
 */

export const PREAMBLE = `
$ErrorActionPreference = 'Stop'
$A = if ($env:GRANTED_DESKTOP_ARGS) { $env:GRANTED_DESKTOP_ARGS | ConvertFrom-Json } else { $null }
$DeskSrc = @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class DeskNative {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, int dx, int dy, int dwData, UIntPtr dwExtraInfo);
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int n);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
  // Asks a window to render itself into a device context — works even when the
  // window is behind others (the OS-level equivalent of CDP captureScreenshot).
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);

  [StructLayout(LayoutKind.Sequential)]
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [StructLayout(LayoutKind.Sequential)]
  public struct POINT { public int X; public int Y; }
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);

  [StructLayout(LayoutKind.Sequential)]
  public struct MOUSEINPUT { public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public UIntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Sequential)]
  public struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public UIntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Explicit)]
  public struct InputUnion { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; }
  [StructLayout(LayoutKind.Sequential)]
  public struct INPUT { public uint type; public InputUnion U; }
  [DllImport("user32.dll", SetLastError=true)] public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

  public static void KeyPress(byte vk) {
    keybd_event(vk, 0, 0, UIntPtr.Zero);
    System.Threading.Thread.Sleep(15);
    keybd_event(vk, 0, 2, UIntPtr.Zero);
    System.Threading.Thread.Sleep(15);
  }

  static void SendCharPair(char c) {
    INPUT[] pair = new INPUT[2];
    pair[0].type = 1; pair[0].U.ki.wScan = c; pair[0].U.ki.dwFlags = 0x0004;
    pair[1].type = 1; pair[1].U.ki.wScan = c; pair[1].U.ki.dwFlags = 0x0006;
    SendInput(2, pair, Marshal.SizeOf(typeof(INPUT)));
    System.Threading.Thread.Sleep(8);
  }

  // One char per SendInput call: batching many KEYEVENTF_UNICODE events triggers
  // a VK_PACKET race where slow apps translate backlogged events with the latest
  // packet state, collapsing the tail of the text into the final character.
  //
  // Guarded: aborts when the foreground window changes mid-type (a popup stole
  // focus, keystrokes would land in the wrong app) or when the physical cursor
  // moves (the human grabbed the mouse — yield immediately).
  static bool ForegroundTitleContains(string needle) {
    if (string.IsNullOrEmpty(needle)) { return true; }
    StringBuilder sb = new StringBuilder(512);
    GetWindowText(GetForegroundWindow(), sb, 512);
    return sb.ToString().ToLowerInvariant().Contains(needle.ToLowerInvariant());
  }

  public static string TypeText(string text) { return TypeTextInto(text, ""); }

  // expectTitle is the window the caller *asked* to type into, which is not the
  // same as whatever is in front when typing starts. They diverge in exactly the
  // case that hurts: the user clicks into their own editor or the chat box
  // between the focus call and the first keystroke, and the entire message lands
  // there. Guarding only against *changes* cannot catch it, because by then the
  // wrong window is already the baseline.
  public static string TypeTextInto(string text, string expectTitle) {
    if (!ForegroundTitleContains(expectTitle)) { return "0|wrong-window"; }
    IntPtr startFg = GetForegroundWindow();
    POINT startPos; GetCursorPos(out startPos);
    int typed = 0;
    foreach (char c in text) {
      // Every 4th rather than every 10th: at 10 the first check only ran after
      // the 9th character, so a whole word could reach the wrong window before
      // the guard looked even once.
      if (typed % 4 == 3) {
        if (GetForegroundWindow() != startFg) { return typed + "|focus-changed"; }
        POINT now; GetCursorPos(out now);
        if (Math.Abs(now.X - startPos.X) > 40 || Math.Abs(now.Y - startPos.Y) > 40) { return typed + "|user-mouse-moved"; }
      }
      if (c == '\\r') { typed++; continue; }
      if (c == '\\n') { KeyPress(0x0D); typed++; continue; }
      if (c == '\\t') { KeyPress(0x09); typed++; continue; }
      SendCharPair(c);
      typed++;
    }
    return typed + "|ok";
  }

  public static void DragMouse(int x1, int y1, int x2, int y2, int steps, int stepDelayMs) {
    SetCursorPos(x1, y1);
    System.Threading.Thread.Sleep(120);
    mouse_event(0x0002, 0, 0, 0, UIntPtr.Zero);
    System.Threading.Thread.Sleep(150);
    for (int i = 1; i <= steps; i++) {
      int nx = x1 + (int)((x2 - x1) * (double)i / steps);
      int ny = y1 + (int)((y2 - y1) * (double)i / steps);
      SetCursorPos(nx, ny);
      // Relative zero-move fires a real WM_MOUSEMOVE so drop targets track the drag.
      mouse_event(0x0001, 0, 0, 0, UIntPtr.Zero);
      System.Threading.Thread.Sleep(stepDelayMs);
    }
    System.Threading.Thread.Sleep(120);
    mouse_event(0x0004, 0, 0, 0, UIntPtr.Zero);
  }

  // Launch an app WITHOUT taking the user's foreground.
  //
  // Start-Process cannot express this. Its -WindowStyle Minimized maps to
  // SW_SHOWMINIMIZED (2), which minimizes *and activates*; the one that does
  // not activate is SW_SHOWMINNOACTIVE (7), reachable only through
  // CreateProcess with STARTF_USESHOWWINDOW. Measured on Windows 11: with (7)
  // the caller keeps focus while the app's window still appears on the taskbar
  // with a usable UI Automation tree.
  //
  // lpApplicationName needs a real executable path - which also sidesteps the
  // Store app execution alias: a bare "notepad" resolves to a Store host that
  // ignores the requested show state entirely, while
  // C:/Windows/System32/notepad.exe is the ordinary Win32 binary that honours it.
  [StructLayout(LayoutKind.Sequential)] public struct STARTUPINFO {
    public int cb; public string lpReserved, lpDesktop, lpTitle;
    public int dwX, dwY, dwXSize, dwYSize, dwXCountChars, dwYCountChars, dwFillAttribute, dwFlags;
    public short wShowWindow; public short cbReserved2;
    public IntPtr lpReserved2, hStdInput, hStdOutput, hStdError;
  }
  [StructLayout(LayoutKind.Sequential)] public struct PROCESS_INFORMATION {
    public IntPtr hProcess, hThread; public int dwProcessId, dwThreadId;
  }
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CreateProcessW(string lpApplicationName, string lpCommandLine,
    IntPtr lpProcessAttributes, IntPtr lpThreadAttributes, bool bInheritHandles, uint dwCreationFlags,
    IntPtr lpEnvironment, string lpCurrentDirectory, ref STARTUPINFO si, out PROCESS_INFORMATION pi);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);

  /** Returns the new process id, or -1 when the launch could not be started. */
  public static int StartWithoutActivating(string exePath, string commandLine) {
    var si = new STARTUPINFO();
    si.cb = Marshal.SizeOf(si);
    si.dwFlags = 0x00000001;   // STARTF_USESHOWWINDOW
    si.wShowWindow = 7;        // SW_SHOWMINNOACTIVE
    PROCESS_INFORMATION pi;
    bool ok = CreateProcessW(exePath, commandLine, IntPtr.Zero, IntPtr.Zero, false, 0,
                             IntPtr.Zero, null, ref si, out pi);
    if (!ok) { return -1; }
    CloseHandle(pi.hThread);
    CloseHandle(pi.hProcess);
    return pi.dwProcessId;
  }

  // How long since the user last touched the keyboard or mouse, in ms.
  //
  // This is what makes the launch considerate rather than merely quiet. A user
  // mid-sentence must never lose the caret; a user who has stepped back from
  // the keyboard is better served by being shown the finished window. Both
  // ChatGPT and Claude Code behave this way, and GetLastInputInfo is the signal
  // that tells them apart. Note it is session-wide input, not per-window.
  [StructLayout(LayoutKind.Sequential)] public struct LASTINPUTINFO {
    public uint cbSize; public uint dwTime;
  }
  [DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

  public static uint IdleMilliseconds() {
    var info = new LASTINPUTINFO();
    info.cbSize = (uint)Marshal.SizeOf(typeof(LASTINPUTINFO));
    if (!GetLastInputInfo(ref info)) { return 0; }
    return unchecked((uint)Environment.TickCount - info.dwTime);
  }

  public static bool FocusWindow(IntPtr hWnd) {
    if (IsIconic(hWnd)) { ShowWindowAsync(hWnd, 9); System.Threading.Thread.Sleep(250); }
    uint pidIgnored;
    uint targetThread = GetWindowThreadProcessId(hWnd, out pidIgnored);
    uint thisThread = GetCurrentThreadId();
    IntPtr fg = GetForegroundWindow();
    uint fgThread = 0;
    if (fg != IntPtr.Zero) { fgThread = GetWindowThreadProcessId(fg, out pidIgnored); }
    bool attachedTarget = false;
    bool attachedFg = false;
    if (targetThread != thisThread) { attachedTarget = AttachThreadInput(thisThread, targetThread, true); }
    if (fgThread != 0 && fgThread != thisThread && fgThread != targetThread) { attachedFg = AttachThreadInput(thisThread, fgThread, true); }
    BringWindowToTop(hWnd);
    bool ok = SetForegroundWindow(hWnd);
    if (attachedFg) { AttachThreadInput(thisThread, fgThread, false); }
    if (attachedTarget) { AttachThreadInput(thisThread, targetThread, false); }
    System.Threading.Thread.Sleep(250);
    return ok;
  }
}
'@
# Compile-once cache: Add-Type -TypeDefinition launches the C# compiler on every
# call, and this host machine is sensitive to process/CPU churn. Cache the
# compiled assembly on disk (hash-named, so source changes self-invalidate) and
# load it on subsequent calls instead of recompiling.
$deskLoaded = $false
try {
  $md5 = [System.Security.Cryptography.MD5]::Create()
  $hashHex = ([System.BitConverter]::ToString($md5.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($DeskSrc))) -replace '-', '').Substring(0, 12)
  $deskDir = Join-Path $env:LOCALAPPDATA 'Granted\\desknative'
  $deskDll = Join-Path $deskDir ('DeskNative-' + $hashHex + '.dll')
  if (Test-Path $deskDll) {
    Add-Type -Path $deskDll
    $deskLoaded = $true
  } else {
    if (-not (Test-Path $deskDir)) { [void](New-Item -ItemType Directory -Force -Path $deskDir) }
    Add-Type -TypeDefinition $DeskSrc -OutputAssembly $deskDll
    Add-Type -Path $deskDll
    $deskLoaded = $true
  }
} catch { }
if (-not $deskLoaded) { Add-Type -TypeDefinition $DeskSrc }
[void][DeskNative]::SetProcessDPIAware()

function Get-ForegroundInfo {
  $h = [DeskNative]::GetForegroundWindow()
  $sb = New-Object System.Text.StringBuilder 512
  [void][DeskNative]::GetWindowText($h, $sb, 512)
  $procId = [uint32]0
  [void][DeskNative]::GetWindowThreadProcessId($h, [ref]$procId)
  return @{ title = $sb.ToString(); processId = [int]$procId; hwnd = [int64]$h }
}

function Find-WindowHandle([string]$query) {
  if (-not $query) { return [DeskNative]::GetForegroundWindow() }
  $q = $query.ToLowerInvariant()
  $cands = @(Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -and $_.MainWindowTitle.ToLowerInvariant().Contains($q) })
  if ($cands.Count -eq 0) { return [IntPtr]::Zero }
  # Several windows can share a title substring (e.g. two Notepads). Prefer the
  # one already in the foreground, then an exact title match, then any window
  # that is not minimized, then give up and take the first.
  $fg = [DeskNative]::GetForegroundWindow()
  foreach ($p in $cands) { if ($p.MainWindowHandle -eq $fg) { return $p.MainWindowHandle } }
  foreach ($p in $cands) { if ($p.MainWindowTitle.ToLowerInvariant() -eq $q) { return $p.MainWindowHandle } }
  foreach ($p in $cands) { if (-not [DeskNative]::IsIconic($p.MainWindowHandle)) { return $p.MainWindowHandle } }
  return $cands[0].MainWindowHandle
}

function Test-ProcessElevated([int]$procId) {
  # Best-effort: accessing .Handle of a higher-integrity process throws for a
  # non-elevated caller. Returns $null when undetermined.
  try {
    $p = Get-Process -Id $procId -ErrorAction Stop
    $null = $p.Handle
    return $false
  } catch [System.ComponentModel.Win32Exception] {
    return $true
  } catch {
    return $null
  }
}
`;

// Shared UIA helpers (assemblies + element walking) for scripts that read the tree.
export const UIA_HELPERS = `
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName WindowsBase

function Get-BackgroundActions($el) {
  # Report provider capabilities, not guesses based on app name or control role.
  $actions = New-Object System.Collections.ArrayList
  foreach ($entry in @(
    @('invoke', [System.Windows.Automation.InvokePattern]::Pattern),
    @('toggle', [System.Windows.Automation.TogglePattern]::Pattern),
    @('expand', [System.Windows.Automation.ExpandCollapsePattern]::Pattern),
    @('collapse', [System.Windows.Automation.ExpandCollapsePattern]::Pattern),
    @('select', [System.Windows.Automation.SelectionItemPattern]::Pattern),
    @('settext', [System.Windows.Automation.ValuePattern]::Pattern)
  )) {
    try {
      $pattern = $null
      if ($el.TryGetCurrentPattern($entry[1], [ref]$pattern)) {
        if ($entry[0] -ne 'settext' -or -not $pattern.Current.IsReadOnly) {
          [void]$actions.Add($entry[0])
        }
      }
    } catch { }
  }
  return $actions.ToArray()
}

function Get-ElementInfo($el, [int]$maxValueChars) {
  $cur = $el.Current
  $role = ''
  try { $role = $cur.ControlType.ProgrammaticName -replace '^ControlType\\.', '' } catch { }
  $name = ''
  try { $name = [string]$cur.Name } catch { }
  $value = $null
  try {
    $vp = $el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
    $value = [string]$vp.Current.Value
  } catch { }
  if ($null -eq $value) {
    try {
      $tp = $el.GetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern)
      $value = $tp.DocumentRange.GetText($maxValueChars)
    } catch { }
  }
  if ($value -and $value.Length -gt $maxValueChars) { $value = $value.Substring(0, $maxValueChars) }
  $enabled = $true
  try { $enabled = $cur.IsEnabled } catch { }
  $rect = $cur.BoundingRectangle
  $hasRect = -not ([double]::IsNaN($rect.X) -or [double]::IsInfinity($rect.X) -or $rect.Width -le 0)
  return @{
    runtimeId = ($el.GetRuntimeId() -join ',')
    processId = $cur.ProcessId
    role = $role
    name = $name
    value = $value
    backgroundActions = @(Get-BackgroundActions $el)
    enabled = $enabled
    x = $(if ($hasRect) { [int]($rect.X + $rect.Width / 2) } else { 0 })
    y = $(if ($hasRect) { [int]($rect.Y + $rect.Height / 2) } else { 0 })
    w = $(if ($hasRect) { [int]$rect.Width } else { 0 })
    h = $(if ($hasRect) { [int]$rect.Height } else { 0 })
    hasRect = $hasRect
  }
}

function Resolve-Element($request) {
  if ($request.runtimeId) {
    $condition = New-Object System.Windows.Automation.PropertyCondition -ArgumentList ([System.Windows.Automation.AutomationElement]::ProcessIdProperty), ([int]$request.processId)
    $elements = [System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
    foreach ($candidate in $elements) {
      try {
        if (($candidate.GetRuntimeId() -join ',') -eq [string]$request.runtimeId) { return $candidate }
      } catch { }
    }
    return $null
  }
  if ($null -ne $request.x -and $null -ne $request.y) {
    return Get-ElementAtPoint ([int]$request.x) ([int]$request.y)
  }
  return $null
}

function Confirm-BackgroundForeground($result, [IntPtr]$before, [IntPtr]$targetWindow, [bool]$foregroundAllowed) {
  $after = [DeskNative]::GetForegroundWindow()
  $result.foregroundUnchanged = ($after -eq $before)
  if (-not $foregroundAllowed -and $after -ne $before) {
    # Restore only when the action's own target is still foreground, never over
    # another window the user may have selected in the meantime.
    $restored = $false
    if ($before -ne [IntPtr]::Zero -and $after -eq $targetWindow) {
      [void][DeskNative]::SetForegroundWindow($before)
      $restored = ([DeskNative]::GetForegroundWindow() -eq $before)
    }
    $result.ok = $false
    $result.refused = 'background-focus-changed'
    $result.focusRestored = $restored
    $result.error = 'This UI Automation provider changed foreground focus. Foreground access requires approval; use a file/API route or isolated desktop instead. The action may already have changed the target; inspect it and do not repeat blindly.'
    if ($result.ContainsKey('verification')) { $result.verification.passed = $false }
  }
}

function Get-ElementAtPoint([int]$x, [int]$y) {
  try {
    $pt = New-Object System.Windows.Point -ArgumentList ([double]$x), ([double]$y)
    return [System.Windows.Automation.AutomationElement]::FromPoint($pt)
  } catch {
    return $null
  }
}

function Search-Elements($root, [string]$nameQuery, [string]$roleQuery, [int]$maxResults, [int]$maxDepth) {
  $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
  $nq = if ($nameQuery) { $nameQuery.ToLowerInvariant() } else { '' }
  $rq = if ($roleQuery) { $roleQuery.ToLowerInvariant() } else { '' }
  $results = New-Object System.Collections.ArrayList
  $queue = New-Object System.Collections.Queue
  $queue.Enqueue(@($root, 0))
  $visited = 0
  while ($queue.Count -gt 0) {
    if ($results.Count -ge $maxResults) { break }
    $pair = $queue.Dequeue()
    $el = $pair[0]
    $depth = [int]$pair[1]
    $visited++
    if ($visited -gt 4000) { break }
    # UIA identities remain useful when a window is minimized or covered.
    if ($null -ne $el) {
      $info = Get-ElementInfo $el 120
      $matchesName = $true
      if ($nq) {
        $hay = (($info.name + ' ' + [string]$info.value)).ToLowerInvariant()
        $matchesName = $hay.Contains($nq)
      }
      $matchesRole = $true
      if ($rq) { $matchesRole = ([string]$info.role).ToLowerInvariant().Contains($rq) }
      if ($depth -gt 0 -and $matchesName -and $matchesRole) {
        $info.Remove('hasRect')
        [void]$results.Add($info)
      }
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
  return $results
}
`;
