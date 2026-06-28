-- ============================================================
-- PRD v13.0 §7.1：离线访客数据隔离
-- ============================================================
-- 目的：让所有本地业务表的 owner_id 默认为 'offline-guest'，
--       离线访客身份下 store 层自动注入 WHERE owner_id = 'offline-guest'。
--       增值账号登录后通过「数据归属迁移」对话框选择性绑定。
-- ============================================================

-- 1. 给核心业务表添加 owner_id 列（默认 'offline-guest'）
ALTER TABLE products ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'offline-guest';
ALTER TABLE sales_orders ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'offline-guest';
ALTER TABLE customers ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'offline-guest';
ALTER TABLE contacts ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'offline-guest';
ALTER TABLE media_assets ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'offline-guest';
ALTER TABLE ai_teams ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'offline-guest';
ALTER TABLE agents ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'offline-guest';
ALTER TABLE api_usage_logs ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'offline-guest';

-- 2. 创建 owner_id 索引（加速按 owner 查询）
CREATE INDEX IF NOT EXISTS idx_products_owner ON products(owner_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_owner ON sales_orders(owner_id);
CREATE INDEX IF NOT EXISTS idx_customers_owner ON customers(owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_owner ON media_assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_ai_teams_owner ON ai_teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_agents_owner ON agents(owner_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_owner ON api_usage_logs(owner_id);

-- 3. 本地账号表（v13.0 新增）
CREATE TABLE IF NOT EXISTS local_accounts (
  id TEXT PRIMARY KEY,                  -- UUID v4 / local-{ts}-{rand}
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  password_hash TEXT,                    -- v13.1 升级 bcrypt cost=12
  created_at TEXT NOT NULL,
  last_active_at TEXT
);

-- 4. 本地会话表（v13.0 新增，v13.1 升级 Keyring 加密）
CREATE TABLE IF NOT EXISTS local_sessions (
  token TEXT PRIMARY KEY,                -- 32-byte 随机
  account_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,              -- 7 天后
  FOREIGN KEY (account_id) REFERENCES local_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_local_sessions_account ON local_sessions(account_id);
