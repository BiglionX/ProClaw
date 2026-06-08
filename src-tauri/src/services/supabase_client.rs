// Supabase REST API 客户端
// 用于云备份、中继消息、数据同步等场景

use reqwest::{Client, Response, StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration;

/// Supabase REST API 客户端
#[derive(Clone)]
#[allow(dead_code)]
pub struct SupabaseClient {
    client: Client,
    base_url: String,
    api_key: String,
    configured: bool,
}

/// Supabase 查询过滤器
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct QueryFilter {
    pub column: String,
    pub operator: String, // eq, neq, gt, gte, lt, lte, like, ilike, in, is, cs, cd
    pub value: String,
}

#[allow(dead_code)]
impl SupabaseClient {
    /// 创建 Supabase 客户端实例
    pub fn new(supabase_url: &str, api_key: &str) -> Self {
        let configured = !supabase_url.is_empty() && !api_key.is_empty();
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .connect_timeout(Duration::from_secs(10))
            .build()
            .expect("Failed to create Supabase HTTP client. Check system network stack.");

        Self {
            client,
            base_url: supabase_url.trim_end_matches('/').to_string(),
            api_key: api_key.to_string(),
            configured,
        }
    }

    /// 从环境变量创建客户端
    pub fn from_env() -> Self {
        let url = std::env::var("SUPABASE_URL").unwrap_or_default();
        let key = std::env::var("SUPABASE_ANON_KEY").unwrap_or_default();
        Self::new(&url, &key)
    }

    /// 检查是否已配置
    pub fn is_configured(&self) -> bool {
        self.configured && !self.base_url.is_empty()
    }

    /// 获取 Supabase 基础 URL
    #[allow(dead_code)]
    pub fn base_url(&self) -> &str {
        &self.base_url
    }

    /// 构建 REST API URL
    fn rest_url(&self, table: &str) -> String {
        format!("{}/rest/v1/{}", self.base_url, table)
    }

    /// 构建常用请求头
    fn headers(&self) -> Vec<(&'static str, String)> {
        vec![
            ("apikey", self.api_key.clone()),
            ("Authorization", format!("Bearer {}", self.api_key)),
            ("Content-Type", "application/json".to_string()),
            ("Prefer", "return=representation".to_string()),
        ]
    }

    // ========== CRUD 操作 ==========

    /// 插入记录
    pub async fn insert(&self, table: &str, data: &Value) -> Result<Value, String> {
        let url = self.rest_url(table);
        let mut req = self.client.post(&url);

        for (key, value) in self.headers() {
            req = req.header(key, value);
        }

        let resp = req
            .json(data)
            .send()
            .await
            .map_err(|e| format!("Supabase insert failed: {}", e))?;

        self.handle_response(resp).await
    }

    /// 批量插入
    pub async fn insert_batch(&self, table: &str, data: &[Value]) -> Result<Value, String> {
        let url = self.rest_url(table);
        let mut req = self.client.post(&url);

        for (key, value) in self.headers() {
            req = req.header(key, value);
        }

        let resp = req
            .json(data)
            .send()
            .await
            .map_err(|e| format!("Supabase batch insert failed: {}", e))?;

        self.handle_response(resp).await
    }

    /// 查询记录（带去重列名保护）
    pub async fn select(&self, table: &str, filters: &[QueryFilter]) -> Result<Value, String> {
        let url = self.rest_url(table);
        let mut req = self.client.get(&url);

        for (key, value) in self.headers() {
            req = req.header(key, value);
        }

        // 添加查询过滤器
        for filter in filters {
            let param = format!("{}={}.{}", filter.column, filter.operator, filter.value);
            req = req.query(&[(&filter.column, &param)]);
        }

        let resp = req
            .send()
            .await
            .map_err(|e| format!("Supabase select failed: {}", e))?;

        self.handle_response(resp).await
    }

    /// 根据 ID 查询单条记录
    pub async fn select_by_id(&self, table: &str, id: &str) -> Result<Value, String> {
        let url = format!("{}?id=eq.{}", self.rest_url(table), id);
        let mut req = self.client.get(&url);

        for (key, value) in self.headers() {
            req = req.header(key, value);
        }

        let resp = req
            .send()
            .await
            .map_err(|e| format!("Supabase select_by_id failed: {}", e))?;

        self.handle_response(resp).await
    }

    /// 更新记录
    pub async fn update(
        &self,
        table: &str,
        filters: &[QueryFilter],
        data: &Value,
    ) -> Result<Value, String> {
        let url = self.rest_url(table);
        let mut req = self.client.patch(&url);

        for (key, value) in self.headers() {
            req = req.header(key, value);
        }

        for filter in filters {
            let param = format!("{}=eq.{}", filter.column, filter.value);
            req = req.query(&[(&filter.column, &param)]);
        }

        let resp = req
            .json(data)
            .send()
            .await
            .map_err(|e| format!("Supabase update failed: {}", e))?;

        self.handle_response(resp).await
    }

    /// 根据 ID 更新单条记录
    pub async fn update_by_id(&self, table: &str, id: &str, data: &Value) -> Result<Value, String> {
        let url = format!("{}?id=eq.{}", self.rest_url(table), id);
        let mut req = self.client.patch(&url);

        for (key, value) in self.headers() {
            req = req.header(key, value);
        }

        let resp = req
            .json(data)
            .send()
            .await
            .map_err(|e| format!("Supabase update_by_id failed: {}", e))?;

        self.handle_response(resp).await
    }

    /// 删除记录
    pub async fn delete_by_id(&self, table: &str, id: &str) -> Result<(), String> {
        let url = format!("{}?id=eq.{}", self.rest_url(table), id);
        let mut req = self.client.delete(&url);

        for (key, value) in self.headers() {
            req = req.header(key, value);
        }

        let resp = req
            .send()
            .await
            .map_err(|e| format!("Supabase delete failed: {}", e))?;

        if resp.status().is_success() || resp.status() == StatusCode::NO_CONTENT {
            Ok(())
        } else {
            let body = resp.text().await.unwrap_or_default();
            Err(format!("Supabase delete error: {}", body))
        }
    }

    /// 使用 RPC 调用（自定义函数）
    #[allow(dead_code)]
    pub async fn rpc(&self, function: &str, params: &Value) -> Result<Value, String> {
        let url = format!("{}/rest/v1/rpc/{}", self.base_url, function);
        let mut req = self.client.post(&url);

        for (key, value) in self.headers() {
            req = req.header(key, value);
        }

        let resp = req
            .json(params)
            .send()
            .await
            .map_err(|e| format!("Supabase RPC failed: {}", e))?;

        self.handle_response(resp).await
    }

    /// 获取原始的加密二进制数据（用于下载加密备份）
    pub async fn download_raw(&self, table: &str, id: &str) -> Result<Vec<u8>, String> {
        let url = format!(
            "{}?id=eq.{}&select=encrypted_data",
            self.rest_url(table),
            id
        );
        let mut req = self.client.get(&url);

        for (key, value) in self.headers() {
            req = req.header(key, value);
        }

        let resp = req
            .send()
            .await
            .map_err(|e| format!("Supabase download failed: {}", e))?;

        let body: Vec<u8> = resp
            .bytes()
            .await
            .map_err(|e| format!("Failed to read response bytes: {}", e))?
            .to_vec();

        // 解析 JSON 数组获取 encrypted_data 字段
        let json: Value = serde_json::from_slice(&body)
            .map_err(|e| format!("Failed to parse download response: {}", e))?;

        if let Some(arr) = json.as_array() {
            if let Some(first) = arr.first() {
                if let Some(encrypted) = first.get("encrypted_data").and_then(|v| v.as_str()) {
                    use base64::Engine;
                    return base64::engine::general_purpose::STANDARD
                        .decode(encrypted)
                        .map_err(|e| format!("Base64 decode failed: {}", e));
                }
            }
        }

        Err("No encrypted data found".to_string())
    }

    /// 获取指定表在某个时间戳之后变更的记录
    pub async fn select_changes_since(
        &self,
        table: &str,
        since_column: &str,
        since_value: &str,
    ) -> Result<Value, String> {
        let url = format!(
            "{}?{}={}.{}",
            self.rest_url(table),
            since_column,
            "gte",
            since_value
        );
        let mut req = self.client.get(&url);

        for (key, value) in self.headers() {
            req = req.header(key, value);
        }

        let resp = req
            .send()
            .await
            .map_err(|e| format!("Supabase select changes failed: {}", e))?;

        self.handle_response(resp).await
    }

    // ========== 连接检查 ==========

    /// 测试 Supabase 连接
    pub async fn test_connection(&self) -> Result<bool, String> {
        if !self.is_configured() {
            return Ok(false);
        }

        // 尝试查询一个简单的端点
        let url = format!("{}/rest/v1/", self.base_url);
        let mut req = self.client.get(&url);
        req = req.header("apikey", &self.api_key);
        req = req.header("Authorization", format!("Bearer {}", self.api_key));

        match req.send().await {
            Ok(resp) => Ok(resp.status().is_success()),
            Err(e) => Err(format!("Connection test failed: {}", e)),
        }
    }

    // ========== 内部辅助 ==========

    async fn handle_response(&self, resp: Response) -> Result<Value, String> {
        let status = resp.status();
        let body: Vec<u8> = resp
            .bytes()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?
            .to_vec();

        if status.is_success() || status == StatusCode::CREATED {
            if body.is_empty() {
                return Ok(Value::Null);
            }
            serde_json::from_slice(&body).map_err(|e| {
                format!(
                    "Failed to parse response JSON: {} (body: {:?})",
                    e,
                    String::from_utf8_lossy(&body[..body.len().min(200)])
                )
            })
        } else {
            let error_body = String::from_utf8_lossy(&body);
            Err(format!("Supabase HTTP {}: {}", status.as_u16(), error_body))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_not_configured() {
        let client = SupabaseClient::new("", "");
        assert!(!client.is_configured());
    }

    #[test]
    fn test_client_configured() {
        let client = SupabaseClient::new("https://example.supabase.co", "test-key");
        assert!(client.is_configured());
    }
}
