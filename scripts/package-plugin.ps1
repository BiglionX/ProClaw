<#
.SYNOPSIS
    ProClaw 行业插件打包工具
.DESCRIPTION
    将插件目录（manifest.json + 资源文件）打包为 .proclaw-plugin (ZIP) 文件。
    可选集成 Ed25519 签名。
.PARAMETER PluginDir
    插件目录路径，必须包含 manifest.json
.PARAMETER OutputDir
    输出目录，默认为当前目录
.PARAMETER Sign
    是否对打包结果进行 Ed25519 签名
.PARAMETER PrivateKeyFile
    Ed25519 私钥文件路径（PEM 格式），Sign 为 true 时必填
.EXAMPLE
    .\package-plugin.ps1 -PluginDir ../src/plugins/catering -OutputDir ./dist
    .\package-plugin.ps1 -PluginDir ../src/plugins/catering -OutputDir ./dist -Sign -PrivateKeyFile ./keys/private.pem
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$PluginDir,

    [Parameter(Mandatory = $false)]
    [string]$OutputDir = ".",

    [Parameter(Mandatory = $false)]
    [switch]$Sign,

    [Parameter(Mandatory = $false)]
    [string]$PrivateKeyFile
)

# 解析插件 manifest
$manifestPath = Join-Path $PluginDir "manifest.json"
if (-not (Test-Path $manifestPath)) {
    Write-Error "找不到 manifest.json: $manifestPath"
    exit 1
}

$manifest = Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$pluginId = $manifest.id
$version = $manifest.version
$pluginName = $manifest.name

Write-Host "[Package] 插件: $pluginName ($pluginId@$version)" -ForegroundColor Cyan

# 创建临时打包目录
$tempDir = Join-Path $env:TEMP "proclaw-plugin-$pluginId-$([System.Guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    # 复制 manifest.json
    Copy-Item $manifestPath (Join-Path $tempDir "manifest.json")

    # 复制 migrations 目录（如果存在）
    $migrationsDir = Join-Path $PluginDir "migrations"
    if (Test-Path $migrationsDir) {
        Write-Host "[Package] 复制 migrations/ ..." -ForegroundColor Gray
        $targetMigrations = Join-Path $tempDir "migrations"
        Copy-Item -Recurse $migrationsDir $targetMigrations
    }

    # 复制 frontend 目录（如果存在）
    $frontendDir = Join-Path $PluginDir "frontend"
    if (Test-Path $frontendDir) {
        Write-Host "[Package] 复制 frontend/ ..." -ForegroundColor Gray
        $targetFrontend = Join-Path $tempDir "frontend"
        Copy-Item -Recurse $frontendDir $targetFrontend
    }

    # 复制 assets 目录（如果存在）
    $assetsDir = Join-Path $PluginDir "assets"
    if (Test-Path $assetsDir) {
        Write-Host "[Package] 复制 assets/ ..." -ForegroundColor Gray
        $targetAssets = Join-Path $tempDir "assets"
        Copy-Item -Recurse $assetsDir $targetAssets
    }

    # 创建输出目录
    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }

    # 打包为 ZIP
    $outputFile = Join-Path $OutputDir "$pluginId-$version.proclaw-plugin"

    Write-Host "[Package] 正在打包 -> $outputFile" -ForegroundColor Yellow

    # 使用 .NET ZIP 打包
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zipFile = Join-Path $env:TEMP "$pluginId-$version.zip"
    if (Test-Path $zipFile) { Remove-Item $zipFile -Force }
    [System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipFile)
    Move-Item $zipFile $outputFile -Force

    if (-not (Test-Path $outputFile)) {
        Write-Error "打包失败：输出文件未生成"
        exit 1
    }

    # 计算 SHA256
    $hashStream = [System.IO.File]::OpenRead($outputFile)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $hashBytes = $sha256.ComputeHash($hashStream)
    $hashStream.Close()
    $hashHex = -join ($hashBytes | ForEach-Object { $_.ToString("x2") })

    $fileSize = (Get-Item $outputFile).Length
    Write-Host "[Package] 完成: $outputFile" -ForegroundColor Green
    Write-Host "[Package] SHA256: $hashHex" -ForegroundColor Gray
    Write-Host "[Package] 大小: $fileSize 字节" -ForegroundColor Gray

    # 可选签名
    if ($Sign) {
        if (-not $PrivateKeyFile) {
            Write-Error "如需签名，请提供 -PrivateKeyFile 参数"
            exit 1
        }
        if (-not (Test-Path $PrivateKeyFile)) {
            Write-Error "私钥文件不存在: $PrivateKeyFile"
            exit 1
        }
        Write-Host "[Package] 正在签名..." -ForegroundColor Yellow
        & (Join-Path $PSScriptRoot "sign-plugin.ps1") -PackageFile $outputFile -PrivateKeyFile $PrivateKeyFile
    }

    # 输出打包信息 JSON
    $info = @{
        pluginId   = $pluginId
        version    = $version
        file       = $outputFile
        sha256     = $hashHex
        fileSize   = $fileSize
        signed     = $Sign.IsPresent
    }
    $infoJson = $info | ConvertTo-Json
    Write-Host "[Package] 打包信息:" -ForegroundColor Cyan
    Write-Host $infoJson

} finally {
    # 清理临时目录
    if (Test-Path $tempDir) {
        Remove-Item -Recurse -Force $tempDir
    }
}
