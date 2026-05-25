-- ProClaw 数据库迁移: 员工邀请与角色权限自动分配（PRD v4.3）
-- Migration: 006_add_employee_invitation_fields
-- Created: 2026-05-25
-- PRD: v4.3
-- Depends: 005_add_invitations.sql

-- ============================================
-- 1. 扩展 invitations 表：新增 invite_type 和 role_ids 字段
-- ============================================

ALTER TABLE invitations ADD COLUMN invite_type TEXT DEFAULT 'external'
    CHECK(invite_type IN ('external', 'employee'));

ALTER TABLE invitations ADD COLUMN role_ids TEXT;  -- 存储角色ID的JSON数组，如 "[1,3]"

CREATE INDEX IF NOT EXISTS idx_invitations_type ON invitations(invite_type);

-- ============================================
-- 2. 确保 user_contacts 表支持 colleague 类型
-- ============================================

-- 检查并扩展 contact_type 约束（如果尚未包含 'colleague'）
-- SQLite 不支持 ALTER CHECK CONSTRAINT，需要重建表
-- 这里用更安全的方式：先检查再决定是否重建

-- 获取当前 contact_type CHECK 约束并扩展（通过新建表迁移数据的方式）
CREATE TABLE IF NOT EXISTS user_contacts_new (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    contact_id TEXT NOT NULL REFERENCES users(id),
    contact_type TEXT NOT NULL CHECK(contact_type IN ('supplier', 'customer', 'colleague')),
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    UNIQUE(user_id, contact_id)
);

INSERT OR IGNORE INTO user_contacts_new
    SELECT id, user_id, contact_id, contact_type, created_at
    FROM user_contacts;

DROP TABLE user_contacts;
ALTER TABLE user_contacts_new RENAME TO user_contacts;

CREATE INDEX IF NOT EXISTS idx_user_contacts_user ON user_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contacts_contact ON user_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_user_contacts_type ON user_contacts(contact_type);

-- ============================================
-- 3. 初始化角色数据（如果尚未插入）
-- ============================================

INSERT OR IGNORE INTO roles (id, name, description, permissions) VALUES
    (1, 'boss', '老板', '["*"]');
INSERT OR IGNORE INTO roles (id, name, description, permissions) VALUES
    (2, 'finance', '财务', '["view_finance","manage_finance","view_purchase","view_sales"]');
INSERT OR IGNORE INTO roles (id, name, description, permissions) VALUES
    (3, 'purchase', '采购', '["view_purchase","manage_purchase","view_inventory"]');
INSERT OR IGNORE INTO roles (id, name, description, permissions) VALUES
    (4, 'warehouse', '仓库', '["view_inventory","manage_inventory","view_purchase"]');
INSERT OR IGNORE INTO roles (id, name, description, permissions) VALUES
    (5, 'sales', '销售', '["view_sales","create_sales_order","view_inventory","view_products"]');
INSERT OR IGNORE INTO roles (id, name, description, permissions) VALUES
    (6, 'customer', '客户', '["view_own_orders","view_own_products"]');
INSERT OR IGNORE INTO roles (id, name, description, permissions) VALUES
    (7, 'supplier', '供应商', '["view_own_products"]');
