-- ============================================
-- ProClaw 测试数据：iPhone 电池商品
-- 描述：批量插入 20 个 iPhone 适配电池商品
-- 用于云商城功能测试
-- ============================================

-- 开始事务
BEGIN TRANSACTION;

-- ============================================
-- 1. 确保存在 iPhone 电池相关分类
-- ============================================
INSERT OR IGNORE INTO product_categories (id, name, parent_id, level, sort_order, is_active, created_at, updated_at)
VALUES 
    ('cat_iphone15', 'iPhone 15 系列', NULL, 1, 10, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat_iphone14', 'iPhone 14 系列', NULL, 1, 20, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat_iphone13', 'iPhone 13 系列', NULL, 1, 30, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat_iphone12', 'iPhone 12 系列', NULL, 1, 40, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat_iphone11', 'iPhone 11 系列', NULL, 1, 50, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat_iphonese', 'iPhone SE 系列', NULL, 1, 60, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ============================================
-- 2. 确保存在品牌（Apple）
-- ============================================
INSERT OR IGNORE INTO brands (id, name, is_active, created_at, updated_at)
VALUES ('brand_apple', 'Apple', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ============================================
-- 3. 批量插入 20 个 iPhone 电池 SPU
-- ============================================

-- iPhone 15 系列 (4个)
INSERT OR IGNORE INTO product_spus (id, spu_code, name, description, category_id, brand_id, unit, is_on_sale, status, metadata, created_at, updated_at, sync_status)
VALUES
    ('spu_iphone15pm_bat', 'SPU-2026-001', 'iPhone 15 Pro Max 电池', '高品质替换电池，容量≥100%，内置多重安全保护，兼容所有 iPhone 15 Pro Max 型号', 'cat_iphone15', 'brand_apple', '块', 1, 'on_sale', '{"capacity": "4422mAh", "voltage": "3.85V", "warranty": "12个月"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    
    ('spu_iphone15pro_bat', 'SPU-2026-002', 'iPhone 15 Pro 电池', '原厂品质替换电池，容量≥100%，过充过放保护，兼容 iPhone 15 Pro 全系列', 'cat_iphone15', 'brand_apple', '块', 1, 'on_sale', '{"capacity": "3274mAh", "voltage": "3.85V", "warranty": "12个月"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    
    ('spu_iphone15_bat', 'SPU-2026-003', 'iPhone 15 电池', '高容量替换电池，A级电芯，容量≥100%，安全认证，适用于 iPhone 15', 'cat_iphone15', 'brand_apple', '块', 1, 'on_sale', '{"capacity": "3349mAh", "voltage": "3.85V", "warranty": "12个月"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    
    ('spu_iphone15plus_bat', 'SPU-2026-004', 'iPhone 15 Plus 电池', '大容量电池替换件，容量≥100%，智能芯片，兼容 iPhone 15 Plus', 'cat_iphone15', 'brand_apple', '块', 1, 'on_sale', '{"capacity": "4383mAh", "voltage": "3.85V", "warranty": "12个月"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),

-- iPhone 14 系列 (4个)
    ('spu_iphone14pm_bat', 'SPU-2026-005', 'iPhone 14 Pro Max 电池', '高品质替换电池，容量≥100%，防爆设计，适用于 iPhone 14 Pro Max', 'cat_iphone14', 'brand_apple', '块', 1, 'on_sale', '{"capacity": "4323mAh", "voltage": "3.85V", "warranty": "12个月"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    
    ('spu_iphone14pro_bat', 'SPU-2026-006', 'iPhone 14 Pro 电池', '原装品质电池，容量≥100%，温度保护，兼容 iPhone 14 Pro', 'cat_iphone14', 'brand_apple', '块', 1, 'on_sale', '{"capacity": "3200mAh", "voltage": "3.85V", "warranty": "12个月"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    
    ('spu_iphone14_bat', 'SPU-2026-007', 'iPhone 14 电池', 'A+级电芯电池，容量≥100%，过流保护，适用于 iPhone 14', 'cat_iphone14', 'brand_apple', '块', 1, 'on_sale', '{"capacity": "3279mAh", "voltage": "3.85V", "warranty": "12个月"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    
    ('spu_iphone14plus_bat', 'SPU-2026-008', 'iPhone 14 Plus 电池', '大容量替换电池，容量≥100%，智能IC，兼容 iPhone 14 Plus', 'cat_iphone14', 'brand_apple', '块', 1, 'on_sale', '{"capacity": "4325mAh", "voltage": "3.85V", "warranty": "12个月"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),

-- iPhone 13 系列 (4个)
    ('spu_iphone13pm_bat', 'SPU-2026-009', 'iPhone 13 Pro Max 电池', '高容量电池替换件，容量≥100%，多层保护，适用于 iPhone 13 Pro Max', 'cat_iphone13', 'brand_apple', '块', 1, 'on_sale', '{"capacity": "4352mAh", "voltage": "3.85V", "warranty": "12个月"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    
    ('spu_iphone13pro_bat', 'SPU-2026-010', 'iPhone 13 Pro 电池', '优质替换电池，容量≥100%，防爆阀设计，兼容 iPhone 13 Pro', 'cat_iphone13', 'brand_apple', '块', 1, 'on_sale', '{"capacity": "3095mAh", "voltage": "3.85V", "warranty": "12个月"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    
    ('spu_iphone13_bat', 'SPU-2026-011', 'iPhone 13 电池', '原厂标准电池，容量≥100%，安全芯片，适用于 iPhone 13', 'cat_iphone13', 'brand_apple', '块', 1, 'on_sale', '{"capacity": "3227mAh", "voltage": "3.85V", "warranty": "12个月"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    
    ('spu_iphone13mini_bat', 'SPU-2026-012', 'iPhone 13 mini 电池', '紧凑型高容量电池，容量≥100%，过充保护，兼容 iPhone 13 mini', 'cat_iphone13', 'brand_apple', '块', 1, 'on_sale', '{"capacity": "2406mAh", "voltage": "3.85V", "warranty": "12个月"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),

-- iPhone 12 系列 (4个)
    ('spu_iphone12pm_bat', 'SPU-2026-013', 'iPhone 12 Pro Max 电池', '高品质替换电池，容量≥100%，智能保护电路，适用于 iPhone 12 Pro Max', 'cat_iphone12', 'brand_apple', '块', 1, 'on_sale', '{"capacity": "3687mAh", "voltage": "3.85V", "warranty": "12个月"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    
    ('spu_iphone12pro_bat', 'SPU-2026-014', 'iPhone 12 Pro 电池', 'A级品质电池，容量≥100%，温度控制，兼容 iPhone 12 Pro', 'cat_iphone12', 'brand_apple', '块', 1, 'on_sale', '{"capacity": "2815mAh", "voltage": "3.85V", "warranty": "12个月"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    
    ('spu_iphone12_bat', 'SPU-2026-015', 'iPhone 12 电池', '原装规格电池，容量≥100%，过放保护，适用于 iPhone 12', 'cat_iphone12', 'brand_apple', '块', 1, 'on_sale', '{"capacity": "2815mAh", "voltage": "3.85V", "warranty": "12个月"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    
    ('spu_iphone12mini_bat', 'SPU-2026-016', 'iPhone 12 mini 电池', '小尺寸高容量电池，容量≥100%，多层安全保护，兼容 iPhone 12 mini', 'cat_iphone12', 'brand_apple', '块', 1, 'on_sale', '{"capacity": "2227mAh", "voltage": "3.85V", "warranty": "12个月"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),

-- iPhone 11 系列 (3个)
    ('spu_iphone11pm_bat', 'SPU-2026-017', 'iPhone 11 Pro Max 电池', '大容量替换电池，容量≥100%，智能充电管理，适用于 iPhone 11 Pro Max', 'cat_iphone11', 'brand_apple', '块', 1, 'on_sale', '{"capacity": "3969mAh", "voltage": "3.83V", "warranty": "12个月"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    
    ('spu_iphone11pro_bat', 'SPU-2026-018', 'iPhone 11 Pro 电池', '优质电芯电池，容量≥100%，短路保护，兼容 iPhone 11 Pro', 'cat_iphone11', 'brand_apple', '块', 1, 'on_sale', '{"capacity": "3046mAh", "voltage": "3.83V", "warranty": "12个月"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    
    ('spu_iphone11_bat', 'SPU-2026-019', 'iPhone 11 电池', '高性价比替换电池，容量≥100%，认证电芯，适用于 iPhone 11', 'cat_iphone11', 'brand_apple', '块', 1, 'on_sale', '{"capacity": "3110mAh", "voltage": "3.83V", "warranty": "12个月"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),

-- iPhone SE 系列 (1个)
    ('spu_iphonese3_bat', 'SPU-2026-020', 'iPhone SE (第三代) 电池', '紧凑型高品质电池，容量≥100%，过温保护，兼容 iPhone SE 2022', 'cat_iphonese', 'brand_apple', '块', 1, 'on_sale', '{"capacity": "2018mAh", "voltage": "3.83V", "warranty": "12个月"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending');

-- ============================================
-- 4. 为每个 SPU 创建对应的 SKU
-- ============================================
INSERT OR IGNORE INTO product_skus (id, spu_id, sku_code, specifications, spec_text, cost_price, sell_price, current_stock, min_stock, max_stock, barcode, is_default, sort_order, is_active, created_at, updated_at, sync_status)
VALUES
    -- iPhone 15 系列
    ('sku_001', 'spu_iphone15pm_bat', 'SKU-2026-001', '{"型号": "iPhone 15 Pro Max"}', 'iPhone 15 Pro Max', 80.00, 199.00, 50, 10, 999999, '6931234560010', 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    ('sku_002', 'spu_iphone15pro_bat', 'SKU-2026-002', '{"型号": "iPhone 15 Pro"}', 'iPhone 15 Pro', 70.00, 179.00, 50, 10, 999999, '6931234560020', 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    ('sku_003', 'spu_iphone15_bat', 'SKU-2026-003', '{"型号": "iPhone 15"}', 'iPhone 15', 60.00, 159.00, 60, 10, 999999, '6931234560030', 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    ('sku_004', 'spu_iphone15plus_bat', 'SKU-2026-004', '{"型号": "iPhone 15 Plus"}', 'iPhone 15 Plus', 85.00, 189.00, 45, 10, 999999, '6931234560040', 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    
    -- iPhone 14 系列
    ('sku_005', 'spu_iphone14pm_bat', 'SKU-2026-005', '{"型号": "iPhone 14 Pro Max"}', 'iPhone 14 Pro Max', 75.00, 179.00, 45, 10, 999999, '6931234560050', 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    ('sku_006', 'spu_iphone14pro_bat', 'SKU-2026-006', '{"型号": "iPhone 14 Pro"}', 'iPhone 14 Pro', 65.00, 159.00, 55, 10, 999999, '6931234560060', 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    ('sku_007', 'spu_iphone14_bat', 'SKU-2026-007', '{"型号": "iPhone 14"}', 'iPhone 14', 60.00, 149.00, 60, 10, 999999, '6931234560070', 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    ('sku_008', 'spu_iphone14plus_bat', 'SKU-2026-008', '{"型号": "iPhone 14 Plus"}', 'iPhone 14 Plus', 80.00, 169.00, 40, 10, 999999, '6931234560080', 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    
    -- iPhone 13 系列
    ('sku_009', 'spu_iphone13pm_bat', 'SKU-2026-009', '{"型号": "iPhone 13 Pro Max"}', 'iPhone 13 Pro Max', 70.00, 169.00, 50, 10, 999999, '6931234560090', 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    ('sku_010', 'spu_iphone13pro_bat', 'SKU-2026-010', '{"型号": "iPhone 13 Pro"}', 'iPhone 13 Pro', 60.00, 149.00, 55, 10, 999999, '6931234560100', 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    ('sku_011', 'spu_iphone13_bat', 'SKU-2026-011', '{"型号": "iPhone 13"}', 'iPhone 13', 55.00, 139.00, 60, 10, 999999, '6931234560110', 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    ('sku_012', 'spu_iphone13mini_bat', 'SKU-2026-012', '{"型号": "iPhone 13 mini"}', 'iPhone 13 mini', 45.00, 119.00, 35, 10, 999999, '6931234560120', 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    
    -- iPhone 12 系列
    ('sku_013', 'spu_iphone12pm_bat', 'SKU-2026-013', '{"型号": "iPhone 12 Pro Max"}', 'iPhone 12 Pro Max', 65.00, 159.00, 45, 10, 999999, '6931234560130', 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    ('sku_014', 'spu_iphone12pro_bat', 'SKU-2026-014', '{"型号": "iPhone 12 Pro"}', 'iPhone 12 Pro', 55.00, 139.00, 55, 10, 999999, '6931234560140', 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    ('sku_015', 'spu_iphone12_bat', 'SKU-2026-015', '{"型号": "iPhone 12"}', 'iPhone 12', 55.00, 129.00, 60, 10, 999999, '6931234560150', 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    ('sku_016', 'spu_iphone12mini_bat', 'SKU-2026-016', '{"型号": "iPhone 12 mini"}', 'iPhone 12 mini', 40.00, 109.00, 40, 10, 999999, '6931234560160', 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    
    -- iPhone 11 系列
    ('sku_017', 'spu_iphone11pm_bat', 'SKU-2026-017', '{"型号": "iPhone 11 Pro Max"}', 'iPhone 11 Pro Max', 60.00, 149.00, 40, 10, 999999, '6931234560170', 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    ('sku_018', 'spu_iphone11pro_bat', 'SKU-2026-018', '{"型号": "iPhone 11 Pro"}', 'iPhone 11 Pro', 50.00, 129.00, 50, 10, 999999, '6931234560180', 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    ('sku_019', 'spu_iphone11_bat', 'SKU-2026-019', '{"型号": "iPhone 11"}', 'iPhone 11', 50.00, 119.00, 60, 10, 999999, '6931234560190', 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending'),
    
    -- iPhone SE 系列
    ('sku_020', 'spu_iphonese3_bat', 'SKU-2026-020', '{"型号": "iPhone SE 2022"}', 'iPhone SE (第三代)', 25.00, 59.00, 45, 10, 999999, '6931234560200', 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'pending');

-- ============================================
-- 5. 为每个 SPU 添加主图（可选）
-- ============================================
INSERT OR IGNORE INTO product_images (id, spu_id, image_url, image_type, sort_order, is_primary, created_at, sync_status)
VALUES
    ('img_001', 'spu_iphone15pm_bat', 'https://example.com/images/iphone15pm_bat_1.jpg', 'main', 0, 1, CURRENT_TIMESTAMP, 'pending'),
    ('img_002', 'spu_iphone15pro_bat', 'https://example.com/images/iphone15pro_bat_1.jpg', 'main', 0, 1, CURRENT_TIMESTAMP, 'pending'),
    ('img_003', 'spu_iphone15_bat', 'https://example.com/images/iphone15_bat_1.jpg', 'main', 0, 1, CURRENT_TIMESTAMP, 'pending'),
    ('img_004', 'spu_iphone15plus_bat', 'https://example.com/images/iphone15plus_bat_1.jpg', 'main', 0, 1, CURRENT_TIMESTAMP, 'pending'),
    ('img_005', 'spu_iphone14pm_bat', 'https://example.com/images/iphone14pm_bat_1.jpg', 'main', 0, 1, CURRENT_TIMESTAMP, 'pending'),
    ('img_006', 'spu_iphone14pro_bat', 'https://example.com/images/iphone14pro_bat_1.jpg', 'main', 0, 1, CURRENT_TIMESTAMP, 'pending'),
    ('img_007', 'spu_iphone14_bat', 'https://example.com/images/iphone14_bat_1.jpg', 'main', 0, 1, CURRENT_TIMESTAMP, 'pending'),
    ('img_008', 'spu_iphone14plus_bat', 'https://example.com/images/iphone14plus_bat_1.jpg', 'main', 0, 1, CURRENT_TIMESTAMP, 'pending'),
    ('img_009', 'spu_iphone13pm_bat', 'https://example.com/images/iphone13pm_bat_1.jpg', 'main', 0, 1, CURRENT_TIMESTAMP, 'pending'),
    ('img_010', 'spu_iphone13pro_bat', 'https://example.com/images/iphone13pro_bat_1.jpg', 'main', 0, 1, CURRENT_TIMESTAMP, 'pending'),
    ('img_011', 'spu_iphone13_bat', 'https://example.com/images/iphone13_bat_1.jpg', 'main', 0, 1, CURRENT_TIMESTAMP, 'pending'),
    ('img_012', 'spu_iphone13mini_bat', 'https://example.com/images/iphone13mini_bat_1.jpg', 'main', 0, 1, CURRENT_TIMESTAMP, 'pending'),
    ('img_013', 'spu_iphone12pm_bat', 'https://example.com/images/iphone12pm_bat_1.jpg', 'main', 0, 1, CURRENT_TIMESTAMP, 'pending'),
    ('img_014', 'spu_iphone12pro_bat', 'https://example.com/images/iphone12pro_bat_1.jpg', 'main', 0, 1, CURRENT_TIMESTAMP, 'pending'),
    ('img_015', 'spu_iphone12_bat', 'https://example.com/images/iphone12_bat_1.jpg', 'main', 0, 1, CURRENT_TIMESTAMP, 'pending'),
    ('img_016', 'spu_iphone12mini_bat', 'https://example.com/images/iphone12mini_bat_1.jpg', 'main', 0, 1, CURRENT_TIMESTAMP, 'pending'),
    ('img_017', 'spu_iphone11pm_bat', 'https://example.com/images/iphone11pm_bat_1.jpg', 'main', 0, 1, CURRENT_TIMESTAMP, 'pending'),
    ('img_018', 'spu_iphone11pro_bat', 'https://example.com/images/iphone11pro_bat_1.jpg', 'main', 0, 1, CURRENT_TIMESTAMP, 'pending'),
    ('img_019', 'spu_iphone11_bat', 'https://example.com/images/iphone11_bat_1.jpg', 'main', 0, 1, CURRENT_TIMESTAMP, 'pending'),
    ('img_020', 'spu_iphonese3_bat', 'https://example.com/images/iphonese3_bat_1.jpg', 'main', 0, 1, CURRENT_TIMESTAMP, 'pending');

-- 提交事务
COMMIT;

-- ============================================
-- 验证数据
-- ============================================
SELECT 'SPU 数量' as check_item, COUNT(*) as count FROM product_spus WHERE id LIKE 'spu_iphone%'
UNION ALL
SELECT 'SKU 数量', COUNT(*) FROM product_skus WHERE spu_id LIKE 'spu_iphone%'
UNION ALL
SELECT '图片数量', COUNT(*) FROM product_images WHERE spu_id LIKE 'spu_iphone%';

-- 显示所有插入的商品
SELECT 
    spu.spu_code,
    spu.name,
    sku.sell_price,
    sku.current_stock,
    cat.name as category
FROM product_spus spu
LEFT JOIN product_skus sku ON spu.id = sku.spu_id
LEFT JOIN product_categories cat ON spu.category_id = cat.id
WHERE spu.id LIKE 'spu_iphone%'
ORDER BY spu.spu_code;
