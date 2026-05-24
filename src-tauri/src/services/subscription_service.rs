// 订阅与计费服务 (Phase 7)
// 套餐管理、用户订阅、Token 用量追踪、配额检查

use rusqlite::params;
use uuid::Uuid;
use chrono::Utc;
use crate::database::Database;

/// Token 消耗定额（每操作类型）
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct TokenCost {
    pub action_type: &'static str,
    pub tokens: i64,
}

impl TokenCost {
    pub fn for_action(action: &str) -> i64 {
        match action {
            "api_call" => 1,
            "chat_message" => 1,
            "websocket" => 5,
            "file_upload" => 10,
            "ai_recognition" => 5,
            "offline_queue" => 1,
            _ => 1,
        }
    }
}

/// 订阅套餐定义
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Plan {
    pub id: String,
    pub plan_key: String,
    pub name: String,
    pub description: Option<String>,
    pub monthly_price: f64,
    pub yearly_price: f64,
    pub token_quota: i64,
    pub max_devices: i64,
    pub features: String,
    pub is_active: bool,
    pub sort_order: i64,
}

/// 用户订阅信息
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UserSubscription {
    pub id: String,
    pub user_id: String,
    pub plan_id: String,
    pub plan_name: Option<String>,
    pub plan_key: Option<String>,
    pub token_quota: Option<i64>,
    pub status: String,
    pub billing_cycle: String,
    pub started_at: String,
    pub expires_at: Option<String>,
    pub auto_renew: bool,
    pub token_used_this_month: Option<i64>,
}

/// Token 用量摘要
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TokenUsageSummary {
    pub user_id: String,
    pub plan_name: String,
    pub plan_key: String,
    pub token_quota: i64,
    pub token_used: i64,
    pub token_remaining: i64,
    pub usage_percent: f64,
    pub subscription_status: String,
}

// ========== 套餐管理 ==========

pub fn get_plans(db: &Database) -> Result<Vec<Plan>, String> {
    let conn = db.connection();
    let mut stmt = conn.prepare(
        "SELECT id, plan_key, name, description, monthly_price, yearly_price, token_quota, max_devices, features, is_active, sort_order
         FROM subscription_plans WHERE is_active = 1 ORDER BY sort_order"
    ).map_err(|e| e.to_string())?;

    let plans = stmt.query_map([], |row| {
        Ok(Plan {
            id: row.get(0)?, plan_key: row.get(1)?, name: row.get(2)?,
            description: row.get(3)?, monthly_price: row.get(4)?, yearly_price: row.get(5)?,
            token_quota: row.get(6)?, max_devices: row.get(7)?, features: row.get(8)?,
            is_active: row.get(9)?, sort_order: row.get(10)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(plans)
}

#[allow(dead_code)]
pub fn get_plan_by_key(db: &Database, plan_key: &str) -> Result<Option<Plan>, String> {
    let conn = db.connection();
    conn.query_row(
        "SELECT id, plan_key, name, description, monthly_price, yearly_price, token_quota, max_devices, features, is_active, sort_order
         FROM subscription_plans WHERE plan_key = ?1",
        params![plan_key],
        |row| Ok(Plan {
            id: row.get(0)?, plan_key: row.get(1)?, name: row.get(2)?,
            description: row.get(3)?, monthly_price: row.get(4)?, yearly_price: row.get(5)?,
            token_quota: row.get(6)?, max_devices: row.get(7)?, features: row.get(8)?,
            is_active: row.get(9)?, sort_order: row.get(10)?,
        }),
    ).map(Some).or_else(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => Ok(None),
        _ => Err(e.to_string()),
    })
}

// ========== 用户订阅 ==========

pub fn get_user_subscription(db: &Database, user_id: &str) -> Result<Option<UserSubscription>, String> {
    let conn = db.connection();
    conn.query_row(
        "SELECT us.id, us.user_id, us.plan_id, sp.name, sp.plan_key, sp.token_quota,
                us.status, us.billing_cycle, us.started_at, us.expires_at, us.auto_renew
         FROM user_subscriptions us
         LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
         WHERE us.user_id = ?1 AND us.status = 'active'
         ORDER BY us.created_at DESC LIMIT 1",
        params![user_id],
        |row| {
            let sub = UserSubscription {
                id: row.get(0)?, user_id: row.get(1)?, plan_id: row.get(2)?,
                plan_name: row.get(3)?, plan_key: row.get(4)?, token_quota: row.get(5)?,
                status: row.get(6)?, billing_cycle: row.get(7)?,
                started_at: row.get::<_, String>(8)?,
                expires_at: row.get::<_, Option<String>>(9)?,
                auto_renew: row.get(10)?,
                token_used_this_month: None,
            };
            Ok(sub)
        },
    ).map(Some).or_else(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => Ok(None),
        _ => Err(e.to_string()),
    })
}

pub fn subscribe_user(db: &Database, user_id: &str, plan_id: &str, billing_cycle: &str) -> Result<String, String> {
    // 获取套餐信息
    let conn = db.connection();
    let plan = conn.query_row(
        "SELECT id, plan_key, name, token_quota FROM subscription_plans WHERE id = ?1 AND is_active = 1",
        params![plan_id],
        |row| Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, i64>(3)?,
        )),
    ).map_err(|_| "Plan not found".to_string())?;

    // 取消现有活跃订阅
    conn.execute(
        "UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?1 AND status = 'active'",
        params![user_id],
    ).map_err(|e| e.to_string())?;

    // 计算过期时间
    let now = Utc::now();
    let expires = if billing_cycle == "yearly" {
        now + chrono::Duration::days(365)
    } else {
        now + chrono::Duration::days(30)
    };

    let sub_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO user_subscriptions (id, user_id, plan_id, status, billing_cycle, started_at, expires_at)
         VALUES (?1, ?2, ?3, 'active', ?4, CURRENT_TIMESTAMP, ?5)",
        params![sub_id, user_id, plan_id, billing_cycle, expires.format("%Y-%m-%dT%H:%M:%S").to_string()],
    ).map_err(|e| e.to_string())?;

    // 更新用户 plan_type
    conn.execute("UPDATE users SET plan_type = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![plan.1, user_id]).map_err(|e| e.to_string())?;

    // 生成发票
    let amount = if billing_cycle == "yearly" {
        conn.query_row("SELECT yearly_price FROM subscription_plans WHERE id = ?1", params![plan_id], |r| r.get::<_, f64>(0)).unwrap_or(0.0)
    } else {
        conn.query_row("SELECT monthly_price FROM subscription_plans WHERE id = ?1", params![plan_id], |r| r.get::<_, f64>(0)).unwrap_or(0.0)
    };

    let invoice_id = Uuid::new_v4().to_string();
    let invoice_no = format!("INV-{}", &invoice_id[..8].to_uppercase());
    conn.execute(
        "INSERT INTO billing_invoices (id, user_id, subscription_id, invoice_number, amount, status, payment_method, billing_period_start, billing_period_end, paid_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'paid', 'mock', DATE('now'), DATE('now', ?6), CURRENT_TIMESTAMP)",
        params![invoice_id, user_id, sub_id, invoice_no, amount,
            if billing_cycle == "yearly" { "+365 days" } else { "+30 days" }],
    ).map_err(|e| e.to_string())?;

    Ok(sub_id)
}

pub fn cancel_subscription(db: &Database, user_id: &str) -> Result<(), String> {
    let conn = db.connection();
    conn.execute(
        "UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?1 AND status = 'active'",
        params![user_id],
    ).map_err(|e| e.to_string())?;
    conn.execute("UPDATE users SET plan_type = 'free', updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![user_id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ========== Token 用量追踪 ==========

pub fn record_token_usage(db: &Database, user_id: &str, action_type: &str, resource_path: Option<&str>, ip: Option<&str>) -> Result<(), String> {
    let tokens = TokenCost::for_action(action_type);
    let id = Uuid::new_v4().to_string();
    let conn = db.connection();
    conn.execute(
        "INSERT INTO token_usage_logs (id, user_id, tokens_consumed, action_type, resource_path, ip_address, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP)",
        params![id, user_id, tokens, action_type, resource_path.unwrap_or(""), ip.unwrap_or("")],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

/// 获取当月 Token 用量
pub fn get_monthly_token_usage(db: &Database, user_id: &str) -> Result<i64, String> {
    let conn = db.connection();
    let count: i64 = conn.query_row(
        "SELECT COALESCE(SUM(tokens_consumed), 0) FROM token_usage_logs
         WHERE user_id = ?1 AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')",
        params![user_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    Ok(count)
}

/// 查询用户 Token 摘要（含套餐信息）
pub fn get_token_usage_summary(db: &Database, user_id: &str) -> Result<TokenUsageSummary, String> {
    let conn = db.connection();

    // 获取用户 plan_type 作为 fallback
    let plan_type: String = conn.query_row(
        "SELECT COALESCE(plan_type, 'free') FROM users WHERE id = ?1",
        params![user_id], |row| row.get(0),
    ).unwrap_or_else(|_| "free".to_string());

    let sub = get_user_subscription(db, user_id)?;

    let plan_key = sub.as_ref().and_then(|s| s.plan_key.clone()).unwrap_or(plan_type);
    let token_quota = sub.as_ref().and_then(|s| s.token_quota).unwrap_or(if plan_key == "free" { 1000 } else { 10000 });
    let plan_name = sub.as_ref().and_then(|s| s.plan_name.clone()).unwrap_or_else(|| plan_key.clone());
    let sub_status = sub.as_ref().map(|s| s.status.clone()).unwrap_or_else(|| "active".to_string());

    let token_used = get_monthly_token_usage(db, user_id)?;
    let token_remaining = (token_quota - token_used).max(0);
    let usage_percent = if token_quota > 0 { (token_used as f64 / token_quota as f64) * 100.0 } else { 0.0 };

    Ok(TokenUsageSummary {
        user_id: user_id.to_string(),
        plan_name,
        plan_key,
        token_quota,
        token_used,
        token_remaining,
        usage_percent,
        subscription_status: sub_status,
    })
}

/// 检查配额是否充足（自动消耗 token）
#[allow(dead_code)]
pub fn check_and_consume(db: &Database, user_id: &str, action_type: &str, resource_path: &str, ip: Option<&str>) -> Result<bool, String> {
    let summary = get_token_usage_summary(db, user_id)?;
    let cost = TokenCost::for_action(action_type);

    if summary.token_remaining < cost {
        return Ok(false); // 配额不足
    }

    // 配额充足，记录消耗
    record_token_usage(db, user_id, action_type, Some(resource_path), ip)?;
    Ok(true)
}

/// 获取 Token 用量明细
pub fn get_token_usage_details(db: &Database, user_id: &str, limit: i64, offset: i64) -> Result<Vec<serde_json::Value>, String> {
    let conn = db.connection();
    let mut stmt = conn.prepare(
        "SELECT id, tokens_consumed, action_type, resource_path, ip_address, created_at
         FROM token_usage_logs WHERE user_id = ?1
         ORDER BY created_at DESC LIMIT ?2 OFFSET ?3"
    ).map_err(|e| e.to_string())?;

    let rows: Vec<serde_json::Value> = stmt.query_map(params![user_id, limit, offset], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "tokens_consumed": row.get::<_, i64>(1)?,
            "action_type": row.get::<_, String>(2)?,
            "resource_path": row.get::<_, Option<String>>(3)?,
            "ip_address": row.get::<_, Option<String>>(4)?,
            "created_at": row.get::<_, String>(5)?,
        }))
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(rows)
}

/// 获取用户账单列表
pub fn get_invoices(db: &Database, user_id: &str) -> Result<Vec<serde_json::Value>, String> {
    let conn = db.connection();
    let mut stmt = conn.prepare(
        "SELECT id, invoice_number, amount, status, payment_method, billing_period_start, billing_period_end, paid_at, created_at
         FROM billing_invoices WHERE user_id = ?1 ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;

    let rows: Vec<serde_json::Value> = stmt.query_map(params![user_id], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "invoice_number": row.get::<_, String>(1)?,
            "amount": row.get::<_, f64>(2)?,
            "status": row.get::<_, String>(3)?,
            "payment_method": row.get::<_, String>(4)?,
            "billing_period_start": row.get::<_, Option<String>>(5)?,
            "billing_period_end": row.get::<_, Option<String>>(6)?,
            "paid_at": row.get::<_, Option<String>>(7)?,
            "created_at": row.get::<_, String>(8)?,
        }))
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(rows)
}

/// 初始化免费套餐（新用户注册时调用）
#[allow(dead_code)]
pub fn init_free_plan(db: &Database, user_id: &str) -> Result<(), String> {
    let plan = get_plan_by_key(db, "free")?;
    if let Some(p) = plan {
        subscribe_user(db, user_id, &p.id, "monthly")?;
    }
    Ok(())
}
