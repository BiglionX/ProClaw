-- ProClaw AI 客服模块 - 数据库迁移
-- 为云商城创建独立的 AI 客服相关表（公共 schema）
-- 依赖: pgvector 扩展（用于向量相似度检索）

-- 启用 pgvector 扩展
create extension if not exists vector;

-- ============================================================================
-- 1. 客服聊天记录表
-- 存储所有客户与 AI 客服的对话记录
-- ============================================================================
create table if not exists public.customer_service_chat_logs (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid not null,                -- 商户租户 ID
  session_id text not null,               -- 会话 ID（同一客户连续对话）
  customer_id text,                        -- 客户标识（访客 localStorage UUID 或登录客户 ID）
  customer_name text,                      -- 客户昵称
  question text not null,                  -- 客户问题
  answer text not null,                    -- AI 回答
  answer_source text check (answer_source in ('knowledge_base', 'model', 'manual')),  -- 回答来源
  is_transferred boolean default false,    -- 是否已转人工
  transferred_to text,                     -- 转人工目标（如: 'boss', 'operator'）
  is_resolved boolean default true,        -- 是否已解决
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 索引：按租户查询会话、按时间排序、筛选待处理
create index if not exists idx_cs_chat_logs_tenant_session
  on public.customer_service_chat_logs (tenant_id, session_id);
create index if not exists idx_cs_chat_logs_tenant_created
  on public.customer_service_chat_logs (tenant_id, created_at desc);
create index if not exists idx_cs_chat_logs_tenant_transferred
  on public.customer_service_chat_logs (tenant_id, is_transferred);
create index if not exists idx_cs_chat_logs_tenant_customer
  on public.customer_service_chat_logs (tenant_id, customer_id);

-- ============================================================================
-- 2. 转人工队列表
-- 存储客户转人工请求队列
-- ============================================================================
create table if not exists public.customer_service_transfer_queue (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid not null,
  session_id text not null,
  customer_id text,
  customer_name text,
  question text not null,                  -- 客户原始问题
  transfer_reason text,                    -- 转人工原因
  transfer_mode text check (transfer_mode in ('direct', 'ai_judged')),
  status text default 'pending' check (status in ('pending', 'answered', 'closed')),
  answer text,                             -- 商户（老板/运营）的回复
  saved_to_kb boolean default false,       -- 是否已保存到问答库
  created_at timestamptz default now(),
  answered_at timestamptz,
  answered_by uuid                         -- 回复人（商户用户 ID）
);

-- 索引：租户维度的队列查询
create index if not exists idx_cs_transfer_queue_tenant_status
  on public.customer_service_transfer_queue (tenant_id, status);
create index if not exists idx_cs_transfer_queue_tenant_created
  on public.customer_service_transfer_queue (tenant_id, created_at desc);

-- ============================================================================
-- 3. 客服问答库表
-- 商户可维护的问答知识库（支持向量检索）
-- ============================================================================
create table if not exists public.customer_service_knowledge_base (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid not null,
  question text not null,
  answer text not null,
  category text default 'general' check (category in ('general', 'product', 'order', 'shipping', 'return', 'other')),
  keywords text[],                         -- 关键词数组（用于精确匹配）
  embedding vector(1536),                  -- 文本向量（用于相似度匹配）
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 索引
create index if not exists idx_cs_kb_tenant
  on public.customer_service_knowledge_base (tenant_id);
create index if not exists idx_cs_kb_tenant_category
  on public.customer_service_knowledge_base (tenant_id, category);
create index if not exists idx_cs_kb_tenant_active
  on public.customer_service_knowledge_base (tenant_id, is_active);
-- 向量索引（使用 ivfflat，适用于中小规模数据）
create index if not exists idx_cs_kb_embedding
  on public.customer_service_knowledge_base
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ============================================================================
-- 4. 客服设置表
-- 每个租户的客服配置
-- ============================================================================
create table if not exists public.customer_service_settings (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid unique not null,
  is_enabled boolean default true,
  auto_greeting text default '您好，我是客服小如，请问有什么可以帮您？',
  transfer_mode text default 'direct' check (transfer_mode in ('direct', 'ai_judged')),
  avatar_url text,                         -- 客服头像 URL（默认使用秘书头像样式）
  agent_name text default '智能客服',
  business_hours jsonb,                    -- 营业时间配置（可选）
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_cs_settings_tenant
  on public.customer_service_settings (tenant_id);

-- ============================================================================
-- 5. 客服默认头像表
-- 预置的头像选项
-- ============================================================================
create table if not exists public.customer_service_default_avatars (
  id uuid default gen_random_uuid() primary key,
  avatar_key text unique not null,
  avatar_url text not null,
  label text default '',
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- ============================================================================
-- 6. 客服商家订阅表
-- 用于 WebSocket 实时推送转人工通知到桌面端
-- ============================================================================
create table if not exists public.customer_service_subscribers (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid not null,
  user_id uuid not null,                   -- 商户端用户（老板/运营）
  is_online boolean default false,
  last_seen_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (tenant_id, user_id)
);

create index if not exists idx_cs_subscribers_tenant
  on public.customer_service_subscribers (tenant_id);

-- ============================================================================
-- 7. RLS 安全策略
-- 公共表基础 RLS，按 tenant_id 隔离
-- ============================================================================
alter table public.customer_service_chat_logs enable row level security;
alter table public.customer_service_transfer_queue enable row level security;
alter table public.customer_service_knowledge_base enable row level security;
alter table public.customer_service_settings enable row level security;
alter table public.customer_service_default_avatars enable row level security;
alter table public.customer_service_subscribers enable row level security;

-- 客服聊天记录：商户只读自己的租户数据
create policy "商户可查看自己租户的聊天记录"
  on public.customer_service_chat_logs for select
  using (tenant_id = auth.uid());

-- 转人工队列：商户可管理自己的队列
create policy "商户可管理自己租户的转人工队列"
  on public.customer_service_transfer_queue for all
  using (tenant_id = auth.uid());

-- 问答库：商户可管理自己的问答
create policy "商户可管理自己租户的问答库"
  on public.customer_service_knowledge_base for all
  using (tenant_id = auth.uid());

-- 客服设置：商户可管理自己的设置
create policy "商户可管理自己租户的客服设置"
  on public.customer_service_settings for all
  using (tenant_id = auth.uid());

-- 默认头像：所有认证用户可读
create policy "认证用户可查看默认头像"
  on public.customer_service_default_avatars for select
  using (auth.role() = 'authenticated');

-- 订阅：商户可管理自己的订阅
create policy "商户可管理自己租户的订阅"
  on public.customer_service_subscribers for all
  using (tenant_id = auth.uid());
