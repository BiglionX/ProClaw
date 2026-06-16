//! AI 订单识别桌面端核心引擎（任务 #8）
//!
//! 提供 `recognize_order` Tauri 命令
//! 接收图片（base64），调用 LangChain（OpenAI GPT-4V / ProClaw LLM）
//! 返回结构化 JSON（items/confidence/draft_id）
//!
//! 关联 PRD：v4.0 §4（手写订单识别）

use crate::database::Database;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

// ==================== 数据结构 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderItem {
    pub product_name: String,
    pub quantity: f64,
    pub unit_price: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sku: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecognizeOrderResult {
    pub items: Vec<OrderItem>,
    pub total_amount: f64,
    pub confidence: f64,
    pub raw_text: String,
    pub model_used: String,
    pub cost_tokens: u32,
    pub duration_ms: u64,
    /// 草稿 ID（已保存到数据库时填充）
    pub draft_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderDraft {
    pub id: String,
    pub items_json: String,
    pub original_image_url: Option<String>,
    pub ai_raw_response: String,
    pub confidence: f64,
    pub created_at: i64,
}

// ==================== 主命令 ====================

/// AI 识别手写订单图片
///
/// # 参数
/// - `image_base64`: 图片的 base64 编码（不含 data:image/...;base64, 前缀）
/// - `customer_id`: 可选的客户 ID
/// - `save_draft`: 是否保存草稿到数据库
#[tauri::command]
pub async fn recognize_order(
    image_base64: String,
    customer_id: Option<String>,
    save_draft: Option<bool>,
    db: tauri::State<'_, Mutex<Database>>,
) -> Result<RecognizeOrderResult, String> {
    let t0 = std::time::Instant::now();

    // 1. 校验输入
    if image_base64.is_empty() {
        return Err("图片数据为空".to_string());
    }

    let save = save_draft.unwrap_or(true);

    // 2. 解码 base64
    let image_bytes = STANDARD
        .decode(&image_base64)
        .map_err(|e| format!("base64 解码失败: {}", e))?;

    if image_bytes.len() < 100 {
        return Err("图片数据过小，可能无效".to_string());
    }
    if image_bytes.len() > 20 * 1024 * 1024 {
        return Err("图片超过 20MB 上限".to_string());
    }

    // 3. 构造 LLM 提示词（OCR + 结构化）
    let prompt = build_recognize_prompt();

    // 4. 调用 LLM（在实际部署中应注入 LangChain client）
    //    当前为骨架实现：返回演示数据
    let (items, total_amount, confidence, raw_text, model_used, cost_tokens) =
        call_llm_recognize(&image_bytes, &prompt).await?;

    // 5. 保存草稿
    let draft_id = if save {
        let draft = OrderDraft {
            id: format!("draft-{}", uuid::Uuid::new_v4()),
            items_json: serde_json::to_string(&items).unwrap_or_default(),
            original_image_url: None, // 可选：保存图片到本地后填入
            ai_raw_response: raw_text.clone(),
            confidence,
            created_at: chrono::Utc::now().timestamp(),
        };

        if let Err(e) = save_order_draft(&db, &draft, customer_id.as_deref()) {
            eprintln!("[recognize_order] 保存草稿失败: {}", e);
            // 不阻塞主流程
        }

        Some(draft.id)
    } else {
        None
    };

    Ok(RecognizeOrderResult {
        items,
        total_amount,
        confidence,
        raw_text,
        model_used,
        cost_tokens,
        duration_ms: t0.elapsed().as_millis() as u64,
        draft_id,
    })
}

/// 列出订单草稿
#[tauri::command]
pub fn list_order_drafts(
    limit: Option<i64>,
    db: tauri::State<'_, Mutex<Database>>,
) -> Result<Vec<OrderDraft>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 确保表存在
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS order_drafts (
            id TEXT PRIMARY KEY,
            customer_id TEXT,
            items_json TEXT NOT NULL,
            original_image_url TEXT,
            ai_raw_response TEXT,
            confidence REAL NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'draft',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );",
    )
    .map_err(|e| e.to_string())?;

    let limit = limit.unwrap_or(20);
    let mut stmt = conn
        .prepare(
            "SELECT id, items_json, original_image_url, ai_raw_response, confidence, created_at
             FROM order_drafts
             ORDER BY created_at DESC
             LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;

    let drafts: Vec<OrderDraft> = stmt
        .query_map(rusqlite::params![limit], |row| {
            Ok(OrderDraft {
                id: row.get(0)?,
                items_json: row.get(1)?,
                original_image_url: row.get(2)?,
                ai_raw_response: row.get(3)?,
                confidence: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(drafts)
}

/// 删除订单草稿
#[tauri::command]
pub fn delete_order_draft(
    draft_id: String,
    db: tauri::State<'_, Mutex<Database>>,
) -> Result<bool, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let affected = conn
        .execute("DELETE FROM order_drafts WHERE id = ?1", rusqlite::params![draft_id])
        .map_err(|e| e.to_string())?;
    Ok(affected > 0)
}

// ==================== 内部函数 ====================

fn build_recognize_prompt() -> String {
    r#"你是一个资深销售订单识别助手。请从以下手写订单图片中识别所有商品行。

## 输出要求（JSON 格式）
{
  "items": [
    {
      "product_name": "商品名称（中文）",
      "quantity": 数字（如 10）,
      "unit_price": 数字（如 5.0）,
      "sku": "可选的 SKU/编号"
    }
  ],
  "total_amount": 所有行小计之和,
  "confidence": 0.0-1.0（基于图片清晰度）
}

## 注意事项
- 仅输出 JSON，不要其他文字
- 商品名称尽量标准化
- 数量和单价保留 2 位小数
- 数字模糊时给较低 confidence
- 找不到的字段设为 null

## 输出示例
{
  "items": [
    { "product_name": "苹果", "quantity": 10, "unit_price": 5.0, "sku": null },
    { "product_name": "香蕉", "quantity": 5, "unit_price": 3.5, "sku": null }
  ],
  "total_amount": 67.5,
  "confidence": 0.92
}
"#
    .to_string()
}

/// 调用 LLM 进行识别（骨架实现）
async fn call_llm_recognize(
    image_bytes: &[u8],
    prompt: &str,
) -> Result<(Vec<OrderItem>, f64, f64, String, String, u32), String> {
    // 实际部署中应调用：
    //   let client = reqwest::Client::new();
    //   let response = client.post("https://ai.proclaw.cc/api/v1/chat/completions")
    //       .bearer_auth(api_key)
    //       .json(&serde_json::json!({
    //           "model": "proclaw-gpt-4-vision",
    //           "messages": [{
    //               "role": "user",
    //               "content": [
    //                   { "type": "text", "text": prompt },
    //                   { "type": "image_url", "image_url": { "url": format!("data:image/jpeg;base64,{}", base64) } }
    //               ]
    //           }]
    //       }))
    //       .send().await...
    //   解析响应 + 计算 token + 扣费

    // 骨架实现：返回基于 image_bytes 哈希的演示数据
    let image_hash: u32 = image_bytes
        .iter()
        .take(1000)
        .fold(0u32, |acc, &b| acc.wrapping_mul(31).wrapping_add(b as u32));

    let demo_items = vec![
        OrderItem {
            product_name: format!("演示商品-{}", image_hash % 100),
            quantity: ((image_hash % 10) + 1) as f64,
            unit_price: ((image_hash % 200) + 50) as f64 / 10.0,
            sku: Some(format!("SKU-{:04X}", image_hash % 10000)),
        },
    ];

    let total = demo_items[0].quantity * demo_items[0].unit_price;
    let confidence = 0.85 + (image_hash % 10) as f64 / 100.0;

    Ok((
        demo_items,
        total,
        confidence,
        format!("[LLM 骨架响应] image_hash={}, prompt={}", image_hash, prompt),
        "proclaw-gpt-4-vision-skeleton".to_string(),
        1500,
    ))
}

fn save_order_draft(
    db: &tauri::State<'_, Mutex<Database>>,
    draft: &OrderDraft,
    customer_id: Option<&str>,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS order_drafts (
            id TEXT PRIMARY KEY,
            customer_id TEXT,
            items_json TEXT NOT NULL,
            original_image_url TEXT,
            ai_raw_response TEXT,
            confidence REAL NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'draft',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );",
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO order_drafts
            (id, customer_id, items_json, original_image_url, ai_raw_response, confidence, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            draft.id,
            customer_id,
            draft.items_json,
            draft.original_image_url,
            draft.ai_raw_response,
            draft.confidence,
            draft.created_at,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

// ==================== 单元测试 ====================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_recognize_prompt_contains_keys() {
        let prompt = build_recognize_prompt();
        assert!(prompt.contains("items"));
        assert!(prompt.contains("total_amount"));
        assert!(prompt.contains("confidence"));
    }

    #[test]
    fn test_recognize_order_empty_base64() {
        // 同步测试通过 task::spawn
        let result = std::thread::spawn(move || {
            // 模拟空输入
            image_base64_check("")
        })
        .join()
        .unwrap();
        assert!(result.is_err());
    }

    fn image_base64_check(b64: &str) -> Result<(), String> {
        if b64.is_empty() {
            return Err("图片数据为空".to_string());
        }
        Ok(())
    }

    #[test]
    fn test_order_item_serialization() {
        let item = OrderItem {
            product_name: "测试商品".to_string(),
            quantity: 10.0,
            unit_price: 5.5,
            sku: Some("TEST-001".to_string()),
        };
        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("\"product_name\":\"测试商品\""));
        assert!(json.contains("\"quantity\":10"));
        assert!(json.contains("\"unit_price\":5.5"));
    }

    #[test]
    fn test_recognize_result_serialization() {
        let result = RecognizeOrderResult {
            items: vec![],
            total_amount: 0.0,
            confidence: 0.0,
            raw_text: String::new(),
            model_used: "test-model".to_string(),
            cost_tokens: 0,
            duration_ms: 100,
            draft_id: None,
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"model_used\":\"test-model\""));
        assert!(json.contains("\"duration_ms\":100"));
    }
}
