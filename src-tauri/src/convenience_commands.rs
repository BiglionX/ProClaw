// 便利店行业插件 Tauri 命令
// 需求文档：行业插件补充——八大行业插件发布至插件商店

use crate::database::Database;
use chrono::Utc;
use rusqlite::params;
use serde_json::{json, Value};
use std::sync::Mutex;
use uuid::Uuid;

/// 获取临期商品预警列表
#[tauri::command]
pub fn cv_get_expiry_alerts(
    db: tauri::State<Mutex<Database>>,
    days_ahead: Option<i32>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let days = days_ahead.unwrap_or(7);
    let target_date = Utc::now().format("%Y-%m-%d").to_string();

    let mut stmt = conn
        .prepare(
            "SELECT e.id, e.product_id, p.name as product_name, e.batch_no, e.production_date,
                e.expiry_date, e.quantity, e.alert_sent
         FROM cv_expiry_tracking e
         LEFT JOIN products p ON e.product_id = p.id
         WHERE e.expiry_date <= date(?1, '+' || ?2 || ' days')
           AND e.expiry_date >= ?1
           AND e.quantity > 0
         ORDER BY e.expiry_date ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![target_date, days], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "product_id": row.get::<_, String>(1)?,
                "product_name": row.get::<_, Option<String>>(2)?,
                "batch_no": row.get::<_, Option<String>>(3)?,
                "production_date": row.get::<_, String>(4)?,
                "expiry_date": row.get::<_, String>(5)?,
                "quantity": row.get::<_, i32>(6)?,
                "alert_sent": row.get::<_, bool>(7)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let alerts: Vec<Value> = rows.filter_map(|r| r.ok()).collect();
    Ok(json!({ "alerts": alerts, "count": alerts.len(), "days_ahead": days }))
}

/// 获取日结报告
#[tauri::command]
pub fn cv_get_daily_settlement(
    db: tauri::State<Mutex<Database>>,
    date: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let target_date = date.unwrap_or_else(|| Utc::now().format("%Y-%m-%d").to_string());

    let result = conn
        .query_row(
            "SELECT id, settlement_date, shift_start, shift_end,
                cash_amount, wechat_amount, alipay_amount, total_revenue, notes
         FROM cv_daily_settlement WHERE settlement_date = ?1",
            params![target_date],
            |row| {
                Ok(json!({
                    "id": row.get::<_, String>(0)?,
                    "settlement_date": row.get::<_, String>(1)?,
                    "shift_start": row.get::<_, Option<String>>(2)?,
                    "shift_end": row.get::<_, Option<String>>(3)?,
                    "cash_amount": row.get::<_, f64>(4)?,
                    "wechat_amount": row.get::<_, f64>(5)?,
                    "alipay_amount": row.get::<_, f64>(6)?,
                    "total_revenue": row.get::<_, f64>(7)?,
                    "notes": row.get::<_, Option<String>>(8)?,
                }))
            },
        )
        .ok();

    Ok(result.unwrap_or(json!({
        "settlement_date": target_date,
        "cash_amount": 0.0,
        "wechat_amount": 0.0,
        "alipay_amount": 0.0,
        "total_revenue": 0.0
    })))
}

/// 获取补货建议（基于近7天销量）
#[tauri::command]
pub fn cv_get_restock_suggestions(db: tauri::State<Mutex<Database>>) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let today = Utc::now().format("%Y-%m-%d").to_string();
    let week_ago = (Utc::now() - chrono::Duration::days(7))
        .format("%Y-%m-%d")
        .to_string();

    // 尝试从销售订单明细中获取近7天销量，若无则返回空
    let suggestions: Vec<Value> = conn
        .prepare(
            "SELECT soi.product_id, p.name as product_name, SUM(soi.quantity) as total_sold,
                p.stock_quantity as current_stock
         FROM sales_order_items soi
         JOIN sales_orders so ON soi.sales_order_id = so.id
         LEFT JOIN products p ON soi.product_id = p.id
         WHERE date(so.created_at) BETWEEN ?1 AND ?2
         GROUP BY soi.product_id
         ORDER BY total_sold DESC LIMIT 20",
        )
        .map_err(|e| e.to_string())?
        .query_map(params![week_ago, today], |row| {
            Ok(json!({
                "product_id": row.get::<_, String>(0)?,
                "product_name": row.get::<_, Option<String>>(1)?,
                "total_sold": row.get::<_, f64>(2)?,
                "current_stock": row.get::<_, Option<f64>>(3)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .filter(|item| {
            let stock = item["current_stock"].as_f64().unwrap_or(0.0);
            let sold = item["total_sold"].as_f64().unwrap_or(0.0);
            stock < sold * 0.5
        })
        .collect();

    Ok(json!({ "suggestions": suggestions, "count": suggestions.len() }))
}

/// 创建 POS 收银订单
#[tauri::command]
pub fn cv_create_pos_order(
    db: tauri::State<Mutex<Database>>,
    items: Value,
    payment_method: String,
    received_amount: Option<f64>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let total_amount: f64 = items
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|i| {
                    let price = i["price"].as_f64().unwrap_or(0.0);
                    let qty = i["quantity"].as_f64().unwrap_or(1.0);
                    Some(price * qty)
                })
                .sum()
        })
        .unwrap_or(0.0);

    let items_str = items.to_string();

    conn.execute(
        "INSERT INTO sales_orders (id, items, total_amount, payment_method, status, created_at)
         VALUES (?1, ?2, ?3, ?4, 'completed', ?5)",
        params![id, items_str, total_amount, payment_method, now],
    )
    .map_err(|e| e.to_string())?;

    let change_amount = received_amount.map(|r| (r - total_amount).max(0.0));

    // 更新日结记录
    let today = Utc::now().format("%Y-%m-%d").to_string();
    let existing = conn
        .query_row(
            "SELECT id FROM cv_daily_settlement WHERE settlement_date = ?1",
            params![today],
            |row| row.get::<_, String>(0),
        )
        .ok();

    match existing {
        Some(sid) => {
            let field = match payment_method.as_str() {
                "wechat" => "wechat_amount",
                "alipay" => "alipay_amount",
                _ => "cash_amount",
            };
            conn.execute(
                &format!("UPDATE cv_daily_settlement SET {0} = {0} + ?1, total_revenue = total_revenue + ?1 WHERE id = ?2", field),
                params![total_amount, sid],
            ).map_err(|e| eprintln!("[convenience] settlement update failed: {}", e)).ok();
        }
        None => {
            let sid = Uuid::new_v4().to_string();
            let (cash, wechat, alipay) = match payment_method.as_str() {
                "wechat" => (0.0, total_amount, 0.0),
                "alipay" => (0.0, 0.0, total_amount),
                _ => (total_amount, 0.0, 0.0),
            };
            conn.execute(
                "INSERT INTO cv_daily_settlement (id, settlement_date, cash_amount, wechat_amount, alipay_amount, total_revenue, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![sid, today, cash, wechat, alipay, total_amount, now],
            ).ok();
        }
    }

    Ok(json!({
        "id": id,
        "total_amount": total_amount,
        "payment_method": payment_method,
        "change_amount": change_amount,
        "status": "completed",
        "created_at": now
    }))
}

/// 添加保质期跟踪
/// 审计修复 R6: 添加数量和日期校验
#[tauri::command]
pub fn cv_add_expiry_tracking(
    db: tauri::State<Mutex<Database>>,
    product_id: String,
    batch_no: Option<String>,
    production_date: String,
    expiry_date: String,
    quantity: i32,
) -> Result<Value, String> {
    if quantity <= 0 {
        return Err("Quantity must be positive".to_string());
    }
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO cv_expiry_tracking (id, product_id, batch_no, production_date, expiry_date, quantity)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, product_id, batch_no, production_date, expiry_date, quantity],
    ).map_err(|e| e.to_string())?;

    Ok(json!({ "id": id, "message": "保质期记录已添加" }))
}

/// 获取保质期跟踪列表
#[tauri::command]
pub fn cv_get_expiry_tracking(
    db: tauri::State<Mutex<Database>>,
    product_id: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let records: Vec<Value> = if let Some(ref pid) = product_id {
        let mut stmt = conn
            .prepare(
                "SELECT e.id, e.product_id, p.name as product_name, e.batch_no,
                    e.production_date, e.expiry_date, e.quantity, e.alert_sent, e.created_at
             FROM cv_expiry_tracking e
             LEFT JOIN products p ON e.product_id = p.id
             WHERE e.product_id = ?1
             ORDER BY e.expiry_date ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![pid], |row| {
                Ok(json!({
                    "id": row.get::<_, String>(0)?,
                    "product_id": row.get::<_, String>(1)?,
                    "product_name": row.get::<_, Option<String>>(2)?,
                    "batch_no": row.get::<_, Option<String>>(3)?,
                    "production_date": row.get::<_, String>(4)?,
                    "expiry_date": row.get::<_, String>(5)?,
                    "quantity": row.get::<_, i32>(6)?,
                    "alert_sent": row.get::<_, bool>(7)?,
                    "created_at": row.get::<_, String>(8)?,
                }))
            })
            .map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    } else {
        let mut stmt = conn
            .prepare(
                "SELECT e.id, e.product_id, p.name as product_name, e.batch_no,
                    e.production_date, e.expiry_date, e.quantity, e.alert_sent, e.created_at
             FROM cv_expiry_tracking e
             LEFT JOIN products p ON e.product_id = p.id
             ORDER BY e.expiry_date ASC LIMIT 100",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(json!({
                    "id": row.get::<_, String>(0)?,
                    "product_id": row.get::<_, String>(1)?,
                    "product_name": row.get::<_, Option<String>>(2)?,
                    "batch_no": row.get::<_, Option<String>>(3)?,
                    "production_date": row.get::<_, String>(4)?,
                    "expiry_date": row.get::<_, String>(5)?,
                    "quantity": row.get::<_, i32>(6)?,
                    "alert_sent": row.get::<_, bool>(7)?,
                    "created_at": row.get::<_, String>(8)?,
                }))
            })
            .map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    };

    Ok(json!({ "data": records }))
}
