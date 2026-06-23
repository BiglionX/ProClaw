#!/bin/bash
# ProClaw Cloud 托管版 - 每日数据库备份脚本
# PRD §6: 每日自动备份，保留 30 天
#
# 使用方式:
#   1. 设置环境变量 SUPABASE_DB_URL (PostgreSQL 连接字符串)
#   2. 设置 BACKUP_DIR (备份存储目录，默认 /tmp/proclaw-backups)
#   3. 添加到 crontab: 0 2 * * * /path/to/backup-daily.sh
#
# Supabase 用户也可在 Dashboard > Database > Backups 中启用
# 自动每日备份 + Point-in-Time Recovery (PITR) 作为主要备份方案。
# 本脚本作为额外的本地/异地备份手段。

set -euo pipefail

# 配置
SUPABASE_DB_URL="${SUPABASE_DB_URL:-}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/proclaw-backups}"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/proclaw_backup_${DATE}.sql.gz"

# 检查配置
if [ -z "$SUPABASE_DB_URL" ]; then
  echo "[ERROR] SUPABASE_DB_URL 环境变量未设置"
  echo "格式: postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
  exit 1
fi

# 创建备份目录
mkdir -p "$BACKUP_DIR"

echo "[INFO] 开始数据库备份: $DATE"

# 执行备份 (使用 pg_dump + gzip 压缩)
pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[SUCCESS] 备份完成: $BACKUP_FILE ($FILESIZE)"
else
  echo "[ERROR] 备份失败"
  exit 1
fi

# 清理过期备份（保留 30 天）
echo "[INFO] 清理 ${RETENTION_DAYS} 天前的备份..."
find "$BACKUP_DIR" -name "proclaw_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "[INFO] 过期备份清理完成"

# 列出当前备份
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "proclaw_backup_*.sql.gz" | wc -l)
echo "[INFO] 当前备份数: $BACKUP_COUNT"
