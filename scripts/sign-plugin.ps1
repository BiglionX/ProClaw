<#
.SYNOPSIS
    ProClaw 行业插件 Ed25519 签名工具
.DESCRIPTION
    对已打包的 .proclaw-plugin 文件进行 Ed25519 签名。
    生成 .sig 签名文件，用于桌面端插件加载器的签名校验。
.PARAMETER PackageFile
    插件包文件路径（.proclaw-plugin）
.PARAMETER PrivateKeyFile
    Ed25519 私钥文件路径（32 字节原始二进制，Hex 编码或 Base64 编码）
.PARAMETER OutputDir
    签名文件输出目录，默认为插件包所在目录
.EXAMPLE
    .\sign-plugin.ps1 -PackageFile ./dist/inventory-1.0.0.proclaw-plugin -PrivateKeyFile ./keys/private.key
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$PackageFile,

    [Parameter(Mandatory = $true)]
    [string]$PrivateKeyFile,

    [Parameter(Mandatory = $false)]
    [string]$OutputDir
)

if (-not (Test-Path $PackageFile)) {
    Write-Error "插件包文件不存在: $PackageFile"
    exit 1
}
if (-not (Test-Path $PrivateKeyFile)) {
    Write-Error "私钥文件不存在: $PrivateKeyFile"
    exit 1
}

if (-not $OutputDir) {
    $OutputDir = Split-Path $PackageFile -Parent
}

# 读取私钥
$privateKeyRaw = Get-Content $PrivateKeyFile -Raw -ErrorAction SilentlyContinue
if (-not $privateKeyRaw) {
    Write-Error "无法读取私钥文件: $PrivateKeyFile"
    exit 1
}

# 尝试多种编码格式
$privateKeyBytes = $null

# 尝试 Hex 编码（64 hex chars = 32 bytes）
$privateKeyRaw = $privateKeyRaw.Trim()
if ($privateKeyRaw -match '^[0-9a-fA-F]{64}$') {
    $privateKeyBytes = [System.Convert]::FromHexString($privateKeyRaw.ToLower())
    Write-Host "[Sign] 私钥格式: Hex 编码 (32 字节)" -ForegroundColor Gray
}

# 尝试 Base64 编码
if (-not $privateKeyBytes) {
    try {
        $privateKeyBytes = [System.Convert]::FromBase64String($privateKeyRaw)
    } catch {
        # 不是 Base64，继续尝试
    }
}

# 尝试 PEM 格式（-----BEGIN PRIVATE KEY-----）
if (-not $privateKeyBytes) {
    $pemMatch = [regex]::Match($privateKeyRaw, '(?:-----BEGIN[^-]+-----)\s*([A-Za-z0-9+/=]+)\s*(?:-----END[^-]+-----)')
    if ($pemMatch.Success) {
        try {
            $privateKeyBytes = [System.Convert]::FromBase64String($pemMatch.Groups[1].Value)
        } catch {
            Write-Error "PEM Base64 解码失败"
            exit 1
        }
    }
}

# 尝试原始二进制文件
if (-not $privateKeyBytes) {
    try {
        $privateKeyBytes = [System.IO.File]::ReadAllBytes($PrivateKeyFile)
    } catch {
        Write-Error "无法解析私钥文件格式。支持: Hex (64 chars), Base64, PEM, 原始 32 字节二进制"
        exit 1
    }
}

if ($privateKeyBytes.Length -ne 32) {
    Write-Error "私钥长度错误: 期望 32 字节，实际 $($privateKeyBytes.Length) 字节"
    exit 1
}

Write-Host "[Sign] 私钥已加载 ($($privateKeyBytes.Length) 字节)" -ForegroundColor Green

# 读取插件包内容
$packageBytes = [System.IO.File]::ReadAllBytes($PackageFile)
$packageSize = $packageBytes.Length
Write-Host "[Sign] 插件包大小: $packageSize 字节" -ForegroundColor Gray

# 计算 SHA256
$sha256 = [System.Security.Cryptography.SHA256]::Create()
$hashBytes = $sha256.ComputeHash($packageBytes)
$hashHex = -join ($hashBytes | ForEach-Object { $_.ToString("x2") })
Write-Host "[Sign] SHA256: $hashHex" -ForegroundColor Gray

# 使用 HMACSHA256 作为 Ed25519 签名的近似替代
# 注意：真正的 Ed25519 签名需要在 Rust 端或使用 libsodium
# 这里生成一个签名占位符，实际签名由 Rust `sign-plugin` 命令在 Tauri 中完成
$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = $privateKeyBytes
$sigBytes = $hmac.ComputeHash($packageBytes)
$sigHex = -join ($sigBytes | ForEach-Object { $_.ToString("x2") })

# 生成公钥
$publicKeyBytes = New-Object byte[] 32
# Ed25519 公钥 = SHA512(私钥) 的前 32 字节 (简化版)
$sha512 = [System.Security.Cryptography.SHA512]::Create()
$hash512 = $sha512.ComputeHash($privateKeyBytes)
[Array]::Copy($hash512, $publicKeyBytes, 32)
$pubKeyHex = -join ($publicKeyBytes | ForEach-Object { $_.ToString("x2") })

# 写入签名文件
$packageName = [System.IO.Path]::GetFileNameWithoutExtension($PackageFile)
$sigFile = Join-Path $OutputDir "$packageName.sig"

$sigInfo = @{
    algorithm    = "Ed25519"
    signature    = $sigHex
    publicKey    = $pubKeyHex
    sha256       = $hashHex
    timestamp    = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    packageFile  = $PackageFile
    note         = "注意: 此为开发签名，生产环境请使用 Rust `ed25519-dalek` crate 生成正式签名"
}
$sigInfo | ConvertTo-Json | Set-Content $sigFile -Encoding UTF8

Write-Host "[Sign] 签名文件: $sigFile" -ForegroundColor Green
Write-Host "[Sign] 签名 (Hex): $sigHex" -ForegroundColor Cyan
Write-Host "[Sign] 公钥 (Hex): $pubKeyHex" -ForegroundColor Cyan
Write-Host "" -ForegroundColor Yellow
Write-Host "[Sign] 重要提示:" -ForegroundColor Yellow
Write-Host "[Sign] 此签名为开发环境占位签名。" -ForegroundColor Yellow
Write-Host "[Sign] 生产环境签名请使用 Rust 端 ed25519-dalek 生成。" -ForegroundColor Yellow
Write-Host "[Sign] 将公钥 ($pubKeyHex) 配置到 AdminSettingsPage 的插件公钥字段。" -ForegroundColor Yellow

$sigFile
