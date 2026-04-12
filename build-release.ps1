# Proclaw Desktop Quick Build Script
# For Windows PowerShell

# Configure local WiX installation (skip download)
# Try multiple environment variable names for compatibility
$wixPath = "D:\wix314-binaries"
if (Test-Path $wixPath) {
    $env:TAURI_WIX_PATH = $wixPath
    $env:WIX = $wixPath
    Write-Host "Using local WiX installation: $wixPath" -ForegroundColor Green
    Write-Host "Set environment variables: TAURI_WIX_PATH and WIX" -ForegroundColor Gray
} else {
    Write-Host "WARNING: WiX not found at $wixPath, will attempt automatic download" -ForegroundColor Yellow
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Proclaw Desktop v0.1.0-beta Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if in correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: Please run this script in proclaw-desktop directory" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1/5: Cleaning old build files..." -ForegroundColor Yellow
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue dist
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue src-tauri\target\release\bundle
Write-Host "Clean completed" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2/5: Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "Dependencies installed" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3/5: Starting build..." -ForegroundColor Yellow
Write-Host "This may take 5-10 minutes, please wait..." -ForegroundColor Cyan
npm run tauri build

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed" -ForegroundColor Red
    Write-Host "Please check error messages and fix before retry" -ForegroundColor Yellow
    exit 1
}

Write-Host "Build completed" -ForegroundColor Green
Write-Host ""

Write-Host "Step 4/5: Verifying generated files..." -ForegroundColor Yellow

$msiPath = "src-tauri\target\release\bundle\msi\Proclaw_0.1.0_x64_en-US.msi"

if (Test-Path $msiPath) {
    $fileSize = (Get-Item $msiPath).Length / 1MB
    Write-Host "MSI installer generated successfully" -ForegroundColor Green
    Write-Host "   Path: $msiPath" -ForegroundColor Gray
    Write-Host "   Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray
} else {
    Write-Host "ERROR: MSI installer not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 5/5: Generating release summary..." -ForegroundColor Yellow
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BUILD SUCCESS!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Installer Location:" -ForegroundColor Yellow
Write-Host "   Windows: $msiPath" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Test installation in clean Windows environment" -ForegroundColor Gray
Write-Host "   2. Run smoke tests (see RELEASE_CHECKLIST.md)" -ForegroundColor Gray
Write-Host "   3. Prepare screenshots and marketing materials" -ForegroundColor Gray
Write-Host "   4. Create GitHub Release" -ForegroundColor Gray
Write-Host "   5. Update website and social media" -ForegroundColor Gray
Write-Host ""
Write-Host "Related Documents:" -ForegroundColor Yellow
Write-Host "   - RELEASE_CHECKLIST.md (Complete release checklist)" -ForegroundColor Gray
Write-Host "   - RELEASE_NOTES.md (Release notes)" -ForegroundColor Gray
Write-Host "   - INSTALLATION_GUIDE.md (Installation guide)" -ForegroundColor Gray
Write-Host "   - KNOWN_ISSUES.md (Known issues)" -ForegroundColor Gray
Write-Host ""
Write-Host "Good luck with the release!" -ForegroundColor Green
Write-Host ""
