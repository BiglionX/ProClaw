use crate::database::Database;
use rusqlite::params;
use std::sync::Mutex;

// ==================== 账户管理 ====================

/// 创建财务账户
#[tauri::command]
pub fn create_fa_account(
    db: tauri::State<Mutex<Database>>,
    name: String,
    account_type: String,
    balance: Option<f64>,
    notes: Option<String>,
) -> Result<String, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = uuid::Uuid::new_v4().to_string();
    let bal = balance.unwrap_or(0.0);

    conn.execute(
        "INSERT INTO agent_finance_accounts (id, name, type, balance, notes)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, name, account_type, bal, notes],
    )
    .map_err(|e| format!("Failed to create account: {}", e))?;

    Ok(id)
}

/// 获取所有财务账户
#[tauri::command]
pub fn get_fa_accounts(db: tauri::State<Mutex<Database>>) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn
        .prepare(
            "SELECT a.id, a.name, a.type, a.balance, a.currency, a.notes, a.is_active, a.created_at
             FROM agent_finance_accounts a
             WHERE a.is_active = 1
             ORDER BY a.created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let accounts: Vec<serde_json::Value> = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "type": row.get::<_, String>(2)?,
                "balance": row.get::<_, f64>(3)?,
                "currency": row.get::<_, String>(4)?,
                "notes": row.get::<_, Option<String>>(5)?,
                "is_active": row.get::<_, bool>(6)?,
                "created_at": row.get::<_, String>(7)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(serde_json::json!(accounts))
}

/// 更新账户余额
#[tauri::command]
pub fn update_fa_account_balance(
    db: tauri::State<Mutex<Database>>,
    account_id: String,
    new_balance: f64,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    conn.execute(
        "UPDATE agent_finance_accounts SET balance = ?1 WHERE id = ?2",
        params![new_balance, account_id],
    )
    .map_err(|e| format!("Failed to update balance: {}", e))?;

    Ok(())
}

// ==================== 收支记录 ====================

/// 创建交易记录
#[tauri::command]
pub fn create_fa_transaction(
    db: tauri::State<Mutex<Database>>,
    account_id: String,
    category_id: Option<String>,
    amount: f64,
    transaction_type: String,
    transaction_date: String,
    note: Option<String>,
    attachment_id: Option<String>,
) -> Result<String, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = uuid::Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO agent_finance_transactions (id, account_id, category_id, amount, type, transaction_date, note, attachment_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id, account_id, category_id, amount, transaction_type, transaction_date, note, attachment_id],
    )
    .map_err(|e| format!("Failed to create transaction: {}", e))?;

    // 更新账户余额
    let balance_change = if transaction_type == "income" { amount } else { -amount };
    conn.execute(
        "UPDATE agent_finance_accounts SET balance = balance + ?1 WHERE id = ?2",
        params![balance_change, account_id],
    )
    .map_err(|e| format!("Failed to update balance: {}", e))?;

    Ok(id)
}

/// 获取交易记录列表
#[tauri::command]
pub fn get_fa_transactions(
    db: tauri::State<Mutex<Database>>,
    account_id: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
    transaction_type: Option<String>,
    category_id: Option<String>,
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let page = page.unwrap_or(1);
    let page_size = page_size.unwrap_or(50);
    let offset = (page - 1) * page_size;

    let mut where_clauses = vec!["t.deleted_at IS NULL".to_string()];
    let mut query_params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref aid) = account_id {
        where_clauses.push(format!("t.account_id = ?{}", query_params.len() + 1));
        query_params.push(Box::new(aid.clone()));
    }
    if let Some(ref sd) = start_date {
        where_clauses.push(format!("t.transaction_date >= ?{}", query_params.len() + 1));
        query_params.push(Box::new(sd.clone()));
    }
    if let Some(ref ed) = end_date {
        where_clauses.push(format!("t.transaction_date <= ?{}", query_params.len() + 1));
        query_params.push(Box::new(ed.clone()));
    }
    if let Some(ref tt) = transaction_type {
        where_clauses.push(format!("t.type = ?{}", query_params.len() + 1));
        query_params.push(Box::new(tt.clone()));
    }
    if let Some(ref cid) = category_id {
        where_clauses.push(format!("t.category_id = ?{}", query_params.len() + 1));
        query_params.push(Box::new(cid.clone()));
    }

    let where_sql = where_clauses.join(" AND ");
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = query_params.iter().map(|p| p.as_ref()).collect();

    // 查询总数
    let count_sql = format!("SELECT COUNT(*) FROM agent_finance_transactions t WHERE {}", where_sql);
    let total: i64 = conn
        .query_row(&count_sql, param_refs.as_slice(), |row| row.get(0))
        .map_err(|e| e.to_string())?;

    // 查询数据
    let data_sql = format!(
        "SELECT t.id, t.account_id, t.category_id, t.amount, t.type, t.transaction_date, t.note, t.created_at,
                c.name as category_name, a.name as account_name
         FROM agent_finance_transactions t
         LEFT JOIN agent_finance_categories c ON t.category_id = c.id
         LEFT JOIN agent_finance_accounts a ON t.account_id = a.id
         WHERE {}
         ORDER BY t.transaction_date DESC, t.created_at DESC
         LIMIT ?{} OFFSET ?{}",
        where_sql,
        query_params.len() + 1,
        query_params.len() + 2
    );

    let mut all_params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    for p in query_params {
        all_params.push(p);
    }
    all_params.push(Box::new(page_size));
    all_params.push(Box::new(offset));

    let all_refs: Vec<&dyn rusqlite::types::ToSql> = all_params.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(&data_sql).map_err(|e| e.to_string())?;
    let transactions: Vec<serde_json::Value> = stmt
        .query_map(all_refs.as_slice(), |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "account_id": row.get::<_, String>(1)?,
                "category_id": row.get::<_, Option<String>>(2)?,
                "amount": row.get::<_, f64>(3)?,
                "type": row.get::<_, String>(4)?,
                "transaction_date": row.get::<_, String>(5)?,
                "note": row.get::<_, Option<String>>(6)?,
                "created_at": row.get::<_, String>(7)?,
                "category_name": row.get::<_, Option<String>>(8)?,
                "account_name": row.get::<_, Option<String>>(9)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(serde_json::json!({
        "data": transactions,
        "total": total,
        "page": page,
        "page_size": page_size,
    }))
}

/// 删除交易记录
#[tauri::command]
pub fn delete_fa_transaction(
    db: tauri::State<Mutex<Database>>,
    transaction_id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 先获取交易信息用于回滚余额
    let (account_id, amount, tx_type): (String, f64, String) = conn
        .query_row(
            "SELECT account_id, amount, type FROM agent_finance_transactions WHERE id = ?1",
            params![transaction_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|e| format!("Transaction not found: {}", e))?;

    // 软删除
    conn.execute(
        "UPDATE agent_finance_transactions SET deleted_at = datetime('now') WHERE id = ?1",
        params![transaction_id],
    )
    .map_err(|e| format!("Failed to delete transaction: {}", e))?;

    // 回滚余额
    let balance_rollback = if tx_type == "income" { -amount } else { amount };
    conn.execute(
        "UPDATE agent_finance_accounts SET balance = balance + ?1 WHERE id = ?2",
        params![balance_rollback, account_id],
    )
    .map_err(|e| format!("Failed to rollback balance: {}", e))?;

    Ok(())
}

// ==================== 预算控制 ====================

/// 创建或更新预算
#[tauri::command]
pub fn create_fa_budget(
    db: tauri::State<Mutex<Database>>,
    category_id: String,
    month: String,
    limit_amount: f64,
    notes: Option<String>,
) -> Result<String, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = uuid::Uuid::new_v4().to_string();

    conn.execute(
        "INSERT OR REPLACE INTO agent_finance_budgets (id, category_id, month, limit_amount, notes)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, category_id, month, limit_amount, notes],
    )
    .map_err(|e| format!("Failed to create budget: {}", e))?;

    Ok(id)
}

/// 获取预算列表
#[tauri::command]
pub fn get_fa_budgets(
    db: tauri::State<Mutex<Database>>,
    month: Option<String>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let (where_clause, month_param): (String, Vec<Box<dyn rusqlite::types::ToSql>>) =
        if let Some(ref m) = month {
            ("WHERE b.month = ?1".to_string(), vec![Box::new(m.clone())])
        } else {
            (
                "WHERE b.month = strftime('%Y-%m', 'now')".to_string(),
                vec![],
            )
        };

    let sql = format!(
        "SELECT b.id, b.category_id, b.month, b.limit_amount, b.actual_amount, b.notes,
                c.name as category_name, c.icon as category_icon
         FROM agent_finance_budgets b
         LEFT JOIN agent_finance_categories c ON b.category_id = c.id
         {}
         ORDER BY c.sort_order ASC",
        where_clause
    );

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = month_param.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let budgets: Vec<serde_json::Value> = stmt
        .query_map(params_refs.as_slice(), |row| {
            let limit: f64 = row.get(3)?;
            let actual: f64 = row.get(4)?;
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "category_id": row.get::<_, String>(1)?,
                "month": row.get::<_, String>(2)?,
                "limit_amount": limit,
                "actual_amount": actual,
                "notes": row.get::<_, Option<String>>(5)?,
                "category_name": row.get::<_, Option<String>>(6)?,
                "category_icon": row.get::<_, Option<String>>(7)?,
                "usage_percent": if limit > 0.0 { (actual / limit * 100.0).round() } else { 0.0 },
                "is_over_budget": actual > limit,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(serde_json::json!(budgets))
}

/// 检查预算告警
#[tauri::command]
pub fn check_fa_budget_alerts(
    db: tauri::State<Mutex<Database>>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn
        .prepare(
            "SELECT b.id, c.name, b.limit_amount, b.actual_amount
             FROM agent_finance_budgets b
             JOIN agent_finance_categories c ON b.category_id = c.id
             WHERE b.month = strftime('%Y-%m', 'now')
               AND b.limit_amount > 0
               AND b.actual_amount >= b.limit_amount * 0.8",
        )
        .map_err(|e| e.to_string())?;

    let alerts: Vec<serde_json::Value> = stmt
        .query_map([], |row| {
            let limit: f64 = row.get(2)?;
            let actual: f64 = row.get(3)?;
            Ok(serde_json::json!({
                "budget_id": row.get::<_, String>(0)?,
                "category_name": row.get::<_, String>(1)?,
                "limit_amount": limit,
                "actual_amount": actual,
                "usage_percent": (actual / limit * 100.0).round(),
                "level": if actual >= limit { "over" } else { "warning" },
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(serde_json::json!(alerts))
}

// ==================== 报表 ====================

/// 获取收支分类汇总
#[tauri::command]
pub fn get_fa_category_summary(
    db: tauri::State<Mutex<Database>>,
    start_date: String,
    end_date: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.name, c.type, c.icon, COALESCE(SUM(t.amount), 0.0) as total_amount
             FROM agent_finance_categories c
             LEFT JOIN agent_finance_transactions t ON c.id = t.category_id
                 AND t.transaction_date >= ?1 AND t.transaction_date <= ?2
                 AND t.deleted_at IS NULL
             GROUP BY c.id, c.name, c.type, c.icon
             ORDER BY c.type, total_amount DESC",
        )
        .map_err(|e| e.to_string())?;

    let categories: Vec<serde_json::Value> = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "type": row.get::<_, String>(2)?,
                "icon": row.get::<_, Option<String>>(3)?,
                "amount": row.get::<_, f64>(4)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // 计算总收入支出
    let total_income: f64 = categories
        .iter()
        .filter(|c| c["type"] == "income")
        .map(|c| c["amount"].as_f64().unwrap_or(0.0))
        .sum();
    let total_expense: f64 = categories
        .iter()
        .filter(|c| c["type"] == "expense")
        .map(|c| c["amount"].as_f64().unwrap_or(0.0))
        .sum();

    Ok(serde_json::json!({
        "categories": categories,
        "summary": {
            "total_income": total_income,
            "total_expense": total_expense,
            "net": total_income - total_expense,
        }
    }))
}

/// 获取利润表
#[tauri::command]
pub fn get_fa_profit_loss(
    db: tauri::State<Mutex<Database>>,
    start_date: String,
    end_date: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let total_income: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0.0) FROM agent_finance_transactions
             WHERE type = 'income' AND transaction_date >= ?1 AND transaction_date <= ?2 AND deleted_at IS NULL",
            params![start_date, end_date],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let total_expense: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0.0) FROM agent_finance_transactions
             WHERE type = 'expense' AND transaction_date >= ?1 AND transaction_date <= ?2 AND deleted_at IS NULL",
            params![start_date, end_date],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let net_profit = total_income - total_expense;

    Ok(serde_json::json!({
        "period": { "start": start_date, "end": end_date },
        "total_income": total_income,
        "total_expense": total_expense,
        "net_profit": net_profit,
        "profit_margin": if total_income > 0.0 { (net_profit / total_income * 100.0).round() } else { 0.0 },
    }))
}

/// 获取月度趋势（用于折线图）
#[tauri::command]
pub fn get_fa_monthly_trend(
    db: tauri::State<Mutex<Database>>,
    months: Option<i64>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let months_back = months.unwrap_or(12);

    let mut stmt = conn
        .prepare(
            "SELECT strftime('%Y-%m', transaction_date) as month,
                    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
             FROM agent_finance_transactions
             WHERE transaction_date >= date('now', '-' || ?1 || ' months')
               AND deleted_at IS NULL
             GROUP BY month
             ORDER BY month ASC",
        )
        .map_err(|e| e.to_string())?;

    let trend: Vec<serde_json::Value> = stmt
        .query_map(params![months_back], |row| {
            Ok(serde_json::json!({
                "month": row.get::<_, String>(0)?,
                "income": row.get::<_, f64>(1)?,
                "expense": row.get::<_, f64>(2)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(serde_json::json!(trend))
}

// ==================== 发票管理 ====================

/// 创建发票记录
#[tauri::command]
pub fn create_fa_invoice(
    db: tauri::State<Mutex<Database>>,
    invoice_type: String,
    invoice_code: Option<String>,
    invoice_number: Option<String>,
    amount: f64,
    tax_amount: Option<f64>,
    tax_rate: Option<f64>,
    issue_date: Option<String>,
    counterparty_name: Option<String>,
    counterparty_tax_id: Option<String>,
    file_id: Option<String>,
    notes: Option<String>,
) -> Result<String, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = uuid::Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO agent_finance_invoices (id, type, invoice_code, invoice_number, amount, tax_amount, tax_rate, issue_date, counterparty_name, counterparty_tax_id, file_id, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![id, invoice_type, invoice_code, invoice_number, amount, tax_amount, tax_rate, issue_date, counterparty_name, counterparty_tax_id, file_id, notes],
    )
    .map_err(|e| format!("Failed to create invoice: {}", e))?;

    Ok(id)
}

/// 获取发票列表
#[tauri::command]
pub fn get_fa_invoices(
    db: tauri::State<Mutex<Database>>,
    invoice_type: Option<String>,
    status: Option<String>,
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let page = page.unwrap_or(1);
    let page_size = page_size.unwrap_or(50);
    let offset = (page - 1) * page_size;

    let mut conditions = vec!["1=1".to_string()];
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(ref it) = invoice_type {
        conditions.push(format!("i.type = ?{}", param_values.len() + 1));
        param_values.push(Box::new(it.clone()));
    }
    if let Some(ref s) = status {
        conditions.push(format!("i.status = ?{}", param_values.len() + 1));
        param_values.push(Box::new(s.clone()));
    }
    let where_sql = conditions.join(" AND ");

    let count_sql = format!("SELECT COUNT(*) FROM agent_finance_invoices i WHERE {}", where_sql);
    let total: i64 = {
        let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
        conn.query_row(&count_sql, param_refs.as_slice(), |row| row.get(0))
            .map_err(|e| e.to_string())?
    };

    let data_sql = format!(
        "SELECT i.id, i.type, i.invoice_code, i.invoice_number, i.amount, i.tax_amount, i.tax_rate,
                i.status, i.issue_date, i.counterparty_name, i.counterparty_tax_id, i.notes, i.created_at
         FROM agent_finance_invoices i
         WHERE {}
         ORDER BY i.created_at DESC
         LIMIT ?{} OFFSET ?{}",
        where_sql,
        param_values.len() + 1,
        param_values.len() + 2
    );

    let mut all_params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    for p in param_values { all_params.push(p); }
    all_params.push(Box::new(page_size));
    all_params.push(Box::new(offset));
    let final_refs: Vec<&dyn rusqlite::types::ToSql> = all_params.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(&data_sql).map_err(|e| e.to_string())?;
    let invoices: Vec<serde_json::Value> = stmt
        .query_map(final_refs.as_slice(), |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "type": row.get::<_, String>(1)?,
                "invoice_code": row.get::<_, Option<String>>(2)?,
                "invoice_number": row.get::<_, Option<String>>(3)?,
                "amount": row.get::<_, f64>(4)?,
                "tax_amount": row.get::<_, f64>(5)?,
                "tax_rate": row.get::<_, f64>(6)?,
                "status": row.get::<_, String>(7)?,
                "issue_date": row.get::<_, Option<String>>(8)?,
                "counterparty_name": row.get::<_, Option<String>>(9)?,
                "counterparty_tax_id": row.get::<_, Option<String>>(10)?,
                "notes": row.get::<_, Option<String>>(11)?,
                "created_at": row.get::<_, String>(12)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(serde_json::json!({
        "data": invoices,
        "total": total,
        "page": page,
        "page_size": page_size,
    }))
}

/// 更新发票状态
#[tauri::command]
pub fn update_fa_invoice_status(
    db: tauri::State<Mutex<Database>>,
    invoice_id: String,
    status: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    conn.execute(
        "UPDATE agent_finance_invoices SET status = ?1 WHERE id = ?2",
        params![status, invoice_id],
    )
    .map_err(|e| format!("Failed to update invoice status: {}", e))?;

    Ok(())
}
