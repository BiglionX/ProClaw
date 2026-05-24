// 权限控制模块
// Phase 6: RBAC 权限检查、角色-权限映射

use serde::{Deserialize, Serialize};

/// 预定义权限常量
#[allow(dead_code)]
pub mod perm {
    pub const ALL: &str = "*";

    // 产品
    pub const VIEW_PRODUCTS: &str = "view_products";
    pub const MANAGE_PRODUCTS: &str = "manage_products";

    // 采购
    pub const VIEW_PURCHASE: &str = "view_purchase";
    pub const MANAGE_PURCHASE: &str = "manage_purchase";

    // 销售
    pub const VIEW_SALES: &str = "view_sales";
    pub const CREATE_SALES_ORDER: &str = "create_sales_order";

    // 库存
    pub const VIEW_INVENTORY: &str = "view_inventory";
    pub const MANAGE_INVENTORY: &str = "manage_inventory";

    // 财务
    pub const VIEW_FINANCE: &str = "view_finance";
    pub const MANAGE_FINANCE: &str = "manage_finance";

    // 用户管理
    pub const VIEW_USERS: &str = "view_users";
    pub const MANAGE_USERS: &str = "manage_users";

    // 审批
    pub const VIEW_APPROVALS: &str = "view_approvals";
    pub const APPROVE_ORDERS: &str = "approve_orders";

    // 外部用户
    pub const VIEW_OWN_ORDERS: &str = "view_own_orders";
    pub const VIEW_OWN_PRODUCTS: &str = "view_own_products";
}

/// 角色定义
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct Role {
    pub id: i32,
    pub name: String,
    pub description: Option<String>,
    pub permissions: Vec<String>,
}

/// 判断角色是否拥有某项权限
pub fn has_permission(role_permissions: &[String], required: &str) -> bool {
    // boss 角色拥有所有权限
    if role_permissions.contains(&perm::ALL.to_string()) {
        return true;
    }
    role_permissions.contains(&required.to_string())
}

/// 判断角色是否拥有任意一项权限
#[allow(dead_code)]
pub fn has_any_permission(role_permissions: &[String], required: &[&str]) -> bool {
    if role_permissions.contains(&perm::ALL.to_string()) {
        return true;
    }
    required.iter().any(|r| role_permissions.contains(&r.to_string()))
}

/// 从 JSON 权限字符串解析为 Vec
#[allow(dead_code)]
pub fn parse_permissions(json_perms: &str) -> Vec<String> {
    serde_json::from_str::<Vec<String>>(json_perms).unwrap_or_default()
}

/// 获取角色对应的默认权限列表
#[allow(dead_code)]
pub fn get_role_permissions(role_name: &str) -> Vec<String> {
    match role_name {
        "boss" => vec![perm::ALL.to_string()],
        "finance" => vec![
            perm::VIEW_FINANCE.to_string(),
            perm::MANAGE_FINANCE.to_string(),
            perm::VIEW_PRODUCTS.to_string(),
        ],
        "purchase" => vec![
            perm::VIEW_PURCHASE.to_string(),
            perm::MANAGE_PURCHASE.to_string(),
            perm::VIEW_PRODUCTS.to_string(),
            perm::VIEW_INVENTORY.to_string(),
        ],
        "warehouse" => vec![
            perm::VIEW_INVENTORY.to_string(),
            perm::MANAGE_INVENTORY.to_string(),
            perm::VIEW_PRODUCTS.to_string(),
        ],
        "sales" => vec![
            perm::VIEW_SALES.to_string(),
            perm::CREATE_SALES_ORDER.to_string(),
            perm::VIEW_PRODUCTS.to_string(),
            perm::VIEW_INVENTORY.to_string(),
        ],
        "customer" => vec![
            perm::VIEW_OWN_ORDERS.to_string(),
            perm::VIEW_OWN_PRODUCTS.to_string(),
        ],
        "supplier" => vec![
            perm::VIEW_OWN_PRODUCTS.to_string(),
        ],
        _ => vec![],
    }
}

/// 获取 HTTP 方法对应的所需权限
pub fn required_permission_for_route(method: &str, path: &str) -> Option<&'static str> {
    match (method, path) {
        // 产品管理
        (_, p) if p.starts_with("/api/products") => match method {
            "GET" => Some(perm::VIEW_PRODUCTS),
            _ => Some(perm::MANAGE_PRODUCTS),
        },

        // 客户管理
        (_, p) if p.starts_with("/api/customers") => match method {
            "GET" => Some(perm::VIEW_SALES),
            _ => Some(perm::CREATE_SALES_ORDER),
        },

        // 供应商管理
        (_, p) if p.starts_with("/api/suppliers") => match method {
            "GET" => Some(perm::VIEW_PURCHASE),
            _ => Some(perm::MANAGE_PURCHASE),
        },

        // 销售订单
        (_, p) if p.starts_with("/api/sales_orders") => match method {
            "GET" => Some(perm::VIEW_SALES),
            _ => Some(perm::CREATE_SALES_ORDER),
        },

        // 采购订单
        (_, p) if p.starts_with("/api/purchase_orders") => match method {
            "GET" => Some(perm::VIEW_PURCHASE),
            _ => Some(perm::MANAGE_PURCHASE),
        },

        // 库存管理
        (_, p) if p.starts_with("/api/inventory") => match method {
            "GET" => Some(perm::VIEW_INVENTORY),
            _ => Some(perm::MANAGE_INVENTORY),
        },

        // 财务管理
        (_, p) if p.starts_with("/api/finance") => match method {
            "GET" => Some(perm::VIEW_FINANCE),
            _ => Some(perm::MANAGE_FINANCE),
        },

        // 用户管理 (boss only)
        (_, p) if p.starts_with("/api/users") => Some(perm::MANAGE_USERS),

        // 审批 (boss/finance)
        (_, p) if p.starts_with("/api/approvals") => Some(perm::APPROVE_ORDERS),

        // AI / 文件 / 消息 / 设备 / 中继 — 内部用户均可
        _ => None,
    }
}

/// 权限错误响应
#[allow(dead_code)]
pub fn permission_denied_response() -> (axum::http::StatusCode, axum::Json<serde_json::Value>) {
    (
        axum::http::StatusCode::FORBIDDEN,
        axum::Json(serde_json::json!({"error": "Insufficient permissions"})),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_boss_has_all_permissions() {
        let perms = vec!["*".to_string()];
        assert!(has_permission(&perms, "any_perm"));
        assert!(has_permission(&perms, perm::VIEW_PRODUCTS));
        assert!(has_permission(&perms, perm::MANAGE_USERS));
        assert!(has_any_permission(&perms, &["unknown"]));
    }

    #[test]
    fn test_specific_permission_check() {
        let perms = vec!["view_products".to_string(), "view_sales".to_string()];
        assert!(has_permission(&perms, "view_products"));
        assert!(!has_permission(&perms, "manage_products"));
    }

    #[test]
    fn test_has_any_permission() {
        let perms = vec!["view_products".to_string()];
        assert!(has_any_permission(&perms, &["view_products", "manage_products"]));
        assert!(!has_any_permission(&perms, &["manage_products", "manage_users"]));
    }

    #[test]
    fn test_parse_permissions_valid_json() {
        let json = r#"["view_products", "manage_products"]"#;
        let perms = parse_permissions(json);
        assert_eq!(perms.len(), 2);
        assert!(perms.contains(&"view_products".to_string()));
        assert!(perms.contains(&"manage_products".to_string()));
    }

    #[test]
    fn test_parse_permissions_invalid_json() {
        let json = "invalid";
        let perms = parse_permissions(json);
        assert!(perms.is_empty());
    }

    #[test]
    fn test_parse_permissions_empty() {
        let perms = parse_permissions("");
        assert!(perms.is_empty());
    }

    #[test]
    fn test_get_role_permissions_boss() {
        let perms = get_role_permissions("boss");
        assert!(perms.contains(&"*".to_string()));
    }

    #[test]
    fn test_get_role_permissions_sales() {
        let perms = get_role_permissions("sales");
        assert!(perms.contains(&"view_sales".to_string()));
        assert!(perms.contains(&"create_sales_order".to_string()));
        assert!(!perms.contains(&"manage_finance".to_string()));
    }

    #[test]
    fn test_get_role_permissions_warehouse() {
        let perms = get_role_permissions("warehouse");
        assert!(perms.contains(&"view_inventory".to_string()));
        assert!(perms.contains(&"manage_inventory".to_string()));
        assert!(!perms.contains(&"view_sales".to_string()));
    }

    #[test]
    fn test_get_role_permissions_finance() {
        let perms = get_role_permissions("finance");
        assert!(perms.contains(&"view_finance".to_string()));
        assert!(perms.contains(&"manage_finance".to_string()));
    }

    #[test]
    fn test_get_role_permissions_purchase() {
        let perms = get_role_permissions("purchase");
        assert!(perms.contains(&"view_purchase".to_string()));
        assert!(perms.contains(&"manage_purchase".to_string()));
    }

    #[test]
    fn test_get_role_permissions_customer() {
        let perms = get_role_permissions("customer");
        assert!(perms.contains(&"view_own_orders".to_string()));
        assert!(perms.contains(&"view_own_products".to_string()));
    }

    #[test]
    fn test_get_role_permissions_unknown() {
        let perms = get_role_permissions("unknown_role");
        assert!(perms.is_empty());
    }

    #[test]
    fn test_required_permission_for_products_get() {
        let perm = required_permission_for_route("GET", "/api/products");
        assert_eq!(perm, Some("view_products"));
    }

    #[test]
    fn test_required_permission_for_products_post() {
        let perm = required_permission_for_route("POST", "/api/products");
        assert_eq!(perm, Some("manage_products"));
    }

    #[test]
    fn test_required_permission_for_sales_get() {
        let perm = required_permission_for_route("GET", "/api/sales_orders");
        assert_eq!(perm, Some("view_sales"));
    }

    #[test]
    fn test_required_permission_for_inventory_get() {
        let perm = required_permission_for_route("GET", "/api/inventory");
        assert_eq!(perm, Some("view_inventory"));
    }

    #[test]
    fn test_required_permission_for_finance_get() {
        let perm = required_permission_for_route("GET", "/api/finance");
        assert_eq!(perm, Some("view_finance"));
    }

    #[test]
    fn test_required_permission_for_users() {
        let perm = required_permission_for_route("GET", "/api/users");
        assert_eq!(perm, Some("manage_users"));
    }

    #[test]
    fn test_required_permission_for_approvals() {
        let perm = required_permission_for_route("GET", "/api/approvals");
        assert_eq!(perm, Some("approve_orders"));
    }

    #[test]
    fn test_required_permission_for_ai_no_restriction() {
        let perm = required_permission_for_route("POST", "/api/ai/recognize_order");
        assert_eq!(perm, None);
    }

    #[test]
    fn test_permission_denied_response() {
        let (status, _body) = permission_denied_response();
        assert_eq!(status, axum::http::StatusCode::FORBIDDEN);
    }
}
