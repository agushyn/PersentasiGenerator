# Phase 0 sidecar build script.
# 1. Bundles packages/pptx-engine into a single CJS file with esbuild.
# 2. Downloads the official Node.js runtime once and installs it as the
#    Tauri external binary (sidecar), so end users never need Node.js.
#
# Usage: powershell -ExecutionPolicy Bypass -File scripts/build-sidecar.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

Write-Host "[1/2] Building pptx-engine bundle..."
npm run --prefix "$root/packages/pptx-engine" build
if ($LASTEXITCODE -ne 0) { throw "pptx-engine build failed" }

# Tauri resource paths must live inside src-tauri; copy the bundle there.
$resDir = Join-Path $root "apps\desktop\src-tauri\resources\pptx-engine"
New-Item -ItemType Directory -Force $resDir | Out-Null
Copy-Item (Join-Path $root "packages\pptx-engine\dist\cli.cjs") (Join-Path $resDir "cli.cjs") -Force

Write-Host "[2/2] Ensuring Node.js runtime sidecar..."
$binDir = Join-Path $root "apps\desktop\src-tauri\binaries"
New-Item -ItemType Directory -Force $binDir | Out-Null

# Tauri externalBin convention: <name>-<rust target triple>.<ext>
$targetExe = Join-Path $binDir "node-x86_64-pc-windows-msvc.exe"

if (-not (Test-Path $targetExe)) {
    $nodeVersion = "v26.10.0"
    $zipPath = Join-Path $env:TEMP "node-$nodeVersion-win-x64.zip"
    $zipUrl = "https://nodejs.org/dist/$nodeVersion/node-$nodeVersion-win-x64.zip"

    if (-not (Test-Path $zipPath)) {
        Write-Host "Downloading $zipUrl ..."
        Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath
    }

    $extractDir = Join-Path $env:TEMP "adps-node-extract"
    if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
    Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

    Copy-Item (Join-Path $extractDir "node-$nodeVersion-win-x64\node.exe") $targetExe -Force
    Remove-Item -Recurse -Force $extractDir
}

Write-Host "Sidecar ready: $targetExe"
