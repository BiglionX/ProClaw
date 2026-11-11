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

/// 发送虚拟公司会话消息 + 拉取 SSE 流（用于本地流式创建向导）
#[derive(Debug, Serialize)]
pub struct SendMessagePayload {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
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

// ============================================================
// 虚拟公司（Virtual Company）类型
//
// 对应 docs/integration/virtual-company-package.schema.json (schemaVersion 1.0.0)。
// NvwaX 服务端按该 schema 生成导出包；ProClaw 通过 download_virtual_company_package
// 拉取并校验，存入本地 SQLite 表 virtual_companies / virtual_company_agents。
// ============================================================

/// 虚拟公司导出包
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualCompanyPackage {
    pub schema_version: String,
    pub package_id: String,
    pub exported_at: String,
    #[serde(default)]
    pub checksum: Option<String>,
    pub source: VirtualCompanySource,
    pub team: VirtualCompanyTeam,
    pub agents: Vec<VirtualCompanyAgent>,
    #[serde(default)]
    pub skills: Option<Vec<VirtualCompanySkill>>,
    #[serde(default)]
    pub metadata: Option<serde_json::Value>,
}

/// 导出包来源
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualCompanySource {
    pub platform: String, // 固定为 "nvwax"
    pub session_id: String,
    #[serde(default)]
    pub user_id: Option<String>,
    #[serde(default)]
    pub aiteam_id: Option<String>,
}

/// 虚拟公司团队（CEO 主控 + 元数据）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualCompanyTeam {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub industry: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
    #[serde(default)]
    pub ceo_config: Option<serde_json::Value>,
    #[serde(default)]
    pub workflow: Option<Vec<serde_json::Value>>,
    #[serde(default)]
    pub binding_rules: Option<Vec<serde_json::Value>>,
}

/// 虚拟公司成员 Agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualCompanyAgent {
    pub id: String,
    pub name: String,
    pub role: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub avatar_url: Option<String>,
    #[serde(default)]
    pub capabilities: Option<Vec<String>>,
    #[serde(default)]
    pub permissions: Option<Vec<String>>,
    #[serde(default)]
    pub input_schema: Option<serde_json::Value>,
    #[serde(default)]
    pub output_schema: Option<serde_json::Value>,
    #[serde(default)]
    pub model_config: Option<serde_json::Value>,
    #[serde(default)]
    pub system_prompt: Option<String>,
}

/// 虚拟公司绑定技能
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualCompanySkill {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
    #[serde(default)]
    pub content: Option<String>,
}

/// 虚拟公司模板摘要（来自 NvwaX 市场）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualCompanyTemplateSummary {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub industry: Option<String>,
    #[serde(default)]
    pub member_count: Option<u32>,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
    #[serde(default)]
    pub rating: Option<f32>,
    #[serde(default)]
    pub install_count: Option<u32>,
    #[serde(default)]
    pub preview_image: Option<String>,
}

/// 虚拟公司模板列表响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualCompanyTemplateListResponse {
    pub templates: Vec<VirtualCompanyTemplateSummary>,
    #[serde(default)]
    pub pagination: Option<PaginationInfo>,
}

/// 从 URL 导入虚拟公司包命令的返回结果（供 Tauri 命令层包装）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualCompanyImportResult {
    pub package_id: String,
    pub team_id: String,
    pub team_name: String,
    pub agents_imported: u32,
    pub skills_imported: u32,
    pub imported_at: String,
}

/// v1.5.0 (Sprint 2.18)：nvwax_set_agent_local_state 的返回 inner
///
/// 字段命名故意用 camelCase 以匹配 TS 端 `SetAgentLocalStateResultNew`。
/// 包含 `historyId` 字段（无字段变化时为 None），供前端调用 `undoAgentStateChange` 使用。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetAgentLocalStateResultNew {
    #[serde(rename = "lastModifiedAt")]
    pub last_modified_at: String,
    /// 新写入的历史行 id（无字段变化时为 None）
    #[serde(rename = "historyId", default)]
    pub history_id: Option<i64>,
}

/// v1.5.0：单条 Agent 状态变更历史记录
///
/// 字段命名 camelCase 以匹配 TS 端 `AgentStateHistoryEntry`。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStateHistoryEntry {
    #[serde(rename = "id")]
    pub id: i64,
    #[serde(rename = "packageId")]
    pub package_id: String,
    #[serde(rename = "agentId")]
    pub agent_id: String,
    #[serde(rename = "fieldName")]
    pub field_name: String,
    #[serde(rename = "oldValue")]
    pub old_value: Option<String>,
    #[serde(rename = "newValue")]
    pub new_value: Option<String>,
    #[serde(rename = "recordedAt")]
    pub recorded_at: String,
}

/// v1.5.0：历史列表命令的返回包装
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStateHistoryList {
    pub entries: Vec<AgentStateHistoryEntry>,
}

/// v1.5.0：撤销命令的返回
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UndoAgentStateChangeResult {
    /// 恢复后的最终值（已写入主表）
    #[serde(rename = "restoredValue")]
    pub restored_value: Option<String>,
    /// 新生成的 historyId（记录这次撤销本身，以便无限次撤销链）
    #[serde(rename = "historyId")]
    pub history_id: i64,
}

/// 推送到 NvWaX 的本地状态：单个 Agent 的启用状态 + 角色
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualCompanyAgentState {
    #[serde(rename = "agentId")]
    pub agent_id: String,
    #[serde(rename = "enabled", default = "default_true")]
    pub enabled: bool,
    #[serde(rename = "alias", default)]
    pub alias: Option<String>,
    /// owner = 该 Agent 在本地被指派给老板专用
    /// shared = 团队共享
    /// reviewer = 仅作审核/观察角色，不自动执行
    #[serde(rename = "ownerRole", default)]
    pub owner_role: Option<String>,
    #[serde(rename = "lastRunAt", default)]
    pub last_run_at: Option<String>,
}

fn default_true() -> bool {
    true
}

/// 推送到 NvWaX 的本地状态整体结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualCompanyLocalStatePayload {
    #[serde(rename = "importedPackageId")]
    pub imported_package_id: String,
    #[serde(rename = "schemaVersion", default = "default_schema_version")]
    pub schema_version: String,
    #[serde(rename = "proclawVersion", default)]
    pub proclaw_version: Option<String>,
    /// active | paused | archived
    #[serde(rename = "teamStatus", default = "default_active")]
    pub team_status: String,
    #[serde(rename = "agents")]
    pub agents: Vec<VirtualCompanyAgentState>,
}

fn default_schema_version() -> String {
    "1.0.0".to_string()
}

fn default_active() -> String {
    "active".to_string()
}

/// push virtual company local state 接口返回
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualCompanyLocalStatePushResult {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    #[serde(rename = "lastSyncedAt")]
    pub last_synced_at: String,
    #[serde(rename = "agentsCount")]
    pub agents_count: u32,
    #[serde(rename = "teamStatus")]
    pub team_status: String,
}

/// v1.4.0 (Sprint 2.16)：发布到 NvWaX 市场的响应
///
/// NvWaX 端 controller `publishToMarketplace` 返回：
/// ```json
/// { "success": true, "data": { "teamSkillId": "...", "teamName": "...", "message": "..." } }
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublishMarketplaceResult {
    #[serde(rename = "teamSkillId")]
    pub team_skill_id: String,
    #[serde(rename = "teamName")]
    pub team_name: String,
    #[serde(default)]
    pub message: Option<String>,
}

/// Sprint 2.15: 多设备同步
/// 单个 Agent 状态（与 VirtualCompanyAgentState 对齐，但简化只列同步用字段）
/// 当前不在 Rust 端构造（直接由 TS 解析 localState.agents[] 即可），
/// 仅作为 schema 参考。#[allow(dead_code)] 避免 unused 警告。
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualCompanyAgentRemoteState {
    #[serde(rename = "agentId")]
    pub agent_id: String,
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub alias: Option<String>,
    /// owner | shared | reviewer
    #[serde(rename = "ownerRole", default)]
    pub owner_role: Option<String>,
    #[serde(rename = "lastRunAt", default)]
    pub last_run_at: Option<String>,
}

/// 拉取单个 session 的 local_state 响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualCompanyLocalStateResponse {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    /// 即 NvWaX 数据库 aiteam_creation_sessions.local_state JSONB 字段内容
    #[serde(rename = "localState")]
    pub local_state: serde_json::Value,
    #[serde(rename = "fetchedAt")]
    pub fetched_at: String,
}

/// 多设备同步：列出所有 session（含 local_state）
/// 用于 ProClaw 启动时同步 / 「立即同步」按钮
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualCompanySessionWithState {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    pub status: String,
    #[serde(rename = "finalTeamSkillId", default)]
    pub final_team_skill_id: Option<String>,
    #[serde(rename = "localState", default)]
    pub local_state: Option<serde_json::Value>,
    #[serde(rename = "localStateLastSyncedAt", default)]
    pub local_state_last_synced_at: Option<String>,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// 列出会话响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualCompanySessionListResponse {
    pub sessions: Vec<VirtualCompanySessionWithState>,
    #[serde(rename = "totalCount")]
    pub total_count: u32,
}

/// send_message + 收集 stream 后的最终 agent message 包装
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamSessionResponse {
    pub session_id: String,
    pub content: String,
    pub final_progress: f32,
    pub done: bool,
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

/// v1.4.0 (Sprint 2.16)：SSE 字节流的类型别名
///
/// reqwest 0.11 的 `Response::bytes_stream()` 返回 `impl Stream<Item = Result<Bytes, Error>> + Unpin`
/// 由于不能直接命名 `impl Trait`，我们用 `Pin<Box<dyn Stream...>>` 暴露给调用方
pub type SseBytesStream = std::pin::Pin<
    Box<dyn futures_util::Stream<Item = Result<bytes::Bytes, reqwest::Error>> + Send>,
>;

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

    /// v1.4.0 (Sprint 2.16)：构造 SSE 流 URL（绝对 URL）
    /// 用于 `stream_get_raw` 直接读字节流
    #[allow(dead_code)]
    pub fn format_stream_url(&self, path: &str) -> String {
        format!("{}{}", self.base_url, path)
    }

    /// v1.4.0 (Sprint 2.16)：获取 SSE 字节流
    ///
    /// 与 `get<T>` 不同：本方法**不**解析 JSON，直接返回 reqwest 的 bytes_stream
    /// 让调用方（SSE handler）逐块解析 `data: {...}\n\n` 行
    #[allow(dead_code)]
    pub async fn stream_get_raw(&self, url: &str) -> Result<SseBytesStream, NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        let req = self
            .http_client
            .get(url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Accept", "text/event-stream");

        let response = req.send().await.map_err(|e| {
            if e.is_timeout() {
                NvwaXError::Network("Request timed out".to_string())
            } else {
                NvwaXError::Network(format!("Stream connect failed: {}", e))
            }
        })?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(NvwaXError::Internal(format!(
                "Stream endpoint returned {}: {}",
                status.as_u16(),
                &body.chars().take(200).collect::<String>()
            )));
        }

        // 把 reqwest::Response 的 bytes_stream 包成 Pin<Box<dyn Stream>>
        Ok(Box::pin(response.bytes_stream()))
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

    /// 执行 POST 请求（公开版本，供 Tauri 命令直接调用）
    ///
    /// 与私有 `post` 方法功能一致，但允许外部模块（如 `nvwax_stream_session_v2`）
    /// 直接触发 POST 请求而无需先经过完整的内部 helper 链。
    #[allow(dead_code)]
    pub async fn http_post_json<T, B>(&self, path: &str, body: &B) -> Result<T, NvwaXError>
    where
        T: serde::de::DeserializeOwned,
        B: serde::Serialize,
    {
        self.post(path, body).await
    }

    /// 执行 POST 请求（私有 helper）
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

    // ============================================================
    // 虚拟公司（Virtual Company）API
    //
    // 用于 ProClaw 从 NvwaX 浏览/拉取虚拟公司模板和导出包。
    // URL 既可是 NvwaX 站内 API（/virtual-companies/...），
    // 也可是 NvwaX 生成的预签名下载链接（独立的 S3/CDN 域名）。
    // ============================================================

    /// 浏览 NvwaX 上的虚拟公司模板
    /// 内部走与 aiteams 相同的市场 endpoint，过滤 industry 标签
    pub async fn search_virtual_company_templates(
        &self,
        q: Option<&str>,
        industry: Option<&str>,
        page: Option<u32>,
        limit: Option<u32>,
    ) -> Result<VirtualCompanyTemplateListResponse, NvwaXError> {
        if self.closed {
            return Ok(VirtualCompanyTemplateListResponse {
                templates: vec![],
                pagination: None,
            });
        }
        let mut query = serde_json::Map::new();
        if let Some(q) = q {
            query.insert("q".to_string(), serde_json::Value::String(q.to_string()));
        }
        if let Some(ind) = industry {
            query.insert(
                "industry".to_string(),
                serde_json::Value::String(ind.to_string()),
            );
        }
        query.insert(
            "kind".to_string(),
            serde_json::Value::String("virtual-company".to_string()),
        );
        if let Some(p) = page {
            query.insert("page".to_string(), serde_json::Value::Number(p.into()));
        }
        if let Some(l) = limit {
            query.insert("limit".to_string(), serde_json::Value::Number(l.into()));
        }
        self.get::<VirtualCompanyTemplateListResponse>(
            "/marketplace/virtual-companies",
            Some(&serde_json::Value::Object(query)),
        )
        .await
    }

    /// 拉取一个虚拟公司导出包（按 downloadUrl）
    /// 注意：URL 可能是 NvwaX 内部 API 或预签名 CDN 链接，所以不走 base_url 前缀，
    /// 而是直接构造绝对 URL 请求。
    pub async fn download_virtual_company_package(
        &self,
        download_url: &str,
    ) -> Result<VirtualCompanyPackage, NvwaXError> {
        // 兼容两种来源：
        // 1. 完整绝对 URL（NvwaX 返回的预签名下载链接）—— 直接 GET
        // 2. 相对路径（/virtual-companies/packages/{id}/download）—— 拼上 base_url
        let req = if download_url.starts_with("http://") || download_url.starts_with("https://") {
            self.http_client
                .get(download_url)
                .header("Authorization", format!("Bearer {}", self.api_key))
        } else {
            let path = download_url.trim_start_matches('/');
            self.http_client
                .get(format!("{}/{}", self.base_url, path))
                .header("Authorization", format!("Bearer {}", self.api_key))
        };

        let response = req.send().await.map_err(|e| {
            if e.is_timeout() {
                NvwaXError::Network("Request timed out".to_string())
            } else {
                NvwaXError::Network(format!("Download failed: {}", e))
            }
        })?;

        let status = response.status();
        let body_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Failed to read response body".to_string());

        if !status.is_success() {
            return Err(NvwaXError::Internal(format!(
                "Download failed with status {}: {}",
                status.as_u16(),
                body_text
            )));
        }

        // 直接解析为 VirtualCompanyPackage（NvwaX 端不包 success 包装层）
        let package: VirtualCompanyPackage = serde_json::from_str(&body_text).map_err(|e| {
            NvwaXError::Validation(format!(
                "Invalid VirtualCompanyPackage JSON: {} (body: {})",
                e,
                &body_text.chars().take(200).collect::<String>()
            ))
        })?;

        // 基础结构校验
        if package.schema_version.is_empty() {
            return Err(NvwaXError::Validation(
                "Missing schemaVersion in package".to_string(),
            ));
        }
        if package.source.platform != "nvwax" {
            return Err(NvwaXError::Validation(format!(
                "Unsupported source platform: {}",
                package.source.platform
            )));
        }
        if package.team.id.is_empty() || package.team.name.is_empty() {
            return Err(NvwaXError::Validation(
                "Missing required team.id / team.name".to_string(),
            ));
        }

        Ok(package)
    }

    /// 把 ProClaw 本地状态推送到 NvWaX 云端
    /// 对应 PUT /aiteam-creation/sessions/:sessionId/local-state
    pub async fn push_virtual_company_local_state(
        &self,
        session_id: &str,
        payload: &VirtualCompanyLocalStatePayload,
    ) -> Result<VirtualCompanyLocalStatePushResult, NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        if session_id.is_empty() {
            return Err(NvwaXError::Validation("session_id is required".to_string()));
        }
        if payload.imported_package_id.is_empty() {
            return Err(NvwaXError::Validation(
                "imported_package_id is required".to_string(),
            ));
        }
        let path = format!("/aiteam-creation/sessions/{}/local-state", session_id);
        self.put::<VirtualCompanyLocalStatePushResult, VirtualCompanyLocalStatePayload>(
            &path, payload,
        )
        .await
    }

    /// v1.4.0 (Sprint 2.16)：把虚拟公司发布到 NvWaX 市场
    /// 对应 POST /api/aiteam-creation/sessions/:id/publish-to-marketplace
    ///
    /// NvWaX 端 controller 已实现（Sprint 2.13）：把 session 数据组装成
    /// team_skills 表行，`category='virtual-company'`, `is_public=true`。
    pub async fn publish_virtual_company_to_marketplace(
        &self,
        session_id: &str,
    ) -> Result<PublishMarketplaceResult, NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        if session_id.is_empty() {
            return Err(NvwaXError::Validation("session_id is required".to_string()));
        }
        let path = format!(
            "/aiteam-creation/sessions/{}/publish-to-marketplace",
            session_id
        );
        self.post_empty::<PublishMarketplaceResult>(&path).await
    }

    /// 发送用户消息到虚拟公司创建会话，并收集 SSE 流式响应直到 done=true。
    ///
    /// NvWaX 服务端 POST /api/aiteam-creation/sessions/:id/message 是非流式响应，
    /// 而 GET /api/aiteam-creation/sessions/:id/stream 才是真正的 SSE 流。
    /// 本方法组合两者：
    ///   1. POST message 触发 NvWaX 思考
    ///   2. 轮询 /stream 直到拿到 done=true 的最终消息
    ///
    /// 简化策略：阻塞最多 60 秒，每 500ms 拉一次 stream。
    pub async fn stream_session(
        &self,
        session_id: &str,
        message: &str,
    ) -> Result<StreamSessionResponse, NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        if session_id.is_empty() {
            return Err(NvwaXError::Validation("session_id is required".to_string()));
        }

        // 1. POST user message
        let msg_path = format!("/aiteam-creation/sessions/{}/message", session_id);
        let payload = SendMessagePayload {
            message: Some(message.to_string()),
            metadata: None,
        };
        // 用普通 JSON 响应（不是 SSE）触发 NvWaX 思考
        let _send_resp: serde_json::Value = self
            .post::<serde_json::Value, SendMessagePayload>(&msg_path, &payload)
            .await?;

        // 2. 轮询 /stream 直到拿到 done=true 的最终消息
        let stream_path = format!("/aiteam-creation/sessions/{}/stream", session_id);
        let max_polls = 120; // 60 秒（每次 500ms）
        let mut last_content = String::new();
        let mut last_progress = 0.0_f32;
        let mut done = false;

        for _ in 0..max_polls {
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            // /stream 是 SSE；服务端 response 为 text/event-stream，reqwest 默认会读取完整 body
            // 这里退化为每 500ms 拉一次，拿到"当前已积累的内容"
            match self.get::<serde_json::Value>(&stream_path, None).await {
                Ok(v) => {
                    if let Some(arr) = v.as_array() {
                        // 累加所有 event 的 content
                        last_content.clear();
                        for ev in arr {
                            if let Some(content) = ev.get("content").and_then(|c| c.as_str()) {
                                last_content.push_str(content);
                            }
                            if let Some(progress) = ev.get("progress").and_then(|p| p.as_f64()) {
                                last_progress = progress as f32;
                            }
                            if ev.get("done").and_then(|d| d.as_bool()).unwrap_or(false) {
                                done = true;
                                break;
                            }
                        }
                        if done {
                            break;
                        }
                    }
                }
                Err(_) => {
                    // 单次失败重试
                    continue;
                }
            }
        }

        Ok(StreamSessionResponse {
            session_id: session_id.to_string(),
            content: last_content,
            final_progress: last_progress,
            done,
        })
    }

    /// 拉取单个 session 的 local_state（Sprint 2.15 多设备同步）
    /// 对应 GET /api/aiteam-creation/sessions/:id/local-state
    pub async fn fetch_local_state(
        &self,
        session_id: &str,
    ) -> Result<VirtualCompanyLocalStateResponse, NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        if session_id.is_empty() {
            return Err(NvwaXError::Validation("session_id is required".to_string()));
        }
        let path = format!("/aiteam-creation/sessions/{}/local-state", session_id);
        self.get::<VirtualCompanyLocalStateResponse>(&path, None)
            .await
    }

    /// 列出用户最近的虚拟公司会话（含 local_state）
    /// 对应 GET /api/aiteam-creation/sessions
    pub async fn list_sessions_with_state(
        &self,
        limit: Option<u32>,
        offset: Option<u32>,
    ) -> Result<VirtualCompanySessionListResponse, NvwaXError> {
        if self.closed {
            return Err(NvwaXError::Auth("NvwaX API Key 未配置".to_string()));
        }
        let mut query = serde_json::Map::new();
        query.insert(
            "limit".to_string(),
            serde_json::Value::Number((limit.unwrap_or(30)).into()),
        );
        query.insert(
            "offset".to_string(),
            serde_json::Value::Number((offset.unwrap_or(0)).into()),
        );
        self.get::<VirtualCompanySessionListResponse>(
            "/aiteam-creation/sessions",
            Some(&serde_json::Value::Object(query)),
        )
        .await
    }
}
