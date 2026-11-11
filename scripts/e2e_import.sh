#!/usr/bin/env bash
# 用 curl 把 test-old-date 三个导出文件按 multipart 打到桌面端 HTTP。
# 真正的导入入口不是这条路由，而是 Tauri 命令 import_create_batch
# （JSON 字段 target_type / source_filename / source_format / source_base64）。
# 本脚本仍按验证步骤上传，并把每个响应原样存成 resp_*.json。
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA="$ROOT/test-old-date"
BASE="${PROCLAW_BASE_URL:-http://127.0.0.1:8888}"
URL="${BASE}/api/import/batch"

upload() {
  local key="$1"
  local file="$2"
  local target="$3"
  local format="$4"
  local dest="$SCRIPT_DIR/resp_${key}.json"
  local headers="$SCRIPT_DIR/resp_${key}.headers"
  local errfile="$SCRIPT_DIR/resp_${key}.err"
  local code

  code="$(curl -sS -m 20 \
    -D "$headers" \
    -o "$dest" \
    -w "%{http_code}" \
    -F "file=@${file}" \
    -F "target_type=${target}" \
    -F "source_format=${format}" \
    "$URL" 2>"$errfile" || echo "000")"

  if [[ ! -s "$dest" ]]; then
    local err_text=""
    if [[ -f "$errfile" ]]; then
      err_text="$(tr '\n' ' ' < "$errfile")"
    fi
    printf '{"url":"%s","http_status":"%s","error":"%s"}\n' "$URL" "$code" "$err_text" > "$dest"
  fi

  echo "${key} HTTP ${code} -> ${dest}"
}

upload customer "$DATA/客户导出_20260701114803.xls" customers xls
upload supplier "$DATA/供应商导出_20260701112136.xls" suppliers xls
upload product "$DATA/商品导出_20260701235503.xlsx" products xlsx
