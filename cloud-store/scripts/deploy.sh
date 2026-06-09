#!/bin/bash
# ProClaw Cloud-Store 一键部署脚本 (Linux/macOS)

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 输出函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 加载环境变量
load_env() {
    log_info "加载环境变量..."
    
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
        log_success "环境变量加载完成"
    else
        if [ -f .env.example ]; then
            log_warn ".env 文件不存在，复制 .env.example 作为模板"
            cp .env.example .env
            log_warn "请编辑 .env 文件配置必要的环境变量"
        else
            log_error ".env 和 .env.example 都不存在，请手动创建"
            exit 1
        fi
    fi
}

# 创建必要目录
create_directories() {
    log_info "创建必要目录..."
    
    mkdir -p nginx/ssl
    mkdir -p logs
    mkdir -p backups
    
    log_success "目录创建完成"
}

# 构建 Docker 镜像
build_image() {
    log_info "构建 Docker 镜像..."
    
    docker build -t cloud-store:latest .
    
    log_success "镜像构建完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    # 检查是否有 docker compose v2
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    $COMPOSE_CMD up -d
    
    log_success "服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    echo -n "等待数据库"
    for i in {1..30}; do
        if docker exec cloud-store-db pg_isready -U postgres &> /dev/null; then
            echo ""
            log_success "数据库就绪"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    echo -n "等待应用"
    for i in {1..30}; do
        if curl -sf http://localhost:3000/api/health &> /dev/null; then
            echo ""
            log_success "应用就绪"
            return 0
        fi
        echo -n "."
        sleep 2
    done
    
    echo ""
    log_warn "应用启动超时，但可能已在后台运行"
}

# 初始化数据库
init_database() {
    log_info "初始化数据库..."
    
    # 执行数据库迁移
    docker exec cloud-store-db psql -U postgres -d cloudstore -f /docker-entrypoint-initdb.d/01-tenant-schema.sql
    
    log_success "数据库初始化完成"
}

# 显示状态
show_status() {
    echo ""
    echo "=========================================="
    echo "         部署完成!"
    echo "=========================================="
    echo ""
    echo "访问地址: http://localhost:3000"
    echo ""
    echo "管理命令:"
    echo "  查看日志: docker logs -f cloud-store-app"
    echo "  停止服务: docker-compose down"
    echo "  重启服务: docker-compose restart"
    echo ""
    echo "数据库:"
    echo "  主机: localhost"
    echo "  端口: 5432"
    echo "  用户: ${POSTGRES_USER:-postgres}"
    echo "  密码: ${POSTGRES_PASSWORD:-postgres}"
    echo "  数据库: ${POSTGRES_DB:-cloudstore}"
    echo ""
}

# 主流程
main() {
    echo ""
    echo "=========================================="
    echo "  ProClaw Cloud-Store 一键部署脚本"
    echo "=========================================="
    echo ""
    
    check_dependencies
    load_env
    create_directories
    build_image
    start_services
    wait_for_services
    init_database
    show_status
}

# 执行主流程
main "$@"
