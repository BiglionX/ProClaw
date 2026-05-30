-- ============================================================
-- ProClaw 行业插件系统 v2 - 社区生态（Phase 4）
-- ============================================================
-- 说明：在 006_add_plugin_tables.sql 基础上扩展
-- 新增插件社区评价、第三方提交审核等能力
-- ============================================================

-- ============================================
-- 1. plugin_reviews 表 - 插件评价/评分
-- ============================================
CREATE TABLE IF NOT EXISTS plugin_reviews (
    id TEXT PRIMARY KEY,
    plugin_id TEXT NOT NULL REFERENCES industry_plugins(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    content TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plugin_reviews_plugin_id ON plugin_reviews(plugin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_reviews_user_id ON plugin_reviews(user_id);

-- 每个用户对每个插件只能有一条评价（upsert 用）
CREATE UNIQUE INDEX IF NOT EXISTS idx_plugin_reviews_unique
    ON plugin_reviews(plugin_id, user_id);

-- ============================================
-- 2. plugin_categories 表 - 插件分类标签
-- ============================================
CREATE TABLE IF NOT EXISTS plugin_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO plugin_categories (id, name, icon, sort_order) VALUES
    ('retail', '零售行业', '🛍️', 1),
    ('inventory', '进销存管理', '📦', 2),
    ('virtual_company', '虚拟公司', '🏢', 3),
    ('catering', '餐饮行业', '🍽️', 4),
    ('beauty', '美业服务', '💇', 5),
    ('pet', '宠物行业', '🐾', 6),
    ('cloud-proclaw', '云服务', '☁️', 7),
    ('third-party', '第三方插件', '🔌', 99)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. industry_plugins 表扩展字段
-- ============================================
ALTER TABLE industry_plugins ADD COLUMN IF NOT EXISTS developer_name TEXT;
ALTER TABLE industry_plugins ADD COLUMN IF NOT EXISTS developer_website TEXT;
ALTER TABLE industry_plugins ADD COLUMN IF NOT EXISTS developer_email TEXT;
ALTER TABLE industry_plugins ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'builtin'
    CHECK (category IN ('builtin', 'official', 'third-party'));
ALTER TABLE industry_plugins ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE industry_plugins ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;

-- ============================================
-- 4. RLS 策略
-- ============================================
ALTER TABLE plugin_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_categories ENABLE ROW LEVEL SECURITY;

-- 评价：登录用户可查看和写入
CREATE POLICY "Authenticated users can view reviews"
    ON plugin_reviews FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own reviews"
    ON plugin_reviews FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.uid() = user_id
    );

CREATE POLICY "Users can update their own reviews"
    ON plugin_reviews FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 分类：公开可读
CREATE POLICY "Anyone can view categories"
    ON plugin_categories FOR SELECT
    USING (TRUE);

-- ============================================
-- 5. 存储过程：更新插件评价统计
-- ============================================
CREATE OR REPLACE FUNCTION update_plugin_review_stats(p_plugin_id TEXT)
RETURNS TABLE(average_rating NUMERIC, total_reviews INT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROUND(AVG(rating)::numeric, 1),
        COUNT(*)::int
    FROM plugin_reviews
    WHERE plugin_id = p_plugin_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. 存储过程：插件提交审核（第三方开发者用）
-- ============================================
CREATE OR REPLACE FUNCTION submit_third_party_plugin(
    p_id TEXT,
    p_name TEXT,
    p_version TEXT,
    p_manifest_json TEXT,
    p_package_url TEXT,
    p_package_hash TEXT DEFAULT NULL,
    p_developer_name TEXT DEFAULT NULL,
    p_developer_email TEXT DEFAULT NULL,
    p_icon TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    v_plugin_id TEXT;
BEGIN
    -- 插入插件记录（状态为 draft）
    INSERT INTO industry_plugins (
        id, name, version, status, manifest_json,
        package_url, package_hash, icon, description,
        developer_name, developer_email, category
    ) VALUES (
        p_id, p_name, p_version, 'draft', p_manifest_json,
        p_package_url, p_package_hash, p_icon, p_description,
        p_developer_name, p_developer_email, 'third-party'
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        version = EXCLUDED.version,
        manifest_json = EXCLUDED.manifest_json,
        package_url = EXCLUDED.package_url,
        package_hash = EXCLUDED.package_hash,
        icon = EXCLUDED.icon,
        description = EXCLUDED.description,
        developer_name = EXCLUDED.developer_name,
        developer_email = EXCLUDED.developer_email,
        updated_at = NOW()
    RETURNING id INTO v_plugin_id;

    RETURN v_plugin_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. 触发器：自动更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_plugin_reviews_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plugin_reviews_updated_at ON plugin_reviews;
CREATE TRIGGER trg_plugin_reviews_updated_at
    BEFORE UPDATE ON plugin_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_plugin_reviews_timestamp();
