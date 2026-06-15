# ProClaw portable repackage script
$ErrorActionPreference = 'Stop'
$timestamp = (Get-Date).ToString('yyyyMMdd_HHmmss')
$stagingDir = Join-Path $env:TEMP "proclaw-package-$timestamp"
$portableSrc = 'd:\BigLionX\ProClaw\RELEASES\v1.0.0\portable'
$releasesDir = 'd:\BigLionX\ProClaw\RELEASES\v1.0.0'
$zipDest = Join-Path $releasesDir 'ProClaw_1.0.0_x64_portable.zip'

# 1. 复制所有 .txt 到 portable 子目录
Write-Host "[1/4] Syncing .txt files to portable/ ..."
Get-ChildItem $releasesDir -Filter '*.txt' -ErrorAction SilentlyContinue | ForEach-Object {
    Copy-Item $_.FullName $portableSrc -Force -ErrorAction SilentlyContinue
}

# 2. 创建 staging 目录
Write-Host "[2/4] Staging files in $stagingDir ..."
New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null
Copy-Item (Join-Path $portableSrc 'ProClaw.exe') $stagingDir -Force
Copy-Item (Join-Path $portableSrc 'LICENSE') $stagingDir -Force -ErrorAction SilentlyContinue
Get-ChildItem $portableSrc -Filter 'RELEASE_NOTES*.txt' -ErrorAction SilentlyContinue | ForEach-Object {
    Copy-Item $_.FullName $stagingDir -Force -ErrorAction SilentlyContinue
}

# 3. 打包
Write-Host "[3/4] Compressing to $zipDest ..."
Compress-Archive -Path (Join-Path $stagingDir '*') -DestinationPath $zipDest -Force

# 4. 清理
Write-Host "[4/4] Cleaning up staging dir ..."
Remove-Item $stagingDir -Recurse -Force

# 5. 输出
$zip = Get-Item $zipDest
$hash = (Get-FileHash $zip -Algorithm SHA256).Hash
$exe = Get-Item (Join-Path $portableSrc 'ProClaw.exe')
$exeHash = (Get-FileHash $exe -Algorithm SHA256).Hash
$license = Get-Item (Join-Path $portableSrc 'LICENSE') -ErrorAction SilentlyContinue
# PS 5.x 不支持在赋值语句中使用 if/else 表达式,需拆成 if/elseif 块
$licenseHash = 'N/A'
$licenseName = 'N/A'
if ($license) {
    $licenseHash = (Get-FileHash $license -Algorithm SHA256).Hash
    $licenseName = $license.Name
}

Write-Host ""
Write-Host "========================================"
Write-Host "Portable Package Info"
Write-Host "========================================"
Write-Host ("ProClaw.exe:    {0}  ({1:N0} bytes)" -f $exe.Name, $exe.Length)
Write-Host ("  SHA256:       " + $exeHash)
Write-Host ("LICENSE:        " + $licenseName)
Write-Host ("  SHA256:       " + $licenseHash)
Write-Host ("Zip:            {0}  ({1:N0} bytes)" -f $zip.Name, $zip.Length)
Write-Host ("  SHA256:       " + $hash)
Write-Host "========================================"
