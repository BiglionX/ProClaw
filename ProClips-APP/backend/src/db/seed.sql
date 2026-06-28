-- ============================================================
-- ProClips Backend Seed V1
-- 6 个视频模板 + 2 个可信 JWT 签发方
-- 幂等：使用 INSERT OR IGNORE / INSERT OR REPLACE
-- ============================================================

-- 模板种子（与移动端 TEMPLATES 数组保持一致）
INSERT OR IGNORE INTO video_templates (id, title, description, scenes_json, duration, sample, industry, badge, cover_color, sort_order)
VALUES
  ('tpl_1', '招牌菜探店种草', '适用于菜品展示与门店氛围的探店种草短视频。',
   '["开场口播","菜品特写","环境展示","优惠信息","结尾促单"]', '30s',
   '适合餐饮、火锅、甜品等门店宣传。', '餐饮', '🔥 热门', '#ff6b9d', 1),
  ('tpl_2', '门店活动引流', '适用于门店活动、促销引流的短视频模板。',
   '["活动主题","门店展示","优惠详情","行动号召"]', '25s',
   '适合零售、餐饮、美业活动推广。', '零售', 'NEW', '#a855f7', 2),
  ('tpl_3', '美业门店宣传', '适用于美发/美甲/美容门店的个人 IP 营销短视频。',
   '["店铺介绍","服务展示","效果前后","优惠卡片"]', '20s',
   '适合美发、美容、SPA 等商家。', '美业', NULL, '#00d2ff', 3),
  ('tpl_4', '零售热销爆款', '适用于商品展示、推荐理由和购买引导的视频模板。',
   '["商品展示","核心卖点","使用场景","结尾促单"]', '15s',
   '适合零售、小商品、快消品推广。', '零售', NULL, '#ffb547', 4),
  ('tpl_5', '海鲜上新种草', '海鲜类新品上市种草模板，突出鲜活与品质。',
   '["鲜活展示","烹饪过程","成品特写","优惠信息"]', '30s',
   '适合海鲜、生鲜、餐饮上新。', '餐饮', NULL, '#22c55e', 5),
  ('tpl_6', '生活服务推荐', '生活服务类门店推荐模板。',
   '["服务介绍","环境展示","客户评价","优惠引导"]', '25s',
   '适合家政、维修、教培等服务。', '服务', NULL, '#f43f5e', 6);

-- 信任的 JWT 签发方
INSERT OR IGNORE INTO video_jwt_issuers (iss, name, is_trusted)
VALUES
  ('proclaw-account', 'ProClaw 主账号 (account.proclaw.cc)', 1),
  ('proclips-backend', 'ProClips Backend 本地签发', 1);

-- 一个示例商家档案（演示用，merchant_id = demo-merchant-001）
INSERT OR IGNORE INTO video_merchant_profiles
  (merchant_id, display_name, industry, region, store_address, contact_phone)
VALUES
  ('demo-merchant-001', '老王火锅店·万达店', '餐饮', '上海',
   '上海万达广场 3 楼', '13800138000');
