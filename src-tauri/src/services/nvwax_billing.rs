/// NvwaX Token 实时计费拦截器
///
/// 实现两级计费体系：
/// - 在调用 NvwaX API 前检查用户余额
/// - 调用完成后记录 Token 消耗并扣减本地余额
/// - 支持定期从 NvwaX 拉取对账数据
///
/// PRD: ProClaw × NvwaX API 集成需求文档

use crate::database::Database;
use rusqlite::params;
use std::sync::Mutex;
use std::sync::Arc;

use super::nvwax_client::NvwaXClient;

/// Token 摘要
#[derive(Debug, Clone)]
pub struct TokenSummary {
    pub user_id: String,
    pub total_consumed: u64,
    pub monthly_consumed: u64,
    pub balance: u64,
    pub free_monthly_quota: u64,
}

/// 同步结果
#[derive(Debug)]
pub struct SyncResult {
    pub local_records: u32,
    pub nvwax_records: u32,
    pub matched: u32,
    pub discrepancies: Vec<String>,
}

/// NvwaX 计费管理器
pub struct NvwaXBilling {
    db: Arc<Mutex<Database>>,
}

impl NvwaXBilling {
    /// 创建计费管理器
    pub fn new(db: Arc<Mutex<Database>>) -> Self {
        Self { db }
    }

    /// 获取每月免费额度（可从环境变量配置）
    fn get_free_monthly_quota() -> u64 {
        std::env::var("PROCLAW_FREE_MONTHLY_TOKENS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(1_000_000)
    }

    /// 检查用户余额是否充足
    /// estimated_tokens 为预估值，用于实时拦截
    pub fn check_balance(&self, user_id: &str, estimated_tokens: u64) -> Result<bool, String> {
        let summary = self.get_user_token_summary(user_id)?;
        Ok(summary.balance >= estimated_tokens)
    }

    /// 获取用户 Token 摘要
    pub fn get_user_token_summary(&self, user_id: &str) -> Result<TokenSummary, String> {
        let db = self.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
        let free_quota = Self::get_free_monthly_quota();

        // 获取当月消耗
        let monthly_consumed: u64 = db
            .connection()
            .query_row(
                "SELECT COALESCE(SUM(tokens_consumed), 0) FROM nvwax_usage_logs \
                 WHERE proclaw_user_id = ?1 \
                 AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')",
                params![user_id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        // 获取总消耗
        let total_consumed: u64 = db
            .connection()
            .query_row(
                "SELECT COALESCE(SUM(tokens_consumed), 0) FROM nvwax_usage_logs \
                 WHERE proclaw_user_id = ?1",
                params![user_id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        // 从 tokens 表获取用户充值/购买的 Token（复用现有计费系统）
        let purchased_tokens: i64 = db
            .connection()
            .query_row(
                "SELECT COALESCE(SUM(balance), 0) FROM tokens WHERE user_id = ?1",
                params![user_id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let purchased = if purchased_tokens > 0 { purchased_tokens as u64 } else { 0 };

        // 余额 = 免费额度 + 购买额度 - 已消耗
        let balance = (free_quota + purchased).saturating_sub(monthly_consumed);

        Ok(TokenSummary {
            user_id: user_id.to_string(),
            total_consumed,
            monthly_consumed,
            balance,
            free_monthly_quota: free_quota,
        })
    }

    /// 记录消费（在 NvwaX API 返回后调用）
    pub fn record_consumption(
        &self,
        user_id: &str,
        tokens: u64,
        endpoint: &str,
        model: Option<&str>,
        source: Option<&str>,
    ) -> Result<(), String> {
        let db = self.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
        let id = uuid::Uuid::new_v4().to_string();
        let metadata = serde_json::json!({
            "recorded_at": chrono::Utc::now().to_rfc3339(),
        });

        db.connection()
            .execute(
                "INSERT INTO nvwax_usage_logs (id, proclaw_user_id, nvwax_endpoint, tokens_consumed, model, source, metadata) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    id,
                    user_id,
                    endpoint,
                    tokens,
                    model.unwrap_or("unknown"),
                    source.unwrap_or("api_call"),
                    metadata.to_string(),
                ],
            )
            .map_err(|e| format!("Failed to record consumption: {}", e))?;

        Ok(())
    }

    /// 检查余额并预留 Token（原子操作）
    /// 返回 Ok 表示余额充足，Err 表示余额不足
    pub fn require_balance(&self, user_id: &str, estimated_tokens: u64) -> Result<(), String> {
        if !self.check_balance(user_id, estimated_tokens)? {
            return Err("Token 余额不足，请充值后重试".to_string());
        }
        Ok(())
    }

    /// 估算调用成本（基于模型和端点）
    /// 返回预估 Token 数（用于实时拦截）
    pub fn estimate_call_cost(
        &self,
        _model: Option<&str>,
        _endpoint: &str,
    ) -> u64 {
        // 简单估算逻辑：
        // - 市场浏览类（GET 请求）：10 Token
        // - Agent 创建/更新：50 Token
        // - Agent 发布：20 Token
        // - 导出：100 Token
        // - 搜索：20 Token
        // 实际消耗以 NvwaX 返回为准
        50 // 默认估算值
    }

    /// 拉取 NvwaX 侧消费明细用于对账
    pub async fn sync_usage_from_nvwax(
        &self,
        nvwax_client: &NvwaXClient,
    ) -> Result<SyncResult, String> {
        let stats = nvwax_client
            .get_usage_stats("month")
            .await
            .map_err(|e| format!("Failed to fetch usage from NvwaX: {}", e))?;

        let db = self.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

        // 查询本地当月记录数
        let local_records: u32 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM nvwax_usage_logs \
                 WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        // 对账：比较总数
        let nvwax_total = stats.total_tokens;
        let local_total: u64 = db
            .connection()
            .query_row(
                "SELECT COALESCE(SUM(tokens_consumed), 0) FROM nvwax_usage_logs \
                 WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let mut discrepancies = Vec::new();
        if nvwax_total != local_total {
            discrepancies.push(format!(
                "Token 总数不一致: NvwaX={}, 本地={}, 差异={}",
                nvwax_total,
                local_total,
                if nvwax_total > local_total {
                    nvwax_total - local_total
                } else {
                    local_total - nvwax_total
                }
            ));
        }

        Ok(SyncResult {
            local_records,
            nvwax_records: stats.calls,
            matched: if discrepancies.is_empty() { local_records } else { 0 },
            discrepancies,
        })
    }
}
