-- Hermes Skills Schema (P0-A + P0-B)
-- 这个文件同时被 JS 端(skillStore.ts 的 SCHEMA_SQL)和 Rust 侧(hermes_bootstrap_internal)使用。
-- 修改时请同步两边。

CREATE TABLE IF NOT EXISTS hermes_skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  trigger_phrases TEXT NOT NULL,
  tool_templates TEXT NOT NULL,
  system_prompt_addition TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL CHECK(source IN ('preset','learned','optimized')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','pending_review','archived')),
  version INTEGER NOT NULL DEFAULT 1,
  parent_version INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_hermes_skills_source ON hermes_skills(source);
CREATE INDEX IF NOT EXISTS idx_hermes_skills_status ON hermes_skills(status);
CREATE INDEX IF NOT EXISTS idx_hermes_skills_updated ON hermes_skills(updated_at);

CREATE VIRTUAL TABLE IF NOT EXISTS hermes_skills_fts USING fts5(
  id UNINDEXED,
  name,
  description,
  trigger_phrases,
  tags,
  content='hermes_skills',
  content_rowid='rowid',
  tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS hermes_skills_ai AFTER INSERT ON hermes_skills BEGIN
  INSERT INTO hermes_skills_fts(rowid, id, name, description, trigger_phrases, tags)
  VALUES (new.rowid, new.id, new.name, new.description, new.trigger_phrases, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS hermes_skills_ad AFTER DELETE ON hermes_skills BEGIN
  INSERT INTO hermes_skills_fts(hermes_skills_fts, rowid, id, name, description, trigger_phrases, tags)
  VALUES ('delete', old.rowid, old.id, old.name, old.description, old.trigger_phrases, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS hermes_skills_au AFTER UPDATE ON hermes_skills BEGIN
  INSERT INTO hermes_skills_fts(hermes_skills_fts, rowid, id, name, description, trigger_phrases, tags)
  VALUES ('delete', old.rowid, old.id, old.name, old.description, old.trigger_phrases, old.tags);
  INSERT INTO hermes_skills_fts(rowid, id, name, description, trigger_phrases, tags)
  VALUES (new.rowid, new.id, new.name, new.description, new.trigger_phrases, new.tags);
END;

CREATE TABLE IF NOT EXISTS hermes_schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Evolution Log (P0-B: 记录每次反思事件)
CREATE TABLE IF NOT EXISTS hermes_evolution_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  trace_query TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL,
  skill_id TEXT,
  source_skill_ids TEXT,
  reasoning TEXT NOT NULL,
  signals TEXT,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_evolution_log_ts ON hermes_evolution_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_evolution_log_action ON hermes_evolution_log(action);