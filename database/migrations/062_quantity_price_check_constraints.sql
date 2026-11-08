-- ============================================================================
-- P0-06：销售/采购明细正数校验 + 库存变动非零 + 产品库存下限
-- ============================================================================
-- SQLite 不支持 ALTER TABLE ADD CONSTRAINT，采用「建新表 → 拷数据 → 换名」12-step。
-- 幂等：由 database.rs 通过 schema_patches('062_quantity_price_checks') 门禁；
-- 本文件可被重复 include，但仅在未打补丁时执行（见 apply_p0_06_check_constraints）。
--
-- 约束：
--   sales_order_items.quantity > 0
--   sales_order_items.unit_price >= 0
--   purchase_order_items.quantity > 0
--   purchase_order_items.unit_price >= 0
--   inventory_transactions.quantity != 0  （正=入库绝对值语义由 transaction_type 区分；禁止 0）
--   products.current_stock >= -999999     （灵活库存允许负库存，设下限兜底）
-- ============================================================================

-- schema_patches 由 Rust 侧确保存在；此处再 IF NOT EXISTS 一次以支持单独预览执行
CREATE TABLE IF NOT EXISTS schema_patches (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- 数据清洗（使重建前满足 CHECK） ----------
UPDATE sales_order_items SET quantity = 1 WHERE quantity <= 0;
UPDATE sales_order_items SET unit_price = 0 WHERE unit_price < 0;
UPDATE purchase_order_items SET quantity = 1 WHERE quantity <= 0;
UPDATE purchase_order_items SET unit_price = 0 WHERE unit_price < 0;
DELETE FROM inventory_transactions WHERE quantity = 0;
UPDATE products SET current_stock = -999999 WHERE current_stock < -999999;

PRAGMA foreign_keys = OFF;

-- ---------- sales_order_items ----------
DROP TABLE IF EXISTS sales_order_items__p006;
CREATE TABLE sales_order_items__p006 (
    id TEXT PRIMARY KEY,
    sales_order_id TEXT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_price REAL NOT NULL CHECK(unit_price >= 0),
    total_price REAL NOT NULL,
    shipped_quantity INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO sales_order_items__p006
    (id, sales_order_id, product_id, quantity, unit_price, total_price, shipped_quantity, notes, created_at, updated_at)
SELECT id, sales_order_id, product_id, quantity, unit_price, total_price,
       COALESCE(shipped_quantity, 0), notes, created_at, updated_at
FROM sales_order_items;
DROP TABLE sales_order_items;
ALTER TABLE sales_order_items__p006 RENAME TO sales_order_items;
CREATE INDEX IF NOT EXISTS idx_soi_so ON sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_soi_product ON sales_order_items(product_id);

-- ---------- purchase_order_items ----------
DROP TABLE IF EXISTS purchase_order_items__p006;
CREATE TABLE purchase_order_items__p006 (
    id TEXT PRIMARY KEY,
    purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_price REAL NOT NULL CHECK(unit_price >= 0),
    total_price REAL NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO purchase_order_items__p006
    (id, purchase_order_id, product_id, quantity, unit_price, total_price, received_quantity, notes, created_at, updated_at)
SELECT id, purchase_order_id, product_id, quantity, unit_price, total_price,
       COALESCE(received_quantity, 0), notes, created_at, updated_at
FROM purchase_order_items;
DROP TABLE purchase_order_items;
ALTER TABLE purchase_order_items__p006 RENAME TO purchase_order_items;
CREATE INDEX IF NOT EXISTS idx_poi_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poi_product ON purchase_order_items(product_id);

-- ---------- inventory_transactions ----------
DROP TABLE IF EXISTS inventory_transactions__p006;
CREATE TABLE inventory_transactions__p006 (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id),
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('inbound', 'outbound', 'adjustment', 'transfer')),
    quantity INTEGER NOT NULL CHECK(quantity != 0),
    reference_no TEXT,
    reason TEXT,
    performed_by TEXT REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'conflict')),
    last_synced_at TIMESTAMP
);
INSERT INTO inventory_transactions__p006
    (id, product_id, transaction_type, quantity, reference_no, reason, performed_by, notes, created_at, sync_status, last_synced_at)
SELECT id, product_id, transaction_type, quantity, reference_no, reason, performed_by, notes,
       created_at, COALESCE(sync_status, 'pending'), last_synced_at
FROM inventory_transactions;
DROP TABLE inventory_transactions;
ALTER TABLE inventory_transactions__p006 RENAME TO inventory_transactions;
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_created ON inventory_transactions(created_at);

PRAGMA foreign_keys = ON;

-- products.current_stock 下限：灵活库存允许负库存，CHECK >= -999999
-- 用触发器兜底（避免整表重建牵动大量外键）；语义等同 CHECK
CREATE TRIGGER IF NOT EXISTS trg_chk_products_current_stock_ins
BEFORE INSERT ON products
FOR EACH ROW
WHEN NEW.current_stock IS NOT NULL AND NEW.current_stock < -999999
BEGIN
    SELECT RAISE(ABORT, 'CHECK failed: products.current_stock >= -999999');
END;

CREATE TRIGGER IF NOT EXISTS trg_chk_products_current_stock_upd
BEFORE UPDATE OF current_stock ON products
FOR EACH ROW
WHEN NEW.current_stock IS NOT NULL AND NEW.current_stock < -999999
BEGIN
    SELECT RAISE(ABORT, 'CHECK failed: products.current_stock >= -999999');
END;
