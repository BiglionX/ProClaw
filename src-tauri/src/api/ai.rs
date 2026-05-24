// AI 订单识别模块
// 处理图片上传、OCR识别、订单草稿管理。
// Phase 2: 真实 AI/OCR 集成，替换模拟数据

use axum::{
    extract::{State, Json, Path},
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use super::AppState;
use serde_json::json;
use chrono::Utc;
use uuid::Uuid;
use rusqlite::params;

// ============================================================
// 数据结构
// ============================================================

/// AI 识别请求（Base64图片）
#[derive(Debug, Deserialize)]
pub struct RecognizeOrderRequest {
    pub image_base64: String,
    pub image_type: Option<String>,
    /// AI 提供商: "cloud"(默认)或"local"
    pub provider: Option<String>,
    /// 云端 API Key
    pub api_key: Option<String>,
    /// 云端 API 基础 URL（默认 OpenAI）
    pub api_base: Option<String>,
    /// 模型名称（默认 gpt-4o）
    pub model: Option<String>,
    /// 本地 OCR 端点
    pub ocr_endpoint: Option<String>,
    /// 操作用户ID
    pub user_id: Option<String>,
}

/// AI 识别响应
#[derive(Debug, Serialize, Deserialize)]
pub struct RecognizeOrderResponse {
    pub draft_id: String,
    pub items: Vec<OrderItem>,
    pub total_amount: f64,
    pub confidence: f64,
    pub message: Option<String>,
    pub provider_used: Option<String>,
    pub tokens_used: Option<i32>,
}

/// 订单明细项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderItem {
    pub product_name: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub total_price: f64,
}

/// 订单草稿保存请求
#[derive(Debug, Deserialize)]
pub struct SaveOrderDraftRequest {
    pub customer_id: Option<String>,
    pub items: Vec<OrderItem>,
    pub original_image_url: Option<String>,
    pub ai_raw_response: Option<String>,
}

/// 订单草稿响应
#[derive(Debug, Serialize)]
pub struct OrderDraftResponse {
    pub id: String,
    pub customer_id: Option<String>,
    pub items_json: String,
    pub original_image_url: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// AI 审核请求
#[derive(Debug, Deserialize)]
pub struct ValidateOrderItemsRequest {
    pub items: Vec<OrderItem>,
    pub customer_id: Option<String>,
}

/// AI 审核响应
#[derive(Debug, Serialize)]
pub struct ValidateOrderItemsResponse {
    pub is_valid: bool,
    pub warnings: Vec<ValidationWarning>,
    pub suggestions: Vec<String>,
}

/// 校验警告
#[derive(Debug, Serialize)]
pub struct ValidationWarning {
    pub item_index: usize,
    pub warning_type: String,
    pub message: String,
    pub suggestion: Option<String>,
}

/// 云端 AI 原始响应的内部结构
#[derive(Debug, Deserialize)]
struct OpenAIResponse {
    choices: Vec<OpenAIChoice>,
    usage: Option<OpenAIUsage>,
}

#[derive(Debug, Deserialize)]
struct OpenAIChoice {
    message: OpenAIMessage,
}

#[derive(Debug, Deserialize)]
struct OpenAIMessage {
    content: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIUsage {
    total_tokens: Option<i32>,
}

/// OCR 原始结果（PaddleOCR HTTP 响应）
#[derive(Debug, Deserialize)]
struct OCRResult {
    text: String,
    confidence: f32,
    // PaddleOCR 可能返回更多字段
}

#[derive(Debug, Deserialize)]
struct OCRResponse {
    results: Option<Vec<OCRResult>>,
    text: Option<String>,
}

// ============================================================
// AI 识别端点
// ============================================================

/// AI 订单识别端点
/// 接收 Base64 图片，调用 AI 模型识别订单内容
pub async fn recognize_order(
    State(state): State<AppState>,
    Json(payload): Json<RecognizeOrderRequest>,
) -> impl IntoResponse {
    let provider = payload.provider.as_deref().unwrap_or("cloud").to_lowercase();
    let image_type = payload.image_type.as_deref().unwrap_or("jpg");
    let user_id = payload.user_id.clone().unwrap_or_else(|| "system".to_string());

    // 解码 base64 图片为字节数据
    let image_bytes = match base64_decode(&payload.image_base64) {
        Ok(data) => data,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": format!("Invalid base64 image: {}", e)})),
            );
        }
    };

    let now = Utc::now();

    // 根据提供商调用相应服务
    let recognition_result = if provider == "local" {
        let endpoint = payload
            .ocr_endpoint
            .as_deref()
            .unwrap_or("http://localhost:8866/predict/ocr_system");
        call_local_ocr(&image_bytes, endpoint).await
    } else {
        // cloud (default)
        let api_key = payload
            .api_key
            .clone()
            .filter(|k| !k.is_empty())
            .or_else(|| std::env::var("OPENAI_API_KEY").ok())
            .unwrap_or_default();
        let api_base = payload
            .api_base
            .as_deref()
            .unwrap_or("https://api.openai.com/v1");
        let model = payload.model.as_deref().unwrap_or("gpt-4o");

        if api_key.is_empty() {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "API key is required for cloud provider. Set OPENAI_API_KEY env var or provide api_key in request."})),
            );
        }

        call_cloud_ai(&image_bytes, &api_key, api_base, model).await
    };

    let now_str = now.to_rfc3339();

    match recognition_result {
        Ok(mut result) => {
            let draft_id = Uuid::new_v4().to_string();
            result.draft_id = draft_id.clone();
            result.provider_used = Some(provider.clone());

            let items_json = serde_json::to_string(&result.items).unwrap_or_default();

            // 保存到 order_drafts
            let db = match state.db.lock() {
                Ok(db) => db,
                Err(_) => return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": "Database lock error"})),
                ),
            };
            let conn = db.connection();

            let _ = conn.execute(
                "INSERT INTO order_drafts (id, sales_id, items_json, original_image_url, ai_raw_response, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, 'draft', ?6, ?7)",
                rusqlite::params![
                    draft_id,
                    None::<String>,
                    items_json,
                    image_type,
                    serde_json::to_string(&result).unwrap_or_default(),
                    now_str,
                    now_str,
                ],
            );

            // 保存 AI 识别日志
            let image_size = image_bytes.len() as i32;
            let _ = conn.execute(
                "INSERT INTO ai_recognition_logs (id, user_id, image_size, model_name, confidence, tokens_used, cost, status, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'success', ?8)",
                rusqlite::params![
                    Uuid::new_v4().to_string(),
                    user_id,
                    image_size,
                    if provider == "local" { "local-ocr" } else { payload.model.as_deref().unwrap_or("gpt-4o") },
                    result.confidence,
                    result.tokens_used.unwrap_or(0),
                    calculate_cost(result.tokens_used.unwrap_or(0), payload.model.as_deref().unwrap_or("gpt-4o")),
                    now_str,
                ],
            );

            (
                StatusCode::OK,
                Json(serde_json::to_value(result).unwrap_or(json!({"error": "Serialization failed"}))),
            )
        }
        Err(err_msg) => {
            // 记录失败日志
            if let Ok(db) = state.db.lock() {
                let conn = db.connection();
                let _ = conn.execute(
                    "INSERT INTO ai_recognition_logs (id, user_id, image_size, model_name, confidence, tokens_used, cost, status, error_message, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'failed', ?8, ?9)",
                    rusqlite::params![
                        Uuid::new_v4().to_string(),
                        user_id,
                        image_bytes.len() as i32,
                        if provider == "local" { "local-ocr" } else { payload.model.as_deref().unwrap_or("gpt-4o") },
                        0.0,
                        0,
                        0.0,
                        err_msg.clone(),
                        now.to_rfc3339(),
                    ],
                );
            }

            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": format!("AI recognition failed: {}", err_msg)})),
            )
        }
    }
}

// ============================================================
// 校验订单明细
// ============================================================

/// 校验订单明细
/// 检查商品存在性(按名称和SKU)、库存充足性、价格合理性、异常价格检测
pub async fn validate_order_items(
    State(state): State<AppState>,
    Json(payload): Json<ValidateOrderItemsRequest>,
) -> impl IntoResponse {
    let mut warnings = Vec::new();
    let mut suggestions = Vec::new();

    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Database lock error"})),
        ),
    };
    let conn = db.connection();

    for (idx, item) in payload.items.iter().enumerate() {
        // ---- 1. 按名称和SKU双重匹配查找商品 ----
        let product = conn.query_row(
            "SELECT id, name, sku, current_stock, cost_price, sell_price, category_id
             FROM products
             WHERE (name = ?1 OR sku = ?1) AND deleted_at IS NULL
             LIMIT 1",
            params![item.product_name],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,    // id
                    row.get::<_, String>(1)?,     // name
                    row.get::<_, String>(2)?,     // sku
                    row.get::<_, i32>(3)?,        // current_stock
                    row.get::<_, f64>(4)?,        // cost_price
                    row.get::<_, f64>(5)?,        // sell_price
                    row.get::<_, Option<String>>(6)?, // category_id
                ))
            },
        );

        match product {
            Ok((product_id, product_name, sku, current_stock, cost_price, sell_price, _category_id)) => {
                // ---- 2. 库存充足性检查 ----
                if (current_stock as f64) < item.quantity {
                    warnings.push(ValidationWarning {
                        item_index: idx,
                        warning_type: "stock_insufficient".to_string(),
                        message: format!(
                            "商品 '{}' (SKU: {}) 库存不足: 需要 {:.0}, 当前库存 {}",
                            product_name, sku, item.quantity, current_stock
                        ),
                        suggestion: Some(format!("建议可售数量: {}, 当前缺 {:.0}", current_stock,
                            item.quantity - current_stock as f64)),
                    });
                }

                // ---- 3. 成本价校验: 售价低于成本价时警告 ----
                if cost_price > 0.0 && item.unit_price < cost_price {
                    warnings.push(ValidationWarning {
                        item_index: idx,
                        warning_type: "price_too_low".to_string(),
                        message: format!(
                            "商品 '{}' 单价 {:.2} 低于成本价 {:.2}",
                            product_name, item.unit_price, cost_price
                        ),
                        suggestion: Some(format!("建议售价不低于 {:.2} (成本价 +20%)", cost_price * 1.2)),
                    });
                }

                // ---- 4. 异常价格检测: 偏离历史均价 >50% 时警告 ----
                if sell_price > 0.0 {
                    let deviation = (item.unit_price - sell_price).abs() / sell_price;
                    if deviation > 0.5 {
                        warnings.push(ValidationWarning {
                            item_index: idx,
                            warning_type: "price_unusual".to_string(),
                            message: format!(
                                "商品 '{}' 单价 {:.2} 偏离标准售价 {:.2} ({:.0}%)",
                                product_name, item.unit_price, sell_price, deviation * 100.0
                            ),
                            suggestion: Some(format!(
                                "请确认价格 {:.2} 是否正确，标准售价为 {:.2}",
                                item.unit_price, sell_price
                            )),
                        });
                    }
                }

                // ---- 5. 若库存接近下限则建议补货 ----
                let min_stock: i32 = conn.query_row(
                    "SELECT COALESCE(min_stock, 0) FROM products WHERE id = ?1",
                    params![product_id],
                    |row| row.get(0),
                ).unwrap_or(0);

                let after_sale_stock = current_stock - item.quantity as i32;
                if after_sale_stock < min_stock {
                    suggestions.push(format!(
                        "商品 '{}' 售后库存({})将低于最小库存({})，建议补货",
                        product_name, after_sale_stock, min_stock
                    ));
                }

                // 如果通过 SKU 匹配但与原始输入名称不同，提示用户
                if item.product_name != product_name && item.product_name == sku {
                    suggestions.push(format!(
                        "第{}项: SKU '{}' 已匹配为商品 '{}'",
                        idx + 1, sku, product_name
                    ));
                }
            }
            Err(_) => {
                // 商品不存在
                warnings.push(ValidationWarning {
                    item_index: idx,
                    warning_type: "product_not_found".to_string(),
                    message: format!("商品 '{}' 不存在（名称和SKU均未匹配）", item.product_name),
                    suggestion: Some("请在商品管理中新增此商品后重试".to_string()),
                });
            }
        }
    }

    // 如果客户有历史订单，给出价格参考建议
    if let Some(ref customer_id) = payload.customer_id {
        if let Ok(avg_order) = conn.query_row(
            "SELECT COALESCE(AVG(total_amount), 0) FROM sales_orders WHERE customer_id = ?1",
            params![customer_id],
            |row| row.get::<_, f64>(0),
        ) {
            if avg_order > 0.0 {
                let current_total: f64 = payload.items.iter().map(|i| i.total_price).sum();
                if (current_total - avg_order).abs() / avg_order > 0.5 {
                    suggestions.push(format!(
                        "注意: 本次订单总额 {:.2} 与该客户历史平均订单额 {:.2} 差异较大",
                        current_total, avg_order
                    ));
                }
            }
        }
    }

    let response = ValidateOrderItemsResponse {
        is_valid: warnings.is_empty() || warnings.iter().all(|w| w.warning_type == "price_unusual"),
        warnings,
        suggestions,
    };

    (
        StatusCode::OK,
        Json(serde_json::to_value(response).unwrap_or(json!({"error": "Serialization failed"}))),
    )
}

// ============================================================
// 订单草稿管理
// ============================================================

/// 保存订单草稿
pub async fn save_order_draft(
    State(state): State<AppState>,
    Json(payload): Json<SaveOrderDraftRequest>,
) -> impl IntoResponse {
    let draft_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let items_json = serde_json::to_string(&payload.items).unwrap_or_default();

    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Database lock error"})),
        ),
    };
    let conn = db.connection();

    if let Err(e) = conn.execute(
        "INSERT INTO order_drafts (id, sales_id, customer_id, items_json, original_image_url, ai_raw_response, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'draft', ?7, ?8)",
        rusqlite::params![
            draft_id,
            None::<String>,
            payload.customer_id,
            items_json,
            payload.original_image_url,
            payload.ai_raw_response,
            now,
            now,
        ],
    ) {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("Failed to save draft: {}", e)})),
        );
    }

    let response = OrderDraftResponse {
        id: draft_id,
        customer_id: payload.customer_id,
        items_json: serde_json::to_string(&payload.items).unwrap_or_default(),
        original_image_url: payload.original_image_url,
        created_at: now.clone(),
        updated_at: now,
    };

    (
        StatusCode::OK,
        Json(serde_json::to_value(response).unwrap_or(json!({"error": "Serialization failed"})))
    )
}

/// 获取订单草稿
pub async fn get_order_draft(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Database lock error"})),
        ),
    };
    let conn = db.connection();

    let result = conn.query_row(
        "SELECT id, customer_id, items_json, original_image_url, created_at, updated_at
         FROM order_drafts WHERE id = ?1",
        rusqlite::params![id],
        |row| {
            Ok(OrderDraftResponse {
                id: row.get(0)?,
                customer_id: row.get(1)?,
                items_json: row.get(2)?,
                original_image_url: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        },
    );

    match result {
        Ok(draft) => (
            StatusCode::OK,
            Json(serde_json::to_value(draft).unwrap_or(json!({"error": "Serialization failed"})))
        ),
        Err(_) => (
            StatusCode::NOT_FOUND,
            Json(json!({"error": "Draft not found"}))
        ),
    }
}

/// 提交订单草稿（确认生成正式销售单）
/// 包含库存扣减和库存交易记录
pub async fn submit_order_draft(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Database lock error"})),
        ),
    };
    let conn = db.connection();

    // 查询草稿
    let draft = conn.query_row(
        "SELECT id, customer_id, items_json, status FROM order_drafts WHERE id = ?1",
        rusqlite::params![id],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        },
    );

    let (draft_id, customer_id, items_json, draft_status) = match draft {
        Ok(d) => d,
        Err(_) => return (
            StatusCode::NOT_FOUND,
            Json(json!({"error": "Draft not found"})),
        ),
    };

    // 防止重复提交
    if draft_status == "submitted" {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Draft already submitted"})),
        );
    }

    // 解析 items
    let items: Vec<OrderItem> = match serde_json::from_str::<Vec<OrderItem>>(&items_json) {
        Ok(items) if !items.is_empty() => items,
        Ok(_) => return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Draft has no items"})),
        ),
        Err(e) => return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": format!("Failed to parse items: {}", e)})),
        ),
    };

    // 开始事务
    let tx = match conn.unchecked_transaction() {
        Ok(tx) => tx,
        Err(e) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("Transaction error: {}", e)})),
        ),
    };

    let so_id = Uuid::new_v4().to_string();
    let so_number = format!("SO-{}", &so_id[..8]);
    let now = Utc::now().to_rfc3339();
    let total_amount: f64 = items.iter().map(|item| item.total_price).sum();

    // ---- 预检查: 验证所有商品存在且库存充足 ----
    for item in items.iter() {
        let product_info = tx.query_row(
            "SELECT id, name, current_stock FROM products
             WHERE (name = ?1 OR sku = ?1) AND deleted_at IS NULL LIMIT 1",
            params![item.product_name],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i32>(2)?,
                ))
            },
        );

        match product_info {
            Ok((_, _, stock)) => {
                if (stock as f64) < item.quantity {
                    let _ = tx.rollback();
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(json!({
                            "error": format!("库存不足: 商品 '{}' 需要 {:.0}, 当前库存 {}", item.product_name, item.quantity, stock)
                        })),
                    );
                }
            }
            Err(_) => {
                let _ = tx.rollback();
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({
                        "error": format!("商品不存在: '{}'", item.product_name)
                    })),
                );
            }
        }
    }

    // ---- 创建销售订单主记录 ----
    if let Err(e) = tx.execute(
        "INSERT INTO sales_orders (id, so_number, customer_id, order_date, total_amount, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'confirmed', ?6, ?7)",
        rusqlite::params![so_id, so_number, customer_id, now, total_amount, now, now],
    ) {
        let _ = tx.rollback();
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("Failed to create sales order: {}", e)})),
        );
    }

    // ---- 插入订单明细 + 扣减库存 + 记录库存交易 ----
    for item in items.iter() {
        // 获取产品信息
        let product_info = match tx.query_row(
            "SELECT id, name, current_stock FROM products
             WHERE (name = ?1 OR sku = ?1) AND deleted_at IS NULL LIMIT 1",
            params![item.product_name],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i32>(2)?,
                ))
            },
        ) {
            Ok(p) => p,
            Err(e) => {
                let _ = tx.rollback();
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": format!("Product query failed: {}", e)})),
                );
            }
        };

        let (product_id, product_name, before_stock) = product_info;

        // 插入销售订单明细
        let so_item_id = Uuid::new_v4().to_string();
        if let Err(e) = tx.execute(
            "INSERT INTO sales_order_items (id, sales_order_id, product_id, quantity, unit_price, total_price, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![so_item_id, so_id, product_id, item.quantity as i32, item.unit_price, item.total_price, now, now],
        ) {
            let _ = tx.rollback();
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": format!("Failed to insert order item: {}", e)})),
            );
        }

        // 扣减库存
        if let Err(e) = tx.execute(
            "UPDATE products SET current_stock = current_stock - ?1, updated_at = ?2 WHERE id = ?3",
            params![item.quantity as i32, now, product_id],
        ) {
            let _ = tx.rollback();
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": format!("Failed to deduct inventory: {}", e)})),
            );
        }

        let after_stock = before_stock - item.quantity as i32;

        // 写入库存交易记录
        let trans_id = Uuid::new_v4().to_string();
        if let Err(e) = tx.execute(
            "INSERT INTO inventory_transactions (id, product_id, transaction_type, quantity, before_stock, after_stock,
             reference_type, reference_id, notes, created_at)
             VALUES (?1, ?2, 'out', ?3, ?4, ?5, 'sales_order', ?6, ?7, ?8)",
            rusqlite::params![
                trans_id,
                product_id,
                item.quantity as i32,
                before_stock,
                after_stock,
                so_id,
                format!("AI订单确认: {}", product_name),
                now,
            ],
        ) {
            let _ = tx.rollback();
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": format!("Failed to record inventory transaction: {}", e)})),
            );
        }
    }

    // ---- 更新草稿状态为已提交 ----
    if let Err(e) = tx.execute(
        "UPDATE order_drafts SET sales_id = ?2, status = 'submitted', updated_at = ?3 WHERE id = ?1",
        rusqlite::params![draft_id, so_id, now],
    ) {
        let _ = tx.rollback();
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("Failed to update draft: {}", e)})),
        );
    }

    // ---- 提交事务 ----
    if let Err(e) = tx.commit() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("Transaction commit failed: {}", e)})),
        );
    }

    (
        StatusCode::OK,
        Json(json!({
            "message": "Order submitted successfully",
            "so_id": so_id,
            "so_number": so_number,
            "total_amount": total_amount,
            "item_count": items.len()
        }))
    )
}

// ============================================================
// AI 引擎调用
// ============================================================

/// 调用云端 AI 模型（GPT-4V / GPT-4o 等 OpenAI 兼容 API）
async fn call_cloud_ai(
    image_data: &[u8],
    api_key: &str,
    api_base: &str,
    model: &str,
) -> Result<RecognizeOrderResponse, String> {
    // 将图片编码为 base64 以供 API 使用
    let image_base64 = base64_encode(image_data);

    // 读取文件头判断 MIME 类型
    let mime_type = detect_image_format(image_data);

    let api_url = format!("{}/chat/completions", api_base.trim_end_matches('/'));

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // 构建 OpenAI Vision API 请求
    let request_body = json!({
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "你是一个专业的订单识别助手。你的任务是从图片中提取订单/单据的商品信息。\
请仔细查看图片，识别其中的文字内容。\
返回纯JSON格式，不要添加任何解释文字或代码块标记。"
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "请从这张订单/单据图片中识别所有商品项目。\
对于每个商品，提取以下信息：\
- product_name: 商品名称（保持原文） \
- quantity: 数量（数字） \
- unit_price: 单价（数字，元） \
- total_price: 该项小计（quantity × unit_price） \
\
请严格按以下JSON格式返回结果。如果图片中没有找到任何商品，返回空的items数组：\
{\"items\": [{\"product_name\": \"商品名\", \"quantity\": 数量, \"unit_price\": 单价, \"total_price\": 小计}]}"
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": format!("data:{};base64,{}", mime_type, image_base64),
                            "detail": "high"
                        }
                    }
                ]
            }
        ],
        "max_tokens": 2000,
        "temperature": 0.1
    });

    let response = client
        .post(&api_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("API request failed: {}", e))?;

    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    if !status.is_success() {
        return Err(format!("API returned {}: {}", status.as_u16(), response_text));
    }

    // 解析 OpenAI 响应
    let openai_resp: OpenAIResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse AI response: {} - raw: {}", e,
            if response_text.len() > 500 { format!("{}...", &response_text[..500]) } else { response_text.clone() }
        ))?;

    let content = openai_resp
        .choices
        .first()
        .ok_or_else(|| "AI response has no choices".to_string())?
        .message
        .content
        .clone();

    // 尝试从响应中提取 JSON（AI 可能返回带 markdown 代码块的 JSON）
    let items = extract_items_from_ai_response(&content)?;

    let total_amount: f64 = items.iter().map(|i| i.total_price).sum();
    let tokens_used = openai_resp
        .usage
        .as_ref()
        .and_then(|u| u.total_tokens);

    Ok(RecognizeOrderResponse {
        draft_id: String::new(), // caller will fill
        items,
        total_amount,
        confidence: 0.90,
        message: Some("AI 识别完成".to_string()),
        provider_used: Some("cloud".to_string()),
        tokens_used,
    })
}

/// 调用本地 OCR 引擎（PaddleOCR HTTP 服务）
async fn call_local_ocr(
    image_data: &[u8],
    endpoint: &str,
) -> Result<RecognizeOrderResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // PaddleOCR Docker 服务通常接受 multipart/form-data 文件上传
    let image_base64 = base64_encode(image_data);

    let response = client
        .post(endpoint)
        .json(&json!({
            "images": [image_base64]
        }))
        .send()
        .await
        .map_err(|e| format!("OCR service request failed: {}. Is the PaddleOCR Docker container running?", e))?;

    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read OCR response: {}", e))?;

    if !status.is_success() {
        return Err(format!("OCR service returned {}: {}", status.as_u16(), response_text));
    }

    // 解析 OCR 响应
    let ocr_resp: OCRResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse OCR response: {} - raw: {}", e, response_text))?;

    // 提取所有识别文本
    let full_text = if let Some(results) = &ocr_resp.results {
        results.iter()
            .map(|r| r.text.as_str())
            .collect::<Vec<_>>()
            .join("\n")
    } else if let Some(text) = &ocr_resp.text {
        text.clone()
    } else {
        return Err("OCR response contains no text".to_string());
    };

    if full_text.trim().is_empty() {
        return Err("OCR returned empty text".to_string());
    }

    // 从 OCR 文本中解析商品项目（启发式规则）
    let items = parse_ocr_text_to_items(&full_text)?;

    if items.is_empty() {
        return Err(format!("Could not identify any order items in OCR text. Extracted text: {}",
            if full_text.len() > 300 { format!("{}...", &full_text[..300]) } else { full_text }));
    }

    let total_amount: f64 = items.iter().map(|i| i.total_price).sum();
    let confidence = if let Some(results) = &ocr_resp.results {
        if !results.is_empty() {
            results.iter().map(|r| r.confidence).sum::<f32>() / results.len() as f32
        } else {
            0.7
        }
    } else {
        0.7
    };

    Ok(RecognizeOrderResponse {
        draft_id: String::new(),
        items,
        total_amount,
        confidence: confidence as f64,
        message: Some("OCR 识别完成".to_string()),
        provider_used: Some("local".to_string()),
        tokens_used: None,
    })
}

// ============================================================
// 辅助函数
// ============================================================

/// 从 AI 响应文本中提取商品列表
/// 处理各种可能的格式：纯 JSON、带 markdown 代码块的 JSON、带解释文字的 JSON
fn extract_items_from_ai_response(content: &str) -> Result<Vec<OrderItem>, String> {
    let content = content.trim();

    // 尝试1: 直接解析整个内容为 JSON
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(content) {
        if let Some(items) = parsed.get("items").and_then(|v| v.as_array()) {
            return parse_order_items(items);
        }
    }

    // 尝试2: 提取 ```json ... ``` 代码块
    if let Some(json_block) = extract_json_block(content, "json") {
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&json_block) {
            if let Some(items) = parsed.get("items").and_then(|v| v.as_array()) {
                return parse_order_items(items);
            }
        }
    }

    // 尝试3: 提取 ``` ... ``` 代码块（无语言标记）
    if let Some(json_block) = extract_json_block(content, "") {
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&json_block) {
            if let Some(items) = parsed.get("items").and_then(|v| v.as_array()) {
                return parse_order_items(items);
            }
        }
    }

    // 尝试4: 查找第一个 { 到最后一个 } 的 JSON
    if let Some(start) = content.find('{') {
        if let Some(end) = content.rfind('}') {
            let substr = &content[start..=end];
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(substr) {
                if let Some(items) = parsed.get("items").and_then(|v| v.as_array()) {
                    return parse_order_items(items);
                }
            }
        }
    }

    Err(format!("Could not extract order items from AI response: {}",
        if content.len() > 200 { format!("{}...", &content[..200]) } else { content.to_string() }))
}

/// 提取 markdown 代码块
fn extract_json_block(content: &str, tag: &str) -> Option<String> {
    let start_tag = if tag.is_empty() {
        "```".to_string()
    } else {
        format!("```{}", tag)
    };

    if let Some(start) = content.find(&start_tag) {
        let after_start = &content[start + start_tag.len()..];
        if let Some(end) = after_start.find("```") {
            return Some(after_start[..end].trim().to_string());
        }
    }
    None
}

/// 将 JSON Value 数组解析为 OrderItem 列表
fn parse_order_items(items: &[serde_json::Value]) -> Result<Vec<OrderItem>, String> {
    let mut result = Vec::new();
    for item_val in items {
        let product_name = item_val
            .get("product_name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if product_name.is_empty() {
            continue; // skip empty items
        }
        let quantity = item_val
            .get("quantity")
            .and_then(|v| v.as_f64())
            .unwrap_or(1.0);
        let unit_price = item_val
            .get("unit_price")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let total_price = item_val
            .get("total_price")
            .and_then(|v| v.as_f64())
            .unwrap_or_else(|| quantity * unit_price);

        result.push(OrderItem {
            product_name,
            quantity,
            unit_price,
            total_price,
        });
    }
    if result.is_empty() {
        return Err("No valid items found in response".to_string());
    }
    Ok(result)
}

/// 从 OCR 文本中解析商品项目
/// 使用启发式规则：以行为单位，匹配 名称 + 数字 + 数字 的模式
fn parse_ocr_text_to_items(text: &str) -> Result<Vec<OrderItem>, String> {
    let mut items = Vec::new();

    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        // 尝试正则匹配：中文/英文名称 + 数字 + 数字(单价) + 可选数字(小计)
        // 模式：商品名 数量 单价 [小计]
        let re = regex::Regex::new(
            r"([\p{Han}\w\s\-]+?)\s*[×xX*]?\s*(\d+\.?\d*)\s*(?:个|件|箱|袋|瓶|盒|桶|斤|公斤|kg|g|吨|t)?\s*(?:[¥￥$]?\s*(\d+\.?\d*)\s*)?\s*(?:[¥￥$]?\s*(\d+\.?\d*))?"
        ).map_err(|e| format!("Regex error: {}", e))?;

        if let Some(caps) = re.captures(line) {
            let name = caps.get(1).map(|m| m.as_str().trim()).unwrap_or("").to_string();
            if name.is_empty() || name.len() > 50 {
                continue;
            }

            let quantity: f64 = caps.get(2)
                .and_then(|m| m.as_str().parse().ok())
                .unwrap_or(0.0);
            if quantity == 0.0 {
                continue;
            }

            // 尝试提取单价和总价
            let unit_price = caps.get(3)
                .and_then(|m| m.as_str().parse::<f64>().ok());
            let total_price_from_caps = caps.get(4)
                .and_then(|m| m.as_str().parse::<f64>().ok());

            let (unit_price, total_price) = match (unit_price, total_price_from_caps) {
                (Some(up), Some(tp)) => (up, tp),
                (Some(up), None) => (up, (quantity * up * 100.0).round() / 100.0),
                (None, Some(tp)) => {
                    // 有总价无单价，反推单价
                    let up = if quantity > 0.0 {
                        (tp / quantity * 100.0).round() / 100.0
                    } else {
                        0.0
                    };
                    (up, tp)
                }
                (None, None) => {
                    // 都没有，假定单价为0
                    (0.0, 0.0)
                }
            };

            items.push(OrderItem {
                product_name: name,
                quantity,
                unit_price,
                total_price,
            });
        }
    }

    if items.is_empty() {
        return Err("No order items could be extracted from OCR text".to_string());
    }

    Ok(items)
}

/// Base64 解码
fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    // 移除可能存在的 data:image/xxx;base64, 前缀
    let encoded = if let Some(idx) = input.find(";base64,") {
        &input[idx + 8..]
    } else {
        input
    };
    STANDARD
        .decode(encoded.trim())
        .map_err(|e| format!("Base64 decode error: {}", e))
}

/// Base64 编码
fn base64_encode(data: &[u8]) -> String {
    use base64::{engine::general_purpose::STANDARD, Engine};
    STANDARD.encode(data)
}

/// 根据文件头检测图片 MIME 类型
fn detect_image_format(data: &[u8]) -> &'static str {
    if data.len() < 4 {
        return "image/jpeg";
    }
    match &data[0..4] {
        [0xFF, 0xD8, 0xFF, _] => "image/jpeg",
        [0x89, b'P', b'N', b'G'] => "image/png",
        [b'R', b'I', b'F', b'F'] => "image/gif",
        [b'B', b'M', _, _] => "image/bmp",
        _ => {
            // 检查 WebP: RIFF....WEBP
            if data.len() >= 12 && &data[0..4] == b"RIFF" && &data[8..12] == b"WEBP" {
                "image/webp"
            } else {
                "image/jpeg"
            }
        }
    }
}

/// 计算 AI 调用费用（人民币，参考 OpenAI 定价）
fn calculate_cost(tokens: i32, model: &str) -> f64 {
    let tokens = tokens as f64;
    match model {
        "gpt-4o" => tokens * 0.000015,              // $2.50/1M input + $10/1M output, approx average
        "gpt-4-turbo" => tokens * 0.00003,           // more expensive
        "gpt-3.5-turbo" => tokens * 0.000002,        // much cheaper
        "claude-3-opus" => tokens * 0.00003,
        "claude-3-sonnet" => tokens * 0.000015,
        _ => tokens * 0.000015,                      // default
    }
}

// ============================================================
// 测试
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_items_from_json_response() {
        let content = r#"{"items": [{"product_name": "苹果", "quantity": 10, "unit_price": 5.0, "total_price": 50.0}]}"#;
        let items = extract_items_from_ai_response(content).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].product_name, "苹果");
        assert_eq!(items[0].quantity, 10.0);
    }

    #[test]
    fn test_extract_items_from_markdown_json() {
        let content = "以下是识别结果：\n```json\n{\"items\": [{\"product_name\": \"香蕉\", \"quantity\": 5, \"unit_price\": 3.5, \"total_price\": 17.5}]}\n```\n共识别1件商品";
        let items = extract_items_from_ai_response(content).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].product_name, "香蕉");
    }

    #[test]
    fn test_extract_items_from_code_block() {
        let content = "```\n{\"items\": [{\"product_name\": \"梨\", \"quantity\": 3, \"unit_price\": 4.0, \"total_price\": 12.0}]}\n```";
        let items = extract_items_from_ai_response(content).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].product_name, "梨");
    }

    #[test]
    fn test_parse_ocr_text_to_items() {
        let text = "苹果 10 5.00 50.00\n香蕉 5个 3.50 17.50\n桔子 ×3 ¥4.0";
        let items = parse_ocr_text_to_items(text).unwrap();
        assert!(!items.is_empty());
    }

    #[test]
    fn test_detect_image_format() {
        let jpeg = vec![0xFF, 0xD8, 0xFF, 0xE0];
        assert_eq!(detect_image_format(&jpeg), "image/jpeg");

        let png = vec![0x89, b'P', b'N', b'G'];
        assert_eq!(detect_image_format(&png), "image/png");
    }

    #[test]
    fn test_base64_decode_with_prefix() {
        let input = "data:image/png;base64,aGVsbG8=";
        let result = base64_decode(input).unwrap();
        assert_eq!(result, b"hello");
    }

    #[test]
    fn test_calculate_cost() {
        let cost = calculate_cost(1000, "gpt-4o");
        assert!(cost > 0.0);
        assert!(cost < 0.1);

        let cost = calculate_cost(1000, "gpt-3.5-turbo");
        assert!(cost < 0.01); // 3.5 is much cheaper
    }
}
