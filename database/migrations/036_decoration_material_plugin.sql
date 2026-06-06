-- ============================================================
-- 装修材料行业插件数据库迁移
-- 需求文档：行业插件补充——八大行业插件发布至插件商店
-- 
-- 新增表：
--   dm_projects                  - 项目定义
--   dm_material_bom_templates    - 材料清单模板
--   dm_project_material_outs     - 项目材料出库
-- ============================================================

-- 项目定义
CREATE TABLE IF NOT EXISTS dm_projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    customer_id TEXT,
    address TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','paused')),
    budget REAL,
    start_date TEXT,
    end_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 材料清单模板（如"卫生间装修材料清单"）
CREATE TABLE IF NOT EXISTS dm_material_bom_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    room_type TEXT,
    items JSONB NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 项目材料出库（关联项目、商品、批次、色号）
CREATE TABLE IF NOT EXISTS dm_project_material_outs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity REAL,
    batch_no TEXT,
    color_no TEXT,
    signed_by TEXT,
    signed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_dm_projects_customer ON dm_projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_dm_projects_status ON dm_projects(status);
CREATE INDEX IF NOT EXISTS idx_dm_project_material_outs_project ON dm_project_material_outs(project_id);
CREATE INDEX IF NOT EXISTS idx_dm_project_material_outs_product ON dm_project_material_outs(product_id);
