# ProClaw v1.3 Legacy Data Migration - Real File Parse Smoke Test
# Parses the three real export files under D:\BigLionX\ProClaw\test-old-date

param(
    [string]$Filter = "legacy_import_smoke",
    [switch]$Release
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " ProClaw Legacy Import Smoke Test" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$modeArg = if ($Release) { "--release" } else { "" }
$cargoCmd = "cargo test $modeArg $Filter -- --nocapture"
Write-Host "Running: $cargoCmd" -ForegroundColor Yellow

Push-Location "$root\src-tauri"
try {
    Invoke-Expression $cargoCmd
} finally {
    Pop-Location
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nAll tests passed" -ForegroundColor Green
} else {
    Write-Host "`nTests failed, exit code: $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
