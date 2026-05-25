-- ============================================
-- 迁移 005: 邀请系统性能优化索引
-- 添加复合索引提升查询性能 (PRD v4.2)
-- ============================================

-- invitations 表 - 复合索引 (invite_code + status)
-- 加速 accept_invitation 中的 WHERE invite_code = ? AND status = 'active' 查询
CREATE INDEX IF NOT EXISTS idx_invitations_code_status 
    ON invitations(invite_code, status);

-- invitations 表 - 复合索引 (inviter_id + status)
-- 加速 list_invitations 和 revoke_invitation 中的按用户+状态组合查询
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_status 
    ON invitations(inviter_id, status);

-- invitations 表 - expires_at 索引
-- 加速过期邀请清理/查询任务
CREATE INDEX IF NOT EXISTS idx_invitations_expires 
    ON invitations(expires_at);

-- user_contacts 表 - 复合索引 (user_id + contact_type)
-- 加速 ContactsScreen 按类型筛选联系人
CREATE INDEX IF NOT EXISTS idx_user_contacts_user_type 
    ON user_contacts(user_id, contact_type);

-- user_contacts 表 - 复合索引 (contact_id + user_id)
-- 加速反向联系人查询（被邀请方查邀请方）
CREATE INDEX IF NOT EXISTS idx_user_contacts_contact_user 
    ON user_contacts(contact_id, user_id);
