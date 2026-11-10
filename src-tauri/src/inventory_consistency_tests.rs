//! 账实相符：商品库存与默认 SKU 同事务写入，退货、取消单付款、软删主数据有拦截。

use crate::database::Database;
use crate::inventory_commands::create_inventory_transaction_inner;
use crate::payment_commands::{record_payment_on_conn, record_receipt_on_conn};
use crate::product_commands::create_product_spu_on_conn;
use crate::purchase_commands::{create_purchase_order_on_conn, receive_purchase_order_on_conn};
use crate::purchase_return_commands::{
    confirm_purchase_return_on_conn, create_purchase_return_on_conn,
};
use crate::sales_commands::{
    create_sales_order_on_conn, mark_sales_shipped_on_conn, submit_sales_order_on_conn,
};
use crate::sales_return_commands::{confirm_sales_return_on_conn, create_sales_return_on_conn};
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

fn seed_product(conn: &Connection, product_id: &str, stock: i32, allow_negative: i32) {
    conn.execute(
        "INSERT INTO product_spus (id, spu_code, name) VALUES (?1, ?2, '商品')",
        params![product_id, format!("SPU-{product_id}")],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO products (id, sku, name, unit, cost_price, current_stock, allow_negative_stock)
         VALUES (?1, ?2, '商品', '件', 10, ?3, ?4)",
        params![
            product_id,
            format!("CODE-{product_id}"),
            stock,
            allow_negative
        ],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO product_skus
            (id, spu_id, sku_code, specifications, cost_price, current_stock, is_default, is_active)
         VALUES (?1, ?2, ?3, '{}', 10, ?4, 1, 1)",
        params![
            format!("sku-{product_id}"),
            product_id,
            format!("SKU-{product_id}"),
            stock
        ],
    )
    .unwrap();
}

fn seed_parties(conn: &Connection) {
    conn.execute(
        "INSERT INTO suppliers (id, name) VALUES ('sup-1', '供应商')",
        [],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO customers (id, name) VALUES ('c-1', '客户')",
        [],
    )
    .unwrap();
}

fn stocks(conn: &Connection, product_id: &str) -> (i32, i32) {
    let product: i32 = conn
        .query_row(
            "SELECT current_stock FROM products WHERE id = ?1",
            params![product_id],
            |row| row.get(0),
        )
        .unwrap();
    let sku: i32 = conn
        .query_row(
            "SELECT current_stock FROM product_skus WHERE id = ?1",
            params![format!("sku-{product_id}")],
            |row| row.get(0),
        )
        .unwrap();
    (product, sku)
}

fn purchase_order(conn: &Connection, product_id: &str, qty: i32, price: f64) -> String {
    let created = create_purchase_order_on_conn(
        conn,
        serde_json::json!({
            "supplier_id": "sup-1",
            "order_date": "2026-11-10",
            "items": [{ "product_id": product_id, "quantity": qty, "unit_price": price }]
        }),
    )
    .expect("创建采购单");
    created["id"].as_str().unwrap().to_string()
}

fn sales_order(conn: &Connection, product_id: &str, qty: i32, price: f64) -> String {
    let created = create_sales_order_on_conn(
        conn,
        serde_json::json!({
            "customer_id": "c-1",
            "order_date": "2026-11-10",
            "items": [{ "product_id": product_id, "quantity": qty, "unit_price": price }]
        }),
    )
    .expect("创建销售单");
    created["id"].as_str().unwrap().to_string()
}

fn purchase_return(
    conn: &Connection,
    order_id: &str,
    product_id: &str,
    qty: i32,
) -> Result<String, String> {
    create_purchase_return_on_conn(
        conn,
        serde_json::json!({
            "purchase_order_id": order_id,
            "supplier_id": "sup-1",
            "return_date": "2026-11-10",
            "items": [{ "product_id": product_id, "quantity": qty, "unit_price": 10.0 }]
        }),
    )
    .map(|v| v["id"].as_str().unwrap().to_string())
}

fn sales_return(
    conn: &Connection,
    order_id: &str,
    product_id: &str,
    qty: i32,
) -> Result<String, String> {
    create_sales_return_on_conn(
        conn,
        serde_json::json!({
            "sales_order_id": order_id,
            "customer_id": "c-1",
            "return_date": "2026-11-10",
            "items": [{ "product_id": product_id, "quantity": qty, "unit_price": 10.0 }]
        }),
    )
    .map(|v| v["id"].as_str().unwrap().to_string())
}

#[test]
fn buy_sell_return_keeps_product_and_sku_stock_equal() {
    let db = open_db();
    let conn = db.connection();
    seed_parties(conn);
    seed_product(conn, "p-flow", 0, 0);

    let po_id = purchase_order(conn, "p-flow", 10, 10.0);
    receive_purchase_order_on_conn(conn, po_id.clone()).expect("入库");
    assert_eq!(stocks(conn, "p-flow"), (10, 10));

    let so_id = sales_order(conn, "p-flow", 3, 10.0);
    submit_sales_order_on_conn(conn, &so_id).expect("销售出库");
    assert_eq!(stocks(conn, "p-flow"), (7, 7));
    mark_sales_shipped_on_conn(conn, &so_id).expect("标记已发货");

    let return_id = sales_return(conn, &so_id, "p-flow", 2).expect("销售退货");
    confirm_sales_return_on_conn(conn, return_id.clone()).expect("确认销售退货");
    assert_eq!(
        stocks(conn, "p-flow"),
        (9, 9),
        "入库 10、销售 3、退货 2 后两边库存都必须是 9"
    );

    record_receipt_on_conn(conn, &so_id, 30.0, "2026-11-10", None, None, None, None)
        .expect("退货后原销售单仍可收款");
    record_payment_on_conn(conn, &po_id, 100.0, "2026-11-10", None, None, None, None)
        .expect("退货后原采购单仍可付款");

    let (paid, payment_status): (f64, String) = conn
        .query_row(
            "SELECT paid_amount, payment_status FROM sales_orders WHERE id = ?1",
            params![so_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap();
    assert_eq!(paid, 30.0);
    assert_eq!(payment_status, "paid");
    assert_eq!(stocks(conn, "p-flow"), (9, 9));

    let refunds: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM payment_transactions
             WHERE order_type = 'sales_return' AND order_id = ?1 AND transaction_type = 'refund'",
            params![return_id],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(refunds, 1, "退款流水挂在退货单上");
}

#[test]
fn manual_adjustment_and_negative_sale_sync_both_stocks() {
    let db = open_db();
    let conn = db.connection();
    seed_parties(conn);
    seed_product(conn, "p-adj", 4, 0);
    create_inventory_transaction_inner(
        conn,
        &serde_json::json!({
            "product_id": "p-adj",
            "transaction_type": "adjustment",
            "quantity": 3
        }),
    )
    .expect("手工调整");
    assert_eq!(stocks(conn, "p-adj"), (7, 7));

    seed_product(conn, "p-neg", 5, 1);
    let so_id = sales_order(conn, "p-neg", 6, 10.0);
    submit_sales_order_on_conn(conn, &so_id).expect("允许负库存时应出库成功");
    assert_eq!(stocks(conn, "p-neg"), (-1, -1));

    seed_product(conn, "p-block", 5, 0);
    let blocked = sales_order(conn, "p-block", 6, 10.0);
    let err = submit_sales_order_on_conn(conn, &blocked).unwrap_err();
    assert!(err.contains("Insufficient stock"), "{err}");
    assert_eq!(stocks(conn, "p-block"), (5, 5));
}

#[test]
fn purchase_return_rejects_zero_negative_over_cap_and_unreceived() {
    let db = open_db();
    let conn = db.connection();
    seed_parties(conn);
    seed_product(conn, "p-pr", 0, 0);

    let draft_id = purchase_order(conn, "p-pr", 4, 10.0);
    let unreceived = purchase_return(conn, &draft_id, "p-pr", 1).unwrap_err();
    assert!(
        unreceived.contains("只有已入库"),
        "未入库不能退货，实际：{unreceived}"
    );

    receive_purchase_order_on_conn(conn, draft_id.clone()).expect("入库");
    let zero = purchase_return(conn, &draft_id, "p-pr", 0).unwrap_err();
    assert!(zero.contains("大于 0"), "{zero}");
    let negative = purchase_return(conn, &draft_id, "p-pr", -2).unwrap_err();
    assert!(negative.contains("大于 0"), "{negative}");

    let first = purchase_return(conn, &draft_id, "p-pr", 4).expect("退满");
    confirm_purchase_return_on_conn(conn, first).expect("确认采购退货");
    assert_eq!(stocks(conn, "p-pr"), (0, 0));
    let again = purchase_return(conn, &draft_id, "p-pr", 1).unwrap_err();
    assert!(again.contains("超过可退数量"), "{again}");
    assert_eq!(stocks(conn, "p-pr"), (0, 0));
}

#[test]
fn sales_return_rejects_zero_negative_over_cap_and_unshipped() {
    let db = open_db();
    let conn = db.connection();
    seed_parties(conn);
    seed_product(conn, "p-sr", 10, 0);

    let so_id = sales_order(conn, "p-sr", 4, 10.0);
    submit_sales_order_on_conn(conn, &so_id).expect("出库");
    let unshipped = sales_return(conn, &so_id, "p-sr", 1).unwrap_err();
    assert!(
        unshipped.contains("尚未出库"),
        "未发货不能退货，实际：{unshipped}"
    );

    mark_sales_shipped_on_conn(conn, &so_id).expect("发货");
    let zero = sales_return(conn, &so_id, "p-sr", 0).unwrap_err();
    assert!(zero.contains("大于 0"), "{zero}");
    let negative = sales_return(conn, &so_id, "p-sr", -2).unwrap_err();
    assert!(negative.contains("大于 0"), "{negative}");

    let first = sales_return(conn, &so_id, "p-sr", 4).expect("退满");
    confirm_sales_return_on_conn(conn, first).expect("确认销售退货");
    assert_eq!(stocks(conn, "p-sr"), (10, 10));
    let again = sales_return(conn, &so_id, "p-sr", 1).unwrap_err();
    assert!(again.contains("超过可退数量"), "{again}");
}

#[test]
fn cancelled_orders_cannot_take_payment_or_receipt() {
    let db = open_db();
    let conn = db.connection();
    seed_parties(conn);
    conn.execute(
        "INSERT INTO purchase_orders (id, po_number, supplier_id, order_date, status, total_amount)
         VALUES ('po-cancel', 'PO-CANCEL', 'sup-1', '2026-11-10', 'cancelled', 100)",
        [],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO purchase_orders (id, po_number, supplier_id, order_date, status, total_amount)
         VALUES ('po-open', 'PO-OPEN', 'sup-1', '2026-11-10', 'received', 100)",
        [],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO sales_orders (id, so_number, customer_id, order_date, status, total_amount)
         VALUES ('so-cancel', 'SO-CANCEL', 'c-1', '2026-11-10', 'cancelled', 80)",
        [],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO sales_orders (id, so_number, customer_id, order_date, status, total_amount)
         VALUES ('so-open', 'SO-OPEN', 'c-1', '2026-11-10', 'shipped', 80)",
        [],
    )
    .unwrap();

    let pay = record_payment_on_conn(
        conn,
        "po-cancel",
        10.0,
        "2026-11-10",
        None,
        None,
        None,
        None,
    )
    .unwrap_err();
    assert_eq!(pay, "已取消的订单不能付款");
    let receipt = record_receipt_on_conn(
        conn,
        "so-cancel",
        10.0,
        "2026-11-10",
        None,
        None,
        None,
        None,
    )
    .unwrap_err();
    assert_eq!(receipt, "已取消的订单不能收款");

    record_payment_on_conn(conn, "po-open", 100.0, "2026-11-10", None, None, None, None)
        .expect("未取消采购单可以付款");
    record_receipt_on_conn(conn, "so-open", 80.0, "2026-11-10", None, None, None, None)
        .expect("未取消销售单可以收款");

    let po_status: String = conn
        .query_row(
            "SELECT payment_status FROM purchase_orders WHERE id = 'po-open'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    let so_status: String = conn
        .query_row(
            "SELECT payment_status FROM sales_orders WHERE id = 'so-open'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(po_status, "paid");
    assert_eq!(so_status, "paid");
    let cancelled_paid: f64 = conn
        .query_row(
            "SELECT paid_amount FROM purchase_orders WHERE id = 'po-cancel'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(cancelled_paid, 0.0);
}

#[test]
fn soft_deleted_customer_supplier_and_product_cannot_open_new_orders() {
    let db = open_db();
    let conn = db.connection();
    seed_parties(conn);
    seed_product(conn, "p-live", 0, 0);
    seed_product(conn, "p-gone", 0, 0);
    conn.execute(
        "UPDATE customers SET deleted_at = CURRENT_TIMESTAMP WHERE id = 'c-1'",
        [],
    )
    .unwrap();

    let customer_err = create_sales_order_on_conn(
        conn,
        serde_json::json!({
            "customer_id": "c-1",
            "order_date": "2026-11-10",
            "items": [{ "product_id": "p-live", "quantity": 1, "unit_price": 10.0 }]
        }),
    )
    .unwrap_err();
    assert!(
        customer_err.contains("客户不存在或已删除"),
        "{customer_err}"
    );

    conn.execute(
        "UPDATE customers SET deleted_at = NULL WHERE id = 'c-1'",
        [],
    )
    .unwrap();
    conn.execute(
        "UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE id = 'p-gone'",
        [],
    )
    .unwrap();
    let product_err = create_sales_order_on_conn(
        conn,
        serde_json::json!({
            "customer_id": "c-1",
            "order_date": "2026-11-10",
            "items": [{ "product_id": "p-gone", "quantity": 1, "unit_price": 10.0 }]
        }),
    )
    .unwrap_err();
    assert!(product_err.contains("商品不存在或已删除"), "{product_err}");

    conn.execute(
        "UPDATE suppliers SET deleted_at = CURRENT_TIMESTAMP WHERE id = 'sup-1'",
        [],
    )
    .unwrap();
    let supplier_err = create_purchase_order_on_conn(
        conn,
        serde_json::json!({
            "supplier_id": "sup-1",
            "order_date": "2026-11-10",
            "items": [{ "product_id": "p-live", "quantity": 1, "unit_price": 10.0 }]
        }),
    )
    .unwrap_err();
    assert!(
        supplier_err.contains("供应商不存在或已删除"),
        "{supplier_err}"
    );

    let sales_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM sales_orders", [], |row| row.get(0))
        .unwrap();
    let purchase_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM purchase_orders", [], |row| row.get(0))
        .unwrap();
    assert_eq!(sales_count, 0);
    assert_eq!(purchase_count, 0);
}

#[test]
fn tenth_times_three_stores_two_decimals_and_partial_payments_still_add_up() {
    let db = open_db();
    let conn = db.connection();
    seed_parties(conn);
    seed_product(conn, "p-cent", 0, 0);

    let po_id = purchase_order(conn, "p-cent", 3, 0.1);
    let (line_total, order_total): (f64, f64) = conn
        .query_row(
            "SELECT poi.total_price, po.total_amount
             FROM purchase_order_items poi
             JOIN purchase_orders po ON po.id = poi.purchase_order_id
             WHERE po.id = ?1",
            params![po_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap();
    assert_eq!(format!("{:.2}", line_total), "0.30");
    assert_eq!(format!("{:.2}", order_total), "0.30");
    assert!(
        !format!("{:?}", line_total).contains("0000000000004"),
        "行金额不应留下 0.1 * 3 的长尾，实际 {:?}",
        line_total
    );

    record_payment_on_conn(conn, &po_id, 0.1, "2026-11-10", None, None, None, None)
        .expect("先付 0.1");
    record_payment_on_conn(conn, &po_id, 0.2, "2026-11-10", None, None, None, None)
        .expect("再付 0.2 应结清，不能被长尾当成超额");
    let over = record_payment_on_conn(conn, &po_id, 0.01, "2026-11-10", None, None, None, None)
        .unwrap_err();
    assert!(over.contains("超过订单总额"), "{over}");

    let (paid, status): (f64, String) = conn
        .query_row(
            "SELECT paid_amount, payment_status FROM purchase_orders WHERE id = ?1",
            params![po_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap();
    assert_eq!(format!("{:.2}", paid), "0.30");
    assert_eq!(status, "paid");
}

fn sku_rows(code: &str) -> Vec<serde_json::Value> {
    vec![serde_json::json!({
        "sku_code": code,
        "specifications": "{}",
        "is_default": true
    })]
}

#[test]
fn sku_code_must_be_unique_across_different_products() {
    let db = open_db();
    let conn = db.connection();
    create_product_spu_on_conn(
        conn,
        serde_json::json!({"spu_code": "SPU-A", "name": "商品甲"}),
        sku_rows("SKU-SHARED"),
        vec![],
    )
    .expect("第一个商品可以使用这个编码");

    let err = create_product_spu_on_conn(
        conn,
        serde_json::json!({"spu_code": "SPU-B", "name": "商品乙"}),
        sku_rows("SKU-SHARED"),
        vec![],
    )
    .unwrap_err();
    assert!(err.contains("SKU编码已存在"), "{err}");
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM product_skus WHERE sku_code = 'SKU-SHARED'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(count, 1, "重复编码不能落库");

    conn.execute(
        "UPDATE product_skus SET deleted_at = CURRENT_TIMESTAMP WHERE sku_code = 'SKU-SHARED'",
        [],
    )
    .unwrap();
    create_product_spu_on_conn(
        conn,
        serde_json::json!({"spu_code": "SPU-C", "name": "商品丙"}),
        sku_rows("SKU-SHARED"),
        vec![],
    )
    .expect("软删后的编码可以再用");
}

fn http_app_state(db: Arc<Mutex<Database>>) -> crate::api::AppState {
    let key = [7u8; 32];
    let backup = Database::new_in_memory().expect("backup db");
    crate::api::AppState {
        db,
        cipher: Arc::new(crate::utils::crypto::Aes256GcmCipher::new(&key).expect("cipher")),
        ws_manager: Arc::new(crate::api::websocket::WebSocketManager::new()),
        cloud_backup: Arc::new(
            crate::services::cloud_backup_service::CloudBackupService::new(backup, &key),
        ),
        jwt_secret: Arc::new(vec![1u8; 32]),
    }
}

#[test]
fn http_submit_matches_desktop_shipped_quantity_and_stock() {
    let db = Arc::new(Mutex::new(open_db()));
    let so_id = {
        let guard = db.lock().unwrap();
        let conn = guard.connection();
        seed_parties(conn);
        seed_product(conn, "p-http", 10, 0);
        sales_order(conn, "p-http", 3, 10.0)
    };

    let app = http_app_state(Arc::clone(&db));
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();
    let (status, body) = rt.block_on(async move {
        let response = crate::api::sales_orders::submit_sales_order(State(app), Path(so_id))
            .await
            .into_response();
        let status = response.status();
        let bytes = axum::body::to_bytes(response.into_body(), 8192)
            .await
            .unwrap_or_default();
        (status, String::from_utf8_lossy(&bytes).into_owned())
    });
    assert_eq!(status, StatusCode::OK, "{body}");

    let guard = db.lock().unwrap();
    let conn = guard.connection();
    assert_eq!(stocks(conn, "p-http"), (7, 7));
    let shipped: i32 = conn
        .query_row(
            "SELECT shipped_quantity FROM sales_order_items WHERE product_id = 'p-http'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(shipped, 3);
}
