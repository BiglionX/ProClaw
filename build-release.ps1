# Proclaw Desktop Release Build Script
# For Windows PowerShell
# Version: v1.0.0-beta.2

param(
    [switch]$SkipTest,
    [switch]$SkipClean,
    [ValidateSet("msi", "nsis", "all")]
    [string]$Target = "all",
    [ValidateSet("inventory", "virtual_company")]
    [string]$Mode = "inventory"
)

# Configure local WiX installation (skip download)
$wixPath = "D:\wix314-binaries"
if (Test-Path $wixPath) {
    $env:TAURI_WIX_PATH = $wixPath
    $env:WIX = $wixPath
    Write-Host "Using local WiX installation: $wixPath" -ForegroundColor Green
} else {
    Write-Host "WARNING: WiX not found at $wixPath, will attempt automatic download" -ForegroundColor Yellow
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Proclaw Desktop v0.1.0-beta.2 Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 设置构建模式
$env:VITE_BUILD_MODE = $Mode
Write-Host "Build Mode: $Mode" -ForegroundColor Yellow
if ($Mode -eq "virtual_company") {
    $env:CARGO_FEATURES = "virtual_company,custom-protocol"
    $outputSuffix = "Light版"
} else {
    $env:CARGO_FEATURES = "inventory,custom-protocol"
    $outputSuffix = "Plus版"
}
Write-Host "Output: ProClaw-$outputSuffix" -ForegroundColor Yellow
Write-Host ""

# Check if in correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: Please run this script in proclaw-desktop directory" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1/6: Cleaning old build files..." -ForegroundColor Yellow
if (-not $SkipClean) {
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue dist
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue src-tauri\target\release\bundle
    Write-Host "Clean completed" -ForegroundColor Green
} else {
    Write-Host "Clean skipped" -ForegroundColor Gray
}
Write-Host ""

Write-Host "Step 2/6: Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "Dependencies installed" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3/6: Running unit tests..." -ForegroundColor Yellow
if (-not $SkipTest) {
    npm run test:run
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Some unit tests failed. Review and fix before release." -ForegroundColor Yellow
    } else {
        Write-Host "All unit tests passed" -ForegroundColor Green
    }
} else {
    Write-Host "Tests skipped" -ForegroundColor Gray
}
Write-Host ""

Write-Host "Step 4/6: TypeScript compilation check..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: TypeScript compilation errors found" -ForegroundColor Yellow
} else {
    Write-Host "TypeScript compilation passed" -ForegroundColor Green
}
Write-Host ""

Write-Host "Step 5/6: Building release package..." -ForegroundColor Yellow
Write-Host "This may take 5-10 minutes, please wait..." -ForegroundColor Cyan

if ($Target -eq "msi") {
    npm run tauri build -- --bundles msi
} elseif ($Target -eq "nsis") {
    npm run tauri build -- --bundles nsis
} else {
    npm run tauri build
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed" -ForegroundColor Red
    Write-Host "Please check error messages and fix before retry" -ForegroundColor Yellow
    exit 1
}

Write-Host "Build completed" -ForegroundColor Green
Write-Host ""

Write-Host "Step 6/6: Verifying generated files..." -ForegroundColor Yellow

$msiPath = "src-tauri\target\release\bundle\msi\Proclaw_0.1.0_x64_en-US.msi"
$nsisPath = "src-tauri\target\release\bundle\nsis\Proclaw_0.1.0_x64-setup.exe"

$foundFiles = @()

if (Test-Path $msiPath) {
    $fileSize = (Get-Item $msiPath).Length / 1MB
    Write-Host "MSI installer generated successfully" -ForegroundColor Green
    Write-Host "   Path: $msiPath" -ForegroundColor Gray
    Write-Host "   Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray
    $foundFiles += "MSI"
}

if (Test-Path $nsisPath) {
    $fileSize = (Get-Item $nsisPath).Length / 1MB
    Write-Host "NSIS installer generated successfully" -ForegroundColor Green
    Write-Host "   Path: $nsisPath" -ForegroundColor Gray
    Write-Host "   Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray
    $foundFiles += "NSIS"
}

if ($foundFiles.Count -eq 0) {
    Write-Host "ERROR: No installers found in expected locations" -ForegroundColor Red
    Write-Host "Check src-tauri\target\release\bundle\ for generated files" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BUILD SUCCESS!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Installer Location:" -ForegroundColor Yellow
Write-Host "   src-tauri\target\release\bundle\" -ForegroundColor Gray
Write-Host "   Formats: $($foundFiles -join ', ')" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Run smoke tests on clean install" -ForegroundColor Gray
Write-Host "   2. Verify E2E tests: npm run test:e2e" -ForegroundColor Gray
Write-Host "   3. Review docs/guides/DEPLOYMENT_USER_GUIDE.md" -ForegroundColor Gray
Write-Host "   4. Tag release: git tag v0.1.0-beta.2" -ForegroundColor Gray
Write-Host "   5. Create GitHub Release with installers" -ForegroundColor Gray
Write-Host "   6. Update CHANGELOG.md for next release" -ForegroundColor Gray
Write-Host ""
Write-Host "Related Documents:" -ForegroundColor Yellow
Write-Host "   - CHANGELOG.md" -ForegroundColor Gray
Write-Host "   - docs/guides/DEPLOYMENT_USER_GUIDE.md" -ForegroundColor Gray
Write-Host "   - docs/guides/PRO_SETUP_GUIDE.md" -ForegroundColor Gray
Write-Host "   - RELEASE_NOTES_v0.1.0_BETA1.md" -ForegroundColor Gray
Write-Host ""
Write-Host "Good luck with the release!" -ForegroundColor Green
Write-Host ""
