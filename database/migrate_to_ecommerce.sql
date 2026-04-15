-- ProClaw 电商商品库迁移脚本
-- Version: 3.0.0
-- Created: 2026-04-15
-- Description: 将产品库升级为标准电商SPU-SKU结构

-- ============================================
-- 第一步: 备份并删除旧表
-- ============================================

-- 注意: 此操作不可逆,请确保已备份重要数据
DROP TABLE IF EXISTS products CASCADE;
DROP INDEX IF EXISTS idx_products_sku;
DROP INDEX IF EXISTS idx_products_category;
DROP INDEX IF EXISTS idx_products_brand;
DROP INDEX IF EXISTS idx_products_sync_status;

-- ============================================
-- 第二步: 创建新的电商商品表结构
-- ============================================

-- 1. 商品 SPU 表 (标准产品单位)
CREATE TABLE IF NOT EXISTS product_spu (
    id TEXT PRIMARY KEY,
    spu_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    category_id TEXT REFERENCES product_categories(id),
    brand_id TEXT REFERENCES brands(id),
    unit TEXT DEFAULT '件',
    weight DECIMAL(10, 3),
    length DECIMAL(10, 2),
    width DECIMAL(10, 2),
    height DECIMAL(10, 2),
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords TEXT,
    is_on_sale BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'on_sale', 'off_sale', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

DROP INDEX IF EXISTS idx_spu_code;
DROP INDEX IF EXISTS idx_spu_category;
DROP INDEX IF EXISTS idx_spu_brand;
DROP INDEX IF EXISTS idx_spu_status;
CREATE INDEX idx_spu_code ON product_spu(spu_code);
CREATE INDEX idx_spu_category ON product_spu(category_id);
CREATE INDEX idx_spu_brand ON product_spu(brand_id);
CREATE INDEX idx_spu_status ON product_spu(status);

-- 2. 商品 SKU 表 (库存量单位)
CREATE TABLE IF NOT EXISTS product_sku (
    id TEXT PRIMARY KEY,
    spu_id TEXT NOT NULL REFERENCES product_spu(id) ON DELETE CASCADE,
    sku_code TEXT UNIQUE NOT NULL,
    specifications JSONB,
    spec_text TEXT,
    cost_price DECIMAL(10, 2) DEFAULT 0,
    sell_price DECIMAL(10, 2) DEFAULT 0,
    market_price DECIMAL(10, 2),
    current_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    max_stock INTEGER DEFAULT 999999,
    barcode TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sku_spu ON product_sku(spu_id);
CREATE INDEX IF NOT EXISTS idx_sku_code ON product_sku(sku_code);

-- 3. 商品图片表
CREATE TABLE IF NOT EXISTS product_images (
    id TEXT PRIMARY KEY,
    spu_id TEXT NOT NULL REFERENCES product_spu(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_type TEXT DEFAULT 'main' CHECK(image_type IN ('main', 'gallery')),
    sort_order INTEGER DEFAULT 0,
    alt_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_images_spu ON product_images(spu_id);

-- 4. 商品属性定义表
CREATE TABLE IF NOT EXISTS product_attributes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'select' CHECK(type IN ('text', 'select', 'number', 'boolean')),
    options TEXT[],
    is_required BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. SPU属性值关联表
CREATE TABLE IF NOT EXISTS product_spu_attributes (
    id TEXT PRIMARY KEY,
    spu_id TEXT NOT NULL REFERENCES product_spu(id) ON DELETE CASCADE,
    attribute_id TEXT NOT NULL REFERENCES product_attributes(id),
    value_text TEXT,
    value_number DECIMAL(10, 2),
    value_boolean BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(spu_id, attribute_id)
);

CREATE INDEX IF NOT EXISTS idx_spu_attr_spu ON product_spu_attributes(spu_id);
CREATE INDEX IF NOT EXISTS idx_spu_attr_attribute ON product_spu_attributes(attribute_id);

-- ============================================
-- 第三步: 更新外键引用
-- ============================================

-- 更新库存交易表的外键引用
ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_product_id_fkey;
ALTER TABLE inventory_transactions ADD CONSTRAINT inventory_transactions_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES product_sku(id);

-- 更新采购订单明细表的外键引用
ALTER TABLE purchase_order_items DROP CONSTRAINT IF EXISTS purchase_order_items_product_id_fkey;
ALTER TABLE purchase_order_items ADD CONSTRAINT purchase_order_items_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES product_sku(id);

-- 更新销售订单明细表的外键引用
ALTER TABLE sales_order_items DROP CONSTRAINT IF EXISTS sales_order_items_product_id_fkey;
ALTER TABLE sales_order_items ADD CONSTRAINT sales_order_items_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES product_sku(id);

-- ============================================
-- 第四步: 启用RLS策略
-- ============================================

ALTER TABLE product_spu ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sku ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_spu_attributes ENABLE ROW LEVEL SECURITY;

-- 删除旧策略(保证幂等性)
DROP POLICY IF EXISTS "Authenticated users can access product spu" ON product_spu;
DROP POLICY IF EXISTS "Authenticated users can access product sku" ON product_sku;
DROP POLICY IF EXISTS "Authenticated users can access product images" ON product_images;
DROP POLICY IF EXISTS "Authenticated users can access product attributes" ON product_attributes;
DROP POLICY IF EXISTS "Authenticated users can access spu attributes" ON product_spu_attributes;

-- 创建新策略
CREATE POLICY "Authenticated users can access product spu"
    ON product_spu FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can access product sku"
    ON product_sku FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can access product images"
    ON product_images FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can access product attributes"
    ON product_attributes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can access spu attributes"
    ON product_spu_attributes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- 第五步: 插入示例数据
-- ============================================

-- 1. 插入示例商品属性
INSERT INTO product_attributes (id, name, type, options, is_required, sort_order) VALUES
('attr_color', '颜色', 'select', ARRAY['红色', '蓝色', '绿色', '黑色', '白色'], false, 1),
('attr_size', '尺寸', 'select', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], false, 2),
('attr_material', '材质', 'select', ARRAY['棉', '涤纶', '丝绸', '皮革', '金属'], false, 3),
('attr_weight', '重量', 'number', NULL, false, 4),
('attr_warranty', '保修期', 'text', NULL, false, 5)
ON CONFLICT (id) DO NOTHING;

-- 2. 插入示例SPU商品 - iPhone 15 Pro
INSERT INTO product_spu (id, spu_code, name, subtitle, description, category_id, brand_id, unit, weight, is_on_sale, is_featured, status) VALUES
('spu_iphone15pro', 'SPU-IPHONE15PRO', 'iPhone 15 Pro', '钛金属设计,A17 Pro芯片', '全新iPhone 15 Pro,采用航空级钛金属设计,搭载强大的A17 Pro芯片,专业级摄像头系统。', NULL, NULL, '台', 0.187, true, true, 'on_sale')
ON CONFLICT (id) DO NOTHING;

-- 插入iPhone 15 Pro的SKU
INSERT INTO product_sku (id, spu_id, sku_code, specifications, spec_text, cost_price, sell_price, market_price, current_stock, min_stock, barcode, is_default) VALUES
('sku_iphone15pro_128_black', 'spu_iphone15pro', 'SKU-IPHONE15PRO-128-BLK', '{"颜色": "黑色", "容量": "128GB"}', '黑色/128GB', 6500.00, 7999.00, 8999.00, 50, 10, 'IP15P128BLK', true),
('sku_iphone15pro_256_black', 'spu_iphone15pro', 'SKU-IPHONE15PRO-256-BLK', '{"颜色": "黑色", "容量": "256GB"}', '黑色/256GB', 7200.00, 8999.00, 9999.00, 40, 10, 'IP15P256BLK', false),
('sku_iphone15pro_128_blue', 'spu_iphone15pro', 'SKU-IPHONE15PRO-128-BLU', '{"颜色": "蓝色", "容量": "128GB"}', '蓝色/128GB', 6500.00, 7999.00, 8999.00, 35, 10, 'IP15P128BLU', false),
('sku_iphone15pro_256_blue', 'spu_iphone15pro', 'SKU-IPHONE15PRO-256-BLU', '{"颜色": "蓝色", "容量": "256GB"}', '蓝色/256GB', 7200.00, 8999.00, 9999.00, 30, 10, 'IP15P256BLU', false)
ON CONFLICT (id) DO NOTHING;

-- 3. 插入示例SPU商品 - Nike Air Max运动鞋
INSERT INTO product_spu (id, spu_code, name, subtitle, description, category_id, brand_id, unit, weight, is_on_sale, is_featured, status) VALUES
('spu_nike_airmax', 'SPU-NIKE-AIRMAX', 'Nike Air Max 270', '气垫缓震,舒适透气', '经典Air Max系列,采用Max Air气垫单元,提供卓越的缓震效果和全天候舒适感。', NULL, NULL, '双', 0.35, true, false, 'on_sale')
ON CONFLICT (id) DO NOTHING;

-- 插入Nike Air Max的SKU
INSERT INTO product_sku (id, spu_id, sku_code, specifications, spec_text, cost_price, sell_price, market_price, current_stock, min_stock, barcode, is_default) VALUES
('sku_nike_airmax_40_black', 'spu_nike_airmax', 'SKU-NIKE-AM270-40-BLK', '{"颜色": "黑色", "尺码": "40"}', '黑色/40码', 450.00, 899.00, 1099.00, 20, 5, 'NIKEAM40BLK', true),
('sku_nike_airmax_41_black', 'spu_nike_airmax', 'SKU-NIKE-AM270-41-BLK', '{"颜色": "黑色", "尺码": "41"}', '黑色/41码', 450.00, 899.00, 1099.00, 25, 5, 'NIKEAM41BLK', false),
('sku_nike_airmax_42_black', 'spu_nike_airmax', 'SKU-NIKE-AM270-42-BLK', '{"颜色": "黑色", "尺码": "42"}', '黑色/42码', 450.00, 899.00, 1099.00, 30, 5, 'NIKEAM42BLK', false),
('sku_nike_airmax_40_white', 'spu_nike_airmax', 'SKU-NIKE-AM270-40-WHT', '{"颜色": "白色", "尺码": "40"}', '白色/40码', 450.00, 899.00, 1099.00, 15, 5, 'NIKEAM40WHT', false)
ON CONFLICT (id) DO NOTHING;

-- 4. 插入示例SPU商品 - 机械键盘
INSERT INTO product_spu (id, spu_code, name, subtitle, description, category_id, brand_id, unit, weight, is_on_sale, is_featured, status) VALUES
('spu_mech_keyboard', 'SPU-MECH-KB-001', 'Cherry MX机械键盘', '德国Cherry轴体,RGB背光', '专业级机械键盘,采用德国原装Cherry MX轴体,支持RGB背光定制,适合游戏和办公。', NULL, NULL, '把', 1.2, true, true, 'on_sale')
ON CONFLICT (id) DO NOTHING;

-- 插入机械键盘的SKU
INSERT INTO product_sku (id, spu_id, sku_code, specifications, spec_text, cost_price, sell_price, market_price, current_stock, min_stock, barcode, is_default) VALUES
('sku_keyboard_red', 'spu_mech_keyboard', 'SKU-KB-MX-RED', '{"轴体": "红轴", "布局": "87键"}', '红轴/87键', 350.00, 599.00, 699.00, 40, 10, 'KBMXRED87', true),
('sku_keyboard_blue', 'spu_mech_keyboard', 'SKU-KB-MX-BLUE', '{"轴体": "青轴", "布局": "87键"}', '青轴/87键', 350.00, 599.00, 699.00, 35, 10, 'KBMXBLUE87', false),
('sku_keyboard_brown', 'spu_mech_keyboard', 'SKU-KB-MX-BROWN', '{"轴体": "茶轴", "布局": "104键"}', '茶轴/104键', 380.00, 649.00, 749.00, 30, 10, 'KBMXBR104', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'ProClaw ecommerce product migration completed successfully!';
    RAISE NOTICE 'Created % SPU products with multiple SKUs', (SELECT COUNT(*) FROM product_spu);
    RAISE NOTICE 'Created % total SKUs', (SELECT COUNT(*) FROM product_sku);
    RAISE NOTICE 'Created % product attributes', (SELECT COUNT(*) FROM product_attributes);
END $$;
