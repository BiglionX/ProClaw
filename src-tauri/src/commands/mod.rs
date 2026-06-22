//! ProClaw 命令注册表模块
//!
//! **运行时命令注册以 `invoke_handler.rs` 中的 `generate_handler!` 为准。**
//! 本模块的 `ModuleRegistry` 仅用于文档、开发与 `commandValidator` 参考，
//! 不参与实际 Tauri 命令挂载（`main.rs` 不再调用 `build_command_registry`）。

// 子模块
pub mod stats;

/// 命令定义结构（用于文档和验证）
#[derive(Debug, Clone)]
pub struct CommandDef {
    pub name: &'static str,
    pub module: &'static str,
    pub description: &'static str,
}

/// 命令模块特征
pub trait CommandModule {
    fn name(&self) -> &'static str;
    fn description(&self) -> &'static str;
    fn is_enabled(&self) -> bool;
    fn commands(&self) -> Vec<CommandDef>;
    fn priority(&self) -> u32 {
        100
    }
}

/// 命令模块注册表
pub struct ModuleRegistry {
    modules: Vec<Box<dyn CommandModule>>,
}

impl ModuleRegistry {
    pub fn new() -> Self {
        Self {
            modules: Vec::new(),
        }
    }
    pub fn register<M: CommandModule + 'static>(&mut self, module: M) {
        self.modules.push(Box::new(module));
    }
    pub fn get_enabled_commands(&self) -> Vec<CommandDef> {
        let mut commands = Vec::new();
        let mut sorted_modules: Vec<_> = self.modules.iter().collect();
        sorted_modules.sort_by_key(|m| m.priority());
        for module in sorted_modules {
            if module.is_enabled() {
                commands.extend(module.commands());
            }
        }
        commands
    }
    pub fn get_enabled_command_names(&self) -> Vec<&'static str> {
        self.get_enabled_commands().iter().map(|c| c.name).collect()
    }
}

impl Default for ModuleRegistry {
    fn default() -> Self {
        Self::new()
    }
}

// ==================== 子模块 ====================

pub mod core {
    use super::*;

    pub struct CoreModule;
    impl CommandModule for CoreModule {
        fn name(&self) -> &'static str {
            "core"
        }
        fn description(&self) -> &'static str {
            "核心命令，所有版本共享"
        }
        fn is_enabled(&self) -> bool {
            true
        }
        fn priority(&self) -> u32 {
            0
        }
        fn commands(&self) -> Vec<CommandDef> {
            vec![
                CommandDef {
                    name: "get_database_stats",
                    module: "common",
                    description: "获取数据库统计",
                },
                CommandDef {
                    name: "get_pending_sync_records",
                    module: "common",
                    description: "获取待同步记录",
                },
                CommandDef {
                    name: "mark_as_synced",
                    module: "common",
                    description: "标记已同步",
                },
                CommandDef {
                    name: "start_sync",
                    module: "common",
                    description: "开始同步",
                },
                CommandDef {
                    name: "get_sync_status",
                    module: "common",
                    description: "获取同步状态",
                },
                CommandDef {
                    name: "upload_image",
                    module: "common",
                    description: "上传图片",
                },
                CommandDef {
                    name: "get_current_user_cmd",
                    module: "user",
                    description: "获取当前用户",
                },
                CommandDef {
                    name: "get_users_cmd",
                    module: "user",
                    description: "获取用户列表",
                },
                CommandDef {
                    name: "create_user_cmd",
                    module: "user",
                    description: "创建用户",
                },
                CommandDef {
                    name: "get_user_by_id_cmd",
                    module: "user",
                    description: "获取用户详情",
                },
                CommandDef {
                    name: "update_user_cmd",
                    module: "user",
                    description: "更新用户",
                },
                CommandDef {
                    name: "delete_user_cmd",
                    module: "user",
                    description: "删除用户",
                },
                CommandDef {
                    name: "assign_user_role_cmd",
                    module: "user",
                    description: "分配用户角色",
                },
                CommandDef {
                    name: "change_user_password_cmd",
                    module: "user",
                    description: "修改密码",
                },
                CommandDef {
                    name: "get_roles_cmd",
                    module: "user",
                    description: "获取角色列表",
                },
                CommandDef {
                    name: "create_approval_cmd",
                    module: "approval",
                    description: "创建审批",
                },
                CommandDef {
                    name: "get_approvals_cmd",
                    module: "approval",
                    description: "获取审批列表",
                },
                CommandDef {
                    name: "approve_request_cmd",
                    module: "approval",
                    description: "批准请求",
                },
                CommandDef {
                    name: "reject_request_cmd",
                    module: "approval",
                    description: "拒绝请求",
                },
                CommandDef {
                    name: "get_plans_cmd",
                    module: "subscription",
                    description: "获取套餐列表",
                },
                CommandDef {
                    name: "get_my_subscription_cmd",
                    module: "subscription",
                    description: "获取我的订阅",
                },
                CommandDef {
                    name: "subscribe_plan_cmd",
                    module: "subscription",
                    description: "订阅套餐",
                },
                CommandDef {
                    name: "cancel_subscription_cmd",
                    module: "subscription",
                    description: "取消订阅",
                },
                CommandDef {
                    name: "get_token_summary_cmd",
                    module: "subscription",
                    description: "获取Token汇总",
                },
                CommandDef {
                    name: "get_token_usage_cmd",
                    module: "subscription",
                    description: "获取Token使用",
                },
                CommandDef {
                    name: "get_invoices_cmd",
                    module: "subscription",
                    description: "获取发票列表",
                },
                CommandDef {
                    name: "record_token_cmd",
                    module: "subscription",
                    description: "记录Token",
                },
                CommandDef {
                    name: "get_contacts",
                    module: "message",
                    description: "获取联系人",
                },
                CommandDef {
                    name: "get_messages",
                    module: "message",
                    description: "获取消息",
                },
                CommandDef {
                    name: "send_message",
                    module: "message",
                    description: "发送消息",
                },
                CommandDef {
                    name: "mark_message_read",
                    module: "message",
                    description: "标记已读",
                },
                CommandDef {
                    name: "mark_conversation_read",
                    module: "message",
                    description: "标记会话已读",
                },
                CommandDef {
                    name: "get_recent_contacts",
                    module: "message",
                    description: "获取最近联系人",
                },
                CommandDef {
                    name: "add_contact",
                    module: "message",
                    description: "添加联系人",
                },
                CommandDef {
                    name: "get_unread_count",
                    module: "message",
                    description: "获取未读数",
                },
                CommandDef {
                    name: "get_call_records_cmd",
                    module: "call",
                    description: "获取通话记录",
                },
                CommandDef {
                    name: "create_call_record_cmd",
                    module: "call",
                    description: "创建通话记录",
                },
                CommandDef {
                    name: "update_call_record_cmd",
                    module: "call",
                    description: "更新通话记录",
                },
                CommandDef {
                    name: "check_user_online_cmd",
                    module: "call",
                    description: "检查用户在线",
                },
                CommandDef {
                    name: "create_invitation_cmd",
                    module: "invitation",
                    description: "创建邀请",
                },
                CommandDef {
                    name: "accept_invitation_cmd",
                    module: "invitation",
                    description: "接受邀请",
                },
                CommandDef {
                    name: "revoke_invitation_cmd",
                    module: "invitation",
                    description: "撤销邀请",
                },
                CommandDef {
                    name: "get_invitations_cmd",
                    module: "invitation",
                    description: "获取邀请列表",
                },
                CommandDef {
                    name: "create_employee_invitation_cmd",
                    module: "invitation",
                    description: "创建员工邀请",
                },
                CommandDef {
                    name: "accept_employee_invitation_cmd",
                    module: "invitation",
                    description: "接受员工邀请",
                },
                CommandDef {
                    name: "check_installation_status",
                    module: "setup",
                    description: "检查安装状态",
                },
                CommandDef {
                    name: "check_disk_space",
                    module: "setup",
                    description: "检查磁盘空间",
                },
                CommandDef {
                    name: "save_setup_config",
                    module: "setup",
                    description: "保存配置",
                },
                CommandDef {
                    name: "test_ollama_connection",
                    module: "setup",
                    description: "测试Ollama连接",
                },
                CommandDef {
                    name: "test_llamacpp_connection",
                    module: "setup",
                    description: "测试LLama.cpp连接",
                },
                CommandDef {
                    name: "get_default_data_path",
                    module: "setup",
                    description: "获取默认数据路径",
                },
                CommandDef {
                    name: "complete_setup_and_switch",
                    module: "setup",
                    description: "完成安装切换",
                },
                CommandDef {
                    name: "pcp_add_entry",
                    module: "ceo",
                    description: "添加CEO条目",
                },
                CommandDef {
                    name: "pcp_update_entry",
                    module: "ceo",
                    description: "更新CEO条目",
                },
                CommandDef {
                    name: "pcp_query_entries",
                    module: "ceo",
                    description: "查询CEO条目",
                },
                CommandDef {
                    name: "pcp_delete_entry",
                    module: "ceo",
                    description: "删除CEO条目",
                },
                CommandDef {
                    name: "ceo_create_task",
                    module: "ceo",
                    description: "创建CEO任务",
                },
                CommandDef {
                    name: "ceo_get_tasks",
                    module: "ceo",
                    description: "获取CEO任务",
                },
                CommandDef {
                    name: "ceo_update_task_status",
                    module: "ceo",
                    description: "更新CEO任务状态",
                },
                CommandDef {
                    name: "ceo_get_task_stats",
                    module: "ceo",
                    description: "获取CEO任务统计",
                },
                CommandDef {
                    name: "ceo_add_decision_log",
                    module: "ceo",
                    description: "添加决策日志",
                },
                CommandDef {
                    name: "ceo_query_decision_logs",
                    module: "ceo",
                    description: "查询决策日志",
                },
                CommandDef {
                    name: "ceo_get_decision_stats",
                    module: "ceo",
                    description: "获取决策统计",
                },
                CommandDef {
                    name: "ceo_update_decision_log",
                    module: "ceo",
                    description: "更新决策日志",
                },
                CommandDef {
                    name: "ceo_get_learning_preferences",
                    module: "ceo",
                    description: "获取学习偏好",
                },
                CommandDef {
                    name: "ceo_update_preference",
                    module: "ceo",
                    description: "更新偏好",
                },
                CommandDef {
                    name: "ceo_export_company_config",
                    module: "ceo",
                    description: "导出公司配置",
                },
                CommandDef {
                    name: "ceo_import_company_config",
                    module: "ceo",
                    description: "导入公司配置",
                },
                CommandDef {
                    name: "bap_get_all",
                    module: "secretary",
                    description: "获取所有商务秘书",
                },
                CommandDef {
                    name: "bap_upsert",
                    module: "secretary",
                    description: "更新/创建商务秘书",
                },
                CommandDef {
                    name: "bap_delete_by_type",
                    module: "secretary",
                    description: "删除商务秘书",
                },
                CommandDef {
                    name: "bap_reset_learning",
                    module: "secretary",
                    description: "重置学习",
                },
            ]
        }
    }
}

pub mod product {
    use super::*;

    pub struct ProductModule;
    impl CommandModule for ProductModule {
        fn name(&self) -> &'static str {
            "product"
        }
        fn description(&self) -> &'static str {
            "产品管理命令，Light 和 Plus 版本共享"
        }
        #[cfg(any(feature = "light", feature = "inventory"))]
        fn is_enabled(&self) -> bool {
            true
        }
        #[cfg(not(any(feature = "light", feature = "inventory")))]
        fn is_enabled(&self) -> bool {
            false
        }
        fn priority(&self) -> u32 {
            10
        }
        fn commands(&self) -> Vec<CommandDef> {
            vec![
                CommandDef {
                    name: "create_product",
                    module: "product",
                    description: "创建产品",
                },
                CommandDef {
                    name: "get_products",
                    module: "product",
                    description: "获取产品列表",
                },
                CommandDef {
                    name: "get_product_by_id",
                    module: "product",
                    description: "获取产品详情",
                },
                CommandDef {
                    name: "update_product",
                    module: "product",
                    description: "更新产品",
                },
                CommandDef {
                    name: "delete_product",
                    module: "product",
                    description: "删除产品",
                },
                CommandDef {
                    name: "set_product_gallery",
                    module: "product",
                    description: "设置产品多图列表",
                },
                CommandDef {
                    name: "create_product_spu",
                    module: "product",
                    description: "创建SPU",
                },
                CommandDef {
                    name: "get_product_spus",
                    module: "product",
                    description: "获取SPU列表",
                },
                CommandDef {
                    name: "get_product_spu_by_id",
                    module: "product",
                    description: "获取SPU详情",
                },
                CommandDef {
                    name: "update_product_spu",
                    module: "product",
                    description: "更新SPU",
                },
                CommandDef {
                    name: "delete_product_spu",
                    module: "product",
                    description: "删除SPU",
                },
                CommandDef {
                    name: "get_library_mode",
                    module: "product",
                    description: "获取商品库模式",
                },
                CommandDef {
                    name: "migrate_to_ecommerce_mode",
                    module: "product",
                    description: "迁移到电商模式",
                },
                CommandDef {
                    name: "downgrade_to_simple_mode",
                    module: "product",
                    description: "降级到简单模式",
                },
                CommandDef {
                    name: "create_brand",
                    module: "product",
                    description: "创建品牌",
                },
                CommandDef {
                    name: "get_brands",
                    module: "product",
                    description: "获取品牌列表",
                },
                CommandDef {
                    name: "create_category",
                    module: "product",
                    description: "创建分类",
                },
                CommandDef {
                    name: "get_categories",
                    module: "product",
                    description: "获取分类列表",
                },
                CommandDef {
                    name: "get_store_info",
                    module: "store",
                    description: "获取店铺信息",
                },
                CommandDef {
                    name: "update_store_settings",
                    module: "store",
                    description: "更新店铺设置",
                },
            ]
        }
    }
}

pub mod inventory {
    use super::*;

    pub struct InventoryModule;
    impl CommandModule for InventoryModule {
        fn name(&self) -> &'static str {
            "inventory"
        }
        fn description(&self) -> &'static str {
            "进销存管理命令，仅 Plus 版本可用"
        }
        #[cfg(feature = "inventory")]
        fn is_enabled(&self) -> bool {
            true
        }
        #[cfg(not(feature = "inventory"))]
        fn is_enabled(&self) -> bool {
            false
        }
        fn priority(&self) -> u32 {
            20
        }
        fn commands(&self) -> Vec<CommandDef> {
            vec![
                CommandDef {
                    name: "create_inventory_transaction",
                    module: "inventory",
                    description: "创建库存事务",
                },
                CommandDef {
                    name: "get_inventory_transactions",
                    module: "inventory",
                    description: "获取库存事务列表",
                },
                CommandDef {
                    name: "get_inventory_stats",
                    module: "inventory",
                    description: "获取库存统计",
                },
                CommandDef {
                    name: "get_sales_trend",
                    module: "inventory",
                    description: "获取销售趋势",
                },
                CommandDef {
                    name: "get_product_analytics",
                    module: "inventory",
                    description: "获取产品分析",
                },
                CommandDef {
                    name: "create_supplier",
                    module: "purchase",
                    description: "创建供应商",
                },
                CommandDef {
                    name: "get_suppliers",
                    module: "purchase",
                    description: "获取供应商列表",
                },
                CommandDef {
                    name: "create_purchase_order",
                    module: "purchase",
                    description: "创建采购订单",
                },
                CommandDef {
                    name: "get_purchase_orders",
                    module: "purchase",
                    description: "获取采购订单列表",
                },
                CommandDef {
                    name: "get_purchase_order_detail",
                    module: "purchase",
                    description: "获取采购订单详情",
                },
                CommandDef {
                    name: "update_purchase_order_cmd",
                    module: "purchase",
                    description: "更新采购订单",
                },
                CommandDef {
                    name: "delete_purchase_order_cmd",
                    module: "purchase",
                    description: "删除采购订单",
                },
                CommandDef {
                    name: "receive_purchase_order_cmd",
                    module: "purchase",
                    description: "收货",
                },
                CommandDef {
                    name: "confirm_purchase_order_cmd",
                    module: "purchase",
                    description: "确认采购订单",
                },
                CommandDef {
                    name: "cancel_purchase_order_cmd",
                    module: "purchase",
                    description: "取消采购订单",
                },
                CommandDef {
                    name: "create_customer",
                    module: "sales",
                    description: "创建客户",
                },
                CommandDef {
                    name: "get_customers",
                    module: "sales",
                    description: "获取客户列表",
                },
                CommandDef {
                    name: "create_sales_order",
                    module: "sales",
                    description: "创建销售订单",
                },
                CommandDef {
                    name: "get_sales_orders",
                    module: "sales",
                    description: "获取销售订单列表",
                },
                CommandDef {
                    name: "update_sales_order_cmd",
                    module: "sales",
                    description: "更新销售订单",
                },
                CommandDef {
                    name: "delete_sales_order_cmd",
                    module: "sales",
                    description: "删除销售订单",
                },
                CommandDef {
                    name: "submit_sales_order_cmd",
                    module: "sales",
                    description: "提交销售订单",
                },
                CommandDef {
                    name: "cancel_sales_order_cmd",
                    module: "sales",
                    description: "取消销售订单",
                },
                CommandDef {
                    name: "mark_sales_shipped_cmd",
                    module: "sales",
                    description: "标记已发货",
                },
                CommandDef {
                    name: "mark_sales_delivered_cmd",
                    module: "sales",
                    description: "标记已送达",
                },
                CommandDef {
                    name: "create_purchase_return",
                    module: "purchase_return",
                    description: "创建采购退货",
                },
                CommandDef {
                    name: "get_purchase_returns",
                    module: "purchase_return",
                    description: "获取采购退货列表",
                },
                CommandDef {
                    name: "get_purchase_return_detail",
                    module: "purchase_return",
                    description: "获取采购退货详情",
                },
                CommandDef {
                    name: "confirm_purchase_return",
                    module: "purchase_return",
                    description: "确认采购退货",
                },
                CommandDef {
                    name: "cancel_purchase_return",
                    module: "purchase_return",
                    description: "取消采购退货",
                },
                CommandDef {
                    name: "update_purchase_return",
                    module: "purchase_return",
                    description: "更新采购退货",
                },
                CommandDef {
                    name: "create_sales_return",
                    module: "sales_return",
                    description: "创建销售退货",
                },
                CommandDef {
                    name: "get_sales_returns",
                    module: "sales_return",
                    description: "获取销售退货列表",
                },
                CommandDef {
                    name: "get_sales_return_detail",
                    module: "sales_return",
                    description: "获取销售退货详情",
                },
                CommandDef {
                    name: "confirm_sales_return",
                    module: "sales_return",
                    description: "确认销售退货",
                },
                CommandDef {
                    name: "cancel_sales_return",
                    module: "sales_return",
                    description: "取消销售退货",
                },
                CommandDef {
                    name: "get_profit_loss_report",
                    module: "finance",
                    description: "获取损益表",
                },
                CommandDef {
                    name: "get_cash_flow_report",
                    module: "finance",
                    description: "获取现金流量表",
                },
                CommandDef {
                    name: "get_financial_summary",
                    module: "finance",
                    description: "获取财务摘要",
                },
                CommandDef {
                    name: "record_payment_cmd",
                    module: "payment",
                    description: "记录付款",
                },
                CommandDef {
                    name: "record_receipt_cmd",
                    module: "payment",
                    description: "记录收款",
                },
                CommandDef {
                    name: "get_payments_cmd",
                    module: "payment",
                    description: "获取付款列表",
                },
                CommandDef {
                    name: "get_ar_ap_summary_cmd",
                    module: "payment",
                    description: "获取应收应付汇总",
                },
                CommandDef {
                    name: "get_ar_ap_detail_cmd",
                    module: "payment",
                    description: "获取应收应付明细",
                },
                CommandDef {
                    name: "generate_statement",
                    module: "reconciliation",
                    description: "生成对账单",
                },
                CommandDef {
                    name: "send_statement_email",
                    module: "reconciliation",
                    description: "发送对账单邮件",
                },
                CommandDef {
                    name: "create_reconciliation_rule",
                    module: "reconciliation",
                    description: "创建对账规则",
                },
                CommandDef {
                    name: "update_reconciliation_rule",
                    module: "reconciliation",
                    description: "更新对账规则",
                },
                CommandDef {
                    name: "delete_reconciliation_rule",
                    module: "reconciliation",
                    description: "删除对账规则",
                },
                CommandDef {
                    name: "get_reconciliation_rules",
                    module: "reconciliation",
                    description: "获取对账规则列表",
                },
                CommandDef {
                    name: "set_smtp_config",
                    module: "reconciliation",
                    description: "设置SMTP配置",
                },
                CommandDef {
                    name: "get_smtp_config",
                    module: "reconciliation",
                    description: "获取SMTP配置",
                },
                CommandDef {
                    name: "check_reconciliation_rules",
                    module: "reconciliation",
                    description: "检查对账规则",
                },
            ]
        }
    }
}

pub mod agent {
    use super::*;

    pub struct AgentModule;
    impl CommandModule for AgentModule {
        fn name(&self) -> &'static str {
            "agent"
        }
        fn description(&self) -> &'static str {
            "AI 团队管理命令，仅 Plus 版本可用"
        }
        #[cfg(any(feature = "inventory", feature = "virtual_company"))]
        fn is_enabled(&self) -> bool {
            true
        }
        #[cfg(not(any(feature = "inventory", feature = "virtual_company")))]
        fn is_enabled(&self) -> bool {
            false
        }
        fn priority(&self) -> u32 {
            30
        }
        fn commands(&self) -> Vec<CommandDef> {
            vec![
                CommandDef {
                    name: "create_team",
                    module: "team",
                    description: "创建AI团队",
                },
                CommandDef {
                    name: "get_teams",
                    module: "team",
                    description: "获取团队列表",
                },
                CommandDef {
                    name: "get_team_by_id",
                    module: "team",
                    description: "获取团队详情",
                },
                CommandDef {
                    name: "update_team",
                    module: "team",
                    description: "更新团队",
                },
                CommandDef {
                    name: "delete_team",
                    module: "team",
                    description: "删除团队",
                },
                CommandDef {
                    name: "import_team",
                    module: "team",
                    description: "导入团队",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "install_agent",
                    module: "agent",
                    description: "安装Agent",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "uninstall_agent",
                    module: "agent",
                    description: "卸载Agent",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "enable_agent",
                    module: "agent",
                    description: "启用Agent",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "disable_agent",
                    module: "agent",
                    description: "禁用Agent",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "get_installed_agents",
                    module: "agent",
                    description: "获取已安装Agent",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "get_agent_detail",
                    module: "agent",
                    description: "获取Agent详情",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "update_agent",
                    module: "agent",
                    description: "更新Agent",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "get_agent_data_dir",
                    module: "agent",
                    description: "获取Agent数据目录",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "get_available_permissions",
                    module: "agent",
                    description: "获取可用权限",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "agent_db_query",
                    module: "agent",
                    description: "Agent数据库查询",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "agent_db_execute",
                    module: "agent",
                    description: "Agent数据库执行",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "create_fa_account",
                    module: "finance_agent",
                    description: "创建财务账户",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "get_fa_accounts",
                    module: "finance_agent",
                    description: "获取财务账户列表",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "update_fa_account_balance",
                    module: "finance_agent",
                    description: "更新账户余额",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "create_fa_transaction",
                    module: "finance_agent",
                    description: "创建财务事务",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "get_fa_transactions",
                    module: "finance_agent",
                    description: "获取财务事务列表",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "delete_fa_transaction",
                    module: "finance_agent",
                    description: "删除财务事务",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "create_fa_budget",
                    module: "finance_agent",
                    description: "创建预算",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "get_fa_budgets",
                    module: "finance_agent",
                    description: "获取预算列表",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "check_fa_budget_alerts",
                    module: "finance_agent",
                    description: "检查预算预警",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "get_fa_category_summary",
                    module: "finance_agent",
                    description: "获取分类汇总",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "get_fa_profit_loss",
                    module: "finance_agent",
                    description: "获取损益",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "get_fa_monthly_trend",
                    module: "finance_agent",
                    description: "获取月度趋势",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "create_fa_invoice",
                    module: "finance_agent",
                    description: "创建发票",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "get_fa_invoices",
                    module: "finance_agent",
                    description: "获取发票列表",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "update_fa_invoice_status",
                    module: "finance_agent",
                    description: "更新发票状态",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "get_market_agents",
                    module: "market",
                    description: "获取市场Agent",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "get_market_agent_detail",
                    module: "market",
                    description: "获取市场Agent详情",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "get_market_categories",
                    module: "market",
                    description: "获取市场分类",
                },
                #[cfg(feature = "virtual_company")]
                CommandDef {
                    name: "download_market_agent_package",
                    module: "market",
                    description: "下载Agent包",
                },
            ]
        }
    }
}

pub mod cloud {
    use super::*;

    pub struct CloudModule;
    impl CommandModule for CloudModule {
        fn name(&self) -> &'static str {
            "cloud"
        }
        fn description(&self) -> &'static str {
            "云商城和云备份命令，仅 Plus 版本可用"
        }
        #[cfg(any(feature = "inventory", feature = "virtual_company"))]
        fn is_enabled(&self) -> bool {
            true
        }
        #[cfg(not(any(feature = "inventory", feature = "virtual_company")))]
        fn is_enabled(&self) -> bool {
            false
        }
        fn priority(&self) -> u32 {
            40
        }
        fn commands(&self) -> Vec<CommandDef> {
            vec![
                CommandDef {
                    name: "get_backup_history_cmd",
                    module: "cloud_backup",
                    description: "获取备份历史",
                },
                CommandDef {
                    name: "get_backup_status_cmd",
                    module: "cloud_backup",
                    description: "获取备份状态",
                },
                CommandDef {
                    name: "get_backup_config_cmd",
                    module: "cloud_backup",
                    description: "获取备份配置",
                },
                CommandDef {
                    name: "trigger_cloud_backup_cmd",
                    module: "cloud_backup",
                    description: "触发云备份",
                },
                CommandDef {
                    name: "set_auto_backup_schedule_cmd",
                    module: "cloud_backup",
                    description: "设置自动备份",
                },
                CommandDef {
                    name: "restore_from_backup_cmd",
                    module: "cloud_backup",
                    description: "从备份恢复",
                },
                CommandDef {
                    name: "get_token_pricing_cmd",
                    module: "subscription",
                    description: "获取Token定价",
                },
                CommandDef {
                    name: "get_token_balance_cmd",
                    module: "subscription",
                    description: "获取Token余额",
                },
                CommandDef {
                    name: "estimate_token_cost_cmd",
                    module: "subscription",
                    description: "估算Token费用",
                },
                CommandDef {
                    name: "nvwax_search_agents",
                    module: "nvwax",
                    description: "搜索Agent",
                },
                CommandDef {
                    name: "nvwax_get_agent_detail",
                    module: "nvwax",
                    description: "获取Agent详情",
                },
                CommandDef {
                    name: "nvwax_get_categories",
                    module: "nvwax",
                    description: "获取分类",
                },
                CommandDef {
                    name: "nvwax_search_aiteams",
                    module: "nvwax",
                    description: "搜索AI团队",
                },
                CommandDef {
                    name: "nvwax_get_aiteam_detail",
                    module: "nvwax",
                    description: "获取AI团队详情",
                },
                CommandDef {
                    name: "nvwax_get_industries",
                    module: "nvwax",
                    description: "获取行业列表",
                },
                CommandDef {
                    name: "nvwax_get_plugin_detail",
                    module: "nvwax",
                    description: "获取插件详情",
                },
                CommandDef {
                    name: "nvwax_create_agent",
                    module: "nvwax",
                    description: "创建Agent",
                },
                CommandDef {
                    name: "nvwax_get_agents",
                    module: "nvwax",
                    description: "获取Agent列表",
                },
                CommandDef {
                    name: "nvwax_get_my_agent_detail",
                    module: "nvwax",
                    description: "获取我的Agent详情",
                },
                CommandDef {
                    name: "nvwax_update_agent",
                    module: "nvwax",
                    description: "更新Agent",
                },
                CommandDef {
                    name: "nvwax_delete_agent",
                    module: "nvwax",
                    description: "删除Agent",
                },
                CommandDef {
                    name: "nvwax_publish_agent",
                    module: "nvwax",
                    description: "发布Agent",
                },
                CommandDef {
                    name: "nvwax_unpublish_agent",
                    module: "nvwax",
                    description: "取消发布Agent",
                },
                CommandDef {
                    name: "nvwax_create_aiteam",
                    module: "nvwax",
                    description: "创建AI团队",
                },
                CommandDef {
                    name: "nvwax_get_aiteams",
                    module: "nvwax",
                    description: "获取AI团队列表",
                },
                CommandDef {
                    name: "nvwax_get_my_aiteam_detail",
                    module: "nvwax",
                    description: "获取我的AI团队详情",
                },
                CommandDef {
                    name: "nvwax_update_aiteam",
                    module: "nvwax",
                    description: "更新AI团队",
                },
                CommandDef {
                    name: "nvwax_delete_aiteam",
                    module: "nvwax",
                    description: "删除AI团队",
                },
                CommandDef {
                    name: "nvwax_publish_aiteam",
                    module: "nvwax",
                    description: "发布AI团队",
                },
                CommandDef {
                    name: "nvwax_unpublish_aiteam",
                    module: "nvwax",
                    description: "取消发布AI团队",
                },
                CommandDef {
                    name: "nvwax_search_agents_global",
                    module: "nvwax",
                    description: "全局搜索Agent",
                },
                CommandDef {
                    name: "nvwax_search_skills",
                    module: "nvwax",
                    description: "搜索技能",
                },
                CommandDef {
                    name: "nvwax_unified_search",
                    module: "nvwax",
                    description: "统一搜索",
                },
                CommandDef {
                    name: "nvwax_export_agent",
                    module: "nvwax",
                    description: "导出Agent",
                },
                CommandDef {
                    name: "nvwax_export_aiteam",
                    module: "nvwax",
                    description: "导出AI团队",
                },
                CommandDef {
                    name: "nvwax_batch_export",
                    module: "nvwax",
                    description: "批量导出",
                },
                CommandDef {
                    name: "nvwax_get_export_history",
                    module: "nvwax",
                    description: "获取导出历史",
                },
                CommandDef {
                    name: "nvwax_get_usage_stats",
                    module: "nvwax",
                    description: "获取使用统计",
                },
                CommandDef {
                    name: "nvwax_get_token_balance",
                    module: "nvwax",
                    description: "获取Token余额",
                },
                CommandDef {
                    name: "nvwax_record_consumption",
                    module: "nvwax",
                    description: "记录消费",
                },
                CommandDef {
                    name: "nvwax_sync_usage",
                    module: "nvwax",
                    description: "同步使用",
                },
                CommandDef {
                    name: "get_nvwax_api_key",
                    module: "nvwax",
                    description: "获取API Key",
                },
                CommandDef {
                    name: "save_nvwax_api_key",
                    module: "nvwax",
                    description: "保存API Key",
                },
                CommandDef {
                    name: "clear_nvwax_api_key",
                    module: "nvwax",
                    description: "清除API Key",
                },
                CommandDef {
                    name: "test_nvwax_connection",
                    module: "nvwax",
                    description: "测试连接",
                },
            ]
        }
    }
}

pub mod plugin {
    use super::*;

    pub struct PluginModule;
    impl CommandModule for PluginModule {
        fn name(&self) -> &'static str {
            "plugin"
        }
        fn description(&self) -> &'static str {
            "插件管理命令，所有版本可用"
        }
        fn is_enabled(&self) -> bool {
            true
        }
        fn priority(&self) -> u32 {
            50
        }
        fn commands(&self) -> Vec<CommandDef> {
            vec![
                CommandDef {
                    name: "list_installed_plugins",
                    module: "plugin",
                    description: "列出已安装插件",
                },
                CommandDef {
                    name: "get_plugin_manifest",
                    module: "plugin",
                    description: "获取插件清单",
                },
                CommandDef {
                    name: "download_plugin",
                    module: "plugin",
                    description: "下载插件",
                },
                CommandDef {
                    name: "verify_plugin_package",
                    module: "plugin",
                    description: "验证插件包",
                },
                CommandDef {
                    name: "verify_plugin_compatibility",
                    module: "plugin",
                    description: "验证插件兼容性",
                },
                CommandDef {
                    name: "install_plugin",
                    module: "plugin",
                    description: "安装插件",
                },
                CommandDef {
                    name: "uninstall_plugin",
                    module: "plugin",
                    description: "卸载插件",
                },
                CommandDef {
                    name: "get_plugin_assets_path",
                    module: "plugin",
                    description: "获取插件资源路径",
                },
                CommandDef {
                    name: "execute_plugin_migration",
                    module: "plugin",
                    description: "执行插件迁移",
                },
                CommandDef {
                    name: "get_plugin_migration_history",
                    module: "plugin",
                    description: "获取迁移历史",
                },
                CommandDef {
                    name: "load_plugin_backend",
                    module: "plugin",
                    description: "加载插件后端",
                },
                CommandDef {
                    name: "unload_plugin_backend",
                    module: "plugin",
                    description: "卸载插件后端",
                },
                CommandDef {
                    name: "get_loaded_backend_plugins",
                    module: "plugin",
                    description: "获取已加载插件",
                },
                CommandDef {
                    name: "plugin_db_query",
                    module: "plugin",
                    description: "插件数据库查询",
                },
                CommandDef {
                    name: "plugin_db_execute",
                    module: "plugin",
                    description: "插件数据库执行",
                },
                CommandDef {
                    name: "get_plugin_permissions",
                    module: "plugin",
                    description: "获取插件权限",
                },
                CommandDef {
                    name: "verify_plugin_permission",
                    module: "plugin",
                    description: "验证插件权限",
                },
                CommandDef {
                    name: "enable_plugin",
                    module: "plugin",
                    description: "启用插件",
                },
                CommandDef {
                    name: "disable_plugin",
                    module: "plugin",
                    description: "禁用插件",
                },
                CommandDef {
                    name: "get_plugin_enabled_status",
                    module: "plugin",
                    description: "获取插件启用状态",
                },
                CommandDef {
                    name: "get_all_plugin_enabled_statuses",
                    module: "plugin",
                    description: "获取所有启用状态",
                },
                CommandDef {
                    name: "verify_plugin_signature",
                    module: "plugin",
                    description: "验证插件签名",
                },
                CommandDef {
                    name: "check_plugin_update",
                    module: "plugin",
                    description: "检查插件更新",
                },
                CommandDef {
                    name: "apply_plugin_update",
                    module: "plugin",
                    description: "应用插件更新",
                },
            ]
        }
    }
}

pub mod industry_catering {
    use super::*;

    pub struct IndustryCateringModule;
    impl CommandModule for IndustryCateringModule {
        fn name(&self) -> &'static str {
            "industry_catering"
        }
        fn description(&self) -> &'static str {
            "餐饮行业插件命令"
        }
        fn is_enabled(&self) -> bool {
            true
        }
        fn priority(&self) -> u32 {
            60
        }
        fn commands(&self) -> Vec<CommandDef> {
            vec![
                CommandDef {
                    name: "catering_create_pos_order",
                    module: "catering",
                    description: "创建POS订单",
                },
                CommandDef {
                    name: "catering_get_pos_orders",
                    module: "catering",
                    description: "获取POS订单",
                },
                CommandDef {
                    name: "catering_settle_pos_order",
                    module: "catering",
                    description: "结算POS订单",
                },
                CommandDef {
                    name: "catering_get_daily_summary",
                    module: "catering",
                    description: "获取日报汇总",
                },
                CommandDef {
                    name: "catering_get_kds_orders",
                    module: "catering",
                    description: "获取厨房订单",
                },
                CommandDef {
                    name: "catering_mark_kds_item_done",
                    module: "catering",
                    description: "标记厨房项目完成",
                },
            ]
        }
    }
}

pub mod industry_beauty {
    use super::*;

    pub struct IndustryBeautyModule;
    impl CommandModule for IndustryBeautyModule {
        fn name(&self) -> &'static str {
            "industry_beauty"
        }
        fn description(&self) -> &'static str {
            "美业行业插件命令"
        }
        fn is_enabled(&self) -> bool {
            true
        }
        fn priority(&self) -> u32 {
            60
        }
        fn commands(&self) -> Vec<CommandDef> {
            vec![
                CommandDef {
                    name: "beauty_create_appointment",
                    module: "beauty",
                    description: "创建预约",
                },
                CommandDef {
                    name: "beauty_get_appointments",
                    module: "beauty",
                    description: "获取预约列表",
                },
                CommandDef {
                    name: "beauty_update_appointment_status",
                    module: "beauty",
                    description: "更新预约状态",
                },
                CommandDef {
                    name: "beauty_get_employees",
                    module: "beauty",
                    description: "获取员工列表",
                },
                CommandDef {
                    name: "beauty_create_employee",
                    module: "beauty",
                    description: "创建员工",
                },
            ]
        }
    }
}

pub mod industry_pet {
    use super::*;

    pub struct IndustryPetModule;
    impl CommandModule for IndustryPetModule {
        fn name(&self) -> &'static str {
            "industry_pet"
        }
        fn description(&self) -> &'static str {
            "宠物行业插件命令"
        }
        fn is_enabled(&self) -> bool {
            true
        }
        fn priority(&self) -> u32 {
            60
        }
        fn commands(&self) -> Vec<CommandDef> {
            vec![
                CommandDef {
                    name: "pet_create_profile",
                    module: "pet",
                    description: "创建宠物档案",
                },
                CommandDef {
                    name: "pet_get_profiles",
                    module: "pet",
                    description: "获取宠物档案",
                },
                CommandDef {
                    name: "pet_create_boarding",
                    module: "pet",
                    description: "创建寄养",
                },
                CommandDef {
                    name: "pet_get_boarding_records",
                    module: "pet",
                    description: "获取寄养记录",
                },
                CommandDef {
                    name: "pet_check_out_boarding",
                    module: "pet",
                    description: "退房寄养",
                },
            ]
        }
    }
}

pub mod industry_convenience {
    use super::*;

    pub struct IndustryConvenienceModule;
    impl CommandModule for IndustryConvenienceModule {
        fn name(&self) -> &'static str {
            "industry_convenience"
        }
        fn description(&self) -> &'static str {
            "便利店行业插件命令"
        }
        fn is_enabled(&self) -> bool {
            true
        }
        fn priority(&self) -> u32 {
            60
        }
        fn commands(&self) -> Vec<CommandDef> {
            vec![
                CommandDef {
                    name: "cv_get_expiry_alerts",
                    module: "convenience",
                    description: "获取过期预警",
                },
                CommandDef {
                    name: "cv_get_daily_settlement",
                    module: "convenience",
                    description: "获取日结算",
                },
                CommandDef {
                    name: "cv_get_restock_suggestions",
                    module: "convenience",
                    description: "获取补货建议",
                },
                CommandDef {
                    name: "cv_create_pos_order",
                    module: "convenience",
                    description: "创建POS订单",
                },
                CommandDef {
                    name: "cv_add_expiry_tracking",
                    module: "convenience",
                    description: "添加过期追踪",
                },
                CommandDef {
                    name: "cv_get_expiry_tracking",
                    module: "convenience",
                    description: "获取过期追踪",
                },
            ]
        }
    }
}

pub mod industry_liquor {
    use super::*;

    pub struct IndustryLiquorModule;
    impl CommandModule for IndustryLiquorModule {
        fn name(&self) -> &'static str {
            "industry_liquor"
        }
        fn description(&self) -> &'static str {
            "酒水批发行业插件命令"
        }
        fn is_enabled(&self) -> bool {
            true
        }
        fn priority(&self) -> u32 {
            60
        }
        fn commands(&self) -> Vec<CommandDef> {
            vec![
                CommandDef {
                    name: "lw_get_credit_accounts",
                    module: "liquor",
                    description: "获取信用账户",
                },
                CommandDef {
                    name: "lw_get_credit_transactions",
                    module: "liquor",
                    description: "获取信用交易",
                },
                CommandDef {
                    name: "lw_create_credit_transaction",
                    module: "liquor",
                    description: "创建信用交易",
                },
                CommandDef {
                    name: "lw_get_batches",
                    module: "liquor",
                    description: "获取批次列表",
                },
                CommandDef {
                    name: "lw_create_batch",
                    module: "liquor",
                    description: "创建批次",
                },
                CommandDef {
                    name: "lw_get_price_tiers",
                    module: "liquor",
                    description: "获取价格层级",
                },
                CommandDef {
                    name: "lw_set_price_tier",
                    module: "liquor",
                    description: "设置价格层级",
                },
            ]
        }
    }
}

pub mod industry_phone_accessories {
    use super::*;

    pub struct IndustryPhoneAccessoriesModule;
    impl CommandModule for IndustryPhoneAccessoriesModule {
        fn name(&self) -> &'static str {
            "industry_phone_accessories"
        }
        fn description(&self) -> &'static str {
            "手机配件批发行业插件命令"
        }
        fn is_enabled(&self) -> bool {
            true
        }
        fn priority(&self) -> u32 {
            60
        }
        fn commands(&self) -> Vec<CommandDef> {
            vec![
                CommandDef {
                    name: "pa_get_device_models",
                    module: "phone_accessories",
                    description: "获取机型列表",
                },
                CommandDef {
                    name: "pa_add_device_model",
                    module: "phone_accessories",
                    description: "添加机型",
                },
                CommandDef {
                    name: "pa_get_quotations",
                    module: "phone_accessories",
                    description: "获取报价单",
                },
                CommandDef {
                    name: "pa_create_quotation",
                    module: "phone_accessories",
                    description: "创建报价单",
                },
                CommandDef {
                    name: "pa_get_price_history",
                    module: "phone_accessories",
                    description: "获取价格历史",
                },
            ]
        }
    }
}

pub mod industry_fresh_food {
    use super::*;

    pub struct IndustryFreshFoodModule;
    impl CommandModule for IndustryFreshFoodModule {
        fn name(&self) -> &'static str {
            "industry_fresh_food"
        }
        fn description(&self) -> &'static str {
            "食材配送行业插件命令"
        }
        fn is_enabled(&self) -> bool {
            true
        }
        fn priority(&self) -> u32 {
            60
        }
        fn commands(&self) -> Vec<CommandDef> {
            vec![
                CommandDef {
                    name: "ff_get_delivery_routes",
                    module: "fresh_food",
                    description: "获取配送路线",
                },
                CommandDef {
                    name: "ff_create_delivery_route",
                    module: "fresh_food",
                    description: "创建配送路线",
                },
                CommandDef {
                    name: "ff_get_recurring_templates",
                    module: "fresh_food",
                    description: "获取周期模板",
                },
                CommandDef {
                    name: "ff_get_freshness_alerts",
                    module: "fresh_food",
                    description: "获取新鲜度预警",
                },
            ]
        }
    }
}

pub mod industry_auto_parts {
    use super::*;

    pub struct IndustryAutoPartsModule;
    impl CommandModule for IndustryAutoPartsModule {
        fn name(&self) -> &'static str {
            "industry_auto_parts"
        }
        fn description(&self) -> &'static str {
            "汽车配件行业插件命令"
        }
        fn is_enabled(&self) -> bool {
            true
        }
        fn priority(&self) -> u32 {
            60
        }
        fn commands(&self) -> Vec<CommandDef> {
            vec![
                CommandDef {
                    name: "ap_search_by_oe",
                    module: "auto_parts",
                    description: "按OE号搜索",
                },
                CommandDef {
                    name: "ap_get_vehicle_models",
                    module: "auto_parts",
                    description: "获取车型",
                },
                CommandDef {
                    name: "ap_add_vehicle_model",
                    module: "auto_parts",
                    description: "添加车型",
                },
                CommandDef {
                    name: "ap_get_part_categories",
                    module: "auto_parts",
                    description: "获取配件分类",
                },
                CommandDef {
                    name: "ap_add_oe_number",
                    module: "auto_parts",
                    description: "添加OE号",
                },
            ]
        }
    }
}

pub mod industry_hardware {
    use super::*;

    pub struct IndustryHardwareModule;
    impl CommandModule for IndustryHardwareModule {
        fn name(&self) -> &'static str {
            "industry_hardware"
        }
        fn description(&self) -> &'static str {
            "五金行业插件命令"
        }
        fn is_enabled(&self) -> bool {
            true
        }
        fn priority(&self) -> u32 {
            60
        }
        fn commands(&self) -> Vec<CommandDef> {
            vec![
                CommandDef {
                    name: "hw_get_spec_templates",
                    module: "hardware",
                    description: "获取规格模板",
                },
                CommandDef {
                    name: "hw_set_spec_template",
                    module: "hardware",
                    description: "设置规格模板",
                },
                CommandDef {
                    name: "hw_calculate_cutting",
                    module: "hardware",
                    description: "计算切割",
                },
                CommandDef {
                    name: "hw_get_credit_accounts",
                    module: "hardware",
                    description: "获取信用账户",
                },
                CommandDef {
                    name: "hw_get_unit_conversions",
                    module: "hardware",
                    description: "获取单位换算",
                },
                CommandDef {
                    name: "hw_add_unit_conversion",
                    module: "hardware",
                    description: "添加单位换算",
                },
            ]
        }
    }
}

pub mod industry_decoration_material {
    use super::*;

    pub struct IndustryDecorationMaterialModule;
    impl CommandModule for IndustryDecorationMaterialModule {
        fn name(&self) -> &'static str {
            "industry_decoration_material"
        }
        fn description(&self) -> &'static str {
            "装修材料行业插件命令"
        }
        fn is_enabled(&self) -> bool {
            true
        }
        fn priority(&self) -> u32 {
            60
        }
        fn commands(&self) -> Vec<CommandDef> {
            vec![
                CommandDef {
                    name: "dm_get_projects",
                    module: "decoration_material",
                    description: "获取项目列表",
                },
                CommandDef {
                    name: "dm_create_project",
                    module: "decoration_material",
                    description: "创建项目",
                },
                CommandDef {
                    name: "dm_get_bom_templates",
                    module: "decoration_material",
                    description: "获取BOM模板",
                },
                CommandDef {
                    name: "dm_create_bom_template",
                    module: "decoration_material",
                    description: "创建BOM模板",
                },
                CommandDef {
                    name: "dm_get_project_materials",
                    module: "decoration_material",
                    description: "获取项目材料",
                },
            ]
        }
    }
}

pub mod industry_community_group_buy {
    use super::*;

    pub struct IndustryCommunityGroupBuyModule;
    impl CommandModule for IndustryCommunityGroupBuyModule {
        fn name(&self) -> &'static str {
            "industry_community_group_buy"
        }
        fn description(&self) -> &'static str {
            "社区团购行业插件命令"
        }
        fn is_enabled(&self) -> bool {
            true
        }
        fn priority(&self) -> u32 {
            60
        }
        fn commands(&self) -> Vec<CommandDef> {
            vec![
                CommandDef {
                    name: "gb_get_groups",
                    module: "community_group_buy",
                    description: "获取团购",
                },
                CommandDef {
                    name: "gb_create_group",
                    module: "community_group_buy",
                    description: "创建团购",
                },
                CommandDef {
                    name: "gb_get_orders",
                    module: "community_group_buy",
                    description: "获取订单",
                },
                CommandDef {
                    name: "gb_parse_jielong_text",
                    module: "community_group_buy",
                    description: "解析接龙文本",
                },
                CommandDef {
                    name: "gb_verify_pickup",
                    module: "community_group_buy",
                    description: "验证提货",
                },
            ]
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_core_module_enabled() {
        let module = core::CoreModule;
        assert!(module.is_enabled());
        assert!(!module.commands().is_empty());
    }

    #[test]
    fn test_module_registry() {
        let mut registry = ModuleRegistry::new();
        registry.register(core::CoreModule);
        registry.register(plugin::PluginModule);
        let commands = registry.get_enabled_commands();
        assert!(!commands.is_empty());
        assert!(registry
            .get_enabled_command_names()
            .contains(&"get_database_stats"));
    }

    #[test]
    fn test_command_statistics() {
        // 统计各模块命令数量
        let mut total = 0;

        let core = core::CoreModule;
        println!("Core commands: {}", core.commands().len());
        total += core.commands().len();

        let plugin = plugin::PluginModule;
        println!("Plugin commands: {}", plugin.commands().len());
        total += plugin.commands().len();

        #[cfg(any(feature = "light", feature = "inventory"))]
        {
            let product = product::ProductModule;
            println!("Product commands: {}", product.commands().len());
            total += product.commands().len();
        }

        #[cfg(feature = "inventory")]
        {
            let inventory = inventory::InventoryModule;
            println!("Inventory commands: {}", inventory.commands().len());
            total += inventory.commands().len();
        }

        println!("Total registered commands: {}", total);

        // 验证至少有 50 个命令
        assert!(total >= 50, "Expected at least 50 commands, got {}", total);
    }

    #[test]
    fn test_product_module_conditional() {
        #[cfg(any(feature = "light", feature = "inventory"))]
        {
            let product = product::ProductModule;
            assert!(product.is_enabled());
            assert!(product.commands().len() >= 15);
        }

        #[cfg(not(any(feature = "light", feature = "inventory")))]
        {
            let product = product::ProductModule;
            assert!(!product.is_enabled());
        }
    }

    #[test]
    fn test_inventory_module_conditional() {
        #[cfg(feature = "inventory")]
        {
            let inventory = inventory::InventoryModule;
            assert!(inventory.is_enabled());
            assert!(inventory.commands().len() >= 40);
        }

        #[cfg(not(feature = "inventory"))]
        {
            let inventory = inventory::InventoryModule;
            assert!(!inventory.is_enabled());
        }
    }
}
