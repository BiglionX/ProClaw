use crate::database::Database;
use std::sync::Mutex;

/// 获取销售趋势数据 (按天/周/月)
#[tauri::command]
pub fn get_sales_trend(
    db: tauri::State<Mutex<Database>>,
    period: Option<String>, // "day", "week", "month"
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let period = period.unwrap_or_else(|| "day".to_string());

    // 根据周期选择 SQL 查询
    let (date_format, days_back) = match period.as_str() {
        "week" => ("%Y-W%W", 90),  // 最近 90 天 (约 13 周)
        "month" => ("%Y-%m", 365), // 最近 365 天 (12 个月)
        _ => ("%Y-%m-%d", 30),     // 默认最近 30 天
    };

    let sql = format!(
        "SELECT
            strftime('{}', created_at) as date,
            COUNT(*) as transaction_count,
            SUM(CASE WHEN transaction_type = 'outbound' THEN quantity ELSE 0 END) as outbound_qty,
            SUM(CASE WHEN transaction_type = 'inbound' THEN quantity ELSE 0 END) as inbound_qty
         FROM inventory_transactions
         WHERE created_at >= datetime('now', '-{} days')
         GROUP BY date
         ORDER BY date ASC",
        date_format, days_back
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let trend_data: Vec<serde_json::Value> = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "date": row.get::<_, String>(0)?,
                "transaction_count": row.get::<_, i32>(1)?,
                "outbound_qty": row.get::<_, i32>(2)?,
                "inbound_qty": row.get::<_, i32>(3)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(serde_json::json!({
        "period": period,
        "data": trend_data
    }))
}

/// 获取产品分析数据 (畅销/滞销产品)
#[tauri::command]
pub fn get_product_analytics(
    db: tauri::State<Mutex<Database>>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 畅销产品 (出库最多的前 10 个)
    let mut best_selling_stmt = conn
        .prepare(
            "SELECT p.id, p.name, p.sku, SUM(it.quantity) as total_sold
         FROM inventory_transactions it
         JOIN products p ON it.product_id = p.id
         WHERE it.transaction_type = 'outbound'
         GROUP BY p.id, p.name, p.sku
         ORDER BY total_sold DESC
         LIMIT 10",
        )
        .map_err(|e| e.to_string())?;

    let best_selling: Vec<serde_json::Value> = best_selling_stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "sku": row.get::<_, String>(2)?,
                "total_sold": row.get::<_, i32>(3)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // 滞销产品 (有库存但无出库记录的产品)
    let mut slow_moving_stmt = conn
        .prepare(
            "SELECT p.id, p.name, p.sku, p.current_stock, p.cost_price
         FROM products p
         WHERE p.deleted_at IS NULL
           AND p.current_stock > 0
           AND p.id NOT IN (
               SELECT DISTINCT product_id
               FROM inventory_transactions
               WHERE transaction_type = 'outbound'
           )
         ORDER BY p.current_stock * p.cost_price DESC
         LIMIT 10",
        )
        .map_err(|e| e.to_string())?;

    let slow_moving: Vec<serde_json::Value> = slow_moving_stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "sku": row.get::<_, String>(2)?,
                "current_stock": row.get::<_, i32>(3)?,
                "stock_value": row.get::<_, f64>(3)? * row.get::<_, f64>(4)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // 库存周转率 (按类别)
    let mut turnover_stmt = conn
        .prepare(
            "SELECT
            pc.name as category_name,
            COUNT(DISTINCT p.id) as product_count,
            COALESCE(SUM(p.current_stock), 0) as total_stock,
            COALESCE(SUM(
                (SELECT SUM(it2.quantity)
                 FROM inventory_transactions it2
                 WHERE it2.product_id = p.id AND it2.transaction_type = 'outbound')
            ), 0) as total_sold
         FROM products p
         LEFT JOIN product_categories pc ON p.category_id = pc.id
         WHERE p.deleted_at IS NULL
         GROUP BY pc.name
         ORDER BY total_sold DESC",
        )
        .map_err(|e| e.to_string())?;

    let turnover_by_category: Vec<serde_json::Value> = turnover_stmt
        .query_map([], |row| {
            let stock: i32 = row.get(2)?;
            let sold: i32 = row.get(3)?;
            let turnover_rate = if stock > 0 {
                (sold as f64) / (stock as f64)
            } else {
                0.0
            };

            Ok(serde_json::json!({
                "category": row.get::<_, Option<String>>(0)?.unwrap_or_else(|| "未分类".to_string()),
                "product_count": row.get::<_, i32>(1)?,
                "total_stock": stock,
                "total_sold": sold,
                "turnover_rate": format!("{:.2}", turnover_rate),
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(serde_json::json!({
        "best_selling": best_selling,
        "slow_moving": slow_moving,
        "turnover_by_category": turnover_by_category
    }))
}

/// 获取利润表数据
#[tauri::command]
pub fn get_profit_loss_report(
    db: tauri::State<Mutex<Database>>,
    start_date: String,
    end_date: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    crate::finance_ledger::profit_loss_report(db.connection(), &start_date, &end_date)
}

/// 获取现金流量表数据
#[tauri::command]
pub fn get_cash_flow_report(
    db: tauri::State<Mutex<Database>>,
    start_date: String,
    end_date: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    crate::finance_ledger::cash_flow_report(db.connection(), &start_date, &end_date)
}

/// 报表行明细。line: revenue | cogs | operating_expense | cash_in | cash_out
#[tauri::command]
pub fn get_report_lines(
    db: tauri::State<Mutex<Database>>,
    start_date: String,
    end_date: String,
    line: String,
) -> Result<Vec<serde_json::Value>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    crate::finance_ledger::report_lines(db.connection(), &start_date, &end_date, &line)
}

/// 获取财务概览
#[tauri::command]
pub fn get_financial_summary(
    db: tauri::State<Mutex<Database>>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    crate::finance_ledger::financial_summary(db.connection())
}
