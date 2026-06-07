use crate::database::Database;
use rusqlite::params;
use std::sync::Mutex;

/// 生成对账单 PDF 并返回文件路径
#[tauri::command]
pub fn generate_statement(
    db: tauri::State<Mutex<Database>>,
    counterparty_type: String,
    counterparty_id: String,
    start_date: String,
    end_date: String,
    format: String,
) -> Result<String, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 查询对方信息
    let (counterparty_name, _email): (Option<String>, Option<String>) = if counterparty_type == "supplier" {
        conn.query_row(
            "SELECT name, email FROM suppliers WHERE id = ?1",
            params![counterparty_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).map_err(|_| "供应商不存在".to_string())?
    } else {
        conn.query_row(
            "SELECT name, email FROM customers WHERE id = ?1",
            params![counterparty_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).map_err(|_| "客户不存在".to_string())?
    };
    let name = counterparty_name.unwrap_or_else(|| counterparty_id.clone());

    // 查询交易记录
    let mut stmt = conn.prepare(
        "SELECT transaction_date, order_type, transaction_type, amount, payment_method, voucher_no, notes, created_at
         FROM payment_transactions
         WHERE counterparty_id = ?1 AND counterparty_type = ?2
           AND transaction_date >= ?3 AND transaction_date <= ?4
           AND deleted_at IS NULL
         ORDER BY transaction_date ASC, created_at ASC"
    ).map_err(|e| e.to_string())?;

    let transactions: Vec<serde_json::Value> = stmt
        .query_map(params![counterparty_id, counterparty_type, start_date, end_date], |row| {
            Ok(serde_json::json!({
                "date": row.get::<_, String>(0)?,
                "order_type": row.get::<_, String>(1)?,
                "txn_type": row.get::<_, String>(2)?,
                "amount": row.get::<_, f64>(3)?,
                "method": row.get::<_, Option<String>>(4)?,
                "voucher": row.get::<_, Option<String>>(5)?,
                "notes": row.get::<_, Option<String>>(6)?,
                "created_at": row.get::<_, String>(7)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // 查询期初余额（start_date 之前的所有余额）
    let opening_balance: f64 = if counterparty_type == "supplier" {
        conn.query_row(
            "SELECT COALESCE(SUM(po.total_amount - po.paid_amount), 0.0) FROM purchase_orders po
             WHERE po.supplier_id = ?1 AND po.deleted_at IS NULL AND po.status != 'cancelled'
               AND po.created_at < ?2",
            params![counterparty_id, start_date],
            |row| row.get(0),
        ).unwrap_or(0.0)
    } else {
        conn.query_row(
            "SELECT COALESCE(SUM(so.total_amount - so.paid_amount), 0.0) FROM sales_orders so
             WHERE so.customer_id = ?1 AND so.deleted_at IS NULL AND so.status != 'cancelled'
               AND so.created_at < ?2",
            params![counterparty_id, start_date],
            |row| row.get(0),
        ).unwrap_or(0.0)
    };

    // 生成 PDF
    let file_path = generate_pdf(&name, &counterparty_type, &start_date, &end_date, &format, opening_balance, &transactions)?;

    Ok(file_path)
}

/// 生成对账单 PDF（使用 printpdf）
fn generate_pdf(
    counterparty_name: &str,
    counterparty_type: &str,
    start_date: &str,
    end_date: &str,
    format: &str,
    opening_balance: f64,
    transactions: &[serde_json::Value],
) -> Result<String, String> {
    use printpdf::*;
    use std::fs;
    use std::path::PathBuf;

    let label: &str = if counterparty_type == "supplier" { "供应商" } else { "客户" };
    let title = format!("{}对账单", label);

    // 创建 PDF 文档
    let (doc, page1, layer1) = PdfDocument::new(
        &title,
        Mm(210.0),
        Mm(297.0),
        "Layer 1",
    );

    let font = doc.add_builtin_font(BuiltinFont::Helvetica).unwrap();
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold).unwrap();

    let current_layer = doc.get_page(page1).get_layer(layer1);
    let mut y_pos = 270.0; // 从顶部开始（mm 坐标）

    // 标题
    current_layer.use_text(&title, 18.0, Mm(20.0), Mm(y_pos), &font_bold);
    y_pos -= 10.0;

    // 公司名占位
    let company_name = std::env::var("COMPANY_NAME").unwrap_or_else(|_| "本公司".to_string());
    current_layer.use_text(&company_name, 11.0, Mm(20.0), Mm(y_pos), &font);
    y_pos -= 8.0;

    // 对方信息
    current_layer.use_text(
        &format!("{}：{}", label, counterparty_name),
        11.0, Mm(20.0), Mm(y_pos), &font,
    );
    y_pos -= 8.0;

    // 期间
    current_layer.use_text(
        &format!("期间：{} ~ {}", start_date, end_date),
        11.0, Mm(20.0), Mm(y_pos), &font,
    );
    y_pos -= 12.0;

    match format {
        "balance" => {
            // 余额对账单
            current_layer.use_text("【余额对账单】", 13.0, Mm(20.0), Mm(y_pos), &font_bold);
            y_pos -= 10.0;

            let mut period_debit = 0.0_f64; // 本期借方（付款/退款）
            let mut period_credit = 0.0_f64; // 本期贷方（收款）

            for txn in transactions {
                let txn_type = txn["txn_type"].as_str().unwrap_or("");
                let amount = txn["amount"].as_f64().unwrap_or(0.0);
                match txn_type {
                    "payment" | "refund" => period_debit += amount,
                    "receipt" => period_credit += amount,
                    _ => {}
                }
            }

            let closing_balance = opening_balance + period_debit - period_credit;

            current_layer.use_text(
                &format!("期初余额：¥{:.2}", opening_balance),
                11.0, Mm(25.0), Mm(y_pos), &font,
            );
            y_pos -= 8.0;
            current_layer.use_text(
                &format!("本期借方（付款/退款）：¥{:.2}", period_debit),
                11.0, Mm(25.0), Mm(y_pos), &font,
            );
            y_pos -= 8.0;
            current_layer.use_text(
                &format!("本期贷方（收款）：¥{:.2}", period_credit),
                11.0, Mm(25.0), Mm(y_pos), &font,
            );
            y_pos -= 8.0;
            let closing_label = if closing_balance >= 0.0 {
                format!("期末余额（应收）：¥{:.2}", closing_balance)
            } else {
                format!("期末余额（应付）：¥{:.2}", -closing_balance)
            };
            current_layer.use_text(&closing_label, 11.0, Mm(25.0), Mm(y_pos), &font_bold);
        }
        "open_items" => {
            // 未清项对账单
            current_layer.use_text("【未清项对账单】", 13.0, Mm(20.0), Mm(y_pos), &font_bold);
            y_pos -= 10.0;

            // 表头
            current_layer.use_text("日期      类型      金额        状态", 9.0, Mm(20.0), Mm(y_pos), &font_bold);
            y_pos -= 7.0;

            let mut total_unpaid = 0.0_f64;
            for txn in transactions {
                let date = txn["date"].as_str().unwrap_or("");
                let txn_type = match txn["txn_type"].as_str().unwrap_or("") {
                    "payment" => "付款",
                    "receipt" => "收款",
                    "refund" => "退款",
                    _ => "其他",
                };
                let amount = txn["amount"].as_f64().unwrap_or(0.0);
                total_unpaid += if txn["txn_type"].as_str().unwrap_or("") == "receipt" { -amount } else { amount };

                let line = format!("{}  {}  ¥{:.2}", date, txn_type, amount);
                current_layer.use_text(&line, 9.0, Mm(22.0), Mm(y_pos), &font);
                y_pos -= 6.0;
            }

            y_pos -= 4.0;
            current_layer.use_text(
                &format!("未结清合计：¥{:.2}", total_unpaid),
                10.0, Mm(22.0), Mm(y_pos), &font_bold,
            );
        }
        _ => {
            // 交易明细对账单（默认）
            current_layer.use_text("【交易明细对账单】", 13.0, Mm(20.0), Mm(y_pos), &font_bold);
            y_pos -= 10.0;

            // 期初余额
            current_layer.use_text(
                &format!("期初余额：¥{:.2}", opening_balance),
                10.0, Mm(20.0), Mm(y_pos), &font,
            );
            y_pos -= 8.0;

            // 表头
            current_layer.use_text("日期      摘要          借方        贷方        余额", 9.0, Mm(20.0), Mm(y_pos), &font_bold);
            y_pos -= 7.0;

            let mut running_balance = opening_balance;
            for txn in transactions {
                let date = txn["date"].as_str().unwrap_or("");
                let txn_type = match txn["txn_type"].as_str().unwrap_or("") {
                    "payment" => "付款",
                    "receipt" => "收款",
                    "refund" => "退款",
                    _ => "其他",
                };
                let amount = txn["amount"].as_f64().unwrap_or(0.0);
                let is_debit = matches!(txn["txn_type"].as_str(), Some("payment" | "refund"));

                if is_debit {
                    running_balance += amount;
                } else {
                    running_balance -= amount;
                }

                let debit_str = if is_debit { format!("¥{:.2}", amount) } else { String::new() };
                let credit_str = if !is_debit { format!("¥{:.2}", amount) } else { String::new() };

                let line = format!("{}  {:<6}  {:>10}  {:>10}  ¥{:.2}", date, txn_type, debit_str, credit_str, running_balance);
                current_layer.use_text(&line, 8.0, Mm(20.0), Mm(y_pos), &font);
                y_pos -= 5.5;
            }

            y_pos -= 4.0;
            current_layer.use_text(
                &format!("期末余额：¥{:.2}", running_balance),
                10.0, Mm(20.0), Mm(y_pos), &font_bold,
            );
        }
    }

    // 保存到临时目录（R7 修复：净化 counterparty_name 防路径注入）
    let temp_dir = std::env::temp_dir();
    let safe_name = counterparty_name
        .replace('/', "_")
        .replace('\\', "_")
        .replace("..", "");
    let file_name = format!(
        "statement_{}_{}_{}.pdf",
        safe_name.replace(' ', "_"),
        start_date,
        end_date
    );
    let file_path: PathBuf = temp_dir.join(&file_name);

    let file = fs::File::create(&file_path).map_err(|e| format!("创建PDF文件失败: {}", e))?;
    doc.save(&mut std::io::BufWriter::new(file)).map_err(|e| format!("保存PDF失败: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

/// 发送对账单邮件
#[tauri::command]
pub fn send_statement_email(
    db: tauri::State<Mutex<Database>>,
    counterparty_type: String,
    counterparty_id: String,
    file_path: String,
) -> Result<String, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 读取 SMTP 配置
    let get_config = |key: &str| -> Result<String, String> {
        conn.query_row(
            "SELECT value FROM system_config WHERE key = ?1",
            params![key],
            |row| row.get::<_, String>(0),
        ).map_err(|_| format!("SMTP 配置缺失: {}", key))
    };

    let smtp_host = get_config("smtp_host")?;
    let smtp_port: u16 = get_config("smtp_port")?.parse().map_err(|_| "端口格式错误".to_string())?;
    let smtp_username = get_config("smtp_username")?;
    let smtp_password = get_config("smtp_password")?;
    let from_email = get_config("smtp_from_email")?;
    let from_name = get_config("smtp_from_name").unwrap_or_else(|_| from_email.clone());

    // 解密密码
    let password = base64_decode(&smtp_password).unwrap_or_else(|_| smtp_password.clone());

    // 获取收件人邮箱
    let to_email = if counterparty_type == "supplier" {
        conn.query_row(
            "SELECT email FROM suppliers WHERE id = ?1",
            params![counterparty_id],
            |row| row.get::<_, Option<String>>(0),
        ).map_err(|_| "供应商不存在".to_string())?
    } else {
        conn.query_row(
            "SELECT email FROM customers WHERE id = ?1",
            params![counterparty_id],
            |row| row.get::<_, Option<String>>(0),
        ).map_err(|_| "客户不存在".to_string())?
    }.ok_or("该联系人未设置邮箱地址".to_string())?;

    // 发送邮件
    use lettre::message::header::ContentType;
    use lettre::transport::smtp::authentication::Credentials;
    use lettre::{Message, SmtpTransport, Transport};
    use lettre::message::{MultiPart, SinglePart};
    use lettre::message::header::ContentDisposition;

    let pdf_data = std::fs::read(&file_path).map_err(|e| format!("读取PDF文件失败: {}", e))?;

    let attachment_filename = format!("statement_{}.pdf", counterparty_id);
    let email = Message::builder()
        .from(format!("{} <{}>", from_name, from_email).parse().map_err(|e| format!("发件人地址格式错误: {}", e))?)
        .to(to_email.parse().map_err(|e| format!("收件人地址格式错误: {}", e))?)
        .subject("对账单")
        .multipart(
            MultiPart::mixed()
                .singlepart(
                    SinglePart::builder()
                        .header(ContentType::TEXT_PLAIN)
                        .body(format!(
                            "您好，\n\n请查收附件中的对账单。\n\n此邮件由系统自动发送，请勿回复。\n\n{}", from_name
                        )),
                )
                .singlepart(
                    SinglePart::builder()
                        .header(ContentType::parse("application/pdf").map_err(|e| e.to_string())?)
                        .header(ContentDisposition::attachment(&attachment_filename))
                        .body(pdf_data),
                ),
        )
        .map_err(|e| e.to_string())?;

    let creds = Credentials::new(smtp_username, password);

    let mailer = SmtpTransport::starttls_relay(&smtp_host)
        .map_err(|e| format!("SMTP 连接失败: {}", e))?
        .port(smtp_port)
        .credentials(creds)
        .build();

    mailer.send(&email).map_err(|e| format!("邮件发送失败: {}", e))?;

    // 记录日志
    let log_id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO reconciliation_logs (id, counterparty_type, counterparty_id, counterparty_name,
         statement_format, sent_via, sent_to, status)
         VALUES (?1, ?2, ?3, (SELECT COALESCE((SELECT name FROM suppliers WHERE id = ?3),
           (SELECT name FROM customers WHERE id = ?3), '')), 'detail', 'email', ?4, 'success')",
        params![log_id, counterparty_type, counterparty_id, to_email],
    ).ok();

    Ok(format!("对账单已发送至: {}", to_email))
}

fn base64_decode(input: &str) -> Result<String, String> {
    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(input)
        .map_err(|e| format!("Base64解码失败: {}", e))?;
    String::from_utf8(bytes).map_err(|e| format!("UTF-8解码失败: {}", e))
}

// ---- 对账规则 CRUD ----

#[tauri::command]
pub fn create_reconciliation_rule(
    db: tauri::State<Mutex<Database>>,
    rule: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let id = uuid::Uuid::new_v4().to_string();
    let name = rule["name"].as_str().ok_or("规则名称不能为空")?;
    let trigger_type = rule["trigger_type"].as_str().ok_or("触发类型不能为空")?;
    let trigger_config = rule["trigger_config"].as_str().ok_or("触发配置不能为空")?;
    let statement_format = rule["statement_format"].as_str().ok_or("对账单格式不能为空")?;
    let action_type = rule["action_type"].as_str().ok_or("动作类型不能为空")?;

    conn.execute(
        "INSERT INTO reconciliation_rules (id, name, enabled, scope_type, scope_ids, trigger_type,
         trigger_config, statement_format, action_type, extra_emails)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            id, name,
            rule.get("enabled").and_then(|v| v.as_i64()).unwrap_or(1),
            rule.get("scope_type").and_then(|v| v.as_str()),
            rule.get("scope_ids").and_then(|v| v.as_str()),
            trigger_type, trigger_config, statement_format, action_type,
            rule.get("extra_emails").and_then(|v| v.as_str()),
        ],
    ).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "id": id, "message": "规则创建成功" }))
}

#[tauri::command]
pub fn update_reconciliation_rule(
    db: tauri::State<Mutex<Database>>,
    rule_id: String,
    rule: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    conn.execute(
        "UPDATE reconciliation_rules SET name = ?1, enabled = ?2, scope_type = ?3, scope_ids = ?4,
         trigger_type = ?5, trigger_config = ?6, statement_format = ?7, action_type = ?8,
         extra_emails = ?9, updated_at = CURRENT_TIMESTAMP WHERE id = ?10",
        params![
            rule["name"].as_str(),
            rule.get("enabled").and_then(|v| v.as_i64()),
            rule.get("scope_type").and_then(|v| v.as_str()),
            rule.get("scope_ids").and_then(|v| v.as_str()),
            rule.get("trigger_type").and_then(|v| v.as_str()),
            rule.get("trigger_config").and_then(|v| v.as_str()),
            rule.get("statement_format").and_then(|v| v.as_str()),
            rule.get("action_type").and_then(|v| v.as_str()),
            rule.get("extra_emails").and_then(|v| v.as_str()),
            rule_id,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "id": rule_id, "message": "规则更新成功" }))
}

#[tauri::command]
pub fn delete_reconciliation_rule(
    db: tauri::State<Mutex<Database>>,
    rule_id: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    conn.execute("DELETE FROM reconciliation_rules WHERE id = ?1", params![rule_id])
        .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "message": "规则已删除" }))
}

#[tauri::command]
pub fn get_reconciliation_rules(
    db: tauri::State<Mutex<Database>>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn.prepare(
        "SELECT id, name, enabled, scope_type, scope_ids, trigger_type, trigger_config,
                statement_format, action_type, extra_emails, last_run_at, created_at
         FROM reconciliation_rules ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;

    let rules: Vec<serde_json::Value> = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "enabled": row.get::<_, i32>(2)?,
                "scope_type": row.get::<_, Option<String>>(3)?,
                "scope_ids": row.get::<_, Option<String>>(4)?,
                "trigger_type": row.get::<_, String>(5)?,
                "trigger_config": row.get::<_, String>(6)?,
                "statement_format": row.get::<_, String>(7)?,
                "action_type": row.get::<_, String>(8)?,
                "extra_emails": row.get::<_, Option<String>>(9)?,
                "last_run_at": row.get::<_, Option<String>>(10)?,
                "created_at": row.get::<_, String>(11)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rules)
}

// ---- SMTP 配置 ----

#[tauri::command]
pub fn set_smtp_config(
    db: tauri::State<Mutex<Database>>,
    host: String,
    port: u16,
    username: String,
    password: String,
    from_email: String,
    from_name: Option<String>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 密码简单 base64 加密
    let encoded_pw = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        password.as_bytes(),
    );

    let port_str = port.to_string();
    let from_name_str = from_name.unwrap_or_else(|| from_email.clone());
    let configs: Vec<(&str, &str)> = vec![
        ("smtp_host", &host),
        ("smtp_port", &port_str),
        ("smtp_username", &username),
        ("smtp_password", &encoded_pw),
        ("smtp_from_email", &from_email),
        ("smtp_from_name", &from_name_str),
    ];

    for (key, value) in configs {
        conn.execute(
            "INSERT OR REPLACE INTO system_config (key, value) VALUES (?1, ?2)",
            params![key, value],
        ).map_err(|e| e.to_string())?;
    }

    Ok(serde_json::json!({ "message": "SMTP 配置保存成功" }))
}

#[tauri::command]
pub fn get_smtp_config(
    db: tauri::State<Mutex<Database>>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let get_val = |key: &str| -> Option<String> {
        conn.query_row(
            "SELECT value FROM system_config WHERE key = ?1",
            params![key],
            |row| row.get::<_, String>(0),
        ).ok()
    };

    Ok(serde_json::json!({
        "smtp_host": get_val("smtp_host"),
        "smtp_port": get_val("smtp_port"),
        "smtp_username": get_val("smtp_username"),
        "smtp_password": get_val("smtp_password").map(|_| "******".to_string()), // 脱敏
        "smtp_from_email": get_val("smtp_from_email"),
        "smtp_from_name": get_val("smtp_from_name"),
    }))
}

/// 手动触发规则检查
#[tauri::command]
pub fn check_reconciliation_rules(
    db: tauri::State<Mutex<Database>>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn.prepare(
        "SELECT id, name, scope_type, scope_ids, trigger_type, trigger_config,
                statement_format, action_type, extra_emails, last_run_at
         FROM reconciliation_rules WHERE enabled = 1"
    ).map_err(|e| e.to_string())?;

    let rules: Vec<(String, String, Option<String>, Option<String>, String, String, String, String, Option<String>, Option<String>)> = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, String>(7)?,
                row.get::<_, Option<String>>(8)?,
                row.get::<_, Option<String>>(9)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let _today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let now_ts = chrono::Local::now().timestamp();
    let mut triggered = 0;

    for (id, _name, scope_type, _scope_ids, trigger_type, trigger_config, stmt_format, _action_type, _extra_emails, last_run_at) in &rules {
        let should_trigger = match trigger_type.as_str() {
            "date" => {
                // trigger_config: {"day": 1} (每月第几日)
                if let Ok(cfg) = serde_json::from_str::<serde_json::Value>(trigger_config) {
                    let day = cfg.get("day").and_then(|v| v.as_i64()).unwrap_or(1);
                    let today_day = chrono::Local::now().format("%d").to_string().parse::<i64>().unwrap_or(1);
                    today_day == day
                } else { false }
            }
            "period" => {
                // trigger_config: {"interval_days": 7}
                if let Some(last) = last_run_at {
                    if let Ok(last_ts) = chrono::NaiveDateTime::parse_from_str(last, "%Y-%m-%d %H:%M:%S") {
                        let last_epoch = last_ts.and_utc().timestamp();
                        if let Ok(cfg) = serde_json::from_str::<serde_json::Value>(trigger_config) {
                            let interval = cfg.get("interval_days").and_then(|v| v.as_i64()).unwrap_or(7) * 86400;
                            (now_ts - last_epoch) >= interval
                        } else { false }
                    } else { false }
                } else { true } // 从未运行过
            }
            "amount" => {
                // trigger_config: {"min_amount": 100000}
                if let Ok(cfg) = serde_json::from_str::<serde_json::Value>(trigger_config) {
                    let min_amount = cfg.get("min_amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
                    // 查询 AR/AP 是否超过阈值
                    let exceed = match scope_type.as_deref() {
                        Some("supplier") | None => {
                            let ap: f64 = conn.query_row(
                                "SELECT COALESCE(SUM(total_amount - paid_amount), 0.0) FROM purchase_orders
                                 WHERE deleted_at IS NULL AND status != 'cancelled'",
                                [],
                                |row| row.get(0),
                            ).unwrap_or(0.0);
                            ap >= min_amount
                        }
                        Some("customer") => {
                            let ar: f64 = conn.query_row(
                                "SELECT COALESCE(SUM(total_amount - paid_amount), 0.0) FROM sales_orders
                                 WHERE deleted_at IS NULL AND status != 'cancelled'",
                                [],
                                |row| row.get(0),
                            ).unwrap_or(0.0);
                            ar >= min_amount
                        }
                        _ => false,
                    };
                    exceed
                } else { false }
            }
            _ => false,
        };

        if should_trigger {
            triggered += 1;
            // 更新 last_run_at
            conn.execute(
                "UPDATE reconciliation_rules SET last_run_at = CURRENT_TIMESTAMP WHERE id = ?1",
                params![id],
            ).ok();

            // 记录日志
            conn.execute(
                "INSERT INTO reconciliation_logs (id, rule_id, statement_format, sent_via, status)
                 VALUES (?1, ?2, ?3, 'auto', 'success')",
                params![uuid::Uuid::new_v4().to_string(), id, stmt_format],
            ).ok();
        }
    }

    Ok(serde_json::json!({
        "total_rules": rules.len(),
        "triggered": triggered,
        "message": format!("检查完成，{} 条规则中 {} 条被触发", rules.len(), triggered),
    }))
}
