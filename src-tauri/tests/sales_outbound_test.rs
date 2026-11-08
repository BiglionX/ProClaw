//! 销售出库：`submit_sales_order_on_conn` 把 `shipped_quantity` 写成 `quantity`，并扣默认 SKU。

use proclaw_desktop::database::Database;
use proclaw_desktop::sales_commands::submit_sales_order_on_conn;
use rusqlite::{params, Connection};

fn open_db() -> Database {
    let db = Database::new_in_memory().expect("memory db");
    db.initialize().expect("schema");
    db
}

fn sku_stock(conn: &Connection, sku_id: &str) -> i32 {
    conn.query_row(
        "SELECT current_stock FROM product_skus WHERE id = ?1",
        params![sku_id],
        |row| row.get(0),
    )
    .unwrap()
}

fn product_stock(conn: &Connection, product_id: &str) -> i32 {
    conn.query_row(
        "SELECT current_stock FROM products WHERE id = ?1",
        params![product_id],
        |row| row.get(0),
    )
    .unwrap()
}

/// 非默认 SKU 创建时间更早，库存也更多。出库应只扣该商品的默认 SKU。
fn insert_product(conn: &Connection, product_id: &str, default_stock: i32, other_stock: i32) {
    conn.execute(
        "INSERT INTO product_spus (id, spu_code, name) VALUES (?1, ?2, '商品')",
        params![product_id, format!("SPU-{product_id}")],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO products (id, sku, name, unit, cost_price, current_stock, allow_negative_stock)
         VALUES (?1, ?2, '商品', '件', 10, 1, 0)",
        params![product_id, format!("CODE-{product_id}")],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO product_skus
            (id, spu_id, sku_code, specifications, cost_price, current_stock, is_default, is_active, created_at)
         VALUES (?1, ?2, ?3, '{}', 10, ?4, 0, 1, '2020-01-01 00:00:00')",
        params![
            format!("sku-{product_id}-other"),
            product_id,
            format!("OTH-{product_id}"),
            other_stock
        ],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO product_skus
            (id, spu_id, sku_code, specifications, cost_price, current_stock, is_default, is_active, created_at)
         VALUES (?1, ?2, ?3, '{}', 10, ?4, 1, 1, '2026-01-01 00:00:00')",
        params![
            format!("sku-{product_id}-default"),
            product_id,
            format!("DEF-{product_id}"),
            default_stock
        ],
    )
    .unwrap();
}

fn insert_draft_sales_order(conn: &Connection, order_id: &str, product_id: &str, quantity: i32) {
    let customer_id = format!("c-{order_id}");
    let total = quantity as f64 * 20.0;
    conn.execute(
        "INSERT INTO customers (id, name) VALUES (?1, '客户')",
        params![customer_id],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO sales_orders (id, so_number, customer_id, order_date, status, total_amount)
         VALUES (?1, ?2, ?3, '2026-11-08', 'draft', ?4)",
        params![order_id, format!("SO-{order_id}"), customer_id, total],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO sales_order_items
            (id, sales_order_id, product_id, quantity, unit_price, total_price, shipped_quantity)
         VALUES (?1, ?2, ?3, ?4, 20, ?5, 0)",
        params![
            format!("item-{order_id}"),
            order_id,
            product_id,
            quantity,
            total
        ],
    )
    .unwrap();
}

fn line_qty_shipped(conn: &Connection, order_id: &str) -> (i32, i32) {
    conn.query_row(
        "SELECT quantity, shipped_quantity FROM sales_order_items WHERE sales_order_id = ?1",
        params![order_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .unwrap()
}

#[test]
fn submit_sets_shipped_quantity_and_deducts_default_sku() {
    let db = open_db();
    let conn = db.connection();
    insert_product(conn, "p-sell", 12, 100);
    insert_product(conn, "p-other", 8, 2);
    insert_draft_sales_order(conn, "so-out", "p-sell", 5);

    submit_sales_order_on_conn(conn, "so-out").expect("出库应成功");

    let (qty, shipped) = line_qty_shipped(conn, "so-out");
    assert_eq!(qty, 5);
    assert_eq!(shipped, qty);
    assert_eq!(sku_stock(conn, "sku-p-sell-default"), 7);
    assert_eq!(
        sku_stock(conn, "sku-p-sell-other"),
        100,
        "同商品非默认 SKU 不应扣减"
    );
    assert_eq!(sku_stock(conn, "sku-p-other-default"), 8);
    assert_eq!(
        product_stock(conn, "p-sell"),
        1,
        "products.current_stock 不是出库写入目标"
    );
    let status: String = conn
        .query_row(
            "SELECT status FROM sales_orders WHERE id = 'so-out'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(status, "confirmed");
}

#[test]
fn submit_insufficient_stock_keeps_shipped_quantity_and_stock() {
    let db = open_db();
    let conn = db.connection();
    insert_product(conn, "p-sell", 2, 100);
    insert_product(conn, "p-other", 8, 2);
    insert_draft_sales_order(conn, "so-short", "p-sell", 5);

    let err = submit_sales_order_on_conn(conn, "so-short").unwrap_err();
    assert!(
        err.contains("Insufficient stock"),
        "库存不足应失败，实际：{err}"
    );

    let (qty, shipped) = line_qty_shipped(conn, "so-short");
    assert_eq!(qty, 5);
    assert_eq!(shipped, 0, "失败时 shipped_quantity 应保持 0");
    assert_eq!(sku_stock(conn, "sku-p-sell-default"), 2);
    assert_eq!(sku_stock(conn, "sku-p-sell-other"), 100);
    assert_eq!(sku_stock(conn, "sku-p-other-default"), 8);
    assert_eq!(product_stock(conn, "p-sell"), 1);
    let status: String = conn
        .query_row(
            "SELECT status FROM sales_orders WHERE id = 'so-short'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(status, "draft");
}
