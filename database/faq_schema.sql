-- ============================================
-- FAQ 常见问题管理系统
-- ============================================

-- 1. FAQ 分类表
CREATE TABLE IF NOT EXISTS faq_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faq_categories_slug ON faq_categories(slug);
CREATE INDEX IF NOT EXISTS idx_faq_categories_is_active ON faq_categories(is_active);

-- 2. FAQ 问题表
CREATE TABLE IF NOT EXISTS faq_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES faq_categories(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    
    -- 来源追踪
    source_type TEXT DEFAULT 'manual' CHECK(source_type IN ('manual', 'auto_collected', 'ai_suggested')),
    source_query TEXT, -- 原始用户查询
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- 统计信息
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    
    -- 状态管理
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'pending_review', 'published', 'archived')),
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- 排序和显示
    priority INTEGER DEFAULT 0, -- 优先级，越高越靠前
    is_featured BOOLEAN DEFAULT FALSE, -- 是否精选
    tags TEXT[], -- 标签数组
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faq_questions_category_id ON faq_questions(category_id);
CREATE INDEX IF NOT EXISTS idx_faq_questions_status ON faq_questions(status);
CREATE INDEX IF NOT EXISTS idx_faq_questions_priority ON faq_questions(priority DESC);
CREATE INDEX IF NOT EXISTS idx_faq_questions_source_type ON faq_questions(source_type);

-- 3. FAQ 反馈表（用户投票）
CREATE TABLE IF NOT EXISTS faq_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES faq_questions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_helpful BOOLEAN NOT NULL,
    feedback_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(question_id, user_id) -- 每个用户对每个问题只能反馈一次
);

CREATE INDEX IF NOT EXISTS idx_faq_feedback_question_id ON faq_feedback(question_id);
CREATE INDEX IF NOT EXISTS idx_faq_feedback_user_id ON faq_feedback(user_id);

-- 4. 用户查询记录表（用于自动发现问题）
CREATE TABLE IF NOT EXISTS user_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    query_text TEXT NOT NULL,
    query_type TEXT DEFAULT 'chat' CHECK(query_type IN ('chat', 'search', 'command')),
    context JSONB, -- 上下文信息（页面、操作等）
    
    -- 处理状态
    is_answered BOOLEAN DEFAULT FALSE,
    matched_faq_id UUID REFERENCES faq_questions(id) ON DELETE SET NULL,
    confidence_score FLOAT, -- 匹配置信度
    
    -- 统计
    occurrence_count INTEGER DEFAULT 1,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_queries_user_id ON user_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_queries_created_at ON user_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_queries_is_answered ON user_queries(is_answered);
CREATE INDEX IF NOT EXISTS idx_user_queries_query_text ON user_queries USING gin(to_tsvector('simple', query_text));

-- 插入默认分类
INSERT INTO faq_categories (name, slug, description, sort_order) VALUES
('入门指南', 'getting-started', '安装、配置和基本使用', 1),
('AI 功能', 'ai-features', 'AI智能体和大模型相关', 2),
('数据管理', 'data-management', '产品、库存、销售数据管理', 3),
('账户与订阅', 'account-subscription', '账户管理和Token订阅', 4),
('故障排除', 'troubleshooting', '常见问题和解决方案', 5),
('开发者', 'developer', 'API、集成和扩展开发', 6)
ON CONFLICT (slug) DO NOTHING;

-- 插入示例FAQ（可选）
INSERT INTO faq_questions (category_id, question, answer, status, priority, is_featured) 
SELECT 
    id,
    'ProClaw 是什么？',
    'ProClaw 是一个开源的进销存管理系统，采用本地优先架构，支持AI智能决策。所有数据默认存储在本地，确保数据安全性和隐私保护。',
    'published',
    10,
    true
FROM faq_categories WHERE slug = 'getting-started'
ON CONFLICT DO NOTHING;

INSERT INTO faq_questions (category_id, question, answer, status, priority, is_featured) 
SELECT 
    id,
    '我的数据安全吗？会上传到云端吗？',
    '非常安全。ProClaw 采用"本地优先"架构，所有业务数据默认加密存储在你本地的 SQLite 数据库中。除非你主动开启云同步功能，否则数据永远不会离开你的设备。',
    'published',
    9,
    true
FROM faq_categories WHERE slug = 'data-management'
ON CONFLICT DO NOTHING;

INSERT INTO faq_questions (category_id, question, answer, status, priority, is_featured) 
SELECT 
    id,
    '使用 ProClaw 需要付费吗？',
    'ProClaw 桌面端应用本身是开源且免费的（GPL-3.0 协议）。但你如果使用 AI 智能体功能，需要自行配置 LLM API Key，这部分费用由模型提供商收取。',
    'published',
    8,
    true
FROM faq_categories WHERE slug = 'account-subscription'
ON CONFLICT DO NOTHING;

-- 创建触发器：自动更新 updated_at
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'faq_categories') THEN
        DROP TRIGGER IF EXISTS update_faq_categories_updated_at ON faq_categories;
        CREATE TRIGGER update_faq_categories_updated_at 
            BEFORE UPDATE ON faq_categories 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'faq_questions') THEN
        DROP TRIGGER IF EXISTS update_faq_questions_updated_at ON faq_questions;
        CREATE TRIGGER update_faq_questions_updated_at 
            BEFORE UPDATE ON faq_questions 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- RLS 策略
ALTER TABLE faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_queries ENABLE ROW LEVEL SECURITY;

-- FAQ 分类：所有人可读，仅管理员可写
CREATE POLICY "Anyone can view active categories"
    ON faq_categories FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage categories"
    ON faq_categories FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- FAQ 问题：已发布的问题所有人可读
CREATE POLICY "Anyone can view published questions"
    ON faq_questions FOR SELECT
    USING (status = 'published');

CREATE POLICY "Admins can manage all questions"
    ON faq_questions FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- 用户可以创建待审核的问题（通过AI自动收集）
CREATE POLICY "Users can create pending questions"
    ON faq_questions FOR INSERT
    WITH CHECK (status = 'pending_review');

-- FAQ 反馈：任何人都可以提交反馈
CREATE POLICY "Anyone can submit feedback"
    ON faq_feedback FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view own feedback"
    ON faq_feedback FOR SELECT
    USING (user_id = auth.uid() OR user_id IS NULL);

-- 用户查询：用户可以查看自己的查询
CREATE POLICY "Users can view own queries"
    ON user_queries FOR SELECT
    USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can create queries"
    ON user_queries FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can view all queries"
    ON user_queries FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');
