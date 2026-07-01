-- ProClaw 导入中心支持（v1.2 P1）
-- Version: 1.2.0
-- Created: 2026-07-01
-- Description: 进销存业务对象（商品/库存/采购/销售/供应商/客户）批量导入批次追踪 + 行级错误
-- Author: ProClaw
-- Database: SQLite (Tauri Desktop)

-- ============================================
-- 第一部分：导入批次主表
-- ============================================
-- 一次导入 = 一个批次，记录目标类型/文件/状态/计数/进度
-- 文件实体保存在 APPDATA 应用数据目录下，DB 中只存路径与摘要
CREATE TABLE IF NOT EXISTS import_batches (
    id TEXT PRIMARY KEY,
    -- 业务对象类型
    target_type TEXT NOT NULL CHECK(target_type IN (
      'products',     -- 商品库（product_spu + product_sku）
      'inventory',    -- 库存交易（inventory_transactions）
      'purchases',    -- 采购订单（purchase_orders + items）
      'sales',        -- 销售订单（sales_orders + items）
      'suppliers',    -- 供应商（suppliers）
      'customers'     -- 客户（customers）
    )),
    -- 原始文件名（仅展示用，不用于读取）
    source_filename TEXT NOT NULL,
    -- 文件格式：csv / xlsx / json
    source_format TEXT NOT NULL CHECK(source_format IN ('csv', 'xlsx', 'json')),
    -- 文件大小（字节）
    source_size INTEGER,
    -- 文件持久化路径（APPDATA/proclaw/desktop/import_uploads/<batch_id>/<file>）
    source_path TEXT,
    -- 行/列摘要：总行数、列字段映射（JSON 文本）
    row_count INTEGER,
    column_mapping TEXT,
    -- 状态：pending/parsing/mapping/validating/importing/paused/retrying/success/partial/failed/cancelled
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK(status IN ('pending', 'parsing', 'mapping', 'validating', 'importing',
                       'paused', 'retrying', 'success', 'partial', 'failed', 'cancelled')),
    -- 进度
    processed_rows INTEGER DEFAULT 0,
    success_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    skipped_rows INTEGER DEFAULT 0,
    -- 错误摘要（任意时刻取前 50 条错误的 JSON 列表）
    error_summary TEXT,
    -- 幂等键（如 po_number / so_number，用于重跑去重）
    dedup_key TEXT,
    -- 起始时间 / 结束时间 / 用户
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    performed_by TEXT,
    -- 备注
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_import_batches_target_type
  ON import_batches(target_type);
CREATE INDEX IF NOT EXISTS idx_import_batches_status
  ON import_batches(status);
CREATE INDEX IF NOT EXISTS idx_import_batches_started
  ON import_batches(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_batches_target_status
  ON import_batches(target_type, status);

-- ============================================
-- 第二部分：导入行级错误明细
-- ============================================
-- 校验阶段或执行阶段的逐行错误，方便用户回查
CREATE TABLE IF NOT EXISTS import_batch_errors (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    -- 行号（从 1 起，1 = 标题行后第一行数据）
    row_index INTEGER NOT NULL,
    -- 字段名（如 quantity / sku_code）
    field_name TEXT,
    -- 错误码（required_missing / invalid_number / duplicate_key / not_found / etc）
    error_code TEXT NOT NULL,
    -- 人类可读错误描述
    error_message TEXT NOT NULL,
    -- 原始单元格值（脱敏后 256 字符以内）
    raw_value TEXT,
    -- 阶段：parsing / mapping / validating / importing
    phase TEXT NOT NULL CHECK(phase IN ('parsing', 'mapping', 'validating', 'importing')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_import_batch_errors_batch
  ON import_batch_errors(batch_id);
CREATE INDEX IF NOT EXISTS idx_import_batch_errors_row
  ON import_batch_errors(batch_id, row_index);

-- ============================================
-- 第三部分：导入字段映射模板（用户历史映射持久化）
-- ============================================
-- 同一类目标最多保留 5 套最近使用过的映射，方便下次复用
CREATE TABLE IF NOT EXISTS import_field_mapping_templates (
    id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL,
    template_name TEXT NOT NULL,
    -- JSON：{ "源列名": "目标字段名", ... }
    mapping_json TEXT NOT NULL,
    -- 列顺序与配置（如 default_value）
    config_json TEXT,
    use_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(target_type, template_name)
);

CREATE INDEX IF NOT EXISTS idx_mapping_templates_target_used
  ON import_field_mapping_templates(target_type, last_used_at DESC);

-- ============================================
-- 注释
-- ============================================
-- 状态机：
--   pending  → 创建批次，等待用户上传文件
--   parsing  → 解析文件中（CSV/XLSX/JSON）
--   mapping  → 用户做列→字段映射
--   validating → 校验中（必填/类型/外键/数值范围）
--   importing → 执行导入（写库）
--   paused    → 用户暂停
--   retrying  → 错误行重试中
--   success   → 全部成功
--   partial   → 部分成功（部分行失败）
--   failed    → 致命错误（无法继续）
--   cancelled → 用户取消
--
-- 幂等策略：
--   products → upsert by spu_code / sku_code
--   inventory → 去重 (sku_code + date + transaction_type + reference_no)
--   purchases → upsert by po_number（采购单号）
--   sales → upsert by so_number（销售单号）
--   suppliers → upsert by name 或 code
--   customers → upsert by name 或 code
