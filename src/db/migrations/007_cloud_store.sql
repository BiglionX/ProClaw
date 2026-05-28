-- ProClaw 数据库迁移: 云托管商城（AI 生成独立站）PRD v5.0
-- Migration: 007_cloud_store
-- Created: 2026-05-25
-- PRD: v5.0
-- Depends: 006_add_employee_invitation_fields.sql

-- ============================================
-- 1. product_spu 表新增云商城字段
-- ============================================

ALTER TABLE product_spu ADD COLUMN cloud_sync_status TEXT DEFAULT 'pending'
    CHECK(cloud_sync_status IN ('pending', 'syncing', 'success', 'failed'));

ALTER TABLE product_spu ADD COLUMN cloud_sync_version INTEGER DEFAULT 0;

ALTER TABLE product_spu ADD COLUMN is_cloud_visible BOOLEAN DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_product_spu_cloud_sync ON product_spu(cloud_sync_status);
CREATE INDEX IF NOT EXISTS idx_product_spu_cloud_visible ON product_spu(is_cloud_visible);

-- ============================================
-- 2. 云商城配置表 (cloud_stores)
-- ============================================

CREATE TABLE IF NOT EXISTS cloud_stores (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subdomain TEXT UNIQUE NOT NULL,
    custom_domain TEXT,
    api_key TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('inactive', 'active', 'expired', 'suspended')),
    plan_type TEXT DEFAULT 'free' CHECK(plan_type IN ('free', 'basic', 'professional', 'enterprise')),
    expires_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_cloud_stores_user ON cloud_stores(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_stores_subdomain ON cloud_stores(subdomain);

-- ============================================
-- 3. 云商城主题配置表 (cloud_store_themes)
-- ============================================

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

-- ============================================
-- 4. 云商城同步日志表 (cloud_sync_log)
-- ============================================

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

-- ============================================
-- 5. 云商城订单表 (cloud_orders) - 本地缓存
-- ============================================

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

-- ============================================
-- 6. 初始化云商城套餐数据
-- ============================================

INSERT OR IGNORE INTO roles (id, name, description, permissions) VALUES
    (8, 'store_admin', '商城管理员', '["view_store","manage_store","view_products","sync_store"]');
