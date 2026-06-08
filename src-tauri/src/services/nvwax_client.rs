/// ProClaw NvwaX API 客户端
///
/// 封装所有 NvwaX HTTP API 调用，统一认证、错误处理、重试逻辑。
/// PRD: ProClaw × NvwaX API 集成需求文档
///
/// 使用方式：
///   let client = NvwaXClient::new("nvwax_your_api_key".into());
///   let agents = client.search_agents(SearchParams::default()).await?;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

// ============================================================
// 错误类型
// ============================================================

#[derive(Debug)]
pub enum NvwaXError {
    Network(String),
    Auth(String),
    NotFound(String),
    Validation(String),
    RateLimited { retry_after: u64 },
    Internal(String),
}

impl std::fmt::Display for NvwaXError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            NvwaXError::Network(msg) => write!(f, "Network error: {}", msg),
            NvwaXError::Auth(msg) => write!(f, "Auth error: {}", msg),
            NvwaXError::NotFound(msg) => write!(f, "Not found: {}", msg),
            NvwaXError::Validation(msg) => write!(f, "Validation error: {}", msg),
            NvwaXError::RateLimited { retry_after } => {
                write!(f, "Rate limited, retry after {}s", retry_after)
            }
            NvwaXError::Internal(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl std::error::Error for NvwaXError {}

// ============================================================
// API 响应类型
// ============================================================

/// 通用成功响应
#[derive(Debug, Deserialize, Serialize)]
pub struct NvwaXApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<ApiErrorDetail>,
}

/// 分页信息
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PaginationInfo {
    pub page: u32,
    pub limit: u32,
    pub total: u32,
    pub total_pages: u32,
}

/// 错误详情
#[derive(Debug, Deserialize, Serialize)]
pub struct ApiErrorDetail {
    pub code: String,
    pub message: String,
}

// ============================================================
// 参数类型
// ============================================================

/// 搜索参数
#[derive(Debug, Default, Serialize)]
pub struct SearchParams {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub q: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub industry: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<u32>,
}

/// 列表参数
#[derive(Debug, Default, Serialize)]
pub struct ListParams {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}

/// 创建 Agent 请求
#[derive(Debug, Serialize)]
pub struct CreateAgentPayload {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub config: Option<serde_json::Value>,
}

/// 更新 Agent 请求
#[derive(Debug, Serialize)]
pub struct UpdateAgentPayload {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub config: Option<serde_json::Value>,
}

/// 创建 AiTeam 请求
#[derive(Debug, Serialize)]
pub struct CreateAiTeamPayload {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub members: Option<Vec<TeamMemberInput>>,
}

/// 更新 AiTeam 请求
#[derive(Debug, Serialize)]
pub struct UpdateAiTeamPayload {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub members: Option<Vec<TeamMemberInput>>,
}

/// 团队成员输入
#[derive(Debug, Serialize, Deserialize)]
pub struct TeamMemberInput {
    pub agent_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
}

/// 导出请求
#[derive(Debug, Serialize)]
pub struct ExportPayload {
    pub format: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "includeMetadata")]
    pub include_metadata: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "includeImplementation")]
    pub include_implementation: Option<bool>,
}

/// 批量导出请求
#[derive(Debug, Serialize)]
pub struct BatchExportPayload {
    pub items: Vec<ExportItem>,
    pub format: String,
}

/// 导出项
#[derive(Debug, Serialize, Deserialize)]
pub struct ExportItem {
    #[serde(rename = "type")]
    pub item_type: String,
    pub id: String,
}

/// 统一搜索参数
#[derive(Debug, Default, Serialize)]
pub struct UnifiedSearchParams {
    pub q: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "type")]
    pub search_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<u32>,
}

// ============================================================
// 响应数据类型
// ============================================================

/// Agent 摘要
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct AgentSummary {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
}

/// Agent 详情
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct AgentDetail {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub config: Option<serde_json::Value>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
}

/// Agent 列表响应
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct AgentListResponse {
    pub agents: Vec<AgentSummary>,
    pub pagination: Option<PaginationInfo>,
}

/// AiTeam 摘要
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct AiTeamSummary {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(default)]
    pub industry: Option<String>,
    #[serde(default)]
    pub member_count: Option<u32>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
}

/// AiTeam 详情
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct AiTeamDetail {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(default)]
    pub industry: Option<String>,
    #[serde(default)]
    pub members: Vec<TeamMemberInfo>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
}

/// 团队成员信息
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct TeamMemberInfo {
    pub agent_id: String,
    pub agent_name: Option<String>,
    pub role: Option<String>,
}

/// AiTeam 列表响应
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct AiTeamListResponse {
    pub aiteams: Vec<AiTeamSummary>,
    pub pagination: Option<PaginationInfo>,
}

/// 分类
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Category {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub count: Option<u32>,
}

/// 行业
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Industry {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub count: Option<u32>,
}

/// 插件详情
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PluginDetail {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub industry: Option<String>,
    #[serde(default)]
    pub download_url: Option<String>,
}

/// 导出结果
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ExportResult {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(rename = "type")]
    pub item_type: Option<String>,
    pub format: Option<String>,
    pub content: Option<serde_json::Value>,
    pub url: Option<String>,
    pub success: bool,
    #[serde(default)]
    pub error: Option<String>,
}

/// 技能
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(default)]
    #[serde(rename = "type")]
    pub skill_type: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

/// 统一搜索结果
#[derive(Debug, Deserialize, Serialize)]
pub struct SearchResult {
    pub agents: Vec<AgentSummary>,
    pub skills: Vec<Skill>,
}

/// 消耗统计
#[derive(Debug, Deserialize, Serialize)]
pub struct UsageStats {
    pub period: String,
    #[serde(default)]
    pub total_tokens: u64,
    #[serde(default)]
    pub calls: u32,
    #[serde(default)]
    pub by_model: Vec<ModelUsage>,
    #[serde(default)]
    pub daily: Vec<DailyUsage>,
}

/// 按模型统计
#[derive(Debug, Deserialize, Serialize)]
pub struct ModelUsage {
    pub model: String,
    pub tokens: u64,
    pub calls: u32,
}

/// 按日统计
#[derive(Debug, Deserialize, Serialize)]
pub struct DailyUsage {
    pub date: String,
    pub tokens: u64,
    pub calls: u32,
}

// ============================================================
// 内存缓存
// ============================================================

/// 缓存条目
struct CacheEntry<T> {
    data: T,
    expires_at: Instant,
}

impl<T> CacheEntry<T> {
    fn is_valid(&self, now: &Instant) -> bool {
        now < &self.expires_at
    }
}

/// NvwaX API 响应缓存（线程安全）
/// 减少重复网络请求，提升市场浏览体验
pub struct NvwaXCache {
    categories: Option<CacheEntry<Vec<Category>>>,
    industries: Option<CacheEntry<Vec<Industry>>>,
    agent_search: HashMap<String, CacheEntry<AgentListResponse>>,
    aiteam_search: HashMap<String, CacheEntry<AiTeamListResponse>>,
}

impl NvwaXCache {
    #[allow(dead_code)]
    pub fn new() -> Self {
        Self {
            categories: None,
            industries: None,
            agent_search: HashMap::new(),
            aiteam_search: HashMap::new(),
        }
    }

    /// 获取缓存的分列表（10 分钟 TTL）
    pub fn get_categories(&self) -> Option<&Vec<Category>> {
        self.categories.as_ref().and_then(|entry| {
            if entry.is_valid(&Instant::now()) {
                Some(&entry.data)
            } else {
                None
            }
        })
    }

    /// 设置分列表缓存
    pub fn set_categories(&mut self, categories: Vec<Category>) {
        self.categories = Some(CacheEntry {
            data: categories,
            expires_at: Instant::now() + Duration::from_secs(600), // 10 min
        });
    }

    /// 获取缓存的行业列表（10 分钟 TTL）
    pub fn get_industries(&self) -> Option<&Vec<Industry>> {
        self.industries.as_ref().and_then(|entry| {
            if entry.is_valid(&Instant::now()) {
                Some(&entry.data)
            } else {
                None
            }
        })
    }

    /// 设置行业列表缓存
    pub fn set_industries(&mut self, industries: Vec<Industry>) {
        self.industries = Some(CacheEntry {
            data: industries,
            expires_at: Instant::now() + Duration::from_secs(600),
        });
    }

    /// 获取缓存的 Agent 搜索结果
    /// key = "q:xxx;category:xxx;tags:xxx;page:xxx;limit:xxx"
    pub fn get_agent_search(&self, key: &str) -> Option<&AgentListResponse> {
        self.agent_search.get(key).and_then(|entry| {
            if entry.is_valid(&Instant::now()) {
                Some(&entry.data)
            } else {
                None
            }
        })
    }

    /// 设置 Agent 搜索结果缓存（2 分钟 TTL）
    pub fn set_agent_search(&mut self, key: String, result: AgentListResponse) {
        self.agent_search.insert(
            key,
            CacheEntry {
                data: result,
                expires_at: Instant::now() + Duration::from_secs(120),
            },
        );
    }

    /// 获取缓存的 AiTeam 搜索结果
    pub fn get_aiteam_search(&self, key: &str) -> Option<&AiTeamListResponse> {
        self.aiteam_search.get(key).and_then(|entry| {
            if entry.is_valid(&Instant::now()) {
                Some(&entry.data)
            } else {
                None
            }
        })
    }

    /// 设置 AiTeam 搜索结果缓存（2 分钟 TTL）
    pub fn set_aiteam_search(&mut self, key: String, result: AiTeamListResponse) {
        self.aiteam_search.insert(
            key,
            CacheEntry {
                data: result,
                expires_at: Instant::now() + Duration::from_secs(120),
            },
        );
    }

    /// 清理所有过期缓存
    #[allow(dead_code)]
    pub fn purge_expired(&mut self) {
        let now = Instant::now();
        self.categories = self.categories.take().filter(|e| e.is_valid(&now));
        self.industries = self.industries.take().filter(|e| e.is_valid(&now));
        self.agent_search.retain(|_, e| e.is_valid(&now));
        self.aiteam_search.retain(|_, e| e.is_valid(&now));
    }

    /// 清空所有缓存
    pub fn clear(&mut self) {
        self.categories = None;
        self.industries = None;
        self.agent_search.clear();
        self.aiteam_search.clear();
    }
}

// ============================================================
// 客户端
// ============================================================

pub struct NvwaXClient {
    api_key: String,
    base_url: String,
    http_client: reqwest::Client,
    cache: Mutex<NvwaXCache>,
    /// API Key 为空时标记为关闭模式，所有请求直接返回空结果
    closed: bool,
}

impl NvwaXClient {
    /// 创建 NvwaX API 客户端实例
    pub fn new(api_key: String) -> Self {
        let http_client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("ProClaw/1.0")
            .build()
            .expect("Failed to create HTTP client");

        let closed = api_key.is_empty();
        if closed {
            eprintln!("[NvwaX] API Key 未配置，NvwaX 客户端将以关闭模式运行");
        }
        Self {
            api_key,
            base_url: std::env::var("NVWAX_API_BASE")
                .unwrap_or_else(|_| "https://nvwax.proclaw.cc/api/v1".to_string()),
            http_client,
            cache: Mutex::new(NvwaXCache::new()),
            closed,
        }
    }

    /// 自定义基础 URL（用于测试）
    #[allow(dead_code)]
    pub fn with_base_url(api_key: String, base_url: String) -> Self {
        let http_client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("ProClaw/1.0")
            .build()
            .expect("Failed to create HTTP client");
        let closed = api_key.is_empty();

        Self {
            api_key,
            base_url,
            http_client,
            cache: Mutex::new(NvwaXCache::new()),
            closed,
        }
    }

    /// 获取 API Key（供外部使用，如计费模块）
    #[allow(dead_code)]
    pub fn api_key(&self) -> &str {
        &self.api_key
    }

    /// 获取基础 URL（供外部使用）
    #[allow(dead_code)]
    pub fn base_url(&self) -> &str {
        &self.base_url
    }

    /// 清空所有缓存
    #[allow(dead_code)]
    pub fn clear_cache(&self) {
        if let Ok(mut cache) = self.cache.lock() {
            cache.clear();
        }
    }

    // ---------- 缓存键生成 ----------

    /// 生成搜索参数的缓存键
    fn search_cache_key(
        q: Option<&str>,
        category: Option<&str>,
        tags: Option<&str>,
        industry: Option<&str>,
        page: Option<u32>,
        limit: Option<u32>,
    ) -> String {
        format!(
            "q:{};cat:{};tags:{};ind:{};p:{};l:{}",
            q.unwrap_or(""),
            category.unwrap_or(""),
            tags.unwrap_or(""),
            industry.unwrap_or(""),
            page.unwrap_or(1),
            limit.unwrap_or(20),
        )
    }

    // ---------- 通用请求方法 ----------

    /// 执行 GET 请求，返回反序列化后的数据
    async fn get<T: serde::de::DeserializeOwned>(
        &self,
        path: &str,
        query: Option<&serde_json::Value>,
    ) -> Result<T, NvwaXError> {
        let mut req = self
            .http_client
            .get(format!("{}{}", self.base_url, path))
            .header("Authorization", format!("Bearer {}", self.api_key));

        if let Some(q) = query {
            req = req.query(&q);
        }

        self.execute_request(req).await
    }

    /// 执行 POST 请求
    async fn post<T: serde::de::DeserializeOwned, B: serde::Serialize>(
        &self,
        path: &str,
        body: &B,
    ) -> Result<T, NvwaXError> {
        let req = self
            .http_client
            .post(format!("{}{}", self.base_url, path))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(body);

        self.execute_request(req).await
    }

    /// 执行 PUT 请求
    async fn put<T: serde::de::DeserializeOwned, B: serde::Serialize>(
        &self,
        path: &str,
        body: &B,
    ) -> Result<T, NvwaXError> {
        let req = self
            .http_client
            .put(format!("{}{}", self.base_url, path))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(body);

        self.execute_request(req).await
    }

    /// 执行 DELETE 请求
    async fn delete<T: serde::de::DeserializeOwned>(&self, path: &str) -> Result<T, NvwaXError> {
        let req = self
            .http_client
            .delete(format!("{}{}", self.base_url, path))
            .header("Authorization", format!("Bearer {}", self.api_key));

        self.execute_request(req).await
    }

    /// 执行 POST 请求（无 body）
    async fn post_empty<T: serde::de::DeserializeOwned>(
        &self,
        path: &str,
    ) -> Result<T, NvwaXError> {
        let req = self
            .http_client
            .post(format!("{}{}", self.base_url, path))
            .header("Authorization", format!("Bearer {}", self.api_key));

        self.execute_request(req).await
    }

    /// 执行请求并解析响应
    async fn execute_request<T: serde::de::DeserializeOwned>(
        &self,
        request_builder: reqwest::RequestBuilder,
    ) -> Result<T, NvwaXError> {
        let response = request_builder.send().await.map_err(|e| {
            if e.is_timeout() {
                NvwaXError::Network("Request timed out".to_string())
            } else if e.is_connect() {
                NvwaXError::Network(format!("Connection failed: {}", e))
            } else {
                NvwaXError::Network(format!("Request failed: {}", e))
            }
        })?;

        let status = response.status();
        let is_rate_limited = status.as_u16() == 429;
        let retry_after = if is_rate_limited {
            response
                .headers()
                .get("Retry-After")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.parse().ok())
                .unwrap_or(5)
        } else {
            0
        };
        let body_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Failed to read response body".to_string());

        match status.as_u16() {
            200 | 201 | 202 => {
                // 尝试解析为通用响应格式
                if let Ok(api_resp) = serde_json::from_str::<NvwaXApiResponse<T>>(&body_text) {
                    if api_resp.success {
                        if let Some(data) = api_resp.data {
                            return Ok(data);
                        }
                    }
                    if let Some(err) = api_resp.error {
                        return Err(NvwaXError::Internal(err.message));
                    }
                }

                // 尝试直接解析为 T
                serde_json::from_str::<T>(&body_text)
                    .map_err(|e| NvwaXError::Internal(format!("Failed to parse response: {}", e)))
            }
            204 => {
                // No content - 返回一个默认值
                serde_json::from_str::<T>("null")
                    .map_err(|_| NvwaXError::Internal("Empty response".to_string()))
            }
            400 => {
                let err = Self::parse_error(&body_text, "Validation error");
                Err(NvwaXError::Validation(err))
            }
            401 => {
                let err = Self::parse_error(&body_text, "Authentication failed");
                Err(NvwaXError::Auth(err))
            }
            403 => {
                let err = Self::parse_error(&body_text, "Permission denied");
                Err(NvwaXError::Auth(err))
            }
            404 => {
                let err = Self::parse_error(&body_text, "Resource not found");
                Err(NvwaXError::NotFound(err))
            }
            429 => Err(NvwaXError::RateLimited { retry_after }),
            _ => {
                let msg = if status.as_u16() >= 500 {
                    "Server error"
                } else {
                    "Unexpected error"
                };
                Err(NvwaXError::Internal(format!("{}: {}", msg, body_text)))
            }
        }
    }

    /// 解析错误信息
    fn parse_error(body: &str, fallback: &str) -> String {
        if let Ok(err_resp) = serde_json::from_str::<NvwaXApiResponse<()>>(body) {
            if let Some(err) = err_resp.error {
                return format!("{}: {}", err.code, err.message);
            }
        }
        fallback.to_string()
    }

    // ============================================================
    // Marketplace API
    // ============================================================

    /// 搜索 Agent 市场
    pub async fn search_agents(
        &self,
        params: SearchParams,
    ) -> Result<AgentListResponse, NvwaXError> {
        if self.closed {
            return Ok(AgentListResponse {
                agents: vec![],
                pagination: None,
            });
        }
        let cache_key = Self::search_cache_key(
            params.q.as_deref(),
            params.category.as_deref(),
            params.tags.as_deref(),
            None,
            params.page,
            params.limit,
        );
        // 检查缓存
        if let Ok(cache) = self.cache.lock() {
            if let Some(cached) = cache.get_agent_search(&cache_key) {
                return Ok(cached.clone());
            }
        }
        let query = serde_json::to_value(&params).ok();
        let result = self
            .get::<AgentListResponse>("/marketplace/agents", query.as_ref())
            .await?;
        // 写入缓存
        if let Ok(mut cache) = self.cache.lock() {
            cache.set_agent_search(cache_key, result.clone());
        }
        Ok(result)
    }

    /// 获取 Agent 详情（市场）
    pub async fn get_agent_detail(&self, id: &str) -> Result<AgentDetail, NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        self.get::<AgentDetail>(&format!("/marketplace/agents/{}", id), None)
            .await
    }

    /// 获取分类列表
    pub async fn get_categories(&self) -> Result<Vec<Category>, NvwaXError> {
        if self.closed {
            return Ok(vec![]);
        }
        // 检查缓存
        if let Ok(cache) = self.cache.lock() {
            if let Some(cached) = cache.get_categories() {
                return Ok(cached.clone());
            }
        }
        let result = self
            .get::<Vec<Category>>("/marketplace/categories", None)
            .await?;
        // 写入缓存
        if let Ok(mut cache) = self.cache.lock() {
            cache.set_categories(result.clone());
        }
        Ok(result)
    }

    /// 搜索 AiTeam 市场
    pub async fn search_aiteams(
        &self,
        params: SearchParams,
    ) -> Result<AiTeamListResponse, NvwaXError> {
        if self.closed {
            return Ok(AiTeamListResponse {
                aiteams: vec![],
                pagination: None,
            });
        }
        let cache_key = Self::search_cache_key(
            params.q.as_deref(),
            None,
            None,
            params.industry.as_deref(),
            params.page,
            params.limit,
        );
        // 检查缓存
        if let Ok(cache) = self.cache.lock() {
            if let Some(cached) = cache.get_aiteam_search(&cache_key) {
                return Ok(cached.clone());
            }
        }
        let query = serde_json::to_value(&params).ok();
        let result = self
            .get::<AiTeamListResponse>("/marketplace/aiteams", query.as_ref())
            .await?;
        // 写入缓存
        if let Ok(mut cache) = self.cache.lock() {
            cache.set_aiteam_search(cache_key, result.clone());
        }
        Ok(result)
    }

    /// 获取 AiTeam 详情（市场）
    pub async fn get_aiteam_detail(&self, id: &str) -> Result<AiTeamDetail, NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        self.get::<AiTeamDetail>(&format!("/marketplace/aiteams/{}", id), None)
            .await
    }

    /// 获取行业列表
    pub async fn get_industries(&self) -> Result<Vec<Industry>, NvwaXError> {
        if self.closed {
            return Ok(vec![]);
        }
        // 检查缓存
        if let Ok(cache) = self.cache.lock() {
            if let Some(cached) = cache.get_industries() {
                return Ok(cached.clone());
            }
        }
        let result = self
            .get::<Vec<Industry>>("/marketplace/industries", None)
            .await?;
        // 写入缓存
        if let Ok(mut cache) = self.cache.lock() {
            cache.set_industries(result.clone());
        }
        Ok(result)
    }

    /// 获取行业插件详情
    pub async fn get_plugin_detail(&self, id: &str) -> Result<PluginDetail, NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        self.get::<PluginDetail>(&format!("/marketplace/plugins/{}", id), None)
            .await
    }

    // ============================================================
    // Agents CRUD API
    // ============================================================

    /// 创建 Agent
    pub async fn create_agent(
        &self,
        payload: &CreateAgentPayload,
    ) -> Result<AgentDetail, NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        self.post::<AgentDetail, CreateAgentPayload>("/agents", payload)
            .await
    }

    /// 获取 Agent 列表
    pub async fn get_agents(&self, params: ListParams) -> Result<AgentListResponse, NvwaXError> {
        if self.closed {
            return Ok(AgentListResponse {
                agents: vec![],
                pagination: None,
            });
        }
        let query = serde_json::to_value(&params).ok();
        self.get::<AgentListResponse>("/agents", query.as_ref())
            .await
    }

    /// 获取 Agent 详情
    pub async fn get_my_agent_detail(&self, id: &str) -> Result<AgentDetail, NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        self.get::<AgentDetail>(&format!("/agents/{}", id), None)
            .await
    }

    /// 更新 Agent
    pub async fn update_agent(
        &self,
        id: &str,
        payload: &UpdateAgentPayload,
    ) -> Result<AgentDetail, NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        self.put::<AgentDetail, UpdateAgentPayload>(&format!("/agents/{}", id), payload)
            .await
    }

    /// 删除 Agent
    pub async fn delete_agent(&self, id: &str) -> Result<(), NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        self.delete::<()>(&format!("/agents/{}", id)).await
    }

    /// 发布 Agent
    pub async fn publish_agent(&self, id: &str) -> Result<(), NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        self.post_empty::<()>(&format!("/agents/{}/publish", id))
            .await
    }

    /// 取消发布 Agent
    pub async fn unpublish_agent(&self, id: &str) -> Result<(), NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        self.post_empty::<()>(&format!("/agents/{}/unpublish", id))
            .await
    }

    // ============================================================
    // AiTeams CRUD API
    // ============================================================

    /// 创建 AiTeam
    pub async fn create_aiteam(
        &self,
        payload: &CreateAiTeamPayload,
    ) -> Result<AiTeamDetail, NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        self.post::<AiTeamDetail, CreateAiTeamPayload>("/aiteams", payload)
            .await
    }

    /// 获取 AiTeam 列表
    pub async fn get_aiteams(&self, params: ListParams) -> Result<AiTeamListResponse, NvwaXError> {
        if self.closed {
            return Ok(AiTeamListResponse {
                aiteams: vec![],
                pagination: None,
            });
        }
        let query = serde_json::to_value(&params).ok();
        self.get::<AiTeamListResponse>("/aiteams", query.as_ref())
            .await
    }

    /// 获取 AiTeam 详情
    pub async fn get_my_aiteam_detail(&self, id: &str) -> Result<AiTeamDetail, NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        self.get::<AiTeamDetail>(&format!("/aiteams/{}", id), None)
            .await
    }

    /// 更新 AiTeam
    pub async fn update_aiteam(
        &self,
        id: &str,
        payload: &UpdateAiTeamPayload,
    ) -> Result<AiTeamDetail, NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        self.put::<AiTeamDetail, UpdateAiTeamPayload>(&format!("/aiteams/{}", id), payload)
            .await
    }

    /// 删除 AiTeam
    pub async fn delete_aiteam(&self, id: &str) -> Result<(), NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        self.delete::<()>(&format!("/aiteams/{}", id)).await
    }

    /// 发布 AiTeam
    pub async fn publish_aiteam(&self, id: &str) -> Result<(), NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        self.post_empty::<()>(&format!("/aiteams/{}/publish", id))
            .await
    }

    /// 取消发布 AiTeam
    pub async fn unpublish_aiteam(&self, id: &str) -> Result<(), NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        self.post_empty::<()>(&format!("/aiteams/{}/unpublish", id))
            .await
    }

    // ============================================================
    // Search API
    // ============================================================

    /// 搜索 Agent（跨平台）
    pub async fn search_agents_global(
        &self,
        q: &str,
        page: Option<u32>,
        limit: Option<u32>,
    ) -> Result<Vec<AgentSummary>, NvwaXError> {
        if self.closed {
            return Ok(vec![]);
        }
        let params = SearchParams {
            q: Some(q.to_string()),
            page,
            limit,
            ..Default::default()
        };
        let query = serde_json::to_value(&params).ok();
        self.get::<Vec<AgentSummary>>("/search/agents", query.as_ref())
            .await
    }

    /// 搜索 SkillHub 技能
    pub async fn search_skills(
        &self,
        q: &str,
        page: Option<u32>,
        limit: Option<u32>,
    ) -> Result<Vec<Skill>, NvwaXError> {
        if self.closed {
            return Ok(vec![]);
        }
        let params = SearchParams {
            q: Some(q.to_string()),
            page,
            limit,
            ..Default::default()
        };
        let query = serde_json::to_value(&params).ok();
        self.get::<Vec<Skill>>("/search/skills", query.as_ref())
            .await
    }

    /// 统一搜索
    pub async fn unified_search(
        &self,
        params: UnifiedSearchParams,
    ) -> Result<SearchResult, NvwaXError> {
        if self.closed {
            return Ok(SearchResult {
                agents: vec![],
                skills: vec![],
            });
        }
        let query = serde_json::to_value(&params).ok();
        self.get::<SearchResult>("/search", query.as_ref()).await
    }

    // ============================================================
    // Export API
    // ============================================================

    /// 导出 Agent
    pub async fn export_agent(
        &self,
        id: &str,
        payload: &ExportPayload,
    ) -> Result<ExportResult, NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        self.post::<ExportResult, ExportPayload>(&format!("/agents/{}/export", id), payload)
            .await
    }

    /// 导出 AiTeam
    pub async fn export_aiteam(
        &self,
        id: &str,
        payload: &ExportPayload,
    ) -> Result<ExportResult, NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        self.post::<ExportResult, ExportPayload>(&format!("/aiteams/{}/export", id), payload)
            .await
    }

    /// 批量导出
    pub async fn batch_export(
        &self,
        payload: &BatchExportPayload,
    ) -> Result<Vec<ExportResult>, NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        self.post::<Vec<ExportResult>, BatchExportPayload>("/export/batch", payload)
            .await
    }

    /// 获取导出历史
    pub async fn get_export_history(&self) -> Result<Vec<ExportResult>, NvwaXError> {
        if self.closed {
            return Ok(vec![]);
        }
        self.get::<Vec<ExportResult>>("/export/history", None).await
    }

    // ============================================================
    // Usage API
    // ============================================================

    /// 获取 Token 消耗统计
    /// period: day / week / month
    pub async fn get_usage_stats(&self, period: &str) -> Result<UsageStats, NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        let query = serde_json::json!({"period": period});
        self.get::<UsageStats>("/user/api-keys/usage", Some(&query))
            .await
    }
}
