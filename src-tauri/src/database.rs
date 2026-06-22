use rusqlite::{params, Connection, Result};
use std::path::{Path, PathBuf};
use thiserror::Error;

/// 清除目录的 NTFS Compressed 属性（Windows 专用）
///
/// **背景**：SQLite 的 WAL 模式与 NTFS Compressed 卷不兼容。
/// 当 db 文件所在目录被 NSIS 安装器或 Windows 设置了 Compressed 属性后，
/// SQLite 会自动将连接降级为 readonly 模式，导致后续的 PRAGMA 报错
/// "attempt to write a readonly database"（与 v1.0.0 白屏问题直接相关）。
///
/// 使用 Windows 自带的 `compact /U` 命令（不是 `fsutil`，
/// `fsutil file setattrib` 在 Windows 中并不存在）。
/// compact /U 取消当前目录及子目录的 NTFS 文件压缩。
#[cfg(windows)]
fn clear_ntfs_compressed_attribute(path: &Path) {
    let path_str = path.as_os_str().to_string_lossy().to_string();
    // compact /U <path> 取消路径下所有文件的 NTFS 压缩
    let result = std::process::Command::new("compact")
        .args(["/U", "/S", &path_str, "/Q", "/I", "/F"])
        .output();
    match result {
        Ok(out) if out.status.success() => {
            eprintln!("✓ 已清除目录 NTFS Compressed 属性: {}", path_str);
        }
        Ok(out) => {
            eprintln!(
                "⚠️ 清除 NTFS Compressed 属性失败 (exit={:?}): {}",
                out.status.code(),
                String::from_utf8_lossy(&out.stderr)
            );
        }
        Err(e) => {
            eprintln!("⚠️ 无法执行 compact: {}（可能不在 Windows 环境）", e);
        }
    }
}

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

            // 修复 v1.0.0 白屏问题: 移除 NTFS Compressed 属性
            // SQLite WAL 模式与 NTFS Compressed 卷不兼容，会导致 readonly 错误
            // （NSIS 安装器可能在 AppData 上设置了 Compressed）
            #[cfg(windows)]
            clear_ntfs_compressed_attribute(parent);
        }

        // 诊断 v1.0.0 白屏问题: 测试当前进程能否在 data 目录写文件
        // 如果这一行失败，说明 Tauri main 进程 token 受限导致 Connection::open 失败
        #[cfg(windows)]
        {
            let test_path = db_path.with_extension("write_test.txt");
            match std::fs::write(&test_path, b"main_proc_can_write") {
                Ok(_) => eprintln!("✓ [DIAG] Main 进程能写文件: {:?}", test_path),
                Err(e) => eprintln!("✗ [DIAG] Main 进程写文件失败: {} (path: {:?})", e, test_path),
            }
        }

        let conn = Connection::open(&db_path)?;

        // 改用 DELETE 模式（v3 fix）: 避免 WAL 模式的 -shm/-wal 辅助文件
        // 在受限 token 下更可靠（只需要一个 db 主文件）
        conn.execute_batch("PRAGMA journal_mode=DELETE;")?;
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

        // 运行迁移：Agent 个性化配置（昵称/头像覆盖）
        let agent_profile_migration =
            include_str!("../../database/migrations/041_agent_profile_overrides.sql");
        if let Err(e) = self.conn.execute_batch(agent_profile_migration) {
            eprintln!("[DB Migration WARNING] 041_agent_profile_overrides: {}", e);
            migration_errors.push(format!("041: {}", e));
        }

        // 运行迁移：ProductsPage 多图持久化支持（中等优先级 TODO #1）
        // 为 product_images 表增加 product_id 列（与 spu_id 共存）
        // SQLite 3.35+ 支持 ADD COLUMN；旧版会报 duplicate column，已被迁移错误吞掉
        let gallery_migration = include_str!("../../database/migrations/051_product_gallery.sql");
        if let Err(e) = self.conn.execute_batch(gallery_migration) {
            eprintln!("[DB Migration WARNING] 051_product_gallery: {}", e);
            migration_errors.push(format!("051: {}", e));
        } else {
            eprintln!("✓ [DB Migration] 051_product_gallery 多图支持已加载");
        }

        // 运行迁移：给缺 deleted_at 列的表补充软删除列（v1.0.0+tray 补丁）
        // 原因：销售/采购/联系人代码使用 WHERE deleted_at IS NULL，但 src/db/schema.sql
        // 原始定义里没建这个列。SQLite 不支持 ADD COLUMN IF NOT EXISTS，
        // 错误被静默吞掉（重复列名时不影响后续迁移）。
        // v1.0.0+tray+db+contacts+msgs: 补齐 messages / brands / product_categories
        //                              / product_skus / purchase_returns / sales_returns
        // v1.0.0+tray+db+contacts+msgs+safety+view: 拆成独立 try/catch
        //                                          避免一条失败影响其他表的迁移
        let deleted_at_tables = [
            "users", "customers", "products", "purchase_orders", "sales_orders",
            "suppliers", "messages", "brands", "product_categories", "product_skus",
            "purchase_returns", "sales_returns",
        ];
        for table in deleted_at_tables.iter() {
            let sql = format!("ALTER TABLE {} ADD COLUMN deleted_at TIMESTAMP;", table);
            match self.conn.execute_batch(&sql) {
                Ok(_) => {}
                Err(e) => {
                    // 重复列名错误（如 "duplicate column name: deleted_at"）视为成功
                    let msg = e.to_string();
                    if msg.contains("duplicate column") {
                        eprintln!("[DB Migration INFO] {}.deleted_at 已存在，跳过", table);
                    } else {
                        eprintln!("[DB Migration WARNING] ALTER TABLE {} ADD deleted_at: {}", table, msg);
                    }
                }
            }
        }

        // 运行迁移：重建 v_spu_inventory 视图为完整 16 列版本
        // v1.0.0+tray+db+contacts+msgs+safety+view: 修复 get_product_spus 报错
        //   "no such column: description / category_id / brand_id / unit / is_on_sale
        //    / metadata / created_at / updated_at"
        // SQLite 不支持 CREATE OR REPLACE VIEW，必须先 DROP 再 CREATE
        if let Err(e) = self.conn.execute_batch(
            "DROP VIEW IF EXISTS v_spu_inventory;
             CREATE VIEW v_spu_inventory AS
             SELECT
                 spu.id,
                 spu.spu_code,
                 spu.name,
                 spu.description,
                 spu.category_id,
                 spu.brand_id,
                 spu.unit,
                 spu.is_on_sale,
                 spu.status,
                 spu.metadata,
                 COUNT(sku.id) as sku_count,
                 COALESCE(SUM(sku.current_stock), 0) as total_stock,
                 COALESCE(MIN(sku.sell_price), 0) as min_price,
                 COALESCE(MAX(sku.sell_price), 0) as max_price,
                 spu.created_at,
                 spu.updated_at
             FROM product_spus spu
             LEFT JOIN product_skus sku ON spu.id = sku.spu_id AND sku.deleted_at IS NULL
             WHERE spu.deleted_at IS NULL
             GROUP BY spu.id, spu.spu_code, spu.name, spu.description, spu.category_id,
                      spu.brand_id, spu.unit, spu.is_on_sale, spu.status, spu.metadata,
                      spu.created_at, spu.updated_at;",
        ) {
            eprintln!("[DB Migration WARNING] recreate_v_spu_inventory: {}", e);
            migration_errors.push(format!("v_spu_inventory: {}", e));
        } else {
            eprintln!("✓ [DB Migration] v_spu_inventory 视图已重建为 16 列版本");
        }

        // 运行迁移：iPhone 电池演示案例数据（v1.0.0+tray+db+contacts+msgs+safety+view+demo 补丁）
        // 原因：模拟账号依赖 20 个 iPhone 电池 SPU + 对应 SKU + 图片作为初始案例数据。
        //       src-tauri 此前未加载 seed_iphone_batteries.sql，导致新装数据库空空如也。
        // SQL 使用 INSERT OR IGNORE 幂等插入：老用户重复运行不会报错。
        let iphone_seed = include_str!("../../database/seed_iphone_batteries.sql");
        match self.conn.execute_batch(iphone_seed) {
            Ok(_) => {
                eprintln!("✓ [DB Migration] iPhone 电池案例数据已载入（20 个 SPU + 20 个 SKU + 20 张图片）");
            }
            Err(e) => {
                // 部分失败是允许的（例如某条 INSERT 违反约束），记录警告
                eprintln!("[DB Migration WARNING] seed_iphone_batteries (部分插入可忽略): {}", e);
                migration_errors.push(format!("seed_iphone_batteries: {}", e));
            }
        }

        // 运行迁移：云商城表（v1.0.0+tray+db+contacts+msgs 补丁）
        // 原因：src/db/migrations/007_cloud_store.sql 未被 database.rs 加载，
        // 启动时调用 get_cloud_store / create_cloud_store 会报
        // "no such table: cloud_stores"。这里内联一份 SQLite 兼容版本。
        // 包含：cloud_stores / cloud_store_themes / cloud_sync_log / cloud_orders
        //       + product_spu 云同步字段（云同步状态、版本号、是否上架）
        if let Err(e) = self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS cloud_stores (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                subdomain TEXT UNIQUE NOT NULL,
                custom_domain TEXT,
                api_key TEXT NOT NULL,
                status TEXT DEFAULT 'active' CHECK(status IN ('inactive', 'active', 'expired', 'suspended')),
                plan_type TEXT DEFAULT 'free' CHECK(plan_type IN ('free', 'basic', 'professional', 'enterprise')),
                expires_at INTEGER,
                theme_data TEXT DEFAULT '{}',
                created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
                updated_at INTEGER DEFAULT (strftime('%s','now') * 1000),
                deleted_at TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_cloud_stores_user ON cloud_stores(user_id);
            CREATE INDEX IF NOT EXISTS idx_cloud_stores_subdomain ON cloud_stores(subdomain);

            -- 幂等迁移：给已存在的 cloud_stores 表补充 theme_data 列（mark_store_as_demo 需要）
            -- SQLite 不支持 IF NOT EXISTS 给 ADD COLUMN，吞掉「重复列名」错误即可
            -- 这里用单独 execute，每个独立 try/catch

            CREATE TABLE IF NOT EXISTS cloud_store_themes (
                store_id TEXT PRIMARY KEY REFERENCES cloud_stores(id) ON DELETE CASCADE,
                primary_color TEXT DEFAULT '#1890ff',
                secondary_color TEXT DEFAULT '#f5f5f5',
                layout_style TEXT DEFAULT 'card' CHECK(layout_style IN ('card', 'list')),
                font_family TEXT DEFAULT 'PingFang SC, Microsoft YaHei, sans-serif',
                logo_url TEXT,
                banner_images TEXT DEFAULT '[]',
                theme_data TEXT DEFAULT '{}',
                updated_at INTEGER DEFAULT (strftime('%s','now') * 1000)
            );

            CREATE TABLE IF NOT EXISTS cloud_sync_log (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL REFERENCES cloud_stores(id) ON DELETE CASCADE,
                sync_type TEXT NOT NULL CHECK(sync_type IN ('full', 'incremental')),
                status TEXT NOT NULL CHECK(status IN ('pending', 'syncing', 'success', 'failed')),
                message TEXT,
                items_synced INTEGER DEFAULT 0,
                created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
            );
            CREATE INDEX IF NOT EXISTS idx_cloud_sync_log_store ON cloud_sync_log(store_id);
            CREATE INDEX IF NOT EXISTS idx_cloud_sync_log_created ON cloud_sync_log(created_at DESC);

            CREATE TABLE IF NOT EXISTS cloud_orders (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL REFERENCES cloud_stores(id) ON DELETE CASCADE,
                order_no TEXT UNIQUE NOT NULL,
                customer_name TEXT,
                customer_phone TEXT,
                customer_address TEXT,
                total_amount REAL DEFAULT 0,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
                payment_method TEXT CHECK(payment_method IN ('wechat', 'alipay')),
                items TEXT NOT NULL DEFAULT '[]',
                callback_status TEXT DEFAULT 'pending' CHECK(callback_status IN ('pending', 'success', 'failed')),
                callback_message TEXT,
                created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
                updated_at INTEGER DEFAULT (strftime('%s','now') * 1000)
            );
            CREATE INDEX IF NOT EXISTS idx_cloud_orders_store ON cloud_orders(store_id);
            CREATE INDEX IF NOT EXISTS idx_cloud_orders_status ON cloud_orders(status);
            CREATE INDEX IF NOT EXISTS idx_cloud_orders_created ON cloud_orders(created_at DESC);

            -- 给 product_spu 补云同步相关字段（幂等 ALTER，错误被吞掉）
            -- 错误被外层静默：重复列名时不影响后续迁移。",
        ) {
            eprintln!("[DB Migration WARNING] cloud_stores_inline: {}", e);
            migration_errors.push(format!("cloud_stores_inline: {}", e));
        }
        // 单独跑 product_spus 的 ALTER（独立 try/catch，避免与 cloud_stores 创建耦合）
        // 重要：云商城查的是 product_spus（复数），不是 product_spu（单数）！
        // 这里补上云同步相关字段，让 get_store_stats / get_syncable_products 能正常查到。
        if let Err(e) = self.conn.execute_batch(
            "ALTER TABLE product_spus ADD COLUMN cloud_sync_status TEXT DEFAULT 'synced';
             ALTER TABLE product_spus ADD COLUMN cloud_sync_version INTEGER DEFAULT 1;
             ALTER TABLE product_spus ADD COLUMN is_cloud_visible INTEGER DEFAULT 1;
             ALTER TABLE product_spus ADD COLUMN cloud_sync_time TEXT;
             CREATE INDEX IF NOT EXISTS idx_product_spus_cloud_sync ON product_spus(cloud_sync_status);
             CREATE INDEX IF NOT EXISTS idx_product_spus_cloud_visible ON product_spus(is_cloud_visible);",
        ) {
            eprintln!("[DB Migration INFO] product_spus_cloud_fields: {}", e);
        }

        // 保留对老 product_spu（单数）表的兼容 ALTER（幂等，错误被吞掉）
        let _ = self.conn.execute_batch(
            "ALTER TABLE product_spu ADD COLUMN cloud_sync_status TEXT DEFAULT 'pending';
             ALTER TABLE product_spu ADD COLUMN cloud_sync_version INTEGER DEFAULT 0;
             ALTER TABLE product_spu ADD COLUMN is_cloud_visible INTEGER DEFAULT 0;",
        );

        // 幂等迁移：给已存在的 cloud_stores 表补充 theme_data 列
        // mark_store_as_demo / get_store_stats 需要读取这个列
        // SQLite ADD COLUMN 没有 IF NOT EXISTS，吞掉「重复列名」错误即可
        let _ = self.conn.execute(
            "ALTER TABLE cloud_stores ADD COLUMN theme_data TEXT DEFAULT '{}'",
            [],
        );

        // 运行迁移：商务秘书 BAP 表（SQLite 兼容版本）
        // 原 PostgreSQL 版 025_secretary_bap.sql 用了 JSON 类型和 EXTRACT(EPOCH FROM NOW())
        // 在 SQLite 中不可用，这里内联一个等价的 SQLite 版本
        if let Err(e) = self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS secretary_bap (
                id TEXT PRIMARY KEY,
                profile_type TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                confidence REAL DEFAULT 0.5,
                source TEXT DEFAULT 'observed',
                last_matched_at INTEGER,
                created_at INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)),
                updated_at INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER))
            );
            CREATE INDEX IF NOT EXISTS idx_secretary_bap_profile_type ON secretary_bap(profile_type);
            CREATE INDEX IF NOT EXISTS idx_secretary_bap_source ON secretary_bap(source);
            CREATE INDEX IF NOT EXISTS idx_secretary_bap_updated ON secretary_bap(updated_at);",
        ) {
            eprintln!("[DB Migration WARNING] secretary_bap: {}", e);
            migration_errors.push(format!("secretary_bap: {}", e));
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

        // 运行迁移：灵活库存支持（PRD v12.0 库存负库存与微盘点）
        //   - product_sku 扩展字段：allow_negative_stock / stock_confidence / last_calibrated_at / negative_since
        //   - inventory_calibrations：校准历史（微盘点/冲销/清零）
        //   - notification_suppressions：通知防骚扰
        //   - inventory_aging_tasks：负库存老化待处理
        if let Err(e) = self.conn.execute_batch("
            ALTER TABLE product_sku ADD COLUMN allow_negative_stock INTEGER DEFAULT 0;
            ALTER TABLE product_sku ADD COLUMN stock_confidence TEXT DEFAULT 'low';
            ALTER TABLE product_sku ADD COLUMN last_calibrated_at TIMESTAMP;
            ALTER TABLE product_sku ADD COLUMN negative_since TIMESTAMP;
            -- 同样为旧版 products 表添加字段（销售/采购订单使用该表）
            ALTER TABLE products ADD COLUMN allow_negative_stock INTEGER DEFAULT 0;
            ALTER TABLE products ADD COLUMN stock_confidence TEXT DEFAULT 'low';
            ALTER TABLE products ADD COLUMN last_calibrated_at TIMESTAMP;
            ALTER TABLE products ADD COLUMN negative_since TIMESTAMP;
            CREATE INDEX IF NOT EXISTS idx_product_sku_negative_since ON product_sku(negative_since);
            CREATE INDEX IF NOT EXISTS idx_product_sku_confidence ON product_sku(stock_confidence);
            CREATE INDEX IF NOT EXISTS idx_product_sku_last_calibrated ON product_sku(last_calibrated_at);
            CREATE TABLE IF NOT EXISTS inventory_calibrations (
                id TEXT PRIMARY KEY,
                sku_id TEXT NOT NULL,
                spu_id TEXT,
                calibration_type TEXT NOT NULL CHECK(calibration_type IN ('micro','manual','writeoff','auto_offset')),
                book_stock INTEGER NOT NULL,
                actual_stock INTEGER NOT NULL,
                delta INTEGER NOT NULL,
                trigger_source TEXT NOT NULL CHECK(trigger_source IN ('after_sale','after_purchase','manual','aging','low_confidence','top_sales_aging')),
                reference_id TEXT,
                reference_type TEXT,
                confidence_before TEXT,
                confidence_after TEXT,
                notes TEXT,
                performed_by TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_inventory_calibrations_sku ON inventory_calibrations(sku_id);
            CREATE INDEX IF NOT EXISTS idx_inventory_calibrations_type ON inventory_calibrations(calibration_type);
            CREATE INDEX IF NOT EXISTS idx_inventory_calibrations_created ON inventory_calibrations(created_at DESC);
            CREATE TABLE IF NOT EXISTS notification_suppressions (
                id TEXT PRIMARY KEY,
                sku_id TEXT NOT NULL,
                notification_kind TEXT NOT NULL CHECK(notification_kind IN ('negative_aging','low_confidence','top_sales_aging')),
                ignore_count INTEGER DEFAULT 0,
                suppressed_until TIMESTAMP,
                last_dismissed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_notification_suppressions_sku ON notification_suppressions(sku_id);
            CREATE INDEX IF NOT EXISTS idx_notification_suppressions_until ON notification_suppressions(suppressed_until);
            CREATE TABLE IF NOT EXISTS inventory_aging_tasks (
                id TEXT PRIMARY KEY,
                sku_id TEXT NOT NULL,
                spu_id TEXT,
                task_type TEXT NOT NULL CHECK(task_type IN ('negative_aging')),
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending','resolved','cancelled')),
                triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP,
                resolution TEXT,
                resolution_qty INTEGER,
                notes TEXT,
                highlighted INTEGER DEFAULT 1
            );
            CREATE INDEX IF NOT EXISTS idx_inventory_aging_tasks_status ON inventory_aging_tasks(status);
            CREATE INDEX IF NOT EXISTS idx_inventory_aging_tasks_sku ON inventory_aging_tasks(sku_id);
            UPDATE product_sku
            SET stock_confidence = CASE
              WHEN EXISTS (
                SELECT 1 FROM inventory_transactions it
                WHERE it.product_id = product_sku.id
                  AND it.created_at >= datetime('now', '-7 days')
              ) THEN 'medium'
              ELSE 'low'
            END
            WHERE stock_confidence IS NULL OR stock_confidence = 'low';
            UPDATE product_sku
            SET negative_since = CURRENT_TIMESTAMP
            WHERE current_stock < 0 AND negative_since IS NULL;
            -- 触发器：库存变为负时自动设置 negative_since（PRD v12.0 §3.6）
            DROP TRIGGER IF EXISTS trg_product_sku_negative_since;
            CREATE TRIGGER trg_product_sku_negative_since
                AFTER UPDATE OF current_stock ON product_sku
                WHEN NEW.current_stock < 0 AND (OLD.current_stock >= 0 OR OLD.negative_since IS NULL)
            BEGIN
                UPDATE product_sku
                SET negative_since = CURRENT_TIMESTAMP
                WHERE id = NEW.id;
            END;
            -- 触发器：库存回到非负时清空 negative_since
            DROP TRIGGER IF EXISTS trg_product_sku_negative_clear;
            CREATE TRIGGER trg_product_sku_negative_clear
                AFTER UPDATE OF current_stock ON product_sku
                WHEN NEW.current_stock >= 0 AND OLD.negative_since IS NOT NULL
            BEGIN
                UPDATE product_sku
                SET negative_since = NULL
                WHERE id = NEW.id;
            END;
            -- 旧版 products 表也加同样的触发器（销售/采购使用该表）
            DROP TRIGGER IF EXISTS trg_products_negative_since;
            CREATE TRIGGER trg_products_negative_since
                AFTER UPDATE OF current_stock ON products
                WHEN NEW.current_stock < 0 AND (OLD.current_stock >= 0 OR OLD.negative_since IS NULL)
            BEGIN
                UPDATE products
                SET negative_since = CURRENT_TIMESTAMP
                WHERE id = NEW.id;
            END;
            DROP TRIGGER IF EXISTS trg_products_negative_clear;
            CREATE TRIGGER trg_products_negative_clear
                AFTER UPDATE OF current_stock ON products
                WHEN NEW.current_stock >= 0 AND OLD.negative_since IS NOT NULL
            BEGIN
                UPDATE products
                SET negative_since = NULL
                WHERE id = NEW.id;
            END;
        ") {
            eprintln!("[DB Migration WARNING] flexible_inventory: {}", e);
            migration_errors.push(format!("flexible_inventory: {}", e));
        }

        for (label, sql) in [
            (
                "011_catering",
                include_str!("../../database/migrations/011_catering_plugin.sql"),
            ),
            (
                "012_beauty",
                include_str!("../../database/migrations/012_beauty_plugin.sql"),
            ),
            (
                "013_pet",
                include_str!("../../database/migrations/013_pet_plugin.sql"),
            ),
            (
                "030_convenience",
                include_str!("../../database/migrations/030_convenience_store_plugin.sql"),
            ),
            (
                "031_liquor",
                include_str!("../../database/migrations/031_liquor_wholesale_plugin.sql"),
            ),
            (
                "032_phone_accessories",
                include_str!("../../database/migrations/032_phone_accessories_plugin.sql"),
            ),
            (
                "033_fresh_food",
                include_str!("../../database/migrations/033_fresh_food_delivery_plugin.sql"),
            ),
            (
                "034_auto_parts",
                include_str!("../../database/migrations/034_auto_parts_plugin.sql"),
            ),
            (
                "035_hardware",
                include_str!("../../database/migrations/035_hardware_plugin.sql"),
            ),
            (
                "036_decoration",
                include_str!("../../database/migrations/036_decoration_material_plugin.sql"),
            ),
            (
                "037_group_buy",
                include_str!("../../database/migrations/037_community_group_buy_plugin.sql"),
            ),
        ] {
            if let Err(e) = self.conn.execute_batch(sql) {
                eprintln!("[DB Migration WARNING] {}: {}", label, e);
                migration_errors.push(format!("{}: {}", label, e));
            }
        }

        if let Err(e) = self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS foreign_hs_codes (
                code TEXT PRIMARY KEY, description TEXT NOT NULL,
                duty_rate TEXT NOT NULL, category TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS foreign_translations (
                id TEXT PRIMARY KEY, spu_id TEXT NOT NULL, spu_name TEXT NOT NULL,
                language TEXT NOT NULL, translated_name TEXT NOT NULL,
                translated_description TEXT, updated_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS foreign_customs_declarations (
                id TEXT PRIMARY KEY, order_no TEXT NOT NULL, hs_code TEXT NOT NULL,
                product_name TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price REAL NOT NULL,
                total_value REAL NOT NULL, origin_country TEXT NOT NULL,
                destination_country TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft',
                declared_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS foreign_logistics_tracks (
                tracking_no TEXT PRIMARY KEY, carrier TEXT NOT NULL, status TEXT NOT NULL,
                origin TEXT NOT NULL, destination TEXT NOT NULL, estimated_delivery TEXT NOT NULL,
                events_json TEXT NOT NULL, updated_at TEXT NOT NULL);
            INSERT OR IGNORE INTO foreign_hs_codes VALUES
                ('8507.60.00','Lithium-ion batteries','3.5%','Electronics'),
                ('8504.40.95','Static converters','2.5%','Electronics'),
                ('3926.90.99','Other articles of plastics','5.3%','Packaging'),
                ('4819.10.00','Cartons boxes of paper','0%','Packaging');
            INSERT OR IGNORE INTO foreign_translations VALUES
                ('t1','spu_iphone15pm_bat','iPhone 15 Pro Max Battery','en',
                 'iPhone 15 Pro Max Battery','4422mAh replacement','2025-01-15'),
                ('t2','spu_iphone15pro_bat','iPhone 15 Pro Battery','en',
                 'iPhone 15 Pro Battery','3274mAh replacement','2025-01-16'),
                ('t3','spu_iphone15pm_bat','iPhone 15 Pro Max Battery','ja',
                 'iPhone 15 Pro Max Battery JA','4422mAh replacement','2025-01-15');
            INSERT OR IGNORE INTO foreign_customs_declarations VALUES
                ('cd1','FO-2025-0078','8507.60.00','iPhone 15 Pro Max Battery',
                 200,12.5,2500,'CN','US','cleared','2025-06-15'),
                ('cd2','FO-2025-0079','8507.60.00','iPhone 14 Plus Battery',
                 150,10.8,1620,'CN','DE','submitted','2025-07-08');
            INSERT OR IGNORE INTO foreign_logistics_tracks VALUES
                ('DHL7894561230','dhl','in_transit','Shenzhen (SZX)','Los Angeles (LAX)',
                 '2025-07-15',
                 '[{\"time\":\"2025-07-10 09:30\",\"location\":\"Shenzhen\",\"description\":\"包裹已揽收\",\"status\":\"picked_up\"},{\"time\":\"2025-07-10 14:00\",\"location\":\"Shenzhen宝安机场\",\"description\":\"到达机场，等待出境安检\",\"status\":\"in_transit\"},{\"time\":\"2025-07-11 03:20\",\"location\":\"香港 HKG\",\"description\":\"已出境，搭乘 CX2088 航班\",\"status\":\"in_transit\"},{\"time\":\"2025-07-12 18:45\",\"location\":\"洛杉矶 LAX\",\"description\":\"到达目的地机场，等待清关\",\"status\":\"customs\"}]',
                 '2025-07-12T18:45:00Z');",
        ) {
            eprintln!("[DB Migration WARNING] foreign_counter: {}", e);
            migration_errors.push(format!("foreign_counter: {}", e));
        }

        if let Err(e) = self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS operations_content_queue (
                id TEXT PRIMARY KEY, title TEXT NOT NULL, source TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL);
            INSERT OR IGNORE INTO operations_content_queue VALUES
                ('oc1','ProClaw AI best practices','Content Agent','pending','2026-06-20T10:00:00Z'),
                ('oc2','Announcing v2.0 Release','Content Agent','pending','2026-06-20T09:00:00Z'),
                ('oc3','SEO optimization report','SEO Agent','approved','2026-06-20T08:00:00Z'),
                ('oc4','Product feature tweet','Social Ops','pending','2026-06-20T07:00:00Z');",
        ) {
            eprintln!("[DB Migration WARNING] operations_content_queue: {}", e);
            migration_errors.push(format!("operations_content_queue: {}", e));
        }

        if let Err(e) = self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS operations_seo_metrics (
                id TEXT PRIMARY KEY, label TEXT NOT NULL, value TEXT NOT NULL,
                detail TEXT NOT NULL, trend TEXT NOT NULL DEFAULT 'up', sort_order INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE IF NOT EXISTS operations_seo_recommendations (
                id TEXT PRIMARY KEY, priority TEXT NOT NULL, title TEXT NOT NULL,
                description TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE IF NOT EXISTS operations_social_accounts (
                id TEXT PRIMARY KEY, platform TEXT NOT NULL, region TEXT NOT NULL,
                followers TEXT NOT NULL, engagement TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active', sort_order INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE IF NOT EXISTS operations_alerts (
                id TEXT PRIMARY KEY, level TEXT NOT NULL, title TEXT NOT NULL,
                description TEXT NOT NULL, created_at TEXT NOT NULL, is_dismissed INTEGER NOT NULL DEFAULT 0);
            INSERT OR IGNORE INTO operations_seo_metrics VALUES
                ('sm1','关键词排名','12 个跟踪','前10: 3个','up',1),
                ('sm2','页面加载时间','2.8s','目标: 2.5s','down',2),
                ('sm3','死链数量','2 个','需修复','warning',3),
                ('sm4','索引页面','47 页','上周: 45','up',4);
            INSERT OR IGNORE INTO operations_seo_recommendations VALUES
                ('sr1','高','首页加载速度优化','LCP 3.2s，建议优化至 2.5s 以下',1),
                ('sr2','中','缺失 meta description','3 个页面缺少 meta description',2),
                ('sr3','低','内部链接优化','建议增加产品页之间的关联链接',3);
            INSERT OR IGNORE INTO operations_social_accounts VALUES
                ('sa1','Twitter/X','欧美','1,247','3.4%','active',1),
                ('sa2','Facebook','欧美','892','2.1%','active',2),
                ('sa3','Instagram','欧美','1,568','4.2%','active',3),
                ('sa4','LinkedIn','欧美','634','2.8%','active',4),
                ('sa5','TikTok','东南亚','4,200','6.5%','paused',5),
                ('sa6','微信公众号','国内','2,100','2.3%','active',6),
                ('sa7','小红书','国内','1,468','3.1%','active',7);
            INSERT OR IGNORE INTO operations_alerts VALUES
                ('al1','warning','首页跳出率异常升高','首页跳出率从 35% 升至 52%','2026-06-22T10:30:00Z',0),
                ('al2','warning','博客分类流量下降','技术博客分类流量下降 28%','2026-06-22T10:00:00Z',0),
                ('al3','info','东南亚社媒 Team 已暂停','TikTok 账号需重新授权','2026-06-22T08:00:00Z',0);
            CREATE TABLE IF NOT EXISTS operations_ai_teams (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'running',
                agents_json TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0);
            INSERT OR IGNORE INTO operations_ai_teams VALUES
                ('ot1','网站运营 AI Team','running','[\"SEO 优化\",\"内容生成\",\"数据分析\",\"转化优化\"]',1),
                ('ot2','欧美社媒 Team','running','[\"Twitter\",\"Facebook\",\"Instagram\",\"LinkedIn\"]',2),
                ('ot3','东南亚社媒 Team','paused','[\"TikTok\",\"Instagram\",\"Facebook\"]',3),
                ('ot4','国内社媒 Team','running','[\"微信公众号\",\"小红书\",\"知乎\",\"微博\"]',4);",
        ) {
            eprintln!("[DB Migration WARNING] operations_seo_social_alerts: {}", e);
            migration_errors.push(format!("operations_seo_social_alerts: {}", e));
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
