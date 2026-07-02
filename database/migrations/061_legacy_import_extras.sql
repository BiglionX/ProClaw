-- ============================================================================
-- ProClaw v1.3 — 老系统数据迁移与导入适配 扩展表
-- ============================================================================
--
-- 3 张新表，全部 IF NOT EXISTS 幂等：
-- 1) customer_contacts   — 客户多联系人（替代单条 customers.contact_person）
-- 2) product_sku         — 商品 SPU/SKU 父子关系（同商品编号多 SKU 聚合）
-- 3) categories          — 商品 / 供应商 / 客户 类别统一管理
--
-- 与 v1.2 P1 import_batches 不冲突，本迁移独立添加。
-- 设计要点：
--   - 三张表 source 字段区分 'manual' / 'import_legacy' 便于按来源筛选
--   - product_sku 的 sku UNIQUE 约束保证聚合后仍能 upsert
--   - categories 的 UNIQUE(type, name) 防止重复建档
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) customer_contacts
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS customer_contacts (
    id           TEXT PRIMARY KEY,
    customer_id  TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    contact_name TEXT NOT NULL,
    phone        TEXT,
    landline     TEXT,
    qq_wechat    TEXT,
    address      TEXT,
    is_primary   INTEGER NOT NULL DEFAULT 0,    -- 0=备用 / 1=首要
    source       TEXT NOT NULL DEFAULT 'manual',-- 'manual' / 'import_legacy'
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer
    ON customer_contacts(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_source
    ON customer_contacts(source);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_primary
    ON customer_contacts(customer_id, is_primary);

-- 引入 v1.3 撤销追踪：每条导入记录携带 batch_id 便于按批次回滚
-- 空字符串 '' 表示非批次导入（手动 / 测试数据）
ALTER TABLE customer_contacts
    ADD COLUMN batch_id TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_customer_contacts_batch
    ON customer_contacts(batch_id);


-- ----------------------------------------------------------------------------
-- 2) product_sku（SPU/SKU 父子关系）
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS product_sku (
    id           TEXT PRIMARY KEY,
    product_id   TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku          TEXT NOT NULL UNIQUE,         -- 唯一约束保证 upsert 幂等
    variant_name TEXT,                         -- 变体名（来自"商品名称"）
    spec         TEXT,                         -- 规格型号
    barcode      TEXT,
    source       TEXT NOT NULL DEFAULT 'manual',
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_product_sku_product
    ON product_sku(product_id);

CREATE INDEX IF NOT EXISTS idx_product_sku_source
    ON product_sku(source);

ALTER TABLE product_sku
    ADD COLUMN batch_id TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_product_sku_batch
    ON product_sku(batch_id);


-- ----------------------------------------------------------------------------
-- 3) categories（商品 / 供应商 / 客户 统一类别）
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
    id         TEXT PRIMARY KEY,
    type       TEXT NOT NULL,                  -- 'product' / 'supplier' / 'customer'
    name       TEXT NOT NULL,
    parent_id  TEXT REFERENCES categories(id), -- 支持二级层级
    source     TEXT NOT NULL DEFAULT 'manual', -- 'manual' / 'import_legacy'
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(type, name)                         -- 同类型下类别名唯一
);

CREATE INDEX IF NOT EXISTS idx_categories_type
    ON categories(type);

CREATE INDEX IF NOT EXISTS idx_categories_source
    ON categories(source);

CREATE INDEX IF NOT EXISTS idx_categories_parent
    ON categories(parent_id);

ALTER TABLE categories
    ADD COLUMN batch_id TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_categories_batch
    ON categories(batch_id);