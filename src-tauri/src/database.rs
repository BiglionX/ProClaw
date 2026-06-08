use rusqlite::{params, Connection, Result};
use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DatabaseError {
    #[error("Database error: {0}")]
    Sqlite(#[from] rusqlite::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

pub type DbResult<T> = Result<T, DatabaseError>;

pub struct Database {
    conn: Connection,
}

impl Database {
    /// 创建或打开数据库连接
    pub fn new(db_path: PathBuf) -> DbResult<Self> {
        // 确保目录存在
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let conn = Connection::open(&db_path)?;

        // 启用 WAL 模式以提高并发性能
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;
        // 设置 busy timeout 避免写锁冲突直接报错（5秒等待容忍）
        conn.execute_batch("PRAGMA busy_timeout=5000;")?;
        // 启用外键约束
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;

        Ok(Self { conn })
    }

    /// 创建内存数据库（用于测试）
    pub fn new_in_memory() -> DbResult<Self> {
        let conn = Connection::open_in_memory()?;
        Ok(Self { conn })
    }

    /// 初始化数据库 Schema
    /// 审计修复 #14: 迁移失败时打印警告并收集失败列表，不再静默吞掉所有错误
    pub fn initialize(&self) -> DbResult<()> {
        let mut migration_errors: Vec<String> = Vec::new();

        // 加载基础schema
        let schema = include_str!("../../src/db/schema.sql");
        self.conn.execute_batch(schema)?;

        // 加载SPU-SKU电商架构schema (SQLite版本)
        let spu_sku_schema = include_str!("../../database/spu_sku_schema_sqlite.sql");
        self.conn.execute_batch(spu_sku_schema)?;

        // 审计修复 #18: 迁移SQL位置统一说明 - 历史遗留分散在 src/db/ 和 database/ 下
        // 新迁移统一放入 database/migrations/ 目录按编号排序

        // 运行迁移：员工邀请与角色权限自动分配（PRD v4.3）
        let migration =
            include_str!("../../src/db/migrations/006_add_employee_invitation_fields.sql");
        if let Err(e) = self.conn.execute_batch(migration) {
            eprintln!(
                "[DB Migration WARNING] 006_add_employee_invitation_fields: {}",
                e
            );
            migration_errors.push(format!("006: {}", e));
        }

        // 运行迁移：财务管理 Agent 数据表（PRD v6.0）
        let finance_migration =
            include_str!("../../src/db/migrations/009_finance_agent_tables.sql");
        if let Err(e) = self.conn.execute_batch(finance_migration) {
            eprintln!("[DB Migration WARNING] 009_finance_agent_tables: {}", e);
            migration_errors.push(format!("009: {}", e));
        }

        // 运行迁移：Agent 市场数据表（PRD v6.0）
        let market_migration = include_str!("../../database/migrations/010_market_agents.sql");
        if let Err(e) = self.conn.execute_batch(market_migration) {
            eprintln!("[DB Migration WARNING] 010_market_agents: {}", e);
            migration_errors.push(format!("010: {}", e));
        }

        // 运行迁移：安装向导系统配置表（PRD v6.1）
        if let Err(e) = self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS system_config (\
             key TEXT PRIMARY KEY,\
             value TEXT NOT NULL\
             );",
        ) {
            eprintln!("[DB Migration WARNING] system_config: {}", e);
            migration_errors.push(format!("system_config: {}", e));
        }

        // 运行迁移：CEO Agent 项目上下文协议表（PRD v6.2）
        let ceo_migration = include_str!("../../src/db/migrations/011_pcp_tables.sql");
        if let Err(e) = self.conn.execute_batch(ceo_migration) {
            eprintln!("[DB Migration WARNING] 011_pcp_tables: {}", e);
            migration_errors.push(format!("011: {}", e));
        }

        // 运行迁移：CEO Agent 决策确认与个性化学习表（PRD v6.3）
        let decision_migration = include_str!("../../src/db/migrations/012_ceo_decision_logs.sql");
        if let Err(e) = self.conn.execute_batch(decision_migration) {
            eprintln!("[DB Migration WARNING] 012_ceo_decision_logs: {}", e);
            migration_errors.push(format!("012: {}", e));
        }

        // 运行迁移：NvwaX API 消耗记录表
        let nvwax_migration =
            include_str!("../../database/migrations/028_add_nvwax_usage_logs.sql");
        if let Err(e) = self.conn.execute_batch(nvwax_migration) {
            eprintln!("[DB Migration WARNING] 028_nvwax_usage_logs: {}", e);
            migration_errors.push(format!("028: {}", e));
        }

        // 运行迁移：采购退货表
        if let Err(e) = self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS purchase_returns (
                id TEXT PRIMARY KEY,
                pr_number TEXT UNIQUE NOT NULL,
                purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id),
                supplier_id TEXT NOT NULL REFERENCES suppliers(id),
                return_date DATE NOT NULL,
                status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'confirmed', 'completed', 'cancelled')),
                total_amount REAL DEFAULT 0,
                refund_amount REAL DEFAULT 0,
                reason TEXT,
                notes TEXT,
                created_by TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending',
                deleted_at TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS purchase_return_items (
                id TEXT PRIMARY KEY,
                purchase_return_id TEXT NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
                product_id TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                unit_price REAL NOT NULL,
                total_price REAL NOT NULL,
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ") {
            eprintln!("[DB Migration WARNING] purchase_returns: {}", e);
            migration_errors.push(format!("purchase_returns: {}", e));
        }

        // 运行迁移：销售退货表
        if let Err(e) = self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS sales_returns (
                id TEXT PRIMARY KEY,
                sr_number TEXT UNIQUE NOT NULL,
                sales_order_id TEXT NOT NULL REFERENCES sales_orders(id),
                customer_id TEXT NOT NULL REFERENCES customers(id),
                return_date DATE NOT NULL,
                status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'confirmed', 'completed', 'cancelled')),
                total_amount REAL DEFAULT 0,
                refund_amount REAL DEFAULT 0,
                reason TEXT,
                notes TEXT,
                created_by TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending',
                deleted_at TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS sales_return_items (
                id TEXT PRIMARY KEY,
                sales_return_id TEXT NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
                product_id TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                unit_price REAL NOT NULL,
                total_price REAL NOT NULL,
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ") {
            eprintln!("[DB Migration WARNING] sales_returns: {}", e);
            migration_errors.push(format!("sales_returns: {}", e));
        }

        // 运行迁移：付款交易表 + 对账规则表 + 对账单日志表（PRD v1.1）
        if let Err(e) = self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS payment_transactions (
                id TEXT PRIMARY KEY,
                order_type TEXT NOT NULL CHECK(order_type IN ('purchase','sales','purchase_return','sales_return')),
                order_id TEXT NOT NULL,
                transaction_type TEXT NOT NULL CHECK(transaction_type IN ('payment','receipt','refund')),
                amount REAL NOT NULL,
                transaction_date DATE NOT NULL,
                payment_method TEXT,
                voucher_no TEXT,
                notes TEXT,
                created_by TEXT,
                counterparty_id TEXT,
                counterparty_name TEXT,
                counterparty_type TEXT CHECK(counterparty_type IN ('supplier','customer')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS reconciliation_rules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                enabled INTEGER DEFAULT 1,
                scope_type TEXT,
                scope_ids TEXT,
                trigger_type TEXT NOT NULL,
                trigger_config TEXT NOT NULL,
                statement_format TEXT NOT NULL,
                action_type TEXT NOT NULL,
                extra_emails TEXT,
                last_run_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS reconciliation_logs (
                id TEXT PRIMARY KEY,
                rule_id TEXT REFERENCES reconciliation_rules(id),
                counterparty_type TEXT,
                counterparty_id TEXT,
                counterparty_name TEXT,
                statement_format TEXT,
                generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sent_via TEXT,
                sent_to TEXT,
                status TEXT DEFAULT 'success',
                error_message TEXT
            );
        ") {
            eprintln!("[DB Migration WARNING] payment/reconciliation: {}", e);
            migration_errors.push(format!("payment/reconciliation: {}", e));
        }

        // 自动安装内置 Agent
        let builtin_count: i64 = self
            .conn
            .query_row(
                "SELECT COUNT(*) FROM agents WHERE is_builtin = 1",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);
        if builtin_count == 0 {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;

            // 预定义所有内置 Agent（含 capabilities 用于 CEO Agent 任务分派）
            let builtins = vec![
                (
                    "proclaw-finance-agent",
                    "财务管理 Agent",
                    vec![
                        "read_user",
                        "read_finance",
                        "write_finance",
                        "show_notification",
                    ],
                    vec!["financial_report", "expense_analysis", "budget_management"],
                    "内置财务管理 Agent - 记账、预算、报表、发票管理",
                ),
                (
                    "proclaw-task-agent",
                    "任务管理 Agent",
                    vec!["read_user", "send_message", "show_notification"],
                    vec!["task_management", "progress_tracking"],
                    "看板式任务管理，支持任务分配、进度跟踪、优先级排序",
                ),
                (
                    "proclaw-crm-agent",
                    "客户关系 Agent",
                    vec!["read_user", "read_contacts", "send_message"],
                    vec!["contact_management", "communication_tracking"],
                    "管理客户联系人、沟通记录、商机跟踪，支持标签分类",
                ),
                (
                    "proclaw-docs-agent",
                    "文档协作 Agent",
                    vec!["read_user", "read_files", "write_files"],
                    vec!["document_management", "file_collaboration"],
                    "Markdown 编辑器，支持版本历史、文档分类归档",
                ),
                (
                    "proclaw-hr-agent",
                    "人事管理 Agent",
                    vec!["read_user", "send_message", "show_notification"],
                    vec!["hr_management", "attendance_tracking"],
                    "员工信息管理、考勤记录、请假审批、工资单生成",
                ),
            ];

            for (id, name, permissions, capabilities, description) in &builtins {
                let manifest = serde_json::json!({
                    "id": id,
                    "name": name,
                    "version": "1.0.0",
                    "entry": "index.html",
                    "description": description,
                    "author": "ProClaw 官方",
                    "permissions": permissions,
                    "capabilities": capabilities,
                })
                .to_string();
                self.conn.execute(
                    "INSERT INTO agents (id, name, version, manifest, enabled, is_builtin, installed_at)
                     VALUES (?1, ?2, '1.0.0', ?3, 1, 1, ?4)",
                    params![id, name, manifest, now],
                ).ok();
                println!("Installed built-in Agent: {}", name);
            }

            // 预定义行业插件 Agent（餐饮/美业/宠物/Cloud）
            let industry_builtins = vec![
                // === 餐饮行业 (Catering) ===
                (
                    "proclaw-catering-assistant",
                    "餐饮服务助手",
                    vec![
                        "read_user",
                        "read_orders",
                        "send_message",
                        "show_notification",
                    ],
                    vec![
                        "pos_order_management",
                        "menu_recommendation",
                        "table_status_query",
                        "daily_summary",
                        "member_lookup",
                    ],
                    "智能餐饮助手 - POS 点餐、桌台管理、菜单推荐、营收统计",
                ),
                (
                    "proclaw-catering-menu",
                    "智能菜单顾问",
                    vec!["read_user", "send_message"],
                    vec![
                        "dish_recommendation",
                        "popular_dishes",
                        "dietary_pairing",
                        "special_diet",
                    ],
                    "智能菜单顾问 - 菜品推荐、热销榜单、营养搭配、特殊饮食需求",
                ),
                (
                    "proclaw-catering-kds",
                    "后厨调度助手",
                    vec!["read_orders", "show_notification", "send_message"],
                    vec![
                        "kds_order_monitor",
                        "overdue_alert",
                        "prep_time_estimate",
                        "printer_integration",
                    ],
                    "后厨调度助手 - 订单监控、超时预警、备餐预估、打印联动",
                ),
                // === 美业行业 (Beauty) ===
                (
                    "proclaw-beauty-assistant",
                    "美业服务顾问",
                    vec!["read_user", "read_crm", "send_message", "show_notification"],
                    vec![
                        "appointment_management",
                        "service_recommendation",
                        "employee_schedule_query",
                        "member_insight",
                        "crm_engagement",
                    ],
                    "美业服务顾问 - 预约管理、服务推荐、技师排班、客户洞察、沉睡唤醒",
                ),
                (
                    "proclaw-beauty-scheduler",
                    "智能排班助手",
                    vec!["read_user", "read_finance", "send_message"],
                    vec![
                        "schedule_optimization",
                        "peak_hour_prediction",
                        "leave_management",
                        "commission_calc",
                    ],
                    "智能排班助手 - 排班优化、高峰预测、请假管理、提成计算",
                ),
                (
                    "proclaw-beauty-marketing",
                    "营销活动助手",
                    vec!["read_crm", "send_message", "show_notification"],
                    vec![
                        "campaign_templates",
                        "campaign_analytics",
                        "wechat_template_push",
                        "coupon_distribution",
                    ],
                    "营销活动助手 - 沉睡唤醒、生日礼、充值满赠、优惠券发放",
                ),
                // === 宠物行业 (Pet) ===
                (
                    "proclaw-pet-assistant",
                    "宠物养护顾问",
                    vec!["read_user", "send_message", "show_notification"],
                    vec![
                        "pet_care_advice",
                        "breed_query",
                        "grooming_recommendation",
                        "product_recommendation",
                        "emergency_guide",
                    ],
                    "宠物养护顾问 - 日常养护、品种查询、洗护推荐、商品推荐、紧急指南",
                ),
                (
                    "proclaw-pet-boarding",
                    "寄养管理助手",
                    vec!["read_user", "send_message", "show_notification"],
                    vec![
                        "boarding_status_query",
                        "daily_log_management",
                        "checkout_calculation",
                        "owner_communication",
                        "availability_forecast",
                    ],
                    "寄养管理助手 - 房间状态、每日日志、费用计算、主人沟通、需求预测",
                ),
                (
                    "proclaw-pet-health",
                    "健康管理助手",
                    vec!["read_user", "send_message", "show_notification"],
                    vec![
                        "vaccine_reminder",
                        "vaccine_schedule",
                        "weight_tracking",
                        "health_log",
                        "medical_alert",
                    ],
                    "健康管理助手 - 疫苗提醒、疫苗计划、体重跟踪、健康记录、异常预警",
                ),
                // === Cloud 平台 (Cloud) ===
                (
                    "proclaw-cloud-billing",
                    "Token 计费助手",
                    vec!["read_finance", "send_message", "show_notification"],
                    vec![
                        "token_balance_query",
                        "plan_recommendation",
                        "usage_analytics",
                        "budget_alert",
                        "invoice_query",
                    ],
                    "Token 计费助手 - 余额查询、套餐推荐、消耗分析、预算预警、账单查询",
                ),
                (
                    "proclaw-cloud-ops",
                    "云平台运营助手",
                    vec!["read_finance", "read_orders", "send_message"],
                    vec![
                        "store_analytics",
                        "product_sync_status",
                        "order_monitoring",
                        "performance_report",
                    ],
                    "云平台运营助手 - 商城分析、商品同步、订单监控、性能报告",
                ),
                (
                    "proclaw-cloud-backup",
                    "备份恢复助手",
                    vec!["read_user", "send_message", "show_notification"],
                    vec![
                        "backup_status_query",
                        "auto_backup_config",
                        "restore_assistant",
                        "backup_integrity_check",
                        "disaster_recovery",
                    ],
                    "备份恢复助手 - 备份查询、自动备份、恢复引导、完整性检查、灾难恢复",
                ),
                // === 便利店 (Convenience) ===
                (
                    "proclaw-cv-assistant",
                    "便利店经营助手",
                    vec![
                        "read_user",
                        "read_orders",
                        "read_inventory",
                        "send_message",
                        "show_notification",
                    ],
                    vec![
                        "expiry_alert",
                        "restock_suggestion",
                        "daily_settlement",
                        "pos_assistance",
                    ],
                    "便利店经营助手 - 临期商品提醒、智能补货建议、日结汇总",
                ),
                // === 酒水批发 (Liquor Wholesale) ===
                (
                    "proclaw-lw-assistant",
                    "酒水批发助手",
                    vec![
                        "read_user",
                        "read_orders",
                        "read_inventory",
                        "send_message",
                        "show_notification",
                    ],
                    vec![
                        "batch_tracking",
                        "credit_collection",
                        "price_recommendation",
                        "bundle_assembly",
                    ],
                    "酒水批发助手 - 批次追踪、赊账催收、价格推荐、套装组合",
                ),
                // === 手机配件 (Phone Accessories) ===
                (
                    "proclaw-pa-assistant",
                    "手机配件批发助手",
                    vec!["read_user", "read_orders", "read_inventory", "send_message"],
                    vec![
                        "sku_matrix_management",
                        "quotation_assistance",
                        "price_volatility_alert",
                        "device_compatibility",
                    ],
                    "手机配件批发助手 - SKU矩阵管理、报价辅助、价格波动预警、机型匹配",
                ),
                // === 食材配送 (Fresh Food Delivery) ===
                (
                    "proclaw-ff-assistant",
                    "食材配送助手",
                    vec![
                        "read_user",
                        "read_orders",
                        "read_inventory",
                        "send_message",
                        "show_notification",
                    ],
                    vec![
                        "recurring_order_management",
                        "delivery_route_optimization",
                        "freshness_alert",
                        "weighing_pricing",
                    ],
                    "食材配送助手 - 周期订单管理、配送路线优化、新鲜度预警、称重计价",
                ),
                (
                    "proclaw-ff-router",
                    "配送路线优化师",
                    vec!["read_user", "read_orders", "send_message"],
                    vec![
                        "route_planning",
                        "delivery_scheduling",
                        "distance_calculation",
                        "stop_optimization",
                    ],
                    "配送路线优化师 - 智能路线规划、配送调度、距离计算、停靠点优化",
                ),
                // === 汽车配件 (Auto Parts) ===
                (
                    "proclaw-ap-assistant",
                    "汽配查询助手",
                    vec!["read_user", "read_orders", "read_inventory", "send_message"],
                    vec![
                        "oe_number_query",
                        "vin_decoder",
                        "vehicle_model_match",
                        "parts_recommendation",
                    ],
                    "汽配查询助手 - OE号查询、VIN码车型识别、适配推荐、正品溯源",
                ),
                // === 五金 (Hardware) ===
                (
                    "proclaw-hw-assistant",
                    "五金经营助手",
                    vec![
                        "read_user",
                        "read_orders",
                        "read_inventory",
                        "send_message",
                        "show_notification",
                    ],
                    vec![
                        "spec_recommendation",
                        "cutting_optimization",
                        "credit_collection",
                        "unit_conversion",
                    ],
                    "五金经营助手 - 规格推荐、切割优化、挂账催收、单位转换",
                ),
                // === 装修材料 (Decoration Material) ===
                (
                    "proclaw-dm-assistant",
                    "装修材料助手",
                    vec!["read_user", "read_orders", "read_inventory", "send_message"],
                    vec![
                        "project_accounting",
                        "bom_recommendation",
                        "color_batch_tracking",
                        "site_delivery",
                    ],
                    "装修材料助手 - 项目核算、材料清单推荐、色号追踪、工地配送",
                ),
                // === 社区团购 (Community Group Buy) ===
                (
                    "proclaw-gb-assistant",
                    "社区团购助手",
                    vec![
                        "read_user",
                        "read_orders",
                        "read_inventory",
                        "send_message",
                        "show_notification",
                    ],
                    vec![
                        "jielong_parsing",
                        "product_recommendation",
                        "pickup_reminder",
                        "group_profit_calc",
                    ],
                    "社区团购助手 - 接龙文本解析、选品推荐、到货催取、团长收益核算",
                ),
                (
                    "proclaw-gb-parser",
                    "接龙文本解析器",
                    vec!["read_user", "send_message"],
                    vec![
                        "text_parsing",
                        "order_extraction",
                        "quantity_counting",
                        "format_conversion",
                    ],
                    "接龙文本解析器 - 微信群接龙智能解析、订单提取、数量统计、格式转换",
                ),
            ];

            for (id, name, permissions, capabilities, description) in &industry_builtins {
                let manifest = serde_json::json!({
                    "id": id,
                    "name": name,
                    "version": "1.0.0",
                    "entry": "index.html",
                    "description": description,
                    "author": "ProClaw 官方",
                    "permissions": permissions,
                    "capabilities": capabilities,
                })
                .to_string();
                self.conn.execute(
                    "INSERT INTO agents (id, name, version, manifest, enabled, is_builtin, installed_at)
                     VALUES (?1, ?2, '1.0.0', ?3, 1, 1, ?4)",
                    params![id, name, manifest, now],
                ).ok();
                println!("Installed industry Agent: {}", name);
            }
        }

        // 审计修复 #14: 汇总迁移警告
        if !migration_errors.is_empty() {
            eprintln!(
                "[DB Migration] {} migration(s) encountered errors (non-fatal):",
                migration_errors.len()
            );
            for err in &migration_errors {
                eprintln!("  - {}", err);
            }
        }

        Ok(())
    }

    /// 获取数据库连接引用
    pub fn connection(&self) -> &Connection {
        &self.conn
    }

    /// 获取可变的数据库连接引用
    #[allow(dead_code)]
    pub fn connection_mut(&mut self) -> &mut Connection {
        &mut self.conn
    }

    /// 查询 system_config 表
    pub fn get_config(&self, key: &str) -> Option<String> {
        self.conn
            .query_row(
                "SELECT value FROM system_config WHERE key = ?1",
                params![key],
                |row| row.get(0),
            )
            .ok()
    }

    /// 写入 system_config 表
    pub fn set_config(&self, key: &str, value: &str) -> Result<(), rusqlite::Error> {
        self.conn.execute(
            "INSERT OR REPLACE INTO system_config (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
    }

    /// 获取所有 system_config 键值对
    pub fn get_all_config(&self) -> std::collections::HashMap<String, String> {
        let mut stmt = self
            .conn
            .prepare("SELECT key, value FROM system_config")
            .unwrap();
        let mut map = std::collections::HashMap::new();
        let rows = stmt
            .query_map([], |row| {
                let key: String = row.get(0)?;
                let value: String = row.get(1)?;
                Ok((key, value))
            })
            .ok();
        if let Some(rows) = rows {
            for row in rows.flatten() {
                map.insert(row.0, row.1);
            }
        }
        map
    }

    /// 检查安装是否已经完成
    pub fn is_installation_complete(&self) -> bool {
        self.get_config("install_path").is_some()
    }

    /// 关闭数据库连接
    #[allow(dead_code)]
    pub fn close(self) -> DbResult<()> {
        // Connection 会在 drop 时自动关闭
        Ok(())
    }
}

/// 获取数据库文件路径
pub fn get_database_path() -> PathBuf {
    let proj_dirs = directories::ProjectDirs::from("com", "proclaw", "desktop")
        .expect("Failed to get project directories");

    proj_dirs.data_local_dir().join("proclaw.db")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_database_creation() {
        let temp_dir = env::temp_dir().join("proclaw_test");
        let db_path = temp_dir.join("test.db");

        let _db = Database::new(db_path.clone()).unwrap();
        assert!(db_path.exists());

        // 清理
        std::fs::remove_file(&db_path).ok();
        std::fs::remove_dir(&temp_dir).ok();
    }

    #[test]
    fn test_database_initialization() {
        let temp_dir = env::temp_dir().join("proclaw_test_init");
        let db_path = temp_dir.join("test_init.db");

        let db = Database::new(db_path.clone()).unwrap();
        db.initialize().unwrap();

        // 验证表是否创建
        let table_count: i64 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table'",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert!(table_count > 0);

        // 清理
        std::fs::remove_file(&db_path).ok();
        std::fs::remove_dir(&temp_dir).ok();
    }
}
