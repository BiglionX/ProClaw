// Axum HTTP API 模块
// 提供 RESTful API 和 WebSocket 服务
// Phase 6: RBAC 权限中间件

use axum::{
    body::Body,
    extract::Request,
    middleware::{self, Next},
    http::StatusCode,
    Json,
};
use tower_http::cors::{CorsLayer, Any};
use std::sync::Arc;
use std::sync::Mutex;
use std::sync::OnceLock;
use crate::database::Database;
use crate::utils::crypto::Aes256GcmCipher;
use axum::response::Response;
use crate::api::websocket::WebSocketManager;
use crate::services::cloud_backup_service::CloudBackupService;
use crate::auth::permissions;

/// 全局 JWT 密钥（启动时设置一次）
pub static JWT_SECRET: OnceLock<Vec<u8>> = OnceLock::new();

/// 应用程序状态，在线程间共享
#[derive(Clone)]
#[allow(dead_code)]
pub struct AppState {
    /// 数据库连接
    pub db: Arc<Mutex<Database>>,
    /// 加密器（用于端到端加密）
    pub cipher: Arc<Aes256GcmCipher>,
    /// WebSocket 连接管理器
    pub ws_manager: Arc<WebSocketManager>,
    /// 云备份服务（Pro版，用于中继和同步）
    pub cloud_backup: Arc<CloudBackupService>,
    /// JWT 签名密钥 (Phase 6)
    pub jwt_secret: Arc<Vec<u8>>,
}

// 导入各个API处理器模块
pub mod auth;
pub mod products;
pub mod customers;
pub mod suppliers;
pub mod sales_orders;
pub mod purchase_orders;
pub mod inventory;
pub mod finance;
pub mod ai;
pub mod files;
pub mod devices;
pub mod websocket;
pub mod messages;
pub mod encryption;
pub mod relay;
pub mod users;
pub mod approvals;
pub mod subscriptions;
pub mod call;
pub mod invitations;

/// 创建 Axum 路由器
pub fn create_router(state: AppState) -> axum::Router {
    // 公开端点（无需认证）
    let public_routes = axum::Router::new()
        .route("/api/auth/pair", axum::routing::post(auth::pair_device))
        .route("/api/auth/login", axum::routing::post(auth::login))
        .route("/api/auth/token", axum::routing::post(auth::refresh_token))
        .route("/api/health", axum::routing::get(health_check))
        // 邀请接受（无需认证，IP 限流在 handler 内部实现）
        .route("/api/invitations/accept", axum::routing::post(invitations::accept_invitation));

    // 需要认证的端点
    let protected_routes = axum::Router::new()
        // 产品管理
        .route("/api/products", axum::routing::get(products::get_products).post(products::create_product))
        .route("/api/products/:id", axum::routing::get(products::get_product).put(products::update_product).delete(products::delete_product))

        // 客户管理
        .route("/api/customers", axum::routing::get(customers::get_customers).post(customers::create_customer))
        .route("/api/customers/:id", axum::routing::get(customers::get_customer).put(customers::update_customer).delete(customers::delete_customer))

        // 供应商管理
        .route("/api/suppliers", axum::routing::get(suppliers::get_suppliers).post(suppliers::create_supplier))
        .route("/api/suppliers/:id", axum::routing::get(suppliers::get_supplier).put(suppliers::update_supplier).delete(suppliers::delete_supplier))

        // 销售订单
        .route("/api/sales_orders", axum::routing::get(sales_orders::get_sales_orders).post(sales_orders::create_sales_order))
        .route("/api/sales_orders/:id", axum::routing::get(sales_orders::get_sales_order).put(sales_orders::update_sales_order))
        .route("/api/sales_orders/:id/submit", axum::routing::post(sales_orders::submit_sales_order))

        // 采购订单
        .route("/api/purchase_orders", axum::routing::get(purchase_orders::get_purchase_orders).post(purchase_orders::create_purchase_order))
        .route("/api/purchase_orders/:id", axum::routing::get(purchase_orders::get_purchase_order).put(purchase_orders::update_purchase_order))
        .route("/api/purchase_orders/:id/receive", axum::routing::post(purchase_orders::receive_purchase_order))

        // 库存管理
        .route("/api/inventory", axum::routing::get(inventory::get_inventory))
        .route("/api/inventory/transactions", axum::routing::get(inventory::get_inventory_transactions).post(inventory::create_inventory_transaction))

        // 财务管理
        .route("/api/finance/profit-loss", axum::routing::get(finance::get_profit_loss_report))
        .route("/api/finance/cash-flow", axum::routing::get(finance::get_cash_flow_report))
        .route("/api/finance/summary", axum::routing::get(finance::get_financial_summary))

        // AI 订单识别
        .route("/api/ai/recognize_order", axum::routing::post(ai::recognize_order))
        .route("/api/ai/validate_order_items", axum::routing::post(ai::validate_order_items))
        .route("/api/sales_orders/draft", axum::routing::post(ai::save_order_draft))
        .route("/api/sales_orders/draft/:id", axum::routing::get(ai::get_order_draft))
        .route("/api/sales_orders/draft/:id/submit", axum::routing::post(ai::submit_order_draft))

        // 消息管理
        .route("/api/messages", axum::routing::get(messages::get_messages))
        .route("/api/messages/offline", axum::routing::get(messages::get_offline_messages))
        .route("/api/messages/send", axum::routing::post(messages::send_message))
        .route("/api/messages/:id/read", axum::routing::post(messages::mark_message_read))

        // 文件上传下载
        .route("/api/files/upload", axum::routing::post(files::upload_file))
        .route("/api/files/download/:id", axum::routing::get(files::download_file))
        .route("/api/files/thumb/:id", axum::routing::get(files::get_file_thumbnail))

        // 设备管理
        .route("/api/devices", axum::routing::get(devices::list_devices))
        .route("/api/devices/:id/revoke", axum::routing::post(devices::revoke_device))

        // 云中继与同步 (Phase 5)
        .route("/api/relay/send", axum::routing::post(relay::relay_send))
        .route("/api/relay/messages", axum::routing::get(relay::relay_get_messages))
        .route("/api/relay/status", axum::routing::get(relay::relay_status))
        .route("/api/sync/trigger", axum::routing::post(relay::sync_trigger))
        .route("/api/sync/status", axum::routing::get(relay::sync_status))

        // 用户管理 (Phase 6 - boss only)
        .route("/api/users", axum::routing::get(users::list_users).post(users::create_user))
        .route("/api/users/:id", axum::routing::get(users::get_user).put(users::update_user).delete(users::delete_user))
        .route("/api/users/:id/roles", axum::routing::put(users::assign_role))
        .route("/api/users/:id/password", axum::routing::put(users::change_password))

        // 审批工作流 (Phase 6)
        .route("/api/approvals", axum::routing::get(approvals::list_approvals).post(approvals::create_approval))
        .route("/api/approvals/:id/approve", axum::routing::post(approvals::approve_request))
        .route("/api/approvals/:id/reject", axum::routing::post(approvals::reject_request))

        // 订阅与计费 (Phase 7)
        .route("/api/subscriptions/plans", axum::routing::get(subscriptions::get_plans))
        .route("/api/subscriptions/me", axum::routing::get(subscriptions::get_my_subscription))
        .route("/api/subscriptions/subscribe", axum::routing::post(subscriptions::subscribe_plan))
        .route("/api/subscriptions/cancel", axum::routing::post(subscriptions::cancel_subscription))
        .route("/api/subscriptions/token-summary", axum::routing::get(subscriptions::get_token_summary))
        .route("/api/subscriptions/token-usage", axum::routing::get(subscriptions::get_token_usage))
        .route("/api/subscriptions/invoices", axum::routing::get(subscriptions::get_invoices))

        // 权限检查
        .route("/api/auth/me", axum::routing::get(auth::get_current_user))

        // 邀请管理 (PRD v4.2)
        .route("/api/invitations/create", axum::routing::post(invitations::create_invitation))
        .route("/api/invitations", axum::routing::get(invitations::list_invitations))
        .route("/api/invitations/:code/revoke", axum::routing::post(invitations::revoke_invitation))

        // 通话记录 (v4.1 音视频通话)
        .route("/api/call-records", axum::routing::get(call::get_call_records).post(call::create_call_record))
        .route("/api/call-records/:id", axum::routing::get(call::get_call_record).put(call::update_call_record))
        .route("/api/call-records/:session_id/end", axum::routing::post(call::end_call))
        .route("/api/users/:user_id/online", axum::routing::get(call::check_user_online))

        // 添加认证+权限中间件
        .layer(middleware::from_fn(rbac_middleware));

    // WebSocket 聊天（单独处理，使用认证中间件）
    let websocket_route = axum::Router::new()
        .route("/ws/chat", axum::routing::get(websocket::websocket_handler))
        .layer(middleware::from_fn(auth_middleware_ws));

    // 合并所有路由
    let app = public_routes
        .merge(protected_routes)
        .merge(websocket_route)
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any))
        .with_state(state);

    app
}

/// 健康检查端点
async fn health_check() -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::OK,
        Json(serde_json::json!({
            "status": "ok",
            "version": "4.0.0",
            "timestamp": chrono::Utc::now().to_rfc3339()
        }))
    )
}

/// RBAC 认证+权限中间件
/// 1. 验证 JWT token
/// 2. 提取 Claims（角色+权限）
/// 3. 检查路径级权限
pub async fn rbac_middleware(
    mut request: Request<Body>,
    next: Next,
) -> Response {
    // 从 Authorization header 或 query 参数提取 token
    let token = request
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(|v| v.to_string())
        .or_else(|| {
            request.uri().query()
                .and_then(|q| {
                    q.split('&')
                        .find(|p| p.starts_with("token="))
                        .map(|p| p[6..].to_string())
                })
        });

    // 解析 JWT 密钥
    let secret = JWT_SECRET.get().cloned().unwrap_or_else(|| vec![0u8; 32]);

    match token {
        Some(token) => {
            match auth::verify_token(&token, &secret) {
                Ok(claims) => {
                    let method = request.method().as_str();
                    let path = request.uri().path().to_string();

                    if let Some(required_perm) = permissions::required_permission_for_route(method, &path) {
                        if !permissions::has_permission(&claims.permissions, required_perm) {
                            let mut resp = Response::new(Body::from(
                                serde_json::json!({
                                    "error": "Insufficient permissions",
                                    "required": required_perm,
                                }).to_string()
                            ));
                            *resp.status_mut() = StatusCode::FORBIDDEN;
                            resp.headers_mut().insert("content-type", "application/json".parse().unwrap());
                            return resp;
                        }
                    }

                    request.extensions_mut().insert(claims);
                    next.run(request).await
                }
                Err(_) => {
                    let mut resp = Response::new(Body::from(
                        serde_json::json!({"error": "Invalid or expired token"}).to_string()
                    ));
                    *resp.status_mut() = StatusCode::UNAUTHORIZED;
                    resp.headers_mut().insert("content-type", "application/json".parse().unwrap());
                    resp
                }
            }
        }
        None => {
            let mut resp = Response::new(Body::from(
                serde_json::json!({"error": "Missing Authorization header"}).to_string()
            ));
            *resp.status_mut() = StatusCode::UNAUTHORIZED;
            resp.headers_mut().insert("content-type", "application/json".parse().unwrap());
            resp
        }
    }
}

/// WebSocket 认证中间件（无 RBAC 检查，仅验证 token）
pub async fn auth_middleware_ws(
    request: Request<Body>,
    next: Next,
) -> Response {
    let token = request
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(|v| v.to_string())
        .or_else(|| {
            request.uri().query()
                .and_then(|q| {
                    q.split('&')
                        .find(|p| p.starts_with("token="))
                        .map(|p| p[6..].to_string())
                })
        });

    match token {
        Some(_token) => {
            // WebSocket 权限在 handler 中单独处理
            // 这里仅做基本 token 存在性验证
            next.run(request).await
        }
        None => {
            let mut resp = Response::new(Body::from(
                serde_json::json!({"error": "Missing Authorization header"}).to_string()
            ));
            *resp.status_mut() = StatusCode::UNAUTHORIZED;
            resp.headers_mut().insert("content-type", "application/json".parse().unwrap());
            resp
        }
    }
}

/// 辅助: 从 request extensions 获取 Claims
pub fn extract_claims(request: &Request<Body>) -> Option<auth::Claims> {
    request.extensions().get::<auth::Claims>().cloned()
}
