$env:CARGO_FEATURES = "custom-protocol,light"
$env:VITE_BUILD_MODE = "light"
Write-Host "启动 Light 版..." -ForegroundColor Green
npm run tauri dev