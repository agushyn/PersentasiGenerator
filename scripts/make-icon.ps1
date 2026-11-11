# Creates a minimal brand-colored application icon for Phase 0 builds.
# Output: apps/desktop/src-tauri/icons/icon.ico

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$iconsDir = Join-Path $root "apps\desktop\src-tauri\icons"
New-Item -ItemType Directory -Force $iconsDir | Out-Null
$iconPath = Join-Path $iconsDir "icon.ico"

Add-Type -AssemblyName System.Drawing

$size = 256
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(169, 79, 54))   # accent #A94F36

$font = New-Object System.Drawing.Font("Georgia", 130, [System.Drawing.FontStyle]::Bold)
$brush = [System.Drawing.Brushes]::White
$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = [System.Drawing.StringAlignment]::Center
$fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
$rect = New-Object System.Drawing.RectangleF 0, 0, $size, $size
$g.DrawString("A", $font, $brush, $rect, $fmt)
$g.Dispose()

$icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$fileStream = [System.IO.File]::Create($iconPath)
$icon.Save($fileStream)
$fileStream.Dispose()
$bmp.Dispose()

Write-Host "Icon written: $iconPath"
