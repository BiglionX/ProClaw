-- ============================================
-- 餐厅插件数据库迁移 — down（卸载回滚）
-- ============================================

DROP INDEX IF EXISTS idx_catering_members_phone;
DROP INDEX IF EXISTS idx_catering_kds_status;
DROP INDEX IF EXISTS idx_catering_order_items_order;
DROP INDEX IF EXISTS idx_catering_orders_created;
DROP INDEX IF EXISTS idx_catering_orders_status;
DROP INDEX IF EXISTS idx_catering_orders_table;
DROP INDEX IF EXISTS idx_catering_menu_category;

DROP TABLE IF EXISTS catering_members;
DROP TABLE IF EXISTS catering_kds_queue;
DROP TABLE IF EXISTS catering_order_items;
DROP TABLE IF EXISTS catering_orders;
DROP TABLE IF EXISTS catering_tables;
DROP TABLE IF EXISTS catering_menu_items;
DROP TABLE IF EXISTS catering_categories;
