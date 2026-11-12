# Captures a window's contents via PrintWindow (works when the window is
# occluded by other applications). The script makes itself per-monitor DPI
# aware first: without that, Windows virtualizes GetWindowRect/PrintWindow
# coordinates for higher-DPI displays and the capture crops the window.
param(
    [string]$ProcessName = "arya-duta-persentasion-studio",
    [Parameter(Mandatory = $true)][string]$OutPath
)
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Print {
  [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr value);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
# DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2 = -4. Failure is fine when the
# context is already set for this process.
try { [Win32Print]::SetProcessDpiAwarenessContext([IntPtr](-4)) | Out-Null } catch { }

$p = Get-Process -Name $ProcessName | Select-Object -First 1
if (-not $p) { throw "process $ProcessName not found" }
$h = $p.MainWindowHandle
$r = New-Object Win32Print+RECT
[Win32Print]::GetWindowRect($h, [ref]$r) | Out-Null
$w = $r.Right - $r.Left
$ht = $r.Bottom - $r.Top

$bmp = New-Object System.Drawing.Bitmap $w, $ht
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
# PW_RENDERFULLCONTENT = 2: renders WebView2 content correctly.
[Win32Print]::PrintWindow($h, $hdc, 2) | Out-Null
$g.ReleaseHdc($hdc)
$g.Dispose()

New-Item -ItemType Directory -Force (Split-Path $OutPath) | Out-Null
$bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "saved ${w}x${ht} -> $OutPath"
