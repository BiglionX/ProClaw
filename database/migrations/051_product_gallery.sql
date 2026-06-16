-- ProClaw ProductsPage 多图持久化支持
-- Version: 2.1.0
-- Created: 2026-06-15
-- Description: 给 product_images 表增加 product_id 列，支持单 product 模式多图
-- Database: SQLite (Tauri Desktop)
-- 中等优先级 TODO #1 治理

-- ============================================
-- 第一部分：扩展 product_images 表
-- ============================================

-- 添加 product_id 列（NULLABLE，与 spu_id 共存）
-- SQLite 3.35+ 支持 ADD COLUMN IF NOT EXISTS；旧库需在 Rust 侧 try/catch
ALTER TABLE product_images ADD COLUMN product_id TEXT REFERENCES products(id) ON DELETE CASCADE;

-- 为 product_id 创建部分索引（仅索引非空值，节省空间）
CREATE INDEX IF NOT EXISTS idx_product_images_product_id
  ON product_images(product_id) WHERE product_id IS NOT NULL;

-- ============================================
-- 第二部分：触发器约束（spu_id / product_id 至少一个非空）
-- SQLite 不支持 ALTER TABLE ADD CONSTRAINT，用触发器实现
-- ============================================

CREATE TRIGGER IF NOT EXISTS trg_product_images_either_or_insert
BEFORE INSERT ON product_images
FOR EACH ROW
WHEN NEW.spu_id IS NULL AND NEW.product_id IS NULL
BEGIN
    SELECT RAISE(ABORT, 'product_images: spu_id or product_id must be set');
END;

CREATE TRIGGER IF NOT EXISTS trg_product_images_either_or_update
BEFORE UPDATE ON product_images
FOR EACH ROW
WHEN NEW.spu_id IS NULL AND NEW.product_id IS NULL
BEGIN
    SELECT RAISE(ABORT, 'product_images: spu_id or product_id must be set');
END;

-- ============================================
-- 第三部分：数据回填（将 products.image_url 单字段回填到 product_images）
-- 仅当 product_images 中无该 product_id 的图时才回填，避免重复
-- ============================================

INSERT INTO product_images (id, product_id, image_url, image_type, sort_order, is_primary, sync_status)
SELECT
    lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4'
        || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(2)))
        || '-' || lower(hex(randomblob(6))),
    p.id,
    p.image_url,
    'main',
    0,
    1,
    'synced'
FROM products p
WHERE p.image_url IS NOT NULL
  AND p.image_url != ''
  AND p.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM product_images WHERE product_id = p.id);
