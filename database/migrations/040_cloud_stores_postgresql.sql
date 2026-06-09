-- Cloud Store Tables for Supabase (PostgreSQL)
-- Converted from SQLite to PostgreSQL syntax

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Cloud Stores Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.cloud_stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    custom_domain TEXT,
    api_key TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('inactive', 'active', 'expired', 'suspended')),
    plan_type TEXT DEFAULT 'free' CHECK(plan_type IN ('free', 'basic', 'professional', 'enterprise')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cloud_stores_user ON public.cloud_stores(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_stores_subdomain ON public.cloud_stores(subdomain);

-- ============================================
-- 2. Cloud Store Themes Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.cloud_store_themes (
    store_id UUID PRIMARY KEY REFERENCES public.cloud_stores(id) ON DELETE CASCADE,
    primary_color TEXT DEFAULT '#1890ff',
    secondary_color TEXT DEFAULT '#f5f5f5',
    layout_style TEXT DEFAULT 'card' CHECK(layout_style IN ('card', 'list')),
    font_family TEXT DEFAULT 'PingFang SC, Microsoft YaHei, sans-serif',
    logo_url TEXT,
    banner_images TEXT DEFAULT '[]',
    theme_data TEXT DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. Cloud Sync Log Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.cloud_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.cloud_stores(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL CHECK(sync_type IN ('full', 'incremental')),
    status TEXT NOT NULL CHECK(status IN ('pending', 'syncing', 'success', 'failed')),
    message TEXT,
    items_synced INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cloud_sync_log_store ON public.cloud_sync_log(store_id);
CREATE INDEX IF NOT EXISTS idx_cloud_sync_log_created ON public.cloud_sync_log(created_at DESC);

-- ============================================
-- 4. Cloud Orders Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.cloud_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.cloud_stores(id) ON DELETE CASCADE,
    order_no TEXT UNIQUE NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
    payment_method TEXT CHECK(payment_method IN ('wechat', 'alipay')),
    items TEXT NOT NULL DEFAULT '[]',
    callback_status TEXT DEFAULT 'pending' CHECK(callback_status IN ('pending', 'success', 'failed')),
    callback_message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cloud_orders_store ON public.cloud_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_cloud_orders_status ON public.cloud_orders(status);
CREATE INDEX IF NOT EXISTS idx_cloud_orders_created ON public.cloud_orders(created_at DESC);

-- ============================================
-- 5. Cloud Products (Sync Reference)
-- ============================================
CREATE TABLE IF NOT EXISTS public.cloud_product_sync (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.cloud_stores(id) ON DELETE CASCADE,
    local_spu_id TEXT NOT NULL,
    cloud_product_id TEXT,
    name TEXT NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    stock INTEGER DEFAULT 0,
    images TEXT DEFAULT '[]',
    category TEXT,
    is_on_sale BOOLEAN DEFAULT true,
    sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'syncing', 'success', 'failed')),
    sync_version INTEGER DEFAULT 1,
    cloud_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_id, local_spu_id)
);

CREATE INDEX IF NOT EXISTS idx_cloud_product_sync_store ON public.cloud_product_sync(store_id);
CREATE INDEX IF NOT EXISTS idx_cloud_product_sync_status ON public.cloud_product_sync(sync_status);

-- ============================================
-- 6. Enable RLS
-- ============================================
ALTER TABLE public.cloud_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_store_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_product_sync ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own store data
CREATE POLICY "Users can manage their own cloud stores"
    ON public.cloud_stores FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own store theme"
    ON public.cloud_store_themes FOR ALL
    USING (store_id IN (SELECT id FROM public.cloud_stores WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own sync logs"
    ON public.cloud_sync_log FOR SELECT
    USING (store_id IN (SELECT id FROM public.cloud_stores WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their own orders"
    ON public.cloud_orders FOR ALL
    USING (store_id IN (SELECT id FROM public.cloud_stores WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their own product sync"
    ON public.cloud_product_sync FOR ALL
    USING (store_id IN (SELECT id FROM public.cloud_stores WHERE user_id = auth.uid()));

-- ============================================
-- 7. Insert demo store data for testing
-- ============================================
-- Note: user_id should match the test account's profile id
-- This will be updated when we identify the test account's UUID
