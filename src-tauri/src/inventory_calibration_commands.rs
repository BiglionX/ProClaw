use crate::database::Database;
use rusqlite::params;
use std::sync::Mutex;
use uuid::Uuid;

/// ==================== 库存校准（PRD v12.0 灵活库存） ====================
///
/// §3.3 微盘点：销售后/进货后/手动入口
/// §3.4 库存置信度计算：高/中/低
/// §3.6 负库存"老化"处理：强制清零 / 补录入库

/// 计算库存置信度（§3.4）
///
/// 规则：
///   - 7 天内有微盘点 → high
///   - 7 天内有进货但无微盘点 → medium
///   - 15 天以上无校准动作 → low
///   - 存在负库存且未冲销 → low
fn compute_confidence(conn: &rusqlite::Connection, sku_id: &str) -> Result<String, String> {
    // 1) 存在负库存 → low
    let current_stock: i32 = conn
        .query_row(
            "SELECT COALESCE(current_stock, 0) FROM products WHERE id = ?1",
            params![sku_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    if current_stock < 0 {
        return Ok("low".to_string());
    }

    // 2) 7 天内有微盘点 → high
    let has_recent_calibration: bool = conn
        .query_row(
            "SELECT EXISTS(
                SELECT 1 FROM inventory_calibrations
                WHERE sku_id = ?1
                  AND calibration_type IN ('micro', 'manual', 'writeoff')
                  AND created_at >= datetime('now', '-7 days')
            )",
            params![sku_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    if has_recent_calibration {
        return Ok("high".to_string());
    }

    // 3) 7 天内有进货但无微盘点 → medium
    let has_recent_inbound: bool = conn
        .query_row(
            "SELECT EXISTS(
                SELECT 1 FROM inventory_transactions
                WHERE product_id = ?1
                  AND transaction_type = 'inbound'
                  AND created_at >= datetime('now', '-7 days')
            )",
            params![sku_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    if has_recent_inbound {
        return Ok("medium".to_string());
    }

    // 4) 默认
    Ok("low".to_string())
}

/// 微盘点校准库存（手动或销售/进货后）
///
/// §3.3.3 手动入口：用户输入实际数量，立即覆盖账面库存
/// §3.3.1/§3.3.2 触发：销售后/进货后弹窗建议
#[tauri::command]
pub fn calibrate_stock(
    db: tauri::State<Mutex<Database>>,
    sku_id: String,
    actual_stock: i32,
    trigger_source: String, // 'manual' | 'after_sale' | 'after_purchase' | 'aging' | 'low_confidence' | 'top_sales_aging'
    reference_id: Option<String>,
    reference_type: Option<String>,
    notes: Option<String>,
    performed_by: Option<String>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 1) 读取当前账面库存
    let (book_stock, prev_confidence): (i32, String) = conn
        .query_row(
            "SELECT COALESCE(current_stock, 0), COALESCE(stock_confidence, 'low') FROM products WHERE id = ?1",
            params![sku_id],
            |row| Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?)),
        )
        .map_err(|_| format!("Product {} not found", sku_id))?;

    let delta = actual_stock - book_stock;

    // 2) 写入 inventory_calibrations
    let calib_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO inventory_calibrations
            (id, sku_id, calibration_type, book_stock, actual_stock, delta, trigger_source,
             reference_id, reference_type, confidence_before, performed_by, notes)
         VALUES (?1, ?2, 'manual', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            calib_id,
            sku_id,
            book_stock,
            actual_stock,
            delta,
            trigger_source,
            reference_id,
            reference_type,
            prev_confidence,
            performed_by,
            notes,
        ],
    )
    .map_err(|e| e.to_string())?;

    // 3) 更新产品库存 + 置信度（提升为 high）
    conn.execute(
        "UPDATE products
         SET current_stock = ?1,
             last_calibrated_at = CURRENT_TIMESTAMP,
             negative_since = NULL,
             stock_confidence = 'high'
         WHERE id = ?2",
        params![actual_stock, sku_id],
    )
    .map_err(|e| e.to_string())?;

    // 4) 记录库存交易流水（adjustment 类型）
    let txn_id = Uuid::new_v4().to_string();
    let abs_delta = delta.abs();
    let txn_type = if delta >= 0 { "inbound" } else { "outbound" };
    conn.execute(
        "INSERT INTO inventory_transactions
            (id, product_id, transaction_type, quantity, reference_no, reason, performed_by, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, 'calibration', ?6, ?7)",
        params![
            txn_id,
            sku_id,
            txn_type,
            abs_delta,
            calib_id,
            performed_by,
            format!("微盘点校准：账面 {} → 实际 {}（差 {}）", book_stock, actual_stock, delta),
        ],
    )
    .map_err(|e| e.to_string())?;

    // 5) 重新计算置信度
    let new_confidence = compute_confidence(&conn, &sku_id)?;

    Ok(serde_json::json!({
        "id": calib_id,
        "sku_id": sku_id,
        "book_stock": book_stock,
        "actual_stock": actual_stock,
        "delta": delta,
        "confidence_before": prev_confidence,
        "confidence_after": new_confidence,
        "message": "库存校准成功",
    }))
}

/// 获取库存置信度（§3.4）
#[tauri::command]
pub fn get_stock_confidence(
    db: tauri::State<Mutex<Database>>,
    sku_id: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let current_stock: i32 = conn
        .query_row(
            "SELECT COALESCE(current_stock, 0) FROM products WHERE id = ?1",
            params![sku_id],
            |row| row.get(0),
        )
        .map_err(|_| format!("Product {} not found", sku_id))?;

    let stored_confidence: String = conn
        .query_row(
            "SELECT COALESCE(stock_confidence, 'low') FROM products WHERE id = ?1",
            params![sku_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let computed = compute_confidence(&conn, &sku_id)?;

    let last_calibrated: Option<String> = conn
        .query_row(
            "SELECT last_calibrated_at FROM products WHERE id = ?1",
            params![sku_id],
            |row| row.get(0),
        )
        .ok();

    let negative_since: Option<String> = conn
        .query_row(
            "SELECT negative_since FROM products WHERE id = ?1",
            params![sku_id],
            |row| row.get(0),
        )
        .ok();

    Ok(serde_json::json!({
        "sku_id": sku_id,
        "current_stock": current_stock,
        "stored_confidence": stored_confidence,
        "computed_confidence": computed,
        "last_calibrated_at": last_calibrated,
        "negative_since": negative_since,
    }))
}

/// 批量获取库存置信度（用于商品列表/库存页面展示）
#[tauri::command]
pub fn get_stock_confidence_batch(
    db: tauri::State<Mutex<Database>>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn
        .prepare(
            "SELECT id, name, sku, current_stock, min_stock,
                    COALESCE(allow_negative_stock, 0),
                    COALESCE(stock_confidence, 'low'),
                    last_calibrated_at,
                    negative_since
             FROM products
             WHERE deleted_at IS NULL
             ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;

    let products: Vec<serde_json::Value> = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "sku": row.get::<_, Option<String>>(2)?,
                "current_stock": row.get::<_, i32>(3)?,
                "min_stock": row.get::<_, i32>(4)?,
                "allow_negative_stock": row.get::<_, i64>(5)? != 0,
                "stock_confidence": row.get::<_, String>(6)?,
                "last_calibrated_at": row.get::<_, Option<String>>(7)?,
                "negative_since": row.get::<_, Option<String>>(8)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(products)
}

/// 获取低置信度商品列表（用于库存页面预警）
/// 筛选条件：置信度 = low  或  current_stock < 0  或  距上次校准 > 15 天
#[tauri::command]
pub fn get_low_confidence_products_cmd(
    db: tauri::State<Mutex<Database>>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn
        .prepare(
            "SELECT id, name, sku, current_stock,
                    COALESCE(allow_negative_stock, 0),
                    COALESCE(stock_confidence, 'low'),
                    last_calibrated_at,
                    negative_since
             FROM products
             WHERE deleted_at IS NULL
               AND (
                 COALESCE(stock_confidence, 'low') = 'low'
                 OR current_stock < 0
                 OR (last_calibrated_at IS NULL)
                 OR (datetime(last_calibrated_at, '+15 days') <= datetime('now'))
               )
             ORDER BY
               CASE WHEN current_stock < 0 THEN 0 ELSE 1 END,
               last_calibrated_at ASC NULLS FIRST
             LIMIT 50",
        )
        .map_err(|e| e.to_string())?;

    let mut results: Vec<serde_json::Value> = Vec::new();
    let rows = stmt
        .query_map([], |row| {
            let product_id: String = row.get(0)?;
            let product_name: String = row.get(1)?;
            let spu_code: Option<String> = row.get(2)?;
            let current_stock: i32 = row.get(3)?;
            let allow_negative_stock: bool = row.get::<_, i64>(4)? != 0;
            let stock_confidence: String = row.get(5)?;
            let last_calibrated: Option<String> = row.get(6)?;
            let negative_since: Option<String> = row.get(7)?;

            // 计算距上次校准的天数
            let aging_days: i32 = if let Some(ref ts) = last_calibrated {
                conn.query_row(
                    "SELECT CAST(julianday('now') - julianday(?1) AS INTEGER)",
                    params![ts],
                    |r| r.get(0),
                )
                .unwrap_or(0)
            } else {
                999 // 从未校准
            };

            // 判断是否需要校准
            let should_calibrate = current_stock < 0
                || stock_confidence == "low"
                || aging_days > 15
                || aging_days == 999;

            // 置信度理由
            let reason = if current_stock < 0 {
                format!("库存为负（{} 件）", current_stock)
            } else if aging_days == 999 {
                "从未校准".to_string()
            } else if aging_days > 15 {
                format!("距上次校准 {} 天", aging_days)
            } else {
                "置信度低".to_string()
            };

            Ok(serde_json::json!({
                "product_id": product_id,
                "product_name": product_name,
                "spu_code": spu_code.unwrap_or_default(),
                "current_stock": current_stock,
                "allow_negative_stock": allow_negative_stock,
                "stock_confidence": stock_confidence,
                "last_calibrated_at": last_calibrated,
                "negative_since": negative_since,
                "aging_days": aging_days,
                "should_calibrate": should_calibrate,
                "reason": reason,
            }))
        })
        .map_err(|e| e.to_string())?;

    for row in rows {
        if let Ok(v) = row {
            results.push(v);
        }
    }
    Ok(results)
}

/// 获取校准历史
#[tauri::command]
pub fn get_calibration_history(
    db: tauri::State<Mutex<Database>>,
    sku_id: Option<String>,
    limit: Option<i32>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT ic.id, ic.sku_id, p.name as product_name, ic.calibration_type,
                ic.book_stock, ic.actual_stock, ic.delta, ic.trigger_source,
                ic.reference_id, ic.reference_type,
                ic.confidence_before, ic.confidence_after,
                ic.notes, ic.performed_by, ic.created_at
         FROM inventory_calibrations ic
         LEFT JOIN products p ON ic.sku_id = p.id
         WHERE 1=1",
    );

    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    if let Some(s) = sku_id {
        if !s.is_empty() {
            sql.push_str(" AND ic.sku_id = ?");
            params_vec.push(Box::new(s));
        }
    }

    let lim = limit.unwrap_or(50);
    sql.push_str(&format!(" ORDER BY ic.created_at DESC LIMIT {}", lim));

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "sku_id": row.get::<_, String>(1)?,
                "product_name": row.get::<_, Option<String>>(2)?,
                "calibration_type": row.get::<_, String>(3)?,
                "book_stock": row.get::<_, i32>(4)?,
                "actual_stock": row.get::<_, i32>(5)?,
                "delta": row.get::<_, i32>(6)?,
                "trigger_source": row.get::<_, String>(7)?,
                "reference_id": row.get::<_, Option<String>>(8)?,
                "reference_type": row.get::<_, Option<String>>(9)?,
                "confidence_before": row.get::<_, Option<String>>(10)?,
                "confidence_after": row.get::<_, Option<String>>(11)?,
                "notes": row.get::<_, Option<String>>(12)?,
                "performed_by": row.get::<_, Option<String>>(13)?,
                "created_at": row.get::<_, String>(14)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    Ok(rows.filter_map(|r| r.ok()).collect())
}

/// §3.6 强制清零负库存（writeoff）
#[tauri::command]
pub fn force_clear_negative(
    db: tauri::State<Mutex<Database>>,
    sku_id: String,
    notes: Option<String>,
    performed_by: Option<String>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let book_stock: i32 = conn
        .query_row(
            "SELECT COALESCE(current_stock, 0) FROM products WHERE id = ?1",
            params![sku_id],
            |row| row.get(0),
        )
        .map_err(|_| format!("Product {} not found", sku_id))?;

    if book_stock >= 0 {
        return Err("库存非负，无需清零".to_string());
    }

    let calib_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO inventory_calibrations
            (id, sku_id, calibration_type, book_stock, actual_stock, delta, trigger_source, notes, performed_by)
         VALUES (?1, ?2, 'writeoff', ?3, 0, ?4, 'aging', ?5, ?6)",
        params![calib_id, sku_id, book_stock, -book_stock, notes, performed_by],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE products
         SET current_stock = 0,
             negative_since = NULL,
             last_calibrated_at = CURRENT_TIMESTAMP,
             stock_confidence = 'high'
         WHERE id = ?1",
        params![sku_id],
    )
    .map_err(|e| e.to_string())?;

    // 标记 inventory_aging_tasks 解决
    conn.execute(
        "UPDATE inventory_aging_tasks
         SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, resolution = 'writeoff', resolution_qty = ?1
         WHERE sku_id = ?2 AND status = 'pending' AND task_type = 'negative_aging'",
        params![-book_stock, sku_id],
    )
    .map_err(|e| e.to_string())?;

    // 写入库存交易流水
    let txn_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO inventory_transactions
            (id, product_id, transaction_type, quantity, reference_no, reason, performed_by, notes)
         VALUES (?1, ?2, 'inbound', ?3, ?4, 'writeoff', ?5, ?6)",
        params![
            txn_id,
            sku_id,
            -book_stock,
            calib_id,
            performed_by,
            format!("强制清零负库存：{} → 0", book_stock),
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": calib_id,
        "sku_id": sku_id,
        "book_stock": book_stock,
        "new_stock": 0,
        "message": "负库存已强制清零",
    }))
}

/// §3.6 补录入库（supplement）
#[tauri::command]
#[allow(unused_variables)] // performed_by 保留用于未来权限审计
pub fn supplement_inbound(
    db: tauri::State<Mutex<Database>>,
    sku_id: String,
    supplement_qty: i32,
    notes: Option<String>,
    performed_by: Option<String>,
) -> Result<serde_json::Value, String> {
    if supplement_qty <= 0 {
        return Err("补录数量必须为正数".to_string());
    }

    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let pre_stock: i32 = conn
        .query_row(
            "SELECT COALESCE(current_stock, 0) FROM products WHERE id = ?1",
            params![sku_id],
            |row| row.get(0),
        )
        .map_err(|_| format!("Product {} not found", sku_id))?;

    let calib_id = Uuid::new_v4().to_string();
    let new_stock = pre_stock + supplement_qty;

    conn.execute(
        "INSERT INTO inventory_calibrations
            (id, sku_id, calibration_type, book_stock, actual_stock, delta, trigger_source, notes, performed_by)
         VALUES (?1, ?2, 'manual', ?3, ?4, ?5, 'aging', ?6, ?7)",
        params![
            calib_id,
            sku_id,
            pre_stock,
            new_stock,
            supplement_qty,
            format!("补录入库 {} 件：处理负库存老化", supplement_qty),
            performed_by,
        ],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE products
         SET current_stock = current_stock + ?1,
             last_calibrated_at = CURRENT_TIMESTAMP,
             negative_since = NULL,
             stock_confidence = 'high'
         WHERE id = ?2",
        params![supplement_qty, sku_id],
    )
    .map_err(|e| e.to_string())?;

    // 标记 inventory_aging_tasks 解决
    conn.execute(
        "UPDATE inventory_aging_tasks
         SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, resolution = 'supplement', resolution_qty = ?1
         WHERE sku_id = ?2 AND status = 'pending' AND task_type = 'negative_aging'",
        params![supplement_qty, sku_id],
    )
    .map_err(|e| e.to_string())?;

    let txn_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO inventory_transactions
            (id, product_id, transaction_type, quantity, reference_no, reason, performed_by, notes)
         VALUES (?1, ?2, 'inbound', ?3, ?4, 'supplement', ?5, ?6)",
        params![
            txn_id,
            sku_id,
            supplement_qty,
            calib_id,
            performed_by,
            format!("补录入库 {} 件：处理负库存老化（{} → {}）", supplement_qty, pre_stock, new_stock),
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": calib_id,
        "sku_id": sku_id,
        "pre_stock": pre_stock,
        "supplement_qty": supplement_qty,
        "new_stock": new_stock,
        "message": format!("补录入库成功：{} + {} = {}", pre_stock, supplement_qty, new_stock),
    }))
}

/// 切换商品 allow_negative_stock 开关
#[tauri::command]
pub fn set_allow_negative_stock(
    db: tauri::State<Mutex<Database>>,
    sku_id: String,
    allow: bool,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    conn.execute(
        "UPDATE products SET allow_negative_stock = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![allow as i32, sku_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "sku_id": sku_id,
        "allow_negative_stock": allow,
        "message": if allow { "已开启允许负库存销售" } else { "已关闭允许负库存销售" },
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;

    fn setup_test_db() -> Database {
        let db = Database::new_in_memory().unwrap();
        let conn = db.connection();

        // 最小测试 schema
        conn.execute_batch(
            "CREATE TABLE products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                sku TEXT,
                current_stock INTEGER DEFAULT 0,
                min_stock INTEGER DEFAULT 0,
                deleted_at TIMESTAMP,
                allow_negative_stock INTEGER DEFAULT 0,
                stock_confidence TEXT DEFAULT 'low',
                last_calibrated_at TIMESTAMP,
                negative_since TIMESTAMP
            );
            CREATE TABLE inventory_calibrations (
                id TEXT PRIMARY KEY,
                sku_id TEXT NOT NULL,
                calibration_type TEXT NOT NULL,
                book_stock INTEGER NOT NULL,
                actual_stock INTEGER NOT NULL,
                delta INTEGER NOT NULL,
                trigger_source TEXT NOT NULL,
                reference_id TEXT,
                reference_type TEXT,
                confidence_before TEXT,
                confidence_after TEXT,
                notes TEXT,
                performed_by TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE inventory_transactions (
                id TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                transaction_type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                reference_no TEXT,
                reason TEXT,
                performed_by TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE inventory_aging_tasks (
                id TEXT PRIMARY KEY,
                sku_id TEXT NOT NULL,
                task_type TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                resolution TEXT,
                resolution_qty INTEGER
            );",
        )
        .unwrap();

        db
    }

    #[test]
    fn test_compute_confidence_negative_stock_is_low() {
        let db = setup_test_db();
        let conn = db.connection();
        conn.execute(
            "INSERT INTO products (id, name, current_stock) VALUES ('p1', 'Test', -3)",
            [],
        )
        .unwrap();
        let c = compute_confidence(&conn, "p1").unwrap();
        assert_eq!(c, "low");
    }

    #[test]
    fn test_compute_confidence_no_data_is_low() {
        let db = setup_test_db();
        let conn = db.connection();
        conn.execute(
            "INSERT INTO products (id, name, current_stock) VALUES ('p1', 'Test', 10)",
            [],
        )
        .unwrap();
        let c = compute_confidence(&conn, "p1").unwrap();
        assert_eq!(c, "low");
    }

    #[test]
    fn test_compute_confidence_recent_calibration_is_high() {
        let db = setup_test_db();
        let conn = db.connection();
        conn.execute(
            "INSERT INTO products (id, name, current_stock) VALUES ('p1', 'Test', 10)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO inventory_calibrations (id, sku_id, calibration_type, book_stock, actual_stock, delta, trigger_source, created_at)
             VALUES ('c1', 'p1', 'manual', 10, 10, 0, 'manual', datetime('now', '-1 day'))",
            [],
        )
        .unwrap();
        let c = compute_confidence(&conn, "p1").unwrap();
        assert_eq!(c, "high");
    }
}
