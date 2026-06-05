-- NvwaX API 消耗记录表
-- 用于记录 ProClaw 用户每次通过 NvwaX API 调用产生的 Token 消耗
-- PRD: ProClaw × NvwaX API 集成需求文档

CREATE TABLE IF NOT EXISTS nvwax_usage_logs (
  id TEXT PRIMARY KEY,
  proclaw_user_id TEXT NOT NULL,
  nvwax_endpoint TEXT,
  tokens_consumed INTEGER NOT NULL DEFAULT 0,
  model TEXT,
  source TEXT,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proclaw_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_nvwax_usage_user ON nvwax_usage_logs(proclaw_user_id);
CREATE INDEX IF NOT EXISTS idx_nvwax_usage_time ON nvwax_usage_logs(created_at);
