//! 应收/应付汇总按订单金额返回，不因列类型读失败变成空列表。

use super::get_ar_ap_summary_on_conn;
use crate::database::Database;
use rusqlite::Connection;

fn open_db() -> Database {
    let db = Database::new_in_memory().expect("memory db");
    db.initialize().expect("schema");
    db
}

fn insert_supplier_purchase(conn: &Connection) {
    conn.execute(
        "INSERT INTO suppliers (id, name) VALUES ('s1', '供应商')",
        [],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO purchase_orders (
            id, po_number, supplier_id, order_date, status, total_amount, paid_amount, payment_status
         ) VALUES ('po1', 'PO-1', 's1', '2026-06-01', 'confirmed', 1000, 300, 'partial')",
        [],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO payment_transactions (
            id, order_type, order_id, transaction_type, amount, transaction_date,
            counterparty_id, counterparty_type
         ) VALUES ('pay1', 'purchase', 'po1', 'payment', 300, '2026-06-02', 's1', 'supplier')",
        [],
    )
    .unwrap();
}

fn insert_customer_sale(conn: &Connection) {
    conn.execute("INSERT INTO customers (id, name) VALUES ('c1', '客户')", [])
        .unwrap();
    conn.execute(
        "INSERT INTO sales_orders (
            id, so_number, customer_id, order_date, status, total_amount, paid_amount, payment_status
         ) VALUES ('so1', 'SO-1', 'c1', '2026-06-01', 'confirmed', 1000, 300, 'partial')",
        [],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO payment_transactions (
            id, order_type, order_id, transaction_type, amount, transaction_date,
            counterparty_id, counterparty_type
         ) VALUES ('pay2', 'sales', 'so1', 'receipt', 300, '2026-06-02', 'c1', 'customer')",
        [],
    )
    .unwrap();
}

#[test]
fn supplier_summary_returns_order_totals() {
    let db = open_db();
    let conn = db.connection();
    insert_supplier_purchase(conn);

    let rows = get_ar_ap_summary_on_conn(conn, Some("supplier")).unwrap();
    assert!(!rows.is_empty(), "supplier summary empty: {rows:?}");
    assert_eq!(rows[0]["total_amount"].as_f64(), Some(1000.0));
    assert_eq!(rows[0]["paid_amount"].as_f64(), Some(300.0));
    assert_eq!(rows[0]["counterparty_id"], "s1");
}

#[test]
fn customer_summary_returns_order_totals() {
    let db = open_db();
    let conn = db.connection();
    insert_customer_sale(conn);

    let rows = get_ar_ap_summary_on_conn(conn, Some("customer")).unwrap();
    assert!(!rows.is_empty(), "customer summary empty: {rows:?}");
    assert_eq!(rows[0]["total_amount"].as_f64(), Some(1000.0));
    assert_eq!(rows[0]["paid_amount"].as_f64(), Some(300.0));
    assert_eq!(rows[0]["counterparty_id"], "c1");
}
