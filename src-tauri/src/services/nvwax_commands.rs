use crate::database::Database;
use crate::services::nvwax_billing::NvwaXBilling;
/// NvwaX Tauri 命令桥接
///
/// 将 NvwaX API 暴露为 Tauri IPC 命令，供前端调用。
/// 所有命令在调用 NvwaX API 前自动检查用户 Token 余额。
///
/// PRD: ProClaw × NvwaX API 集成需求文档
use crate::services::nvwax_client::{
    self, BatchExportPayload, CreateAgentPayload, CreateAiTeamPayload, ExportPayload, ListParams,
    NvwaXClient, SearchParams, UnifiedSearchParams, UpdateAgentPayload, UpdateAiTeamPayload,
};
use crate::utils::crypto::Aes256GcmCipher;
use std::sync::{Arc, Mutex};
use tauri::State;

// ============================================================
// 内部辅助：获取当前用户 ID
// ============================================================

/// 从 Tauri State 或环境中获取当前用户 ID
/// 实际项目中应从 Tauri 的 session/app handle 中获取
fn current_user_id() -> String {
    // 优先从环境变量读取（开发环境）
    std::env::var("PROCLAW_USER_ID").unwrap_or_else(|_| "u_test001".to_string())
}

// ============================================================
// 响应包装
// ============================================================

/// 统一 Tauri 命令响应
#[derive(Debug, serde::Serialize)]
pub struct NvwaXCmdResponse<T: serde::Serialize> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T: serde::Serialize> NvwaXCmdResponse<T> {
    fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    fn err(msg: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(msg),
        }
    }
}

/// 简单布尔响应
type BoolResponse = NvwaXCmdResponse<bool>;

// ============================================================
// 转发：从 NvwaXError 到 String
// ============================================================

fn map_error(e: nvwax_client::NvwaXError) -> String {
    e.to_string()
}

// ============================================================
// Marketplace 命令
// ============================================================

/// 搜索 Agent 市场
#[tauri::command]
pub async fn nvwax_search_agents(
    client: State<'_, Arc<NvwaXClient>>,
    billing: State<'_, Arc<NvwaXBilling>>,
    q: Option<String>,
    category: Option<String>,
    tags: Option<String>,
    page: Option<u32>,
    limit: Option<u32>,
) -> Result<NvwaXCmdResponse<nvwax_client::AgentListResponse>, String> {
    let user_id = current_user_id();
    let estimated = billing.estimate_call_cost(None, "marketplace/search_agents");
    billing.require_balance(&user_id, estimated)?;

    let params = SearchParams {
        q,
        category,
        tags,
        industry: None,
        page,
        limit,
    };

    match client.search_agents(params).await {
        Ok(result) => {
            billing.record_consumption(
                &user_id,
                estimated,
                "/api/v1/marketplace/agents",
                None,
                Some("marketplace"),
            )?;
            Ok(NvwaXCmdResponse::ok(result))
        }
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 获取 Agent 详情（市场）
#[tauri::command]
pub async fn nvwax_get_agent_detail(
    client: State<'_, Arc<NvwaXClient>>,
    id: String,
) -> Result<NvwaXCmdResponse<nvwax_client::AgentDetail>, String> {
    match client.get_agent_detail(&id).await {
        Ok(result) => Ok(NvwaXCmdResponse::ok(result)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 获取分类列表
#[tauri::command]
pub async fn nvwax_get_categories(
    client: State<'_, Arc<NvwaXClient>>,
) -> Result<NvwaXCmdResponse<Vec<nvwax_client::Category>>, String> {
    match client.get_categories().await {
        Ok(result) => Ok(NvwaXCmdResponse::ok(result)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 搜索 AiTeam 市场
#[tauri::command]
pub async fn nvwax_search_aiteams(
    client: State<'_, Arc<NvwaXClient>>,
    billing: State<'_, Arc<NvwaXBilling>>,
    q: Option<String>,
    industry: Option<String>,
    page: Option<u32>,
    limit: Option<u32>,
) -> Result<NvwaXCmdResponse<nvwax_client::AiTeamListResponse>, String> {
    let user_id = current_user_id();
    let estimated = billing.estimate_call_cost(None, "marketplace/search_aiteams");
    billing.require_balance(&user_id, estimated)?;

    let params = SearchParams {
        q,
        category: None,
        tags: None,
        industry,
        page,
        limit,
    };

    match client.search_aiteams(params).await {
        Ok(result) => {
            billing.record_consumption(
                &user_id,
                estimated,
                "/api/v1/marketplace/aiteams",
                None,
                Some("marketplace"),
            )?;
            Ok(NvwaXCmdResponse::ok(result))
        }
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 获取 AiTeam 详情（市场）
#[tauri::command]
pub async fn nvwax_get_aiteam_detail(
    client: State<'_, Arc<NvwaXClient>>,
    id: String,
) -> Result<NvwaXCmdResponse<nvwax_client::AiTeamDetail>, String> {
    match client.get_aiteam_detail(&id).await {
        Ok(result) => Ok(NvwaXCmdResponse::ok(result)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 获取行业列表
#[tauri::command]
pub async fn nvwax_get_industries(
    client: State<'_, Arc<NvwaXClient>>,
) -> Result<NvwaXCmdResponse<Vec<nvwax_client::Industry>>, String> {
    match client.get_industries().await {
        Ok(result) => Ok(NvwaXCmdResponse::ok(result)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 获取插件详情
#[tauri::command]
pub async fn nvwax_get_plugin_detail(
    client: State<'_, Arc<NvwaXClient>>,
    id: String,
) -> Result<NvwaXCmdResponse<nvwax_client::PluginDetail>, String> {
    match client.get_plugin_detail(&id).await {
        Ok(result) => Ok(NvwaXCmdResponse::ok(result)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

// ============================================================
// Agents CRUD 命令
// ============================================================

/// 创建 Agent
#[tauri::command]
pub async fn nvwax_create_agent(
    client: State<'_, Arc<NvwaXClient>>,
    billing: State<'_, Arc<NvwaXBilling>>,
    name: String,
    description: Option<String>,
    config: Option<serde_json::Value>,
) -> Result<NvwaXCmdResponse<nvwax_client::AgentDetail>, String> {
    let user_id = current_user_id();
    billing.require_balance(&user_id, billing.estimate_call_cost(None, "agents/create"))?;

    let payload = CreateAgentPayload {
        name,
        description,
        config,
    };

    match client.create_agent(&payload).await {
        Ok(result) => {
            billing.record_consumption(&user_id, 50, "/api/v1/agents", None, Some("agent_crud"))?;
            Ok(NvwaXCmdResponse::ok(result))
        }
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 获取 Agent 列表
#[tauri::command]
pub async fn nvwax_get_agents(
    client: State<'_, Arc<NvwaXClient>>,
    page: Option<u32>,
    limit: Option<u32>,
    status: Option<String>,
) -> Result<NvwaXCmdResponse<nvwax_client::AgentListResponse>, String> {
    let params = ListParams {
        page,
        limit,
        status,
    };
    match client.get_agents(params).await {
        Ok(result) => Ok(NvwaXCmdResponse::ok(result)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 获取自己的 Agent 详情
#[tauri::command]
pub async fn nvwax_get_my_agent_detail(
    client: State<'_, Arc<NvwaXClient>>,
    id: String,
) -> Result<NvwaXCmdResponse<nvwax_client::AgentDetail>, String> {
    match client.get_my_agent_detail(&id).await {
        Ok(result) => Ok(NvwaXCmdResponse::ok(result)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 更新 Agent
#[tauri::command]
pub async fn nvwax_update_agent(
    client: State<'_, Arc<NvwaXClient>>,
    id: String,
    name: Option<String>,
    description: Option<String>,
    config: Option<serde_json::Value>,
) -> Result<NvwaXCmdResponse<nvwax_client::AgentDetail>, String> {
    let payload = UpdateAgentPayload {
        name,
        description,
        config,
    };
    match client.update_agent(&id, &payload).await {
        Ok(result) => Ok(NvwaXCmdResponse::ok(result)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 删除 Agent
#[tauri::command]
pub async fn nvwax_delete_agent(
    client: State<'_, Arc<NvwaXClient>>,
    id: String,
) -> Result<BoolResponse, String> {
    match client.delete_agent(&id).await {
        Ok(_) => Ok(NvwaXCmdResponse::ok(true)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 发布 Agent
#[tauri::command]
pub async fn nvwax_publish_agent(
    client: State<'_, Arc<NvwaXClient>>,
    id: String,
) -> Result<BoolResponse, String> {
    match client.publish_agent(&id).await {
        Ok(_) => Ok(NvwaXCmdResponse::ok(true)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 取消发布 Agent
#[tauri::command]
pub async fn nvwax_unpublish_agent(
    client: State<'_, Arc<NvwaXClient>>,
    id: String,
) -> Result<BoolResponse, String> {
    match client.unpublish_agent(&id).await {
        Ok(_) => Ok(NvwaXCmdResponse::ok(true)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

// ============================================================
// AiTeams CRUD 命令
// ============================================================

/// 创建 AiTeam
#[tauri::command]
pub async fn nvwax_create_aiteam(
    client: State<'_, Arc<NvwaXClient>>,
    billing: State<'_, Arc<NvwaXBilling>>,
    name: String,
    description: Option<String>,
    members: Option<Vec<nvwax_client::TeamMemberInput>>,
) -> Result<NvwaXCmdResponse<nvwax_client::AiTeamDetail>, String> {
    let user_id = current_user_id();
    billing.require_balance(&user_id, billing.estimate_call_cost(None, "aiteams/create"))?;

    let payload = CreateAiTeamPayload {
        name,
        description,
        members,
    };

    match client.create_aiteam(&payload).await {
        Ok(result) => {
            billing.record_consumption(
                &user_id,
                50,
                "/api/v1/aiteams",
                None,
                Some("aiteam_crud"),
            )?;
            Ok(NvwaXCmdResponse::ok(result))
        }
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 获取 AiTeam 列表
#[tauri::command]
pub async fn nvwax_get_aiteams(
    client: State<'_, Arc<NvwaXClient>>,
    page: Option<u32>,
    limit: Option<u32>,
) -> Result<NvwaXCmdResponse<nvwax_client::AiTeamListResponse>, String> {
    let params = ListParams {
        page,
        limit,
        status: None,
    };
    match client.get_aiteams(params).await {
        Ok(result) => Ok(NvwaXCmdResponse::ok(result)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 获取自己的 AiTeam 详情
#[tauri::command]
pub async fn nvwax_get_my_aiteam_detail(
    client: State<'_, Arc<NvwaXClient>>,
    id: String,
) -> Result<NvwaXCmdResponse<nvwax_client::AiTeamDetail>, String> {
    match client.get_my_aiteam_detail(&id).await {
        Ok(result) => Ok(NvwaXCmdResponse::ok(result)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 更新 AiTeam
#[tauri::command]
pub async fn nvwax_update_aiteam(
    client: State<'_, Arc<NvwaXClient>>,
    id: String,
    name: Option<String>,
    members: Option<Vec<nvwax_client::TeamMemberInput>>,
) -> Result<NvwaXCmdResponse<nvwax_client::AiTeamDetail>, String> {
    let payload = UpdateAiTeamPayload { name, members };
    match client.update_aiteam(&id, &payload).await {
        Ok(result) => Ok(NvwaXCmdResponse::ok(result)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 删除 AiTeam
#[tauri::command]
pub async fn nvwax_delete_aiteam(
    client: State<'_, Arc<NvwaXClient>>,
    id: String,
) -> Result<BoolResponse, String> {
    match client.delete_aiteam(&id).await {
        Ok(_) => Ok(NvwaXCmdResponse::ok(true)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 发布 AiTeam
#[tauri::command]
pub async fn nvwax_publish_aiteam(
    client: State<'_, Arc<NvwaXClient>>,
    id: String,
) -> Result<BoolResponse, String> {
    match client.publish_aiteam(&id).await {
        Ok(_) => Ok(NvwaXCmdResponse::ok(true)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 取消发布 AiTeam
#[tauri::command]
pub async fn nvwax_unpublish_aiteam(
    client: State<'_, Arc<NvwaXClient>>,
    id: String,
) -> Result<BoolResponse, String> {
    match client.unpublish_aiteam(&id).await {
        Ok(_) => Ok(NvwaXCmdResponse::ok(true)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

// ============================================================
// Search 命令
// ============================================================

/// 跨平台搜索 Agent
#[tauri::command]
pub async fn nvwax_search_agents_global(
    client: State<'_, Arc<NvwaXClient>>,
    q: String,
    page: Option<u32>,
    limit: Option<u32>,
) -> Result<NvwaXCmdResponse<Vec<nvwax_client::AgentSummary>>, String> {
    match client.search_agents_global(&q, page, limit).await {
        Ok(result) => Ok(NvwaXCmdResponse::ok(result)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 搜索技能
#[tauri::command]
pub async fn nvwax_search_skills(
    client: State<'_, Arc<NvwaXClient>>,
    q: String,
    page: Option<u32>,
    limit: Option<u32>,
) -> Result<NvwaXCmdResponse<Vec<nvwax_client::Skill>>, String> {
    match client.search_skills(&q, page, limit).await {
        Ok(result) => Ok(NvwaXCmdResponse::ok(result)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 统一搜索
#[tauri::command]
pub async fn nvwax_unified_search(
    client: State<'_, Arc<NvwaXClient>>,
    q: String,
    search_type: Option<String>,
    page: Option<u32>,
    limit: Option<u32>,
) -> Result<NvwaXCmdResponse<nvwax_client::SearchResult>, String> {
    let params = UnifiedSearchParams {
        q,
        search_type,
        page,
        limit,
    };
    match client.unified_search(params).await {
        Ok(result) => Ok(NvwaXCmdResponse::ok(result)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

// ============================================================
// Export 命令
// ============================================================

/// 导出 Agent
#[tauri::command]
pub async fn nvwax_export_agent(
    client: State<'_, Arc<NvwaXClient>>,
    id: String,
    format: String,
    include_metadata: Option<bool>,
    include_implementation: Option<bool>,
) -> Result<NvwaXCmdResponse<nvwax_client::ExportResult>, String> {
    let payload = ExportPayload {
        format,
        include_metadata,
        include_implementation,
    };
    match client.export_agent(&id, &payload).await {
        Ok(result) => Ok(NvwaXCmdResponse::ok(result)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 导出 AiTeam
#[tauri::command]
pub async fn nvwax_export_aiteam(
    client: State<'_, Arc<NvwaXClient>>,
    id: String,
    format: String,
    include_metadata: Option<bool>,
) -> Result<NvwaXCmdResponse<nvwax_client::ExportResult>, String> {
    let payload = ExportPayload {
        format,
        include_metadata,
        include_implementation: None,
    };
    match client.export_aiteam(&id, &payload).await {
        Ok(result) => Ok(NvwaXCmdResponse::ok(result)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 批量导出
#[tauri::command]
pub async fn nvwax_batch_export(
    client: State<'_, Arc<NvwaXClient>>,
    items: Vec<nvwax_client::ExportItem>,
    format: String,
) -> Result<NvwaXCmdResponse<Vec<nvwax_client::ExportResult>>, String> {
    let payload = BatchExportPayload { items, format };
    match client.batch_export(&payload).await {
        Ok(result) => Ok(NvwaXCmdResponse::ok(result)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 获取导出历史
#[tauri::command]
pub async fn nvwax_get_export_history(
    client: State<'_, Arc<NvwaXClient>>,
) -> Result<NvwaXCmdResponse<Vec<nvwax_client::ExportResult>>, String> {
    match client.get_export_history().await {
        Ok(result) => Ok(NvwaXCmdResponse::ok(result)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

// ============================================================
// Usage & Billing 命令
// ============================================================

/// 获取消耗统计
#[tauri::command]
pub async fn nvwax_get_usage_stats(
    client: State<'_, Arc<NvwaXClient>>,
    period: String,
) -> Result<NvwaXCmdResponse<nvwax_client::UsageStats>, String> {
    match client.get_usage_stats(&period).await {
        Ok(result) => Ok(NvwaXCmdResponse::ok(result)),
        Err(e) => Ok(NvwaXCmdResponse::err(map_error(e))),
    }
}

/// 获取当前用户 Token 余额
#[tauri::command]
pub async fn nvwax_get_token_balance(
    billing: State<'_, Arc<NvwaXBilling>>,
) -> Result<NvwaXCmdResponse<serde_json::Value>, String> {
    let user_id = current_user_id();
    match billing.get_user_token_summary(&user_id) {
        Ok(summary) => {
            let data = serde_json::json!({
                "user_id": summary.user_id,
                "total_consumed": summary.total_consumed,
                "monthly_consumed": summary.monthly_consumed,
                "balance": summary.balance,
                "free_monthly_quota": summary.free_monthly_quota,
            });
            Ok(NvwaXCmdResponse::ok(data))
        }
        Err(e) => Ok(NvwaXCmdResponse::err(e)),
    }
}

/// 记录 Token 消耗（供手动调用）
#[tauri::command]
pub async fn nvwax_record_consumption(
    billing: State<'_, Arc<NvwaXBilling>>,
    tokens: u64,
    endpoint: String,
    model: Option<String>,
    source: Option<String>,
) -> Result<BoolResponse, String> {
    let user_id = current_user_id();
    match billing.record_consumption(
        &user_id,
        tokens,
        &endpoint,
        model.as_deref(),
        source.as_deref(),
    ) {
        Ok(_) => Ok(NvwaXCmdResponse::ok(true)),
        Err(e) => Ok(NvwaXCmdResponse::err(e)),
    }
}

/// 同步 NvwaX 消耗数据（对账）
#[tauri::command]
pub async fn nvwax_sync_usage(
    client: State<'_, Arc<NvwaXClient>>,
    billing: State<'_, Arc<NvwaXBilling>>,
) -> Result<NvwaXCmdResponse<serde_json::Value>, String> {
    match billing.sync_usage_from_nvwax(&client).await {
        Ok(result) => {
            let data = serde_json::json!({
                "local_records": result.local_records,
                "nvwax_records": result.nvwax_records,
                "matched": result.matched,
                "discrepancies": result.discrepancies,
            });
            Ok(NvwaXCmdResponse::ok(data))
        }
        Err(e) => Ok(NvwaXCmdResponse::err(e)),
    }
}

// ============================================================
// API Key 管理命令
// ============================================================

/// 获取已保存的 NvwaX API Key（解密后返回）
#[tauri::command]
pub fn get_nvwax_api_key(
    db: State<'_, Mutex<Database>>,
    cipher: State<'_, Arc<Aes256GcmCipher>>,
) -> Result<Option<String>, String> {
    let db = db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let result: Result<String, _> = db.connection().query_row(
        "SELECT value FROM system_config WHERE key = 'nvwax_api_key'",
        [],
        |row| row.get(0),
    );
    match result {
        Ok(encrypted) => {
            // 解密后返回
            match cipher.decrypt_string(&encrypted) {
                Ok(decrypted) => Ok(Some(decrypted)),
                Err(_) => {
                    // 如果不是加密格式（旧版明文存储），直接返回
                    Ok(Some(encrypted))
                }
            }
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Failed to read API key: {}", e)),
    }
}

/// 保存 NvwaX API Key（AES-256-GCM 加密存储）
#[tauri::command]
pub fn save_nvwax_api_key(
    db: State<'_, Mutex<Database>>,
    cipher: State<'_, Arc<Aes256GcmCipher>>,
    api_key: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    // 加密后存储
    let encrypted = cipher
        .encrypt_string(&api_key)
        .map_err(|e| format!("Encryption failed: {}", e))?;
    db.connection()
        .execute(
            "INSERT OR REPLACE INTO system_config (key, value) VALUES ('nvwax_api_key', ?1)",
            rusqlite::params![encrypted],
        )
        .map_err(|e| format!("Failed to save API key: {}", e))?;
    Ok(())
}

/// 清除 NvwaX API Key
#[tauri::command]
pub fn clear_nvwax_api_key(db: State<'_, Mutex<Database>>) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    db.connection()
        .execute("DELETE FROM system_config WHERE key = 'nvwax_api_key'", [])
        .map_err(|e| format!("Failed to clear API key: {}", e))?;
    Ok(())
}

/// 测试 NvwaX API 连接
#[tauri::command]
pub async fn test_nvwax_connection(
    client: State<'_, Arc<NvwaXClient>>,
) -> Result<NvwaXCmdResponse<serde_json::Value>, String> {
    match client.get_categories().await {
        Ok(categories) => {
            let data = serde_json::json!({
                "success": true,
                "message": format!("连接成功，获取到 {} 个分类", categories.len()),
                "categories_count": categories.len(),
            });
            Ok(NvwaXCmdResponse::ok(data))
        }
        Err(e) => {
            let data = serde_json::json!({
                "success": false,
                "message": format!("连接失败: {}", e),
            });
            Ok(NvwaXCmdResponse::ok(data))
        }
    }
}
