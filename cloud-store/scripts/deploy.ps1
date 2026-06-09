# ProClaw Cloud-Store 一键部署脚本 (Windows PowerShell)
# 使用方法: .\deploy.ps1

param(
    [switch]$SkipBuild,
    [switch]$OnlyApp
)

# 颜色函数
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )
    
    $colors = @{
        "Info" = "Cyan"
        "Success" = "Green"
        "Warn" = "Yellow"
        "Error" = "Red"
    }
    
    $prefix = @{
        "Info" = "[INFO]"
        "Success" = "[SUCCESS]"
        "Warn" = "[WARN]"
        "Error" = "[ERROR]"
    }
    
    Write-Host "$($prefix[$Type]) $Message" -ForegroundColor $colors[$Type]
}

# 检查 Docker
function Test-Docker {
    Write-ColorOutput "检查 Docker..." "Info"
    
    try {
        $dockerVersion = docker --version 2>&1
        Write-ColorOutput "Docker: $dockerVersion" "Success"
    }
    catch {
        Write-ColorOutput "Docker 未安装，请先安装 Docker Desktop" "Error"
        exit 1
    }
    
    try {
        docker info 2>&1 | Out-Null
        Write-ColorOutput "Docker 服务运行中" "Success"
    }
    catch {
        Write-ColorOutput "Docker 服务未运行，请启动 Docker Desktop" "Error"
        exit 1
    }
}

# 加载环境变量
function Load-EnvFile {
    Write-ColorOutput "加载环境变量..." "Info"
    
    if (Test-Path ".env") {
        Get-Content ".env" | Where-Object { $_ -notmatch '^#' -and $_ -match '=' } | ForEach-Object {
            $key, $value = $_.Split('=', 2)
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
        Write-ColorOutput "环境变量加载完成" "Success"
    }
    elseif (Test-Path ".env.example") {
        Write-ColorOutput ".env 文件不存在，复制 .env.example 作为模板" "Warn"
        Copy-Item ".env.example" ".env"
        Write-ColorOutput "请编辑 .env 文件配置必要的环境变量" "Warn"
        exit 1
    }
    else {
        Write-ColorOutput ".env 和 .env.example 都不存在" "Error"
        exit 1
    }
}

# 创建目录
function New-RequiredDirectories {
    Write-ColorOutput "创建必要目录..." "Info"
    
    $dirs = @("nginx\ssl", "logs", "backups")
    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }
    
    Write-ColorOutput "目录创建完成" "Success"
}

# 构建镜像
function Build-DockerImage {
    if ($SkipBuild) {
        Write-ColorOutput "跳过构建步骤" "Warn"
        return
    }
    
    Write-ColorOutput "构建 Docker 镜像..." "Info"
    docker build -t cloud-store:latest .
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "镜像构建完成" "Success"
    }
    else {
        Write-ColorOutput "镜像构建失败" "Error"
        exit 1
    }
}

# 启动服务
function Start-Services {
    Write-ColorOutput "启动服务..." "Info"
    
    # 使用 docker compose 或 docker-compose
    $composeCmd = if (Get-Command "docker" -ErrorAction SilentlyContinue) {
        "docker compose"
    } else {
        "docker-compose"
    }
    
    # 检查命令是否可用
    $useCompose = docker compose version 2>&1 | Out-Null
    
    if ($useCompose) {
        docker compose up -d --build
    }
    else {
        docker-compose up -d --build
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "服务启动完成" "Success"
    }
    else {
        Write-ColorOutput "服务启动失败" "Error"
        exit 1
    }
}

# 等待服务就绪
function Wait-ForServices {
    Write-ColorOutput "等待服务就绪..." "Info"
    
    # 等待数据库
    Write-Host "等待数据库... " -NoNewline
    for ($i = 1; $i -le 30; $i++) {
        $dbReady = docker exec cloud-store-db pg_isready -U postgres 2>&1
        if ($dbReady) {
            Write-Host ""
            Write-ColorOutput "数据库就绪" "Success"
            break
        }
        Start-Sleep -Seconds 2
    }
    
    # 等待应用
    Write-Host "等待应用... " -NoNewline
    for ($i = 1; $i -le 30; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host ""
                Write-ColorOutput "应用就绪" "Success"
                return
            }
        }
        catch {}
        Start-Sleep -Seconds 2
    }
    
    Write-Host ""
    Write-ColorOutput "应用启动超时，但可能已在后台运行" "Warn"
}

# 显示状态
function Show-Status {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Magenta
    Write-Host "         部署完成!" -ForegroundColor Magenta
    Write-Host "==========================================" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "访问地址: http://localhost:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "管理命令:" -ForegroundColor White
    Write-Host "  查看日志: docker logs -f cloud-store-app" -ForegroundColor Gray
    Write-Host "  停止服务: docker compose down" -ForegroundColor Gray
    Write-Host "  重启服务: docker compose restart" -ForegroundColor Gray
    Write-Host ""
    Write-Host "数据库:" -ForegroundColor White
    Write-Host "  主机: localhost" -ForegroundColor Gray
    Write-Host "  端口: 5432" -ForegroundColor Gray
    Write-Host "  用户: postgres" -ForegroundColor Gray
    Write-Host "  密码: postgres" -ForegroundColor Gray
    Write-Host "  数据库: cloudstore" -ForegroundColor Gray
    Write-Host ""
}

# 主流程
function Main {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Magenta
    Write-Host "  ProClaw Cloud-Store 一键部署脚本" -ForegroundColor Magenta
    Write-Host "==========================================" -ForegroundColor Magenta
    Write-Host ""
    
    Test-Docker
    Load-EnvFile
    New-RequiredDirectories
    
    if (-not $OnlyApp) {
        Build-DockerImage
    }
    
    Start-Services
    Wait-ForServices
    Show-Status
}

# 执行
Main
