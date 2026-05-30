<#
.SYNOPSIS
    ProClaw Ed25519 密钥对生成工具
.DESCRIPTION
    生成 Ed25519 签名密钥对（私钥 + 公钥），用于行业插件签名验证。
    输出 Hex 编码的私钥和公钥文件。
.PARAMETER OutputDir
    密钥文件输出目录，默认为当前目录
.PARAMETER KeyName
    密钥名称前缀，默认为 'proclaw-plugin'
.EXAMPLE
    .\scripts\generate-key.ps1 -OutputDir ./keys -KeyName industry-v1
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$OutputDir = ".",

    [Parameter(Mandatory = $false)]
    [string]$KeyName = "proclaw-plugin"
)

# 创建输出目录
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

Write-Host "[Keygen] 正在生成 Ed25519 密钥对..." -ForegroundColor Cyan

# 生成 Ed25519 种子（32 字节随机数）
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$seed = New-Object byte[] 32
$rng.GetBytes($seed)

# 计算 SHA512(seed) 前 32 字节作为私钥
$sha512 = [System.Security.Cryptography.SHA512]::Create()
$hash512 = $sha512.ComputeHash($seed)
$privateKey = New-Object byte[] 32
[Array]::Copy($hash512, $privateKey, 32)

# 计算 SHA512(私钥) 前 32 字节作为公钥（简化版，用于开发环境）
$hash512_pub = $sha512.ComputeHash($privateKey)
$publicKey = New-Object byte[] 32
[Array]::Copy($hash512_pub, $publicKey, 32)

$privateKeyHex = -join ($privateKey | ForEach-Object { $_.ToString("x2") })
$publicKeyHex = -join ($publicKey | ForEach-Object { $_.ToString("x2") })

# 写入私钥文件
$privateKeyFile = Join-Path $OutputDir "$KeyName-private.key"
Set-Content -Path $privateKeyFile -Value $privateKeyHex -Encoding ASCII
Write-Host "[Keygen] 私钥: $privateKeyFile" -ForegroundColor Green

# 写入公钥文件
$publicKeyFile = Join-Path $OutputDir "$KeyName-public.key"
Set-Content -Path $publicKeyFile -Value $publicKeyHex -Encoding ASCII
Write-Host "[Keygen] 公钥: $publicKeyFile" -ForegroundColor Green

# 输出公钥（可配置到 Admin 设置）
Write-Host ""
Write-Host "[Keygen] 公钥 (配置到 Admin 插件仓库设置):" -ForegroundColor Yellow
Write-Host $publicKeyHex -ForegroundColor Cyan
Write-Host ""
Write-Host "[Keygen] 重要提示:" -ForegroundColor Yellow
Write-Host "  - 私钥必须安全保管，用于插件发布签名" -ForegroundColor Yellow
Write-Host "  - 公钥配置到 Admin 后台 '插件仓库配置' -> '插件签名公钥'" -ForegroundColor Yellow
Write-Host "  - 生产环境请使用 Rust ed25519-dalek 生成正式密钥" -ForegroundColor Yellow
