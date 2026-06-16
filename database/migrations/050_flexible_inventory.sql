-- ProClaw 灵活库存支持（PRD v12.0 库存负库存与微盘点）
-- Version: 2.1.0
-- Created: 2026-06-15
-- Description: 允许负库存软约束销售 + 进货自动冲销 + 微盘点 + 库存置信度 + AI 自动提醒
-- Author: ProClaw
-- Database: SQLite (Tauri Desktop)

-- ============================================
-- 第一部分：扩展 product_sku 表
-- ============================================

-- 产品级开关：是否允许负库存销售（默认关闭，保持向后兼容）
ALTER TABLE product_sku ADD COLUMN allow_negative_stock INTEGER DEFAULT 0;

-- 库存置信度（高/中/低）
ALTER TABLE product_sku ADD COLUMN stock_confidence TEXT DEFAULT 'low'
  CHECK(stock_confidence IN ('high', 'medium', 'low'));

-- 最近一次校准时间
ALTER TABLE product_sku ADD COLUMN last_calibrated_at TIMESTAMP;

-- 首次进入负库存的时间（用于 §3.6 老化处理：14 天未处理 → 强制要求清零）
ALTER TABLE product_sku ADD COLUMN negative_since TIMESTAMP;

-- 创建索引以加速老化查询
CREATE INDEX IF NOT EXISTS idx_product_sku_negative_since
  ON product_sku(negative_since) WHERE negative_since IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_sku_confidence
  ON product_sku(stock_confidence);

CREATE INDEX IF NOT EXISTS idx_product_sku_last_calibrated
  ON product_sku(last_calibrated_at);

-- ============================================
-- 第二部分：库存校准记录表（含微盘点/冲销/强制清零）
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_calibrations (
    id TEXT PRIMARY KEY,
    sku_id TEXT NOT NULL REFERENCES product_sku(id),
    spu_id TEXT REFERENCES product_spu(id),

    -- 校准类型：micro（销售/进货后微盘点）、manual（手动校准）、writeoff（强制清零）、auto_offset（进货自动冲销）
    calibration_type TEXT NOT NULL CHECK(calibration_type IN ('micro', 'manual', 'writeoff', 'auto_offset')),

    -- 校准前账面库存
    book_stock INTEGER NOT NULL,
    -- 校准前实际库存（用户输入 / 进货数量）
    actual_stock INTEGER NOT NULL,
    -- 调整差值（actual - book）
    delta INTEGER NOT NULL,

    -- 触发场景：after_sale（销售后）、after_purchase（进货后）、manual（手动）、aging（老化）、low_confidence（低置信度）
    trigger_source TEXT NOT NULL CHECK(trigger_source IN ('after_sale', 'after_purchase', 'manual', 'aging', 'low_confidence', 'top_sales_aging')),

    -- 关联对象（销售订单/采购订单/进货单 ID）
    reference_id TEXT,
    reference_type TEXT,  -- 'sales_order' | 'purchase_order' | 'inventory_transaction'

    -- 置信度快照（校准当时）
    confidence_before TEXT,
    confidence_after TEXT,

    notes TEXT,
    performed_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_calibrations_sku
  ON inventory_calibrations(sku_id);

CREATE INDEX IF NOT EXISTS idx_inventory_calibrations_type
  ON inventory_calibrations(calibration_type);

CREATE INDEX IF NOT EXISTS idx_inventory_calibrations_created
  ON inventory_calibrations(created_at DESC);

-- ============================================
-- 第三部分：通知抑制表（防骚扰机制：连续忽略 3 次 → 7 天内不再提醒同类）
-- ============================================

CREATE TABLE IF NOT EXISTS notification_suppressions (
    id TEXT PRIMARY KEY,
    sku_id TEXT NOT NULL REFERENCES product_sku(id),
    notification_kind TEXT NOT NULL CHECK(notification_kind IN (
      'negative_aging',       -- 负库存老化
      'low_confidence',       -- 长期未校准低置信度
      'top_sales_aging'       -- 高销量低置信度
    )),
    -- 连续忽略次数
    ignore_count INTEGER DEFAULT 0,
    -- 抑制开始时间（达到 3 次忽略后置为 7 天后）
    suppressed_until TIMESTAMP,
    -- 上次忽略时间
    last_dismissed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sku_id, notification_kind)
);

CREATE INDEX IF NOT EXISTS idx_notification_suppressions_sku
  ON notification_suppressions(sku_id);

CREATE INDEX IF NOT EXISTS idx_notification_suppressions_until
  ON notification_suppressions(suppressed_until);

-- ============================================
-- 第四部分：负库存待处理任务表（§3.6 老化处理）
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_aging_tasks (
    id TEXT PRIMARY KEY,
    sku_id TEXT NOT NULL REFERENCES product_sku(id),
    spu_id TEXT REFERENCES product_spu(id),
    -- 任务类型
    task_type TEXT NOT NULL CHECK(task_type IN ('negative_aging')),
    -- 状态：pending（待处理）、resolved（已处理）、cancelled（已取消）
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'resolved', 'cancelled')),
    -- 触发时间
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- 解决时间
    resolved_at TIMESTAMP,
    -- 解决方案：writeoff（强制清零）、supplement（补录入库）
    resolution TEXT,
    -- 解决数量
    resolution_qty INTEGER,
    notes TEXT,
    -- 高亮标志：是否在仪表盘突出显示
    highlighted INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_inventory_aging_tasks_status
  ON inventory_aging_tasks(status);

CREATE INDEX IF NOT EXISTS idx_inventory_aging_tasks_sku
  ON inventory_aging_tasks(sku_id);

-- ============================================
-- 第五部分：初始化现有数据置信度
-- ============================================

-- 为所有现有 SKU 计算初始置信度：
-- 规则：最近 7 天有任意库存交易 → medium，否则 → low
UPDATE product_sku
SET stock_confidence = CASE
  WHEN EXISTS (
    SELECT 1 FROM inventory_transactions it
    WHERE it.product_id = product_sku.id
      AND it.created_at >= datetime('now', '-7 days')
  ) THEN 'medium'
  ELSE 'low'
END
WHERE stock_confidence IS NULL OR stock_confidence = 'low';

-- 对于已有 current_stock <= 0 的 SKU，若未设置 negative_since，标记为创建时间
UPDATE product_sku
SET negative_since = CURRENT_TIMESTAMP
WHERE current_stock < 0 AND negative_since IS NULL;

-- ============================================
-- 第六部分：触发器 - 库存变为负时自动设置 negative_since
-- ============================================

DROP TRIGGER IF EXISTS trg_product_sku_negative_since;
CREATE TRIGGER trg_product_sku_negative_since
    AFTER UPDATE OF current_stock ON product_sku
    WHEN NEW.current_stock < 0 AND (OLD.current_stock >= 0 OR OLD.negative_since IS NULL)
BEGIN
    UPDATE product_sku
    SET negative_since = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- 库存回到非负时清空 negative_since
DROP TRIGGER IF EXISTS trg_product_sku_negative_clear;
CREATE TRIGGER trg_product_sku_negative_clear
    AFTER UPDATE OF current_stock ON product_sku
    WHEN NEW.current_stock >= 0 AND OLD.negative_since IS NOT NULL
BEGIN
    UPDATE product_sku
    SET negative_since = NULL
    WHERE id = NEW.id;
END;

-- ============================================
-- 注释
-- ============================================
-- 库存置信度计算规则（见 §3.4）：
--   - 最近 7 天有微盘点 → high
--   - 最近 7 天有进货但无微盘点 → medium
--   - 超过 15 天无任何校准动作 → low
--   - 存在负库存且未冲销 → low
-- 防骚扰机制（见 §3.5）：
--   - 用户连续忽略同一提醒 3 次 → 7 天内不再提醒
-- 老化处理（见 §3.6）：
--   - 负库存持续 14 天无任何动作 → 生成 inventory_aging_tasks
--   - 必须选择 writeoff（清零）或 supplement（补录）才能继续销售
