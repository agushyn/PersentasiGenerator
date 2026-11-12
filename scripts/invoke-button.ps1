# Invokes a named control inside the running Arya Duta Persentasion Studio
# window using UI Automation, with a coordinate-click fallback. Finds every
# element with the target name and clicks the one with a real bounding
# rectangle (WebView2 exposes some leaves with zero-width rects).
param([Parameter(Mandatory = $true)][string]$TargetName)

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MouseClick2 {
  [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr value);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
}
"@
# Per-monitor DPI awareness: UIA rectangles and cursor coordinates must be
# physical pixels; without this the OS virtualizes them on scaled displays.
try { [MouseClick2]::SetProcessDpiAwarenessContext([IntPtr](-4)) | Out-Null } catch { }

$process = Get-Process -Name "arya-duta-persentasion-studio" | Select-Object -First 1
if (-not $process) { throw "app not running" }
[MouseClick2]::SetForegroundWindow($process.MainWindowHandle) | Out-Null
Start-Sleep -Milliseconds 250

$root = [System.Windows.Automation.AutomationElement]::FromHandle($process.MainWindowHandle)
$condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, $TargetName)
$matches = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
if ($matches.Count -eq 0) { throw "element '$TargetName' not found" }

# Prefer real patterns; coordinates are the last resort because WebView2
# reports element rects in a different (logical) coordinate space than
# GetWindowRect physical pixels.
$target = $null
foreach ($element in $matches) {
    try {
        $invoke = $element.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
        $invoke.Invoke()
        Write-Host "invoked via UIA InvokePattern: $TargetName"
        exit 0
    } catch { }
    try {
        $select = $element.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)
        $select.Select()
        Write-Host "selected via UIA SelectionItemPattern: $TargetName"
        exit 0
    } catch { }
    $rect = $element.Current.BoundingRectangle
    if ($rect.Width -gt 1 -and ($target -eq $null -or $rect.Width -gt $target.Current.BoundingRectangle.Width)) {
        $target = $element
    }
}
if (-not $target) { throw "no clickable element '$TargetName'" }

$rect = $target.Current.BoundingRectangle
$x = [int]($rect.X + $rect.Width / 2)
$y = [int]($rect.Y + $rect.Height / 2)
[MouseClick2]::SetCursorPos($x, $y) | Out-Null
Start-Sleep -Milliseconds 120
[MouseClick2]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)  # LEFTDOWN
Start-Sleep -Milliseconds 60
[MouseClick2]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)  # LEFTUP
Write-Host "clicked at ${x},${y}: $TargetName"
