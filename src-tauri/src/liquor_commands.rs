// 酒水批发行业插件 Tauri 命令
// 需求文档：行业插件补充——八大行业插件发布至插件商店

use crate::database::Database;
use rusqlite::params;
use serde_json::{json, Value};
use std::sync::Mutex;
use uuid::Uuid;

/// 获取赊账账户列表（含客户信息）
#[tauri::command]
pub fn lw_get_credit_accounts(db: tauri::State<Mutex<Database>>) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    seed_lw_demo_if_empty(&conn)?;

    let mut stmt = conn.prepare(
        "SELECT ca.id, ca.customer_id, c.name as customer_name, c.contact_person,
                ca.credit_limit, ca.current_balance, ca.last_settlement_at,
                (SELECT COALESCE(SUM(ct.amount), 0) FROM lw_credit_transactions ct
                 WHERE ct.credit_account_id = ca.id AND ct.type = 'debit'
                   AND ct.created_at > COALESCE(ca.last_settlement_at, '1970-01-01')) as pending_debit
         FROM lw_credit_accounts ca
         LEFT JOIN customers c ON ca.customer_id = c.id
         ORDER BY ca.current_balance DESC"
    ).map_err(|e| e.to_string())?;

    let accounts: Vec<Value> = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "customer_id": row.get::<_, String>(1)?,
                "customer_name": row.get::<_, Option<String>>(2)?,
                "contact_person": row.get::<_, Option<String>>(3)?,
                "credit_limit": row.get::<_, f64>(4)?,
                "current_balance": row.get::<_, f64>(5)?,
                "last_settlement_at": row.get::<_, Option<String>>(6)?,
                "pending_debit": row.get::<_, f64>(7)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(json!({ "accounts": accounts, "count": accounts.len() }))
}

/// 获取赊账交易流水
#[tauri::command]
pub fn lw_get_credit_transactions(
    db: tauri::State<Mutex<Database>>,
    credit_account_id: String,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn
        .prepare(
            "SELECT id, credit_account_id, order_id, type, amount, notes, created_at
         FROM lw_credit_transactions
         WHERE credit_account_id = ?1
         ORDER BY created_at DESC LIMIT 100",
        )
        .map_err(|e| e.to_string())?;

    let transactions: Vec<Value> = stmt
        .query_map(params![credit_account_id], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "credit_account_id": row.get::<_, String>(1)?,
                "order_id": row.get::<_, Option<String>>(2)?,
                "type": row.get::<_, String>(3)?,
                "amount": row.get::<_, f64>(4)?,
                "notes": row.get::<_, Option<String>>(5)?,
                "created_at": row.get::<_, String>(6)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(json!({ "transactions": transactions, "count": transactions.len() }))
}

/// 记录赊账交易
#[tauri::command]
pub fn lw_create_credit_transaction(
    db: tauri::State<Mutex<Database>>,
    credit_account_id: String,
    transaction_type: String,
    amount: f64,
    order_id: Option<String>,
    notes: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO lw_credit_transactions (id, credit_account_id, order_id, type, amount, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            id,
            credit_account_id,
            order_id,
            transaction_type,
            amount,
            notes
        ],
    )
    .map_err(|e| e.to_string())?;

    // Update balance
    let delta = match transaction_type.as_str() {
        "debit" => amount,
        "credit" | "settlement" => -amount,
        _ => 0.0,
    };
    conn.execute(
        "UPDATE lw_credit_accounts SET current_balance = current_balance + ?1 WHERE id = ?2",
        params![delta, credit_account_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(json!({ "id": id, "message": "赊账交易已记录" }))
}

/// 获取批次列表
#[tauri::command]
pub fn lw_get_batches(
    db: tauri::State<Mutex<Database>>,
    product_id: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    seed_lw_demo_if_empty(&conn)?;

    let batches: Vec<Value>;
    if let Some(ref pid) = product_id {
        batches = {
            let mut stmt = conn
                .prepare(
                    "SELECT b.id, b.batch_no, b.product_id, p.name as product_name,
                        b.production_date, b.expiry_date, b.purchase_quantity, b.remain_quantity,
                        b.supplier_id, s.name as supplier_name, b.created_at
                 FROM lw_batches b
                 LEFT JOIN products p ON b.product_id = p.id
                 LEFT JOIN suppliers s ON b.supplier_id = s.id
                 WHERE b.product_id = ?1
                 ORDER BY b.created_at DESC",
                )
                .map_err(|e| e.to_string())?;
            let x = stmt
                .query_map(params![pid], |row| {
                    Ok(json!({
                        "id": row.get::<_, String>(0)?,
                        "batch_no": row.get::<_, String>(1)?,
                        "product_id": row.get::<_, String>(2)?,
                        "product_name": row.get::<_, Option<String>>(3)?,
                        "production_date": row.get::<_, Option<String>>(4)?,
                        "expiry_date": row.get::<_, Option<String>>(5)?,
                        "purchase_quantity": row.get::<_, i32>(6)?,
                        "remain_quantity": row.get::<_, i32>(7)?,
                        "supplier_id": row.get::<_, Option<String>>(8)?,
                        "supplier_name": row.get::<_, Option<String>>(9)?,
                        "created_at": row.get::<_, String>(10)?,
                    }))
                })
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();
            x
        };
    } else {
        batches = {
            let mut stmt = conn
                .prepare(
                    "SELECT b.id, b.batch_no, b.product_id, p.name as product_name,
                        b.production_date, b.expiry_date, b.purchase_quantity, b.remain_quantity,
                        b.supplier_id, s.name as supplier_name, b.created_at
                 FROM lw_batches b
                 LEFT JOIN products p ON b.product_id = p.id
                 LEFT JOIN suppliers s ON b.supplier_id = s.id
                 ORDER BY b.created_at DESC LIMIT 100",
                )
                .map_err(|e| e.to_string())?;
            let x = stmt
                .query_map([], |row| {
                    Ok(json!({
                        "id": row.get::<_, String>(0)?,
                        "batch_no": row.get::<_, String>(1)?,
                        "product_id": row.get::<_, String>(2)?,
                        "product_name": row.get::<_, Option<String>>(3)?,
                        "production_date": row.get::<_, Option<String>>(4)?,
                        "expiry_date": row.get::<_, Option<String>>(5)?,
                        "purchase_quantity": row.get::<_, i32>(6)?,
                        "remain_quantity": row.get::<_, i32>(7)?,
                        "supplier_id": row.get::<_, Option<String>>(8)?,
                        "supplier_name": row.get::<_, Option<String>>(9)?,
                        "created_at": row.get::<_, String>(10)?,
                    }))
                })
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();
            x
        };
    }

    Ok(json!({ "batches": batches, "count": batches.len() }))
}

/// 创建批次
#[tauri::command]
pub fn lw_create_batch(
    db: tauri::State<Mutex<Database>>,
    batch_no: String,
    product_id: String,
    production_date: Option<String>,
    expiry_date: Option<String>,
    purchase_quantity: i32,
    supplier_id: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO lw_batches (id, batch_no, product_id, production_date, expiry_date, purchase_quantity, remain_quantity, supplier_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?7)",
        params![id, batch_no, product_id, production_date, expiry_date, purchase_quantity, supplier_id],
    ).map_err(|e| e.to_string())?;

    Ok(json!({ "id": id, "batch_no": batch_no, "message": "批次已创建" }))
}

/// 获取多级定价
#[tauri::command]
pub fn lw_get_price_tiers(
    db: tauri::State<Mutex<Database>>,
    product_id: String,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn
        .prepare(
            "SELECT id, product_id, tier_name, price, min_quantity, created_at
         FROM lw_price_tiers WHERE product_id = ?1 ORDER BY min_quantity ASC",
        )
        .map_err(|e| e.to_string())?;

    let tiers: Vec<Value> = stmt
        .query_map(params![product_id], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "product_id": row.get::<_, String>(1)?,
                "tier_name": row.get::<_, String>(2)?,
                "price": row.get::<_, f64>(3)?,
                "min_quantity": row.get::<_, i32>(4)?,
                "created_at": row.get::<_, String>(5)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(json!({ "tiers": tiers, "count": tiers.len() }))
}

/// 设置多级定价
#[tauri::command]
pub fn lw_set_price_tier(
    db: tauri::State<Mutex<Database>>,
    product_id: String,
    tier_name: String,
    price: f64,
    min_quantity: Option<i32>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    let min_qty = min_quantity.unwrap_or(1);

    conn.execute(
        "INSERT INTO lw_price_tiers (id, product_id, tier_name, price, min_quantity)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, product_id, tier_name, price, min_qty],
    )
    .map_err(|e| e.to_string())?;

    Ok(json!({ "id": id, "message": "价格层级已设置" }))
}

fn seed_lw_demo_if_empty(conn: &rusqlite::Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM lw_credit_accounts", [], |row| row.get(0))
        .unwrap_or(0);
    if count > 0 {
        return Ok(());
    }
    let now = chrono::Utc::now().to_rfc3339();
    let customers = [
        ("lw_c1", "华联超市", "张经理"),
        ("lw_c2", "金樽酒楼", "李总"),
        ("lw_c3", "便民小卖部", "王老板"),
    ];
    for (id, name, contact) in customers {
        conn.execute(
            "INSERT OR IGNORE INTO customers (id, name, contact_person, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, 1, ?4, ?4)",
            params![id, name, contact, now],
        )
        .ok();
    }
    let accounts = [
        ("lca1", "lw_c1", 50000.0, 12500.0),
        ("lca2", "lw_c2", 80000.0, 34200.0),
        ("lca3", "lw_c3", 10000.0, 2800.0),
    ];
    for (id, cust, limit, balance) in accounts {
        conn.execute(
            "INSERT OR IGNORE INTO lw_credit_accounts (id, customer_id, credit_limit, current_balance, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, cust, limit, balance, now],
        )
        .map_err(|e| e.to_string())?;
    }
    let batches = [
        ("lb1", "B2026-001", "prod_demo_1", "2026-01-10", "2028-01-10", 500, 320),
        ("lb2", "B2026-002", "prod_demo_2", "2026-03-01", "2027-03-01", 200, 180),
    ];
    for (id, batch_no, product_id, prod_date, exp_date, purchase, remain) in batches {
        conn.execute(
            "INSERT OR IGNORE INTO lw_batches (id, batch_no, product_id, production_date, expiry_date, purchase_quantity, remain_quantity, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![id, batch_no, product_id, prod_date, exp_date, purchase, remain, now],
        )
        .ok();
    }
    Ok(())
}
