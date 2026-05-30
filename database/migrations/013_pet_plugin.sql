-- ============================================================
-- 宠物行业插件数据库迁移
-- 需求文档：行业插件功能实现（餐饮 / 美业 / 宠物 / Cloud）
-- 
-- 新增表：
--   pet_profiles             - 宠物档案
--   pet_vaccine_records      - 疫苗记录
--   pet_health_logs          - 健康日志
--   pet_boarding_records     - 寄养记录
--   pet_boarding_rooms       - 寄养房间
--   pet_boarding_daily_logs  - 寄养日常记录
--   pet_grooming_records     - 洗护服务记录
-- ============================================================

-- 宠物档案
CREATE TABLE IF NOT EXISTS pet_profiles (
    id TEXT PRIMARY KEY,
    owner_id TEXT,
    name TEXT,
    species TEXT,
    breed TEXT,
    gender TEXT,
    birth_date TEXT,
    weight REAL,
    color TEXT,
    chip_no TEXT,
    is_neutered BOOLEAN,
    photo_url TEXT,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 疫苗记录
CREATE TABLE IF NOT EXISTS pet_vaccine_records (
    id TEXT PRIMARY KEY,
    pet_id TEXT,
    vaccine_type TEXT,
    administered_at TEXT,
    next_due_at TEXT,
    vet_name TEXT,
    notes TEXT,
    created_at TEXT
);

-- 健康日志
CREATE TABLE IF NOT EXISTS pet_health_logs (
    id TEXT PRIMARY KEY,
    pet_id TEXT,
    log_type TEXT,
    description TEXT,
    created_at TEXT
);

-- 寄养记录
CREATE TABLE IF NOT EXISTS pet_boarding_records (
    id TEXT PRIMARY KEY,
    pet_id TEXT,
    room_id TEXT,
    check_in_at TEXT,
    check_out_at TEXT,
    daily_rate REAL,
    total_amount REAL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','checked_out','cancelled')),
    notes TEXT,
    created_at TEXT
);

-- 寄养房间
CREATE TABLE IF NOT EXISTS pet_boarding_rooms (
    id TEXT PRIMARY KEY,
    name TEXT,
    room_type TEXT,
    capacity INT,
    daily_rate REAL,
    status TEXT DEFAULT 'vacant' CHECK(status IN ('vacant','occupied','cleaning','maintenance'))
);

-- 寄养日常记录
CREATE TABLE IF NOT EXISTS pet_boarding_daily_logs (
    id TEXT PRIMARY KEY,
    boarding_id TEXT,
    log_date TEXT,
    log_type TEXT,
    content TEXT,
    staff_name TEXT,
    created_at TEXT
);

-- 洗护服务记录
CREATE TABLE IF NOT EXISTS pet_grooming_records (
    id TEXT PRIMARY KEY,
    pet_id TEXT,
    service_items JSONB,
    employee_id TEXT,
    scheduled_at TEXT,
    completed_at TEXT,
    amount REAL,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    created_at TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_pet_profiles_owner_id ON pet_profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_pet_vaccine_records_pet_id ON pet_vaccine_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_vaccine_records_next_due ON pet_vaccine_records(next_due_at);
CREATE INDEX IF NOT EXISTS idx_pet_health_logs_pet_id ON pet_health_logs(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_boarding_records_pet_id ON pet_boarding_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_boarding_records_status ON pet_boarding_records(status);
CREATE INDEX IF NOT EXISTS idx_pet_boarding_rooms_status ON pet_boarding_rooms(status);
CREATE INDEX IF NOT EXISTS idx_pet_boarding_daily_logs_boarding_id ON pet_boarding_daily_logs(boarding_id);
CREATE INDEX IF NOT EXISTS idx_pet_grooming_records_pet_id ON pet_grooming_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_grooming_records_status ON pet_grooming_records(status);
