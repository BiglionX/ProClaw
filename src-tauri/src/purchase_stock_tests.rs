//! 采购入库 / 退货写 `product_skus.current_stock`。
//!
//! 命令在锁库后调用 `*_on_conn`。测试直接传入 `&Connection`。
//! 采购明细只有 `product_id`，库存落在该商品启用的默认 SKU 上。

use super::{confirm_purchase_return_on_conn, create_purchase_return_on_conn};
use crate::database::Database;
use crate::purchase_commands::receive_purchase_order_on_conn;
use axum::body::to_bytes;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use rusqlite::{params, Connection};
use std::sync::{Arc, Mutex};

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

/// 非默认 SKU 创建时间更早。若实现按创建顺序而不是 `is_default` 取行，会写错 SKU。
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

fn seed_catalog(conn: &Connection) {
    insert_product(conn, "p-buy", 10, 4);
    insert_product(conn, "p-other", 8, 2);
    conn.execute(
        "INSERT INTO suppliers (id, name) VALUES ('sup-1', '供应商')",
        [],
    )
    .unwrap();
}

fn insert_purchase_order(conn: &Connection, order_id: &str, product_id: &str, qty: i32) {
    let total = qty as f64 * 3.0;
    conn.execute(
        "INSERT INTO purchase_orders
            (id, po_number, supplier_id, order_date, status, total_amount)
         VALUES (?1, ?2, 'sup-1', '2026-11-08', 'confirmed', ?3)",
        params![order_id, format!("PO-{order_id}"), total],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO purchase_order_items
            (id, purchase_order_id, product_id, quantity, unit_price, total_price, received_quantity)
         VALUES (?1, ?2, ?3, ?4, 3, ?5, 0)",
        params![
            format!("poi-{order_id}"),
            order_id,
            product_id,
            qty,
            total
        ],
    )
    .unwrap();
}

fn assert_only_buy_default_changed(conn: &Connection, buy_default: i32) {
    assert_eq!(sku_stock(conn, "sku-p-buy-default"), buy_default);
    assert_eq!(sku_stock(conn, "sku-p-buy-other"), 4, "同商品非默认 SKU 不应变化");
    assert_eq!(sku_stock(conn, "sku-p-other-default"), 8, "其他商品默认 SKU 不应变化");
    assert_eq!(sku_stock(conn, "sku-p-other-other"), 2, "其他商品非默认 SKU 不应变化");
    assert_eq!(
        product_stock(conn, "p-buy"),
        1,
        "products.current_stock 不是入库写入目标"
    );
}

#[test]
fn ordered_default_sku_stock_increases_on_purchase_receive() {
    let db = open_db();
    let conn = db.connection();
    seed_catalog(conn);
    insert_purchase_order(conn, "po-in", "p-buy", 6);

    receive_purchase_order_on_conn(conn, "po-in".to_string()).expect("采购入库应成功");

    assert_only_buy_default_changed(conn, 16);
    let received: i32 = conn
        .query_row(
            "SELECT received_quantity FROM purchase_order_items WHERE purchase_order_id = 'po-in'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(received, 6);
    let status: String = conn
        .query_row(
            "SELECT status FROM purchase_orders WHERE id = 'po-in'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(status, "received");
}

#[test]
fn ordered_default_sku_stock_decreases_on_purchase_return() {
    let db = open_db();
    let conn = db.connection();
    seed_catalog(conn);
    insert_purchase_order(conn, "po-ret", "p-buy", 10);

    let created = create_purchase_return_on_conn(
        conn,
        serde_json::json!({
            "purchase_order_id": "po-ret",
            "supplier_id": "sup-1",
            "return_date": "2026-11-08",
            "items": [{
                "product_id": "p-buy",
                "quantity": 3,
                "unit_price": 3.0
            }]
        }),
    )
    .expect("创建采购退货单");

    assert_eq!(
        sku_stock(conn, "sku-p-buy-default"),
        10,
        "创建退货单不应改库存"
    );

    let return_id = created["id"].as_str().unwrap().to_string();
    confirm_purchase_return_on_conn(conn, return_id).expect("确认采购退货应回减库存");

    assert_only_buy_default_changed(conn, 7);
    let status: String = conn
        .query_row("SELECT status FROM purchase_returns", [], |row| row.get(0))
        .unwrap();
    assert_eq!(status, "confirmed");
}

fn http_app_state(db: Arc<Mutex<Database>>) -> crate::api::AppState {
    let key = [7u8; 32];
    let backup = Database::new_in_memory().expect("backup db");
    crate::api::AppState {
        db,
        cipher: Arc::new(crate::utils::crypto::Aes256GcmCipher::new(&key).expect("cipher")),
        ws_manager: Arc::new(crate::api::websocket::WebSocketManager::new()),
        cloud_backup: Arc::new(crate::services::cloud_backup_service::CloudBackupService::new(
            backup, &key,
        )),
        jwt_secret: Arc::new(vec![1u8; 32]),
    }
}

#[test]
fn ordered_default_sku_stock_increases_on_http_receive() {
    let db = Arc::new(Mutex::new(open_db()));
    {
        let guard = db.lock().unwrap();
        let conn = guard.connection();
        seed_catalog(conn);
        insert_purchase_order(conn, "po-http", "p-buy", 6);
    }

    let app = http_app_state(Arc::clone(&db));
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();
    let (status, body) = rt.block_on(async move {
        let response = crate::api::purchase_orders::receive_purchase_order(
            State(app),
            Path("po-http".to_string()),
        )
        .await
        .into_response();
        let status = response.status();
        let bytes = to_bytes(response.into_body(), 8192)
            .await
            .unwrap_or_default();
        (status, String::from_utf8_lossy(&bytes).into_owned())
    });
    assert_eq!(status, StatusCode::OK, "{body}");

    let guard = db.lock().unwrap();
    let conn = guard.connection();
    assert_only_buy_default_changed(conn, 16);
    let received: i32 = conn
        .query_row(
            "SELECT received_quantity FROM purchase_order_items WHERE purchase_order_id = 'po-http'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(received, 6);
}
