-- ProClaw CEO Agent 项目上下文协议数据表 (PRD v6.2)
-- 由 CEO Agent 维护，记录 Boss 的宏观意图、业务方向、项目定位、关键约束

-- ============================================
-- 项目上下文表 (Project Context Protocol)
-- ============================================
CREATE TABLE IF NOT EXISTS project_context (
  id TEXT PRIMARY KEY,
  context_type TEXT NOT NULL,   -- 'vision', 'goal', 'constraint', 'milestone', 'decision'
  title TEXT,
  description TEXT,
  priority INTEGER,              -- 1-5
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'archived')),
  created_at INTEGER,
  updated_at INTEGER,
  created_by TEXT DEFAULT 'boss',               -- 'boss' or 'ceo_agent'
  metadata TEXT DEFAULT '{}'                  -- JSON 扩展字段，如关联的 agent_id
);

CREATE INDEX IF NOT EXISTS idx_pcp_context_type ON project_context(context_type);
CREATE INDEX IF NOT EXISTS idx_pcp_status ON project_context(status);
CREATE INDEX IF NOT EXISTS idx_pcp_priority ON project_context(priority);
CREATE INDEX IF NOT EXISTS idx_pcp_created_at ON project_context(created_at);

-- ============================================
-- CEO Agent 任务表
-- ============================================
CREATE TABLE IF NOT EXISTS ceo_tasks (
  id TEXT PRIMARY KEY,
  task_id TEXT UNIQUE NOT NULL,
  assigned_agent_id TEXT NOT NULL,
  type TEXT,
  description TEXT,
  expected_output TEXT,
  priority INTEGER DEFAULT 2,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  result TEXT,                  -- JSON
  created_at INTEGER,
  deadline INTEGER,
  completed_at INTEGER,
  metadata TEXT DEFAULT '{}'   -- JSON 扩展字段
);

CREATE INDEX IF NOT EXISTS idx_ceo_tasks_agent ON ceo_tasks(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_ceo_tasks_status ON ceo_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ceo_tasks_priority ON ceo_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_ceo_tasks_created ON ceo_tasks(created_at);

-- ============================================
-- PCP 默认示例数据（首次安装时引导）
-- ============================================
INSERT OR IGNORE INTO project_context (id, context_type, title, description, priority, status, created_at, updated_at, created_by)
SELECT
  'pcp_vision_001', 'vision', '让 AI 赋能每一个商户', 'ProClaw 致力于为中小商户提供智能化的经营管理工具，降低数字化门槛', 1, 'active', strftime('%s','now'), strftime('%s','now'), 'ceo_agent'
WHERE NOT EXISTS (SELECT 1 FROM project_context WHERE id = 'pcp_vision_001');
