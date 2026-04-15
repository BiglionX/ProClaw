-- ProClaw Database Schema Update - SPU-SKU E-commerce Architecture
-- Version: 0.2.0
-- Created: 2026-04-15
-- Description: Add SPU-SKU tables for e-commerce product management
-- Database: SQLite (Tauri Desktop)

-- ============================================
-- SPU (Standard Product Unit) - 标准商品单元表
-- ============================================
CREATE TABLE IF NOT EXISTS product_spus (
    id TEXT PRIMARY KEY,
    spu_code TEXT UNIQUE NOT NULL,  -- SPU编号 (自动生成)
    name TEXT NOT NULL,              -- 商品名称
    description TEXT,                -- 商品描述
    category_id TEXT REFERENCES product_categories(id),  -- 分类ID
    brand_id TEXT REFERENCES brands(id),                -- 品牌ID
    unit TEXT DEFAULT '件',           -- 主单位
    is_on_sale BOOLEAN DEFAULT TRUE,  -- 是否在售
    status TEXT DEFAULT 'on_sale' CHECK(status IN ('draft', 'on_sale', 'off_sale', 'deleted')),
    metadata TEXT,                   -- JSON 字符串 (扩展属性)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'conflict')),
    last_synced_at TIMESTAMP,
    deleted_at TIMESTAMP
);

-- SPU编号索引
CREATE INDEX IF NOT EXISTS idx_product_spus_spu_code ON product_spus(spu_code);
CREATE INDEX IF NOT EXISTS idx_product_spus_status ON product_spus(status);
CREATE INDEX IF NOT EXISTS idx_product_spus_category ON product_spus(category_id);

-- ============================================
-- SKU (Stock Keeping Unit) - 库存单位表
-- ============================================
CREATE TABLE IF NOT EXISTS product_skus (
    id TEXT PRIMARY KEY,
    spu_id TEXT NOT NULL REFERENCES product_spus(id) ON DELETE CASCADE,
    sku_code TEXT NOT NULL,          -- SKU编号 (自动生成)
    specifications TEXT NOT NULL,    -- JSON 规格属性 {"颜色": "黑色", "尺寸": "XL"}
    spec_text TEXT,                  -- 规格文本 (如 "黑色/XL")
    cost_price REAL DEFAULT 0,       -- 成本价
    sell_price REAL DEFAULT 0,       -- 销售价
    current_stock INTEGER DEFAULT 0, -- 当前库存
    min_stock INTEGER DEFAULT 0,     -- 最低库存
    max_stock INTEGER DEFAULT 999999, -- 最高库存
    barcode TEXT,                    -- 条形码
    weight REAL,                     -- 重量(kg)
    volume REAL,                     -- 体积(m³)
    is_default BOOLEAN DEFAULT FALSE, -- 是否默认SKU
    sort_order INTEGER DEFAULT 0,    -- 排序
    is_active BOOLEAN DEFAULT TRUE,  -- 是否启用
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'conflict')),
    last_synced_at TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(spu_id, sku_code)
);

-- SKU索引
CREATE INDEX IF NOT EXISTS idx_product_skus_spu_id ON product_skus(spu_id);
CREATE INDEX IF NOT EXISTS idx_product_skus_sku_code ON product_skus(sku_code);
CREATE INDEX IF NOT EXISTS idx_product_skus_barcode ON product_skus(barcode);

-- ============================================
-- SPU图片表
-- ============================================
CREATE TABLE IF NOT EXISTS product_images (
    id TEXT PRIMARY KEY,
    spu_id TEXT NOT NULL REFERENCES product_spus(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,         -- 图片URL或Base64
    image_type TEXT DEFAULT 'main',  -- 图片类型 (main, gallery, detail)
    sort_order INTEGER DEFAULT 0,    -- 排序
    is_primary BOOLEAN DEFAULT FALSE, -- 是否主图
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'conflict')),
    last_synced_at TIMESTAMP
);

-- 图片索引
CREATE INDEX IF NOT EXISTS idx_product_images_spu_id ON product_images(spu_id);
CREATE INDEX IF NOT EXISTS idx_product_images_type ON product_images(image_type);

-- ============================================
-- 更新产品表 (保留旧表用于兼容,新增SPU-SKU关联)
-- ============================================
-- 注意: 旧的products表暂时保留用于数据迁移
-- 迁移完成后,可以删除旧表或标记为deprecated
-- 由于SQLite不支持ALTER TABLE ADD COLUMN IF NOT EXISTS,
-- 且execute_batch遇到错误会停止,这里暂时注释掉ALTER语句
-- 新表将直接使用product_spus和product_skus

-- ============================================
-- 触发器: 自动更新updated_at时间戳
-- ============================================
-- 注意: SQLite不支持IF NOT EXISTS for TRIGGER,需要先DROP再CREATE
DROP TRIGGER IF EXISTS update_product_spus_updated_at;
CREATE TRIGGER update_product_spus_updated_at
    AFTER UPDATE ON product_spus
    FOR EACH ROW
BEGIN
    UPDATE product_spus SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS update_product_skus_updated_at;
CREATE TRIGGER update_product_skus_updated_at
    AFTER UPDATE ON product_skus
    FOR EACH ROW
BEGIN
    UPDATE product_skus SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================
-- 创建视图: SPU库存汇总 (方便查询)
-- ============================================
-- 注意: SQLite不支持CREATE VIEW IF NOT EXISTS,需要先DROP再CREATE
DROP VIEW IF EXISTS v_spu_inventory;
CREATE VIEW v_spu_inventory AS
SELECT 
    spu.id,
    spu.spu_code,
    spu.name,
    spu.status,
    COUNT(sku.id) as sku_count,
    COALESCE(SUM(sku.current_stock), 0) as total_stock,
    COALESCE(SUM(sku.min_stock), 0) as total_min_stock,
    COALESCE(MIN(sku.sell_price), 0) as min_price,
    COALESCE(MAX(sku.sell_price), 0) as max_price
FROM product_spus spu
LEFT JOIN product_skus sku ON spu.id = sku.spu_id AND sku.deleted_at IS NULL
WHERE spu.deleted_at IS NULL
GROUP BY spu.id, spu.spu_code, spu.name, spu.status;

-- ============================================
-- 创建视图: SPU详情 (含SKU和库存)
-- ============================================
-- 注意: SQLite不支持CREATE VIEW IF NOT EXISTS,需要先DROP再CREATE
DROP VIEW IF EXISTS v_spu_details;
CREATE VIEW v_spu_details AS
SELECT 
    spu.id,
    spu.spu_code,
    spu.name,
    spu.description,
    spu.category_id,
    spu.brand_id,
    spu.unit,
    spu.status,
    sku.id as sku_id,
    sku.sku_code,
    sku.specifications,
    sku.spec_text,
    sku.cost_price,
    sku.sell_price,
    sku.current_stock,
    sku.barcode,
    sku.is_default,
    img.image_url,
    img.is_primary
FROM product_spus spu
LEFT JOIN product_skus sku ON spu.id = sku.spu_id AND sku.deleted_at IS NULL
LEFT JOIN product_images img ON spu.id = img.spu_id AND img.is_primary = TRUE
WHERE spu.deleted_at IS NULL;
