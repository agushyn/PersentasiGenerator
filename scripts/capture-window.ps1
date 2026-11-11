# Captures the Arya Duta Persentasion Studio window as a PNG (evidence).
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Capture {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

$outPath = "C:\OpenCode\Studio_Presentasi\phase0-evidence\dev-app.png"
New-Item -ItemType Directory -Force (Split-Path $outPath) | Out-Null

$p = Get-Process -Name "arya-duta-persentasion-studio" | Select-Object -First 1
$h = $p.MainWindowHandle
[Win32Capture]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 1000

$r = New-Object Win32Capture+RECT
[Win32Capture]::GetWindowRect($h, [ref]$r) | Out-Null
$w = $r.Right - $r.Left
$ht = $r.Bottom - $r.Top

$bmp = New-Object System.Drawing.Bitmap $w, $ht
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($r.Left, $r.Top, 0, 0, (New-Object System.Drawing.Size $w, $ht))
$g.Dispose()
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "saved ${w}x${ht} -> $outPath"
