$env:CARGO_FEATURES = "custom-protocol,inventory"
$env:VITE_BUILD_MODE = "inventory"
Write-Host "启动 Plus 版..." -ForegroundColor Cyan
npm run tauri dev
