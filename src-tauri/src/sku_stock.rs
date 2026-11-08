//! 阶段二：库存真相源是 `product_skus.current_stock`。
//!
//! 销售明细、采购明细、库存流水的 `product_id` 仍外键到 `products(id)`。
//! 阶段一双写保证新建商品的 `products.id = product_spus.id`，前端提交的也是这个 SPU id。
//! 因此用 `product_id` 当作 `spu_id`，在启用的 SKU 里按 `is_default` 取默认行。
//! 不写遗留的单数表 `product_sku`。

use rusqlite::{params, Connection};

#[derive(Debug)]
pub enum SkuStockError {
    NoSku,
    Insufficient { current: i32, required: i32 },
    Db(String),
}

impl std::fmt::Display for SkuStockError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NoSku => write!(f, "没有启用的默认 SKU"),
            Self::Insufficient { current, required } => {
                write!(
                    f,
                    "Insufficient stock. Current: {current}, Required: {required}"
                )
            }
            Self::Db(msg) => write!(f, "{msg}"),
        }
    }
}

/// 一对一时期通常只有一行。多规格时优先 `is_default = 1`，其次更早创建的启用 SKU。
pub fn find_default_sku_id(conn: &Connection, product_id: &str) -> Result<String, SkuStockError> {
    conn.query_row(
        "SELECT id FROM product_skus
         WHERE spu_id = ?1 AND is_active = 1 AND deleted_at IS NULL
         ORDER BY is_default DESC, created_at ASC
         LIMIT 1",
        params![product_id],
        |row| row.get(0),
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => SkuStockError::NoSku,
        other => SkuStockError::Db(other.to_string()),
    })
}

pub fn default_sku_stock(conn: &Connection, product_id: &str) -> Result<i32, SkuStockError> {
    let sku_id = find_default_sku_id(conn, product_id)?;
    conn.query_row(
        "SELECT COALESCE(current_stock, 0) FROM product_skus WHERE id = ?1",
        params![sku_id],
        |row| row.get(0),
    )
    .map_err(|e| SkuStockError::Db(e.to_string()))
}

/// 条件扣减。`affected = 0` 视为库存不足，避免先查后改的并发超卖。
pub fn deduct_default_sku(
    conn: &Connection,
    product_id: &str,
    quantity: i32,
) -> Result<(), SkuStockError> {
    let sku_id = find_default_sku_id(conn, product_id)?;
    let updated = conn
        .execute(
            "UPDATE product_skus
             SET current_stock = current_stock - ?1, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?2 AND deleted_at IS NULL AND current_stock >= ?1",
            params![quantity, sku_id],
        )
        .map_err(|e| SkuStockError::Db(e.to_string()))?;
    if updated == 0 {
        let current: i32 = conn
            .query_row(
                "SELECT COALESCE(current_stock, 0) FROM product_skus WHERE id = ?1",
                params![sku_id],
                |row| row.get(0),
            )
            .unwrap_or(0);
        return Err(SkuStockError::Insufficient {
            current,
            required: quantity,
        });
    }
    Ok(())
}

/// 带符号增量。采购收货、退货入库、调整走这里；出库的非负保护走 `deduct_default_sku`。
pub fn apply_default_sku_delta(
    conn: &Connection,
    product_id: &str,
    delta: i32,
) -> Result<(), SkuStockError> {
    let sku_id = find_default_sku_id(conn, product_id)?;
    let updated = conn
        .execute(
            "UPDATE product_skus
             SET current_stock = current_stock + ?1, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?2 AND deleted_at IS NULL",
            params![delta, sku_id],
        )
        .map_err(|e| SkuStockError::Db(e.to_string()))?;
    if updated == 0 {
        return Err(SkuStockError::NoSku);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::deduct_default_sku;
    use rusqlite::{params, Connection};

    fn schema_with_view(conn: &Connection) {
        conn.execute_batch(
            "CREATE TABLE product_spus (
                id TEXT PRIMARY KEY,
                spu_code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                category_id TEXT,
                brand_id TEXT,
                unit TEXT DEFAULT '件',
                is_on_sale INTEGER DEFAULT 1,
                status TEXT DEFAULT 'on_sale',
                metadata TEXT,
                sync_status TEXT DEFAULT 'pending',
                created_at TEXT,
                updated_at TEXT,
                deleted_at TEXT
            );
            CREATE TABLE product_skus (
                id TEXT PRIMARY KEY,
                spu_id TEXT NOT NULL,
                sku_code TEXT NOT NULL,
                specifications TEXT NOT NULL,
                spec_text TEXT,
                cost_price REAL DEFAULT 0,
                sell_price REAL DEFAULT 0,
                current_stock INTEGER DEFAULT 0,
                min_stock INTEGER DEFAULT 0,
                max_stock INTEGER DEFAULT 999999,
                barcode TEXT,
                weight REAL,
                volume REAL,
                is_default INTEGER DEFAULT 0,
                sort_order INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                sync_status TEXT DEFAULT 'pending',
                created_at TEXT,
                updated_at TEXT,
                deleted_at TEXT
            );
            CREATE TABLE product_images (
                id TEXT PRIMARY KEY,
                spu_id TEXT NOT NULL,
                image_url TEXT NOT NULL,
                image_type TEXT,
                sort_order INTEGER,
                is_primary INTEGER,
                sync_status TEXT
            );
            CREATE TABLE products (
                id TEXT PRIMARY KEY,
                sku TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                unit TEXT NOT NULL DEFAULT '件',
                cost_price REAL NOT NULL DEFAULT 0,
                sell_price REAL DEFAULT 0,
                current_stock INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                sync_status TEXT DEFAULT 'pending'
            );
            CREATE VIEW v_spu_inventory AS
            SELECT
                spu.id,
                spu.spu_code,
                spu.name,
                spu.description,
                spu.category_id,
                spu.brand_id,
                spu.unit,
                spu.is_on_sale,
                spu.status,
                spu.metadata,
                COUNT(sku.id) as sku_count,
                COALESCE(SUM(sku.current_stock), 0) as total_stock,
                COALESCE(MIN(sku.sell_price), 0) as min_price,
                COALESCE(MAX(sku.sell_price), 0) as max_price,
                spu.created_at,
                spu.updated_at
            FROM product_spus spu
            LEFT JOIN product_skus sku ON spu.id = sku.spu_id AND sku.deleted_at IS NULL
            WHERE spu.deleted_at IS NULL
            GROUP BY spu.id;",
        )
        .unwrap();
    }

    /// 阶段一约定：`product_spus.id` 与 `products.id` 同值。`products.sku` 写入 `spu_code`。
    fn insert_test_product(conn: &Connection, product_id: &str, spu_code: &str, name: &str) {
        conn.execute(
            "INSERT INTO product_spus (id, spu_code, name) VALUES (?1, ?2, ?3)",
            params![product_id, spu_code, name],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO products (id, sku, name) VALUES (?1, ?2, ?3)",
            params![product_id, spu_code, name],
        )
        .unwrap();
    }

    /// `specifications` 必须是 JSON 文本，空对象用 `"{}"`。`is_default` 落成 0/1。
    fn insert_test_sku(
        conn: &Connection,
        sku_id: &str,
        spu_id: &str,
        sku_code: &str,
        specifications: &str,
        current_stock: i32,
        is_default: bool,
    ) {
        conn.execute(
            "INSERT INTO product_skus (
                id, spu_id, sku_code, specifications, current_stock, is_default, is_active
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)",
            params![
                sku_id,
                spu_id,
                sku_code,
                specifications,
                current_stock,
                if is_default { 1 } else { 0 }
            ],
        )
        .unwrap();
    }

    #[test]
    fn sales_deduct_two_updates_sku_and_spu_view() {
        let conn = Connection::open_in_memory().unwrap();
        schema_with_view(&conn);

        insert_test_product(&conn, "p-test-1", "SPU-TEST-1", "测试商品1");
        insert_test_sku(
            &conn,
            "sku-test-1",
            "p-test-1",
            "SKU-TEST-1",
            "{}",
            12,
            true,
        );
        // 扣减只改 SKU。products 起点写成 12，才能断言它没有跟着变成 10。
        conn.execute(
            "UPDATE products SET current_stock = 12 WHERE id = 'p-test-1'",
            [],
        )
        .unwrap();

        deduct_default_sku(&conn, "p-test-1", 2).expect("sales deduct 2");

        let sku_stock: i32 = conn
            .query_row(
                "SELECT current_stock FROM product_skus WHERE spu_id = ?1",
                params!["p-test-1"],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(sku_stock, 10);

        let view_stock: i64 = conn
            .query_row(
                "SELECT total_stock FROM v_spu_inventory WHERE id = ?1",
                params!["p-test-1"],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(view_stock, 10);

        let products_stock: i32 = conn
            .query_row(
                "SELECT current_stock FROM products WHERE id = ?1",
                params!["p-test-1"],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(products_stock, 12, "products 只保留外键锚点，不再跟着扣");
    }
}
