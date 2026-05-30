-- ProClaw CEO Agent 决策确认与个性化学习数据表 (PRD v6.3)
-- 记录所有 CEO Agent 的决策建议及 Boss 的反馈，用于偏好模型训练

-- ============================================
-- 决策日志表
-- ============================================
CREATE TABLE IF NOT EXISTS ceo_decision_logs (
  id TEXT PRIMARY KEY,
  decision_type TEXT NOT NULL,      -- 'context_add', 'context_update', 'task_dispatch', 'agent_request', 'goal_pause', etc.
  proposed_content TEXT NOT NULL,   -- JSON: 原始建议内容
  boss_decision TEXT,               -- 'approved', 'rejected', 'edited', 'snoozed', NULL(待处理)
  boss_feedback TEXT,               -- 用户填写的反馈文字
  final_content TEXT,               -- JSON: 最终生效的内容（如被编辑后）
  context_snapshot TEXT DEFAULT '{}', -- JSON: 当时的 PCP 快照
  estimated_risk TEXT,              -- 'low', 'medium', 'high'
  created_at INTEGER NOT NULL,
  approved_at INTEGER,              -- 实际确认/拒绝的时间
  metadata TEXT DEFAULT '{}'        -- JSON 扩展字段
);

CREATE INDEX IF NOT EXISTS idx_ceo_decision_type ON ceo_decision_logs(decision_type);
CREATE INDEX IF NOT EXISTS idx_ceo_decision_status ON ceo_decision_logs(boss_decision);
CREATE INDEX IF NOT EXISTS idx_ceo_decision_created ON ceo_decision_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ceo_decision_approved ON ceo_decision_logs(approved_at);

-- ============================================
-- CEO Agent 偏好表
-- ============================================
CREATE TABLE IF NOT EXISTS ceo_preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,              -- JSON: 偏好值
  updated_at INTEGER NOT NULL
);

-- 默认偏好（首次安装时插入）
INSERT OR IGNORE INTO ceo_preferences (key, value, updated_at)
VALUES
  ('budget_sensitivity', '5', strftime('%s','now')),
  ('risk_tolerance', '5', strftime('%s','now')),
  ('auto_approve_threshold', '0.85', strftime('%s','now')),
  ('decision_style', '"balanced"', strftime('%s','now'));
