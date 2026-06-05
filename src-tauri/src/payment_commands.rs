use crate::database::Database;
use rusqlite::params;
use std::sync::Mutex;

/// 记录采购付款
#[tauri::command]
pub fn record_payment_cmd(
    db: tauri::State<Mutex<Database>>,
    order_id: String,
    amount: f64,
    transaction_date: String,
    payment_method: Option<String>,
    voucher_no: Option<String>,
    notes: Option<String>,
    created_by: Option<String>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    if amount <= 0.0 {
        return Err("付款金额必须大于0".to_string());
    }

    // 查询采购订单信息
    let (total_amount, supplier_id, supplier_name): (f64, String, Option<String>) = conn.query_row(
        "SELECT po.total_amount, po.supplier_id, s.name
         FROM purchase_orders po
         LEFT JOIN suppliers s ON po.supplier_id = s.id
         WHERE po.id = ?1 AND po.deleted_at IS NULL",
        params![order_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    ).map_err(|_| "采购订单不存在".to_string())?;

    // 获取当前已付金额
    let current_paid: f64 = conn.query_row(
        "SELECT paid_amount FROM purchase_orders WHERE id = ?1",
        params![order_id],
        |row| row.get(0),
    ).map_err(|_| "获取已付金额失败".to_string())?;

    let new_paid = current_paid + amount;
    if new_paid > total_amount {
        return Err(format!(
            "付款金额({})加上已付金额({})超过订单总额({})",
            amount, current_paid, total_amount
        ));
    }

    let payment_status = if (new_paid - total_amount).abs() < f64::EPSILON || new_paid >= total_amount {
        "paid"
    } else {
        "partial"
    };

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    let payment_id = uuid::Uuid::new_v4().to_string();

    // 插入付款交易记录
    tx.execute(
        "INSERT INTO payment_transactions (id, order_type, order_id, transaction_type, amount,
         transaction_date, payment_method, voucher_no, notes, created_by,
         counterparty_id, counterparty_name, counterparty_type)
         VALUES (?1, 'purchase', ?2, 'payment', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'supplier')",
        params![
            payment_id, order_id, amount, transaction_date, payment_method,
            voucher_no, notes, created_by, supplier_id, supplier_name,
        ],
    ).map_err(|e| e.to_string())?;

    // 更新采购订单已付金额和状态
    tx.execute(
        "UPDATE purchase_orders SET paid_amount = ?1, payment_status = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
        params![new_paid, payment_status, order_id],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": payment_id,
        "paid_amount": new_paid,
        "payment_status": payment_status,
        "message": "付款记录成功"
    }))
}

/// 记录销售收款
#[tauri::command]
pub fn record_receipt_cmd(
    db: tauri::State<Mutex<Database>>,
    order_id: String,
    amount: f64,
    transaction_date: String,
    payment_method: Option<String>,
    voucher_no: Option<String>,
    notes: Option<String>,
    created_by: Option<String>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    if amount <= 0.0 {
        return Err("收款金额必须大于0".to_string());
    }

    // 查询销售订单信息
    let (total_amount, customer_id, customer_name): (f64, String, Option<String>) = conn.query_row(
        "SELECT so.total_amount, so.customer_id, c.name
         FROM sales_orders so
         LEFT JOIN customers c ON so.customer_id = c.id
         WHERE so.id = ?1 AND so.deleted_at IS NULL",
        params![order_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    ).map_err(|_| "销售订单不存在".to_string())?;

    // 获取当前已收金额
    let current_paid: f64 = conn.query_row(
        "SELECT paid_amount FROM sales_orders WHERE id = ?1",
        params![order_id],
        |row| row.get(0),
    ).map_err(|_| "获取已收金额失败".to_string())?;

    let new_paid = current_paid + amount;
    if new_paid > total_amount {
        return Err(format!(
            "收款金额({})加上已收金额({})超过订单总额({})",
            amount, current_paid, total_amount
        ));
    }

    let payment_status = if (new_paid - total_amount).abs() < f64::EPSILON || new_paid >= total_amount {
        "paid"
    } else {
        "partial"
    };

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    let payment_id = uuid::Uuid::new_v4().to_string();

    // 插入收款交易记录
    tx.execute(
        "INSERT INTO payment_transactions (id, order_type, order_id, transaction_type, amount,
         transaction_date, payment_method, voucher_no, notes, created_by,
         counterparty_id, counterparty_name, counterparty_type)
         VALUES (?1, 'sales', ?2, 'receipt', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'customer')",
        params![
            payment_id, order_id, amount, transaction_date, payment_method,
            voucher_no, notes, created_by, customer_id, customer_name,
        ],
    ).map_err(|e| e.to_string())?;

    // 更新销售订单已收金额和状态
    tx.execute(
        "UPDATE sales_orders SET paid_amount = ?1, payment_status = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
        params![new_paid, payment_status, order_id],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": payment_id,
        "paid_amount": new_paid,
        "payment_status": payment_status,
        "message": "收款记录成功"
    }))
}

/// 获取订单付款/收款历史
#[tauri::command]
pub fn get_payments_cmd(
    db: tauri::State<Mutex<Database>>,
    order_id: String,
) -> Result<Vec<serde_json::Value>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn.prepare(
        "SELECT id, order_type, transaction_type, amount, transaction_date,
                payment_method, voucher_no, notes, created_by, created_at
         FROM payment_transactions
         WHERE order_id = ?1 AND deleted_at IS NULL
         ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;

    let payments: Vec<serde_json::Value> = stmt
        .query_map(params![order_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "order_type": row.get::<_, String>(1)?,
                "transaction_type": row.get::<_, String>(2)?,
                "amount": row.get::<_, f64>(3)?,
                "transaction_date": row.get::<_, String>(4)?,
                "payment_method": row.get::<_, Option<String>>(5)?,
                "voucher_no": row.get::<_, Option<String>>(6)?,
                "notes": row.get::<_, Option<String>>(7)?,
                "created_by": row.get::<_, Option<String>>(8)?,
                "created_at": row.get::<_, String>(9)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(payments)
}

/// 获取应收/应付汇总（按对方维度）
#[tauri::command]
pub fn get_ar_ap_summary_cmd(
    db: tauri::State<Mutex<Database>>,
    counterparty_type: Option<String>,  // 'supplier' 或 'customer'
) -> Result<Vec<serde_json::Value>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut results: Vec<serde_json::Value> = Vec::new();

    // 应付汇总（供应商维度）
    if counterparty_type.as_deref() != Some("customer") {
        let mut stmt = conn.prepare(
            "SELECT po.supplier_id, s.name as supplier_name, s.code as supplier_code, s.email,
                    s.contact_person, s.phone,
                    COUNT(po.id) as order_count,
                    SUM(po.total_amount) as total_amount,
                    SUM(po.paid_amount) as total_paid,
                    COALESCE((SELECT SUM(pt.amount) FROM payment_transactions pt
                      WHERE pt.counterparty_id = po.supplier_id AND pt.counterparty_type = 'supplier'
                      AND pt.deleted_at IS NULL), 0.0) as ledger_total
             FROM purchase_orders po
             JOIN suppliers s ON po.supplier_id = s.id
             WHERE po.deleted_at IS NULL AND po.status != 'cancelled'
             GROUP BY po.supplier_id
             ORDER BY total_amount DESC"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map([], |row| {
            let total: f64 = row.get(6)?;
            let paid: f64 = row.get(7)?;
            Ok(serde_json::json!({
                "counterparty_id": row.get::<_, String>(0)?,
                "counterparty_name": row.get::<_, Option<String>>(1)?,
                "counterparty_code": row.get::<_, Option<String>>(2)?,
                "email": row.get::<_, Option<String>>(3)?,
                "contact_person": row.get::<_, Option<String>>(4)?,
                "phone": row.get::<_, Option<String>>(5)?,
                "order_count": row.get::<_, i32>(6)?,
                "total_amount": total,
                "paid_amount": paid,
                "balance": total - paid,
                "counterparty_type": "supplier",
            }))
        }).map_err(|e| e.to_string())?;

        for row in rows.flatten() {
            results.push(row);
        }
    }

    // 应收汇总（客户维度）
    if counterparty_type.as_deref() != Some("supplier") {
        let mut stmt = conn.prepare(
            "SELECT so.customer_id, c.name as customer_name, c.code as customer_code, c.email,
                    c.contact_person, c.phone,
                    COUNT(so.id) as order_count,
                    SUM(so.total_amount) as total_amount,
                    SUM(so.paid_amount) as total_paid
             FROM sales_orders so
             JOIN customers c ON so.customer_id = c.id
             WHERE so.deleted_at IS NULL AND so.status != 'cancelled'
             GROUP BY so.customer_id
             ORDER BY total_amount DESC"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map([], |row| {
            let total: f64 = row.get(6)?;
            let paid: f64 = row.get(7)?;
            Ok(serde_json::json!({
                "counterparty_id": row.get::<_, String>(0)?,
                "counterparty_name": row.get::<_, Option<String>>(1)?,
                "counterparty_code": row.get::<_, Option<String>>(2)?,
                "email": row.get::<_, Option<String>>(3)?,
                "contact_person": row.get::<_, Option<String>>(4)?,
                "phone": row.get::<_, Option<String>>(5)?,
                "order_count": row.get::<_, i32>(6)?,
                "total_amount": total,
                "paid_amount": paid,
                "balance": total - paid,
                "counterparty_type": "customer",
            }))
        }).map_err(|e| e.to_string())?;

        for row in rows.flatten() {
            results.push(row);
        }
    }

    Ok(results)
}

/// 获取某个对方（供应商/客户）的未清项明细
#[tauri::command]
pub fn get_ar_ap_detail_cmd(
    db: tauri::State<Mutex<Database>>,
    counterparty_type: String,
    counterparty_id: String,
) -> Result<Vec<serde_json::Value>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    if counterparty_type == "supplier" {
        let mut stmt = conn.prepare(
            "SELECT po.id, po.po_number, po.order_date, po.status,
                    po.total_amount, po.paid_amount, po.payment_status
             FROM purchase_orders po
             WHERE po.supplier_id = ?1 AND po.deleted_at IS NULL AND po.status != 'cancelled'
             ORDER BY po.created_at DESC"
        ).map_err(|e| e.to_string())?;

        let items: Vec<serde_json::Value> = stmt
            .query_map(params![counterparty_id], |row| {
                let total: f64 = row.get(4)?;
                let paid: f64 = row.get(5)?;
                Ok(serde_json::json!({
                    "order_id": row.get::<_, String>(0)?,
                    "order_number": row.get::<_, String>(1)?,
                    "order_date": row.get::<_, String>(2)?,
                    "status": row.get::<_, String>(3)?,
                    "total_amount": total,
                    "paid_amount": paid,
                    "balance": total - paid,
                    "payment_status": row.get::<_, String>(6)?,
                    "order_type": "purchase",
                }))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        Ok(items)
    } else {
        let mut stmt = conn.prepare(
            "SELECT so.id, so.so_number, so.order_date, so.status,
                    so.total_amount, so.paid_amount, so.payment_status
             FROM sales_orders so
             WHERE so.customer_id = ?1 AND so.deleted_at IS NULL AND so.status != 'cancelled'
             ORDER BY so.created_at DESC"
        ).map_err(|e| e.to_string())?;

        let items: Vec<serde_json::Value> = stmt
            .query_map(params![counterparty_id], |row| {
                let total: f64 = row.get(4)?;
                let paid: f64 = row.get(5)?;
                Ok(serde_json::json!({
                    "order_id": row.get::<_, String>(0)?,
                    "order_number": row.get::<_, String>(1)?,
                    "order_date": row.get::<_, String>(2)?,
                    "status": row.get::<_, String>(3)?,
                    "total_amount": total,
                    "paid_amount": paid,
                    "balance": total - paid,
                    "payment_status": row.get::<_, String>(6)?,
                    "order_type": "sales",
                }))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        Ok(items)
    }
}
