-- ============================================================
-- 美业行业插件数据库迁移
-- 需求文档：行业插件功能实现（餐饮 / 美业 / 宠物 / Cloud）
-- 
-- 新增表：
--   beauty_appointments          - 预约管理
--   beauty_employee_schedules    - 员工排班
--   beauty_employees             - 员工档案
--   beauty_commission_rules      - 提成规则
--   beauty_services              - 服务项目
--   beauty_service_categories    - 服务分类
-- ============================================================

-- 预约管理
CREATE TABLE IF NOT EXISTS beauty_appointments (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    service_ids JSONB,
    employee_id TEXT,
    start_at TEXT,
    duration INT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','checked_in','in_progress','completed','cancelled','no_show')),
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 员工排班
CREATE TABLE IF NOT EXISTS beauty_employee_schedules (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    date TEXT,
    time_slots JSONB,
    is_available BOOLEAN DEFAULT true,
    created_at TEXT
);

-- 员工档案
CREATE TABLE IF NOT EXISTS beauty_employees (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    hire_date TEXT,
    service_ids JSONB,
    commission_rate REAL,
    is_active BOOLEAN DEFAULT true,
    created_at TEXT
);

-- 提成规则
CREATE TABLE IF NOT EXISTS beauty_commission_rules (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    service_id TEXT,
    rate_type TEXT DEFAULT 'percentage' CHECK(rate_type IN ('percentage','fixed')),
    rate_value REAL,
    created_at TEXT
);

-- 服务项目
CREATE TABLE IF NOT EXISTS beauty_services (
    id TEXT PRIMARY KEY,
    category_id TEXT,
    name TEXT,
    duration INT,
    price REAL,
    member_price REAL,
    new_customer_price REAL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INT
);

-- 服务分类
CREATE TABLE IF NOT EXISTS beauty_service_categories (
    id TEXT PRIMARY KEY,
    name TEXT,
    icon TEXT,
    sort_order INT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_beauty_appointments_employee_id ON beauty_appointments(employee_id);
CREATE INDEX IF NOT EXISTS idx_beauty_appointments_status ON beauty_appointments(status);
CREATE INDEX IF NOT EXISTS idx_beauty_appointments_start_at ON beauty_appointments(start_at);
CREATE INDEX IF NOT EXISTS idx_beauty_employee_schedules_employee_id ON beauty_employee_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_beauty_employees_is_active ON beauty_employees(is_active);
CREATE INDEX IF NOT EXISTS idx_beauty_commission_rules_employee_id ON beauty_commission_rules(employee_id);
CREATE INDEX IF NOT EXISTS idx_beauty_services_category_id ON beauty_services(category_id);
