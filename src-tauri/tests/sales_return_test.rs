//! P0-1：退货按订单状态和已出库数量校验。
//! 出库扣库存属于 P0-3，这里直接插入订单，不调用 submit。

use proclaw_desktop::database::Database;
use proclaw_desktop::sales_return_commands::create_sales_return_on_conn;
use rusqlite::{params, Connection};

fn open_db() -> Database {
    let db = Database::new_in_memory().expect("memory db");
    db.initialize().expect("schema");
    db
}

/// 客户和商品是外键父行。不写 product_skus，也不走出库。
fn insert_order_parents(conn: &Connection, order_id: &str, product_id: &str) {
    let customer_id = format!("c-{order_id}");
    conn.execute(
        "INSERT INTO customers (id, name) VALUES (?1, '客户')",
        params![customer_id],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO product_spus (id, spu_code, name) VALUES (?1, ?2, '商品')",
        params![product_id, format!("SPU-{product_id}")],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO products (id, sku, name, unit, cost_price) VALUES (?1, ?2, '商品', '件', 10)",
        params![product_id, format!("SKU-{product_id}")],
    )
    .unwrap();
}

fn insert_confirmed_order_with_shipped(
    conn: &Connection,
    order_id: &str,
    item_id: &str,
    product_id: &str,
    quantity: i32,
    shipped_quantity: i32,
) {
    insert_order_parents(conn, order_id, product_id);
    conn.execute(
        "INSERT INTO sales_orders (id, so_number, customer_id, order_date, status, total_amount)
         VALUES (?1, ?2, ?3, '2026-11-07', 'confirmed', ?4)",
        params![
            order_id,
            format!("SO-{order_id}"),
            format!("c-{order_id}"),
            quantity as f64 * 20.0
        ],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO sales_order_items
            (id, sales_order_id, product_id, quantity, unit_price, total_price, shipped_quantity)
         VALUES (?1, ?2, ?3, ?4, 20, ?5, ?6)",
        params![
            item_id,
            order_id,
            product_id,
            quantity,
            quantity as f64 * 20.0,
            shipped_quantity
        ],
    )
    .unwrap();
}

fn insert_draft_order(
    conn: &Connection,
    order_id: &str,
    item_id: &str,
    product_id: &str,
    quantity: i32,
) {
    insert_order_parents(conn, order_id, product_id);
    conn.execute(
        "INSERT INTO sales_orders (id, so_number, customer_id, order_date, status, total_amount)
         VALUES (?1, ?2, ?3, '2026-11-07', 'draft', ?4)",
        params![
            order_id,
            format!("SO-{order_id}"),
            format!("c-{order_id}"),
            quantity as f64 * 20.0
        ],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO sales_order_items
            (id, sales_order_id, product_id, quantity, unit_price, total_price, shipped_quantity)
         VALUES (?1, ?2, ?3, ?4, 20, ?5, 0)",
        params![
            item_id,
            order_id,
            product_id,
            quantity,
            quantity as f64 * 20.0
        ],
    )
    .unwrap();
}

fn return_body(order_id: &str, product_id: &str, quantity: i32) -> serde_json::Value {
    serde_json::json!({
        "sales_order_id": order_id,
        "customer_id": format!("c-{order_id}"),
        "return_date": "2026-11-07",
        "items": [{
            "product_id": product_id,
            "quantity": quantity,
            "unit_price": 20.0
        }]
    })
}

#[test]
fn test_sales_return_after_shipped_order_succeeds() {
    let db = open_db();
    let conn = db.connection();
    insert_confirmed_order_with_shipped(conn, "so-out", "item-out", "p-out", 5, 5);

    create_sales_return_on_conn(conn, return_body("so-out", "p-out", 3)).expect("退 3 件应成功");
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM sales_returns", [], |row| row.get(0))
        .unwrap();
    assert_eq!(count, 1);
}

#[test]
fn test_sales_return_exceeds_shipped_fails() {
    let db = open_db();
    let conn = db.connection();
    insert_confirmed_order_with_shipped(conn, "so-over", "item-over", "p-over", 5, 5);

    let err = create_sales_return_on_conn(conn, return_body("so-over", "p-over", 6)).unwrap_err();
    assert!(
        err.contains("超过已出库数量"),
        "错误信息应说明超过已出库数量，实际：{err}"
    );
}

#[test]
fn test_sales_return_draft_order_fails() {
    let db = open_db();
    let conn = db.connection();
    insert_draft_order(conn, "so-draft", "item-draft", "p-draft", 5);

    let err = create_sales_return_on_conn(conn, return_body("so-draft", "p-draft", 3)).unwrap_err();
    assert!(
        err.contains("尚未出库"),
        "草稿退货应报尚未出库，实际：{err}"
    );
}

#[test]
fn test_sales_return_historical_order_succeeds() {
    let db = open_db();
    let conn = db.connection();
    // shipped_quantity = 0 的已确认单走 CASE 回退，不靠迁移改写。
    insert_confirmed_order_with_shipped(
        conn,
        "so-hist-case",
        "item-hist-case",
        "p-hist-case",
        5,
        0,
    );

    create_sales_return_on_conn(conn, return_body("so-hist-case", "p-hist-case", 5))
        .expect("历史单按 quantity 回退应能退");
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sales_returns WHERE sales_order_id = 'so-hist-case'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(count, 1);
}

#[test]
fn test_shipped_quantity_migration_backfills_historical_orders() {
    let db = open_db();
    let conn = db.connection();
    insert_confirmed_order_with_shipped(conn, "so-hist", "item-hist", "p-hist", 5, 0);

    let migration_sql = "UPDATE sales_order_items SET shipped_quantity = quantity
        WHERE sales_order_id IN (SELECT id FROM sales_orders
            WHERE status IN ('confirmed','shipped','delivered','completed'))
        AND (shipped_quantity IS NULL OR shipped_quantity = 0)";
    let n = conn.execute(migration_sql, []).unwrap();
    assert_eq!(n, 1, "应回填 1 条历史单");

    let shipped: i32 = conn
        .query_row(
            "SELECT shipped_quantity FROM sales_order_items WHERE id = 'item-hist'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(shipped, 5);
}
