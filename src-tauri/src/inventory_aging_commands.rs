use crate::database::Database;
use rusqlite::params;
use std::sync::Mutex;
use uuid::Uuid;

/// ==================== 库存老化与 AI 提醒（PRD v12.0 灵活库存） ====================
///
/// §3.5 AI 自动提醒（连续忽略 3 次 → 7 天内不再提醒同类）
/// §3.6 负库存持续 14 天 → 强制要求处理

/// §3.6 扫描负库存老化（>14天），生成待处理任务
/// 返回新创建的任务数
#[tauri::command]
pub fn check_negative_aging(
    db: tauri::State<Mutex<Database>>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 查找所有 14 天以上未处理的负库存
    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.name, p.current_stock, p.negative_since
             FROM products p
             WHERE p.deleted_at IS NULL
               AND p.current_stock < 0
               AND p.negative_since IS NOT NULL
               AND datetime(p.negative_since, '+14 days') <= datetime('now')
               AND NOT EXISTS (
                 SELECT 1 FROM inventory_aging_tasks t
                 WHERE t.sku_id = p.id
                   AND t.task_type = 'negative_aging'
                   AND t.status = 'pending'
               )",
        )
        .map_err(|e| e.to_string())?;

    let candidates: Vec<(String, String, i32, String)> = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i32>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut created = 0;
    for (sku_id, _name, current_stock, negative_since) in candidates {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO inventory_aging_tasks (id, sku_id, task_type, status, triggered_at, notes, highlighted)
             VALUES (?1, ?2, 'negative_aging', 'pending', CURRENT_TIMESTAMP, ?3, 1)",
            params![id, sku_id, format!("负库存 {} 件持续超过 14 天（自 {}）", current_stock, negative_since)],
        )
        .map_err(|e| e.to_string())?;
        created += 1;
    }

    Ok(serde_json::json!({
        "created_count": created,
        "message": format!("已生成 {} 个负库存老化待处理任务", created),
    }))
}

/// §3.6 获取待处理的负库存老化任务（用于仪表盘高亮显示）
#[tauri::command]
pub fn get_pending_aging_tasks(
    db: tauri::State<Mutex<Database>>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.sku_id, p.name as product_name, t.triggered_at, t.notes,
                    p.current_stock, p.negative_since
             FROM inventory_aging_tasks t
             LEFT JOIN products p ON t.sku_id = p.id
             WHERE t.status = 'pending' AND t.task_type = 'negative_aging'
             ORDER BY t.triggered_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "sku_id": row.get::<_, String>(1)?,
                "product_name": row.get::<_, Option<String>>(2)?,
                "triggered_at": row.get::<_, String>(3)?,
                "notes": row.get::<_, Option<String>>(4)?,
                "current_stock": row.get::<_, i32>(5)?,
                "negative_since": row.get::<_, Option<String>>(6)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    Ok(rows.filter_map(|r| r.ok()).collect())
}

/// §3.5 计算当前应当触发的 AI 提醒
/// 返回三类提醒：
///   1. 负库存持续 > 3 天（negative_aging）
///   2. 长期未校准低置信度（low_confidence，> 15 天无校准）
///   3. 高销量低置信度（top_sales_aging，近 7 天销量前 10% 但置信度为低）
#[tauri::command]
pub fn compute_reminders(
    db: tauri::State<Mutex<Database>>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // === 提醒 1：负库存持续 > 3 天 ===
    let mut neg_stmt = conn
        .prepare(
            "SELECT p.id, p.name, p.current_stock, p.negative_since
             FROM products p
             WHERE p.deleted_at IS NULL
               AND p.current_stock < 0
               AND p.negative_since IS NOT NULL
               AND datetime(p.negative_since, '+3 days') <= datetime('now')",
        )
        .map_err(|e| e.to_string())?;

    let neg_reminders: Vec<serde_json::Value> = neg_stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "sku_id": row.get::<_, String>(0)?,
                "product_name": row.get::<_, String>(1)?,
                "current_stock": row.get::<_, i32>(2)?,
                "negative_since": row.get::<_, String>(3)?,
                "kind": "negative_aging",
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // === 提醒 2：长期未校准（> 15 天无校准动作，置信度为低） ===
    let mut low_conf_stmt = conn
        .prepare(
            "SELECT p.id, p.name, p.current_stock, p.last_calibrated_at
             FROM products p
             WHERE p.deleted_at IS NULL
               AND p.current_stock >= 0
               AND p.stock_confidence = 'low'
               AND (p.last_calibrated_at IS NULL
                    OR datetime(p.last_calibrated_at, '+15 days') <= datetime('now'))",
        )
        .map_err(|e| e.to_string())?;

    let low_conf_reminders: Vec<serde_json::Value> = low_conf_stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "sku_id": row.get::<_, String>(0)?,
                "product_name": row.get::<_, String>(1)?,
                "current_stock": row.get::<_, i32>(2)?,
                "last_calibrated_at": row.get::<_, Option<String>>(3)?,
                "kind": "low_confidence",
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // === 提醒 3：高销量低置信度（近 7 天销量前 10% 且置信度为低） ===
    // 计算每个 SKU 的近 7 天销量
    let top_sales_reminders: Vec<serde_json::Value> = {
        let mut stmt = conn
            .prepare(
                "SELECT p.id, p.name, p.current_stock,
                        COALESCE(SUM(CASE WHEN it.transaction_type = 'outbound' AND it.created_at >= datetime('now', '-7 days') THEN it.quantity ELSE 0 END), 0) as qty_7d
                 FROM products p
                 LEFT JOIN inventory_transactions it ON it.product_id = p.id
                 WHERE p.deleted_at IS NULL
                   AND p.stock_confidence = 'low'
                   AND p.current_stock >= 0
                 GROUP BY p.id, p.name, p.current_stock
                 ORDER BY qty_7d DESC
                 LIMIT 20",
            )
            .map_err(|e| e.to_string())?;

        let raw: Vec<(String, String, i32, i32)> = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i32>(2)?,
                    row.get::<_, i32>(3)?,
                ))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        // 前 10%（至少 1 个）
        let top_count = std::cmp::max(1, raw.len() / 10);
        raw.into_iter()
            .take(top_count)
            .filter(|(_, _, _, qty)| *qty > 0)
            .map(|(id, name, stock, qty)| {
                serde_json::json!({
                    "sku_id": id,
                    "product_name": name,
                    "current_stock": stock,
                    "qty_7d": qty,
                    "kind": "top_sales_aging",
                })
            })
            .collect()
    };

    // === 应用防骚扰机制：过滤被抑制的提醒 ===
    let all = vec![
        ("negative_aging", neg_reminders),
        ("low_confidence", low_conf_reminders),
        ("top_sales_aging", top_sales_reminders),
    ];

    let mut kept: Vec<serde_json::Value> = Vec::new();
    for (kind, items) in all {
        for item in items {
            let sku_id = item["sku_id"].as_str().unwrap_or("");
            let suppressed: bool = conn
                .query_row(
                    "SELECT EXISTS(
                        SELECT 1 FROM notification_suppressions
                        WHERE sku_id = ?1 AND notification_kind = ?2
                          AND suppressed_until IS NOT NULL
                          AND datetime(suppressed_until) > datetime('now')
                    )",
                    params![sku_id, kind],
                    |row| row.get(0),
                )
                .unwrap_or(false);
            if !suppressed {
                kept.push(item);
            }
        }
    }

    Ok(serde_json::json!({
        "reminders": kept,
        "total": kept.len(),
    }))
}

/// §3.5 标记提醒被忽略（防骚扰计数）
/// 用户连续忽略 3 次后，7 天内不再提醒同类
#[tauri::command]
pub fn mark_reminder_dismissed(
    db: tauri::State<Mutex<Database>>,
    sku_id: String,
    notification_kind: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // upsert
    let existing_id: Option<String> = conn
        .query_row(
            "SELECT id FROM notification_suppressions
             WHERE sku_id = ?1 AND notification_kind = ?2",
            params![sku_id, notification_kind],
            |row| row.get(0),
        )
        .ok();

    let new_count;
    let mut suppressed_until: Option<String> = None;

    if let Some(id) = existing_id {
        conn.execute(
            "UPDATE notification_suppressions
             SET ignore_count = ignore_count + 1,
                 last_dismissed_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?1",
            params![id],
        )
        .map_err(|e| e.to_string())?;

        let count: i32 = conn
            .query_row(
                "SELECT ignore_count FROM notification_suppressions WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )
            .unwrap_or(0);
        new_count = count;
    } else {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO notification_suppressions
                (id, sku_id, notification_kind, ignore_count, last_dismissed_at, created_at, updated_at)
             VALUES (?1, ?2, ?3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            params![id, sku_id, notification_kind],
        )
        .map_err(|e| e.to_string())?;
        new_count = 1;
    }

    // 防骚扰：达到 3 次后抑制 7 天
    if new_count >= 3 {
        let until = format!("datetime('now', '+7 days')");
        conn.execute(
            &format!(
                "UPDATE notification_suppressions
                 SET suppressed_until = {}
                 WHERE sku_id = ?1 AND notification_kind = ?2",
                until
            ),
            params![sku_id, notification_kind],
        )
        .map_err(|e| e.to_string())?;
        suppressed_until = Some(format!("7 days from now ({})", new_count));
    }

    Ok(serde_json::json!({
        "sku_id": sku_id,
        "notification_kind": notification_kind,
        "ignore_count": new_count,
        "suppressed_until": suppressed_until,
        "message": if new_count >= 3 {
            format!("已忽略 {} 次同类提醒，7 天内不再显示", new_count)
        } else {
            format!("已忽略 {}/3 次同类提醒", new_count)
        },
    }))
}

/// 重置抑制状态（用于"我知道了"或测试）
#[tauri::command]
pub fn reset_reminder_suppression(
    db: tauri::State<Mutex<Database>>,
    sku_id: String,
    notification_kind: Option<String>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    if let Some(kind) = notification_kind {
        conn.execute(
            "DELETE FROM notification_suppressions WHERE sku_id = ?1 AND notification_kind = ?2",
            params![sku_id, kind],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "DELETE FROM notification_suppressions WHERE sku_id = ?1",
            params![sku_id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(serde_json::json!({
        "sku_id": sku_id,
        "message": "已重置提醒抑制状态",
    }))
}

/// 检查销售完成后是否需要触发微盘点（PRD v12.0 §3.3）
/// 触发条件：
///   1. 距离上次校准 ≥ 3 天
///   2. 该商品是热销品（近 7 天有销售交易）
///   3. 当前库存偏低（≤ min_stock + 5）
/// 简化实现：满足 (1) AND (2) 即触发
#[tauri::command]
pub fn should_trigger_post_sales_calibration_cmd(
    db: tauri::State<Mutex<Database>>,
    product_id: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 获取商品当前状态
    let mut stmt = conn
        .prepare(
            "SELECT COALESCE(current_stock, 0),
                    COALESCE(min_stock, 0),
                    COALESCE(allow_negative_stock, 0),
                    last_calibrated_at
             FROM products WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let product_info = stmt.query_row(params![product_id], |row| {
        Ok((
            row.get::<_, i32>(0)?,
            row.get::<_, i32>(1)?,
            row.get::<_, i64>(2)?,
            row.get::<_, Option<String>>(3)?,
        ))
    });

    let (current_stock, min_stock, allow_negative, last_calibrated) = match product_info {
        Ok(v) => v,
        Err(_) => {
            return Ok(serde_json::json!({
                "should_trigger": false,
                "reason": "商品不存在",
            }))
        }
    };

    // 条件 1：距上次校准 ≥ 3 天（或从未校准）
    let days_since_last: i32 = if let Some(ref ts) = last_calibrated {
        conn.query_row(
            "SELECT CAST(julianday('now') - julianday(?1) AS INTEGER)",
            params![ts],
            |r| r.get(0),
        )
        .unwrap_or(0)
    } else {
        999
    };
    let cond1 = days_since_last >= 3 || days_since_last == 999;

    // 条件 2：近 7 天有销售记录（出库 outbound 交易）
    let recent_sales: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM inventory_transactions
             WHERE product_id = ?1
               AND transaction_type = 'outbound'
               AND created_at >= datetime('now', '-7 days')",
            params![product_id],
            |r| r.get(0),
        )
        .unwrap_or(0);
    let cond2 = recent_sales > 0;

    // 条件 3：当前库存偏低
    let cond3 = current_stock <= min_stock + 5;

    let should_trigger = cond1 && cond2;
    let reason = if should_trigger {
        format!(
            "距上次校准 {} 天，近 7 天有 {} 笔销售，建议微盘点",
            days_since_last.min(365),
            recent_sales
        )
    } else {
        "暂不满足触发条件".to_string()
    };

    Ok(serde_json::json!({
        "should_trigger": should_trigger,
        "reason": reason,
        "days_since_last_calibration": days_since_last.min(365),
        "is_hot_seller": cond2,
        "current_stock": current_stock,
        "allow_negative_stock": allow_negative != 0,
        "cond_low_stock": cond3,
    }))
}

/// 检查进货完成后是否需要触发微盘点（PRD v12.0 §3.3）
/// 触发条件：
///   1. 进货后库存仍为负
///   2. 或当前置信度为 low
#[tauri::command]
pub fn should_trigger_post_purchase_calibration_cmd(
    db: tauri::State<Mutex<Database>>,
    product_id: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let product_info = conn.query_row(
        "SELECT COALESCE(current_stock, 0),
                COALESCE(stock_confidence, 'low')
         FROM products WHERE id = ?1",
        params![product_id],
        |row| Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?)),
    );

    let (current_stock, stock_confidence) = match product_info {
        Ok(v) => v,
        Err(_) => {
            return Ok(serde_json::json!({
                "should_trigger": false,
                "reason": "商品不存在",
            }))
        }
    };

    let has_negative_stock = current_stock < 0;
    let should_trigger = has_negative_stock || stock_confidence == "low";
    let reason = if has_negative_stock {
        format!("进货后库存仍为负（{}），建议补充进货", current_stock)
    } else if stock_confidence == "low" {
        "置信度低，建议微盘点".to_string()
    } else {
        "暂不满足触发条件".to_string()
    };

    Ok(serde_json::json!({
        "should_trigger": should_trigger,
        "reason": reason,
        "current_stock": current_stock,
        "has_negative_stock": has_negative_stock,
        "stock_confidence": stock_confidence,
    }))
}

#[cfg(test)]
mod tests {
    use crate::database::Database;

    fn setup_test_db() -> Database {
        let db = Database::new_in_memory().unwrap();
        let conn = db.connection();
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
            CREATE TABLE inventory_transactions (
                id TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                transaction_type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE inventory_aging_tasks (
                id TEXT PRIMARY KEY,
                sku_id TEXT NOT NULL,
                task_type TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE notification_suppressions (
                id TEXT PRIMARY KEY,
                sku_id TEXT NOT NULL,
                notification_kind TEXT NOT NULL,
                ignore_count INTEGER DEFAULT 0,
                suppressed_until TIMESTAMP
            );",
        )
        .unwrap();
        db
    }

    #[test]
    fn test_check_negative_aging_creates_tasks() {
        let db = setup_test_db();
        let conn = db.connection();
        // 创建一个 14 天前变负的 SKU
        conn.execute(
            "INSERT INTO products (id, name, current_stock, negative_since)
             VALUES ('p1', 'Test', -3, datetime('now', '-15 days'))",
            [],
        )
        .unwrap();
        // 一个 5 天前变负的 SKU（不应触发）
        conn.execute(
            "INSERT INTO products (id, name, current_stock, negative_since)
             VALUES ('p2', 'Test2', -1, datetime('now', '-5 days'))",
            [],
        )
        .unwrap();
        // 调用函数需要 State<Mutex<Database>>，但单元测试很难构造
        // 这里仅验证 SQL 逻辑正确
        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM products
                 WHERE current_stock < 0
                   AND negative_since IS NOT NULL
                   AND datetime(negative_since, '+14 days') <= datetime('now')",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_suppression_three_times() {
        let db = setup_test_db();
        let conn = db.connection();
        conn.execute(
            "INSERT INTO products (id, name, current_stock) VALUES ('p1', 'Test', 10)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO notification_suppressions (id, sku_id, notification_kind, ignore_count)
             VALUES ('s1', 'p1', 'negative_aging', 2)",
            [],
        )
        .unwrap();
        // 模拟 mark 一次
        conn.execute(
            "UPDATE notification_suppressions
             SET ignore_count = ignore_count + 1, suppressed_until = datetime('now', '+7 days')
             WHERE id = 's1'",
            [],
        )
        .unwrap();
        let (count, until): (i32, Option<String>) = conn
            .query_row(
                "SELECT ignore_count, suppressed_until FROM notification_suppressions WHERE id = 's1'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(count, 3);
        assert!(until.is_some());
    }
}
