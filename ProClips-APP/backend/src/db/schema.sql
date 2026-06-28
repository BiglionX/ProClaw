-- ============================================================
-- ProClips Backend Schema V1
-- 5 张核心表 + 索引 + JWT issuer 信任表
-- 表前缀统一 video_，与 ProClaw 主线隔离
-- ============================================================

-- 1. video_templates 模板库
CREATE TABLE IF NOT EXISTS video_templates (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  scenes_json   TEXT NOT NULL,
  duration      TEXT NOT NULL,
  sample        TEXT,
  industry      TEXT,
  badge         TEXT,
  cover_color   TEXT,
  sort_order    INTEGER DEFAULT 0,
  is_active     INTEGER DEFAULT 1,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_templates_industry ON video_templates(industry);
CREATE INDEX IF NOT EXISTS idx_templates_active ON video_templates(is_active);

-- 2. video_raw_clips 原始素材
CREATE TABLE IF NOT EXISTS video_raw_clips (
  id            TEXT PRIMARY KEY,
  merchant_id   TEXT NOT NULL,
  task_id       TEXT,
  template_id   TEXT,
  scene_index   INTEGER NOT NULL,
  file_key      TEXT NOT NULL UNIQUE,
  file_name     TEXT NOT NULL,
  file_size     INTEGER NOT NULL,
  mime_type     TEXT NOT NULL,
  duration_sec  REAL,
  status        TEXT NOT NULL DEFAULT 'uploaded',
  created_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_raw_clips_merchant ON video_raw_clips(merchant_id);
CREATE INDEX IF NOT EXISTS idx_raw_clips_task ON video_raw_clips(task_id);

-- 3. video_mix_tasks 混剪任务
CREATE TABLE IF NOT EXISTS video_mix_tasks (
  id                    TEXT PRIMARY KEY,
  merchant_id           TEXT NOT NULL,
  template_id           TEXT NOT NULL,
  product_name          TEXT NOT NULL,
  product_features_json TEXT NOT NULL,
  product_promo         TEXT,
  script                TEXT NOT NULL,
  voice_sample_uri      TEXT,
  scene_clips_json      TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending',
  progress              REAL DEFAULT 0,
  result_file_key       TEXT,
  result_video_url      TEXT,
  error_message         TEXT,
  created_at            TEXT DEFAULT (datetime('now')),
  updated_at            TEXT DEFAULT (datetime('now')),
  completed_at          TEXT
);
CREATE INDEX IF NOT EXISTS idx_mix_tasks_merchant ON video_mix_tasks(merchant_id);
CREATE INDEX IF NOT EXISTS idx_mix_tasks_status ON video_mix_tasks(status);

-- 4. video_final_products 成品视频
CREATE TABLE IF NOT EXISTS video_final_products (
  id            TEXT PRIMARY KEY,
  merchant_id   TEXT NOT NULL,
  task_id       TEXT,
  title         TEXT NOT NULL,
  cover_color   TEXT,
  duration      TEXT,
  file_key      TEXT NOT NULL UNIQUE,
  file_size     INTEGER,
  is_public     INTEGER DEFAULT 0,
  view_count    INTEGER DEFAULT 0,
  share_count   INTEGER DEFAULT 0,
  incentive_json TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_final_products_merchant ON video_final_products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_final_products_public ON video_final_products(is_public);

-- 5. video_merchant_profiles 商家配置
CREATE TABLE IF NOT EXISTS video_merchant_profiles (
  merchant_id          TEXT PRIMARY KEY,
  display_name         TEXT NOT NULL,
  industry             TEXT,
  region               TEXT,
  store_address        TEXT,
  contact_phone        TEXT,
  default_template_id  TEXT,
  voice_sample_uri     TEXT,
  preferences_json     TEXT,
  stats_json           TEXT,
  created_at           TEXT DEFAULT (datetime('now')),
  updated_at           TEXT DEFAULT (datetime('now'))
);

-- 6. video_jwt_issuers JWT 信任源
CREATE TABLE IF NOT EXISTS video_jwt_issuers (
  iss         TEXT PRIMARY KEY,
  name        TEXT,
  is_trusted  INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now'))
);
