-- ProClaw 数据库迁移: 外部伙伴邀请与自动关联机制
-- Migration: 005_add_invitations
-- Created: 2026-05-25
-- PRD: v4.2

-- ============================================
-- 1. 邀请码表 (invitations)
-- ============================================
CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY,
    invite_code TEXT UNIQUE NOT NULL,
    inviter_id TEXT NOT NULL REFERENCES users(id),
    target_phone TEXT,                     -- 可选，预填对方手机号，用于自动匹配
    type TEXT NOT NULL CHECK(type IN ('order_share', 'price_update')),
    business_ref_id TEXT NOT NULL,     -- 订单号或商品ID列表(JSON)
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'used', 'expired', 'revoked')),
    expires_at INTEGER NOT NULL,            -- Unix时间戳（毫秒）
    used_at INTEGER,                        -- Unix时间戳（毫秒）
    used_by TEXT REFERENCES users(id),
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter ON invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON invitations(expires_at);

-- ============================================
-- 2. 用户联系人关系表（双向）(user_contacts)
-- ============================================
CREATE TABLE IF NOT EXISTS user_contacts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    contact_id TEXT NOT NULL REFERENCES users(id),
    contact_type TEXT NOT NULL CHECK(contact_type IN ('supplier', 'customer', 'colleague')),
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    UNIQUE(user_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_user_contacts_user ON user_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contacts_contact ON user_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_user_contacts_type ON user_contacts(contact_type);
