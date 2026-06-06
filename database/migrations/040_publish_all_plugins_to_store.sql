-- ============================================================
-- FlowHub 插件商店批量上架 SQL
-- 需求文档：行业插件补充——八大行业插件发布至插件商店
-- 
-- 目标数据库：FlowHub Supabase (PostgreSQL)
-- 执行前提：007_add_industry_plugins.sql 已建表
-- 上架插件：3个已有（餐饮/美业/宠物）+ 8个新增 = 11个
-- ============================================================

-- 注意：manifest_json 字段引用本地 src/plugins/{id}/manifest.json 的完整内容
-- 实际部署时可通过 FlowHub Admin API 自动同步，或手动替换为转义后的 JSON

-- ============================================================
-- 已有行业插件（餐饮/美业/宠物）—— 页面和命令均已完整实现
-- ============================================================

-- 1. 餐饮行业版
INSERT INTO industry_plugins (id, name, version, status, min_app_version, icon, description, manifest_json, published_at)
VALUES (
    'catering',
    '餐饮行业版',
    '1.0.0',
    'published',
    '>=0.1.0',
    '🍽️',
    '面向中小型餐馆、快餐店、饮品店，覆盖扫码点餐、后厨打印、桌台管理、团购对接、会员营销等场景。AI 菜单优化师 + 库存预测师辅助经营。',
    '{"id":"catering","name":"餐饮行业版","version":"1.0.0","icon":"🍽️","category":"official","tags":["餐饮","POS","KDS","点餐","后厨"],"features":{"modules":["pos","kitchen-display","reservation","scan-order","delivery","membership","inventory","purchase","sales","reports","ai-teams","ai-knowledge"],"dashboards":["daily-sales","popular-dishes","table-occupancy","delivery-stats"],"reports":["dish-sales-report","daily-revenue","ingredient-cost","member-analysis"]},"navigation":{"add":[{"text":"收银台","icon":"shopping-cart","path":"/pos","group":"前台"},{"text":"桌台管理","icon":"table-restaurant","path":"/tables","group":"前台"},{"text":"后厨显示","icon":"monitor","path":"/kitchen","group":"前台"},{"text":"菜品管理","icon":"package","path":"/products","group":"业务"},{"text":"供应链","icon":"truck","path":"/supplychain","group":"业务"},{"text":"销售管理","icon":"finance","path":"/sales","group":"业务"},{"text":"库存管理","icon":"inventory","path":"/inventory","group":"业务"},{"text":"会员管理","icon":"users","path":"/members","group":"营销"},{"text":"AI 团队","icon":"users","path":"/teams","group":"AI"},{"text":"AI 知识库","icon":"book-open","path":"/ai-knowledge","group":"AI"},{"text":"数据看板","icon":"bar-chart","path":"/analytics","group":"分析"}],"remove":["/datacenter","/contacts","/messages","/cloud-store","/ucenter"]},"ui":{"theme":{"primary":"#e74c3c","secondary":"#f39c12"},"quickActions":[{"label":"开桌点餐","icon":"utensils","action":"openNewTable","color":"#e74c3c"},{"label":"今日营收","icon":"dollar-sign","action":"openDailyRevenue","color":"#f39c12"},{"label":"食材预警","icon":"alert-triangle","action":"openIngredientAlert","color":"#ef4444"},{"label":"团购核销","icon":"ticket","action":"openGroupBuy","color":"#10b981"}]}}',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    manifest_json = EXCLUDED.manifest_json,
    description = EXCLUDED.description,
    updated_at = NOW(),
    published_at = COALESCE(industry_plugins.published_at, EXCLUDED.published_at);

-- 2. 美业行业版
INSERT INTO industry_plugins (id, name, version, status, min_app_version, icon, description, manifest_json, published_at)
VALUES (
    'beauty',
    '美业行业版',
    '1.0.0',
    'published',
    '>=0.1.0',
    '💇',
    '面向美容院、美发店、美甲店、SPA 会所，覆盖预约排班、会员充值、员工提成、客资管理等场景。AI 帮助分析服务项目热度，自动推送营销唤醒沉睡客户。',
    '{"id":"beauty","name":"美业行业版","version":"1.0.0","icon":"💇","category":"official","features":{"modules":["appointment","member-card","commission","customer-mgmt","marketing","inventory","sales","reports","ai-teams","ai-knowledge"],"dashboards":["appointment-calendar","member-renewal","service-rank","employee-performance"],"reports":["service-sales-report","member-consumption","employee-commission","marketing-effect"]},"navigation":{"add":[{"text":"预约管理","icon":"calendar","path":"/appointments","group":"前台"},{"text":"会员管理","icon":"users","path":"/members","group":"客户"},{"text":"服务项目","icon":"package","path":"/services","group":"业务"},{"text":"员工管理","icon":"users","path":"/employees","group":"业务"},{"text":"库存管理","icon":"inventory","path":"/inventory","group":"业务"},{"text":"销售管理","icon":"finance","path":"/sales","group":"业务"},{"text":"营销活动","icon":"megaphone","path":"/marketing","group":"营销"},{"text":"AI 团队","icon":"users","path":"/teams","group":"AI"},{"text":"AI 知识库","icon":"book-open","path":"/ai-knowledge","group":"AI"},{"text":"数据看板","icon":"bar-chart","path":"/analytics","group":"分析"}],"remove":["/datacenter","/supplychain","/products","/contacts","/messages","/cloud-store","/ucenter"]},"ui":{"theme":{"primary":"#ec4899","secondary":"#f472b6"},"quickActions":[{"label":"新增预约","icon":"calendar-plus","action":"openNewAppointment","color":"#ec4899"},{"label":"会员充值","icon":"credit-card","action":"openMemberRecharge","color":"#f472b6"},{"label":"员工提成","icon":"calculator","action":"openCommissionCalc","color":"#8b5cf6"},{"label":"沉睡唤醒","icon":"bell","action":"openWakeUpCampaign","color":"#f59e0b"}]}}',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    manifest_json = EXCLUDED.manifest_json,
    description = EXCLUDED.description,
    updated_at = NOW(),
    published_at = COALESCE(industry_plugins.published_at, EXCLUDED.published_at);

-- 3. 宠物行业版
INSERT INTO industry_plugins (id, name, version, status, min_app_version, icon, description, manifest_json, published_at)
VALUES (
    'pet',
    '宠物行业版',
    '1.0.0',
    'published',
    '>=0.1.0',
    '🐾',
    '面向宠物店、宠物医院、宠物寄养中心，覆盖商品（食品/用品/活体）有效期管理、寄养服务流程、会员充值、疫苗提醒等场景。AI 活体库存追踪 + 会员智能营销。',
    '{"id":"pet","name":"宠物行业版","version":"1.0.0","icon":"🐾","category":"official","tags":["宠物","寄养","洗护","疫苗"],"features":{"modules":["pet-board","boarding","grooming","member-card","inventory","purchase","sales","reports","ai-teams","ai-knowledge"],"dashboards":["boarding-status","pet-checkin","service-today","expiry-alert"],"reports":["product-expiry-report","boarding-revenue","service-analysis","member-loyalty"]},"navigation":{"add":[{"text":"宠物档案","icon":"paw","path":"/pets","group":"业务"},{"text":"寄养管理","icon":"home","path":"/boarding","group":"业务"},{"text":"洗护服务","icon":"sparkles","path":"/grooming","group":"业务"},{"text":"商品管理","icon":"package","path":"/products","group":"业务"},{"text":"供应链","icon":"truck","path":"/supplychain","group":"业务"},{"text":"销售管理","icon":"finance","path":"/sales","group":"业务"},{"text":"库存管理","icon":"inventory","path":"/inventory","group":"业务"},{"text":"会员管理","icon":"users","path":"/members","group":"客户"},{"text":"AI 团队","icon":"users","path":"/teams","group":"AI"},{"text":"AI 知识库","icon":"book-open","path":"/ai-knowledge","group":"AI"},{"text":"数据看板","icon":"bar-chart","path":"/analytics","group":"分析"}],"remove":["/datacenter","/contacts","/messages","/cloud-store","/ucenter"]},"ui":{"theme":{"primary":"#f59e0b","secondary":"#10b981"},"quickActions":[{"label":"宠物入住","icon":"dog","action":"openPetCheckin","color":"#f59e0b"},{"label":"疫苗提醒","icon":"syringe","action":"openVaccineReminder","color":"#10b981"},{"label":"有效期预警","icon":"clock","action":"openExpiryAlert","color":"#ef4444"},{"label":"今日服务","icon":"clipboard-list","action":"openTodayService","color":"#6366f1"}]}}',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    manifest_json = EXCLUDED.manifest_json,
    description = EXCLUDED.description,
    updated_at = NOW(),
    published_at = COALESCE(industry_plugins.published_at, EXCLUDED.published_at);

-- ============================================================
-- 新增八大行业插件（页面上线中，目前为占位页面）
-- ============================================================

-- 4. 便利店行业版
INSERT INTO industry_plugins (id, name, version, status, min_app_version, icon, description, manifest_json, published_at)
VALUES (
    'convenience-store',
    '便利店行业版',
    '1.0.0',
    'published',
    '>=0.1.0',
    '🏪',
    '面向社区便利店、24小时小店、夫妻店，覆盖扫码收银、保质期预警、日结盘点、补货建议等场景。AI 临期商品提醒 + 智能补货建议辅助经营。',
    '{"id":"convenience-store","name":"便利店行业版","version":"1.0.0","icon":"🏪","category":"official","tags":["便利店","零售","过期提醒","快速收银"],"features":{"modules":["pos","products","inventory","supplychain","sales","members","reports","ai-teams","ai-knowledge"],"dashboards":["daily-settlement","expiry-alert","sales-trend","restock-suggestion"],"reports":["sales-report","expiry-report","daily-revenue"]},"navigation":{"add":[{"text":"收银台","icon":"shopping-cart","path":"/convenience-pos","group":"前台"},{"text":"商品管理","icon":"package","path":"/products","group":"业务"},{"text":"库存管理","icon":"inventory","path":"/inventory","group":"业务"},{"text":"供应链","icon":"truck","path":"/supplychain","group":"业务"},{"text":"客户管理","icon":"users","path":"/members","group":"客户"},{"text":"AI 团队","icon":"users","path":"/teams","group":"AI"},{"text":"AI 知识库","icon":"book-open","path":"/ai-knowledge","group":"AI"},{"text":"数据看板","icon":"bar-chart","path":"/analytics","group":"分析"}],"remove":["/datacenter","/contacts","/messages","/cloud-store","/ucenter"]},"ui":{"theme":{"primary":"#f97316","secondary":"#fdba74"},"quickActions":[{"label":"快速收银","icon":"shopping-cart","action":"openPos","color":"#f97316"},{"label":"临期商品","icon":"clock","action":"openExpiryAlert","color":"#ef4444"},{"label":"今日日结","icon":"calculator","action":"openDailySettlement","color":"#10b981"},{"label":"补货建议","icon":"truck","action":"openRestockSuggestion","color":"#6366f1"}]}}',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    manifest_json = EXCLUDED.manifest_json,
    description = EXCLUDED.description,
    updated_at = NOW(),
    published_at = COALESCE(industry_plugins.published_at, EXCLUDED.published_at);

-- 5. 酒水批发行业版
INSERT INTO industry_plugins (id, name, version, status, min_app_version, icon, description, manifest_json, published_at)
VALUES (
    'liquor-wholesale',
    '酒水批发行业版',
    '1.0.0',
    'published',
    '>=0.1.0',
    '🍷',
    '面向白酒/红酒/啤酒批发商、区域代理，覆盖品牌分级管理、多级定价、批次追踪、赊账对账、防窜货等场景。AI 批次追踪 + 赊账催收辅助经营。',
    '{"id":"liquor-wholesale","name":"酒水批发行业版","version":"1.0.0","icon":"🍷","category":"official","tags":["酒水","批发","批次管理","价格分层"],"features":{"modules":["products","sales","supplychain","inventory","credit-ledger","members","reports","ai-teams","ai-knowledge"],"dashboards":["batch-track","credit-overview","sales-trend","price-analysis"],"reports":["sales-report","credit-report","batch-report","channel-report"]},"navigation":{"add":[{"text":"商品管理","icon":"package","path":"/products","group":"业务"},{"text":"销售管理","icon":"finance","path":"/sales","group":"业务"},{"text":"供应链","icon":"truck","path":"/supplychain","group":"业务"},{"text":"库存管理","icon":"inventory","path":"/inventory","group":"业务"},{"text":"赊账对账","icon":"dollar-sign","path":"/credit-ledger","group":"财务"},{"text":"客户管理","icon":"users","path":"/members","group":"客户"},{"text":"AI 团队","icon":"users","path":"/teams","group":"AI"},{"text":"AI 知识库","icon":"book-open","path":"/ai-knowledge","group":"AI"},{"text":"数据看板","icon":"bar-chart","path":"/analytics","group":"分析"}],"remove":["/datacenter","/contacts","/messages","/cloud-store","/ucenter","/pos"]},"ui":{"theme":{"primary":"#dc2626","secondary":"#fca5a5"},"quickActions":[{"label":"新增销售","icon":"shopping-cart","action":"openNewSale","color":"#dc2626"},{"label":"批次录入","icon":"barcode","action":"openBatchEntry","color":"#f59e0b"},{"label":"赊账催收","icon":"alert-triangle","action":"openCreditReminder","color":"#ef4444"},{"label":"套装组合","icon":"package-plus","action":"openBundleAssembly","color":"#6366f1"}]}}',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    manifest_json = EXCLUDED.manifest_json,
    description = EXCLUDED.description,
    updated_at = NOW(),
    published_at = COALESCE(industry_plugins.published_at, EXCLUDED.published_at);

-- 6. 手机配件批发行业版
INSERT INTO industry_plugins (id, name, version, status, min_app_version, icon, description, manifest_json, published_at)
VALUES (
    'phone-accessories',
    '手机配件批发行业版',
    '1.0.0',
    'published',
    '>=0.1.0',
    '📱',
    '面向3C配件批发档口、华强北商户、手机维修店供货，覆盖SPU/SKU矩阵管理、兼容机型库、批量报价、价格波动追踪等场景。AI SKU矩阵生成 + 报价辅助经营。',
    '{"id":"phone-accessories","name":"手机配件批发行业版","version":"1.0.0","icon":"📱","category":"official","tags":["3C","手机配件","SKU矩阵","批发"],"features":{"modules":["products","sales","supplychain","inventory","quotations","members","reports","ai-teams","ai-knowledge"],"dashboards":["price-history","sku-matrix","sales-trend","device-compatibility"],"reports":["sales-report","price-fluctuation-report","sku-analysis","quotation-report"]},"navigation":{"add":[{"text":"商品管理","icon":"package","path":"/products","group":"业务"},{"text":"销售管理","icon":"finance","path":"/sales","group":"业务"},{"text":"供应链","icon":"truck","path":"/supplychain","group":"业务"},{"text":"库存管理","icon":"inventory","path":"/inventory","group":"业务"},{"text":"报价单","icon":"file-text","path":"/quotations","group":"业务"},{"text":"客户管理","icon":"users","path":"/members","group":"客户"},{"text":"AI 团队","icon":"users","path":"/teams","group":"AI"},{"text":"AI 知识库","icon":"book-open","path":"/ai-knowledge","group":"AI"},{"text":"数据看板","icon":"bar-chart","path":"/analytics","group":"分析"}],"remove":["/datacenter","/contacts","/messages","/cloud-store","/ucenter","/pos"]},"ui":{"theme":{"primary":"#2563eb","secondary":"#93c5fd"},"quickActions":[{"label":"新建报价","icon":"file-text","action":"openNewQuotation","color":"#2563eb"},{"label":"快速SKU","icon":"grid-3x3","action":"openBatchSkuGen","color":"#8b5cf6"},{"label":"价格波动","icon":"trending-up","action":"openPriceHistory","color":"#f59e0b"},{"label":"机型查询","icon":"smartphone","action":"openDeviceSearch","color":"#10b981"}]}}',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    manifest_json = EXCLUDED.manifest_json,
    description = EXCLUDED.description,
    updated_at = NOW(),
    published_at = COALESCE(industry_plugins.published_at, EXCLUDED.published_at);

-- 7. 食材配送行业版
INSERT INTO industry_plugins (id, name, version, status, min_app_version, icon, description, manifest_json, published_at)
VALUES (
    'fresh-food-delivery',
    '食材配送行业版',
    '1.0.0',
    'published',
    '>=0.1.0',
    '🥬',
    '面向餐饮供货商、学校/企业食堂配送、净菜加工厂，覆盖称重计价、配送路线规划、周期订单、新鲜度保障、自助下单等场景。AI 配送路线优化 + 新鲜度预警辅助经营。',
    '{"id":"fresh-food-delivery","name":"食材配送行业版","version":"1.0.0","icon":"🥬","category":"official","tags":["食材","配送","称重计价","新鲜度"],"features":{"modules":["products","sales","delivery","supplychain","inventory","members","reports","ai-teams","ai-knowledge"],"dashboards":["freshness-alert","delivery-route","recurring-order","sales-trend"],"reports":["sales-report","freshness-report","delivery-report","customer-cycle-report"]},"navigation":{"add":[{"text":"商品管理","icon":"package","path":"/products","group":"业务"},{"text":"订单管理","icon":"shopping-cart","path":"/sales","group":"业务"},{"text":"配送管理","icon":"truck","path":"/delivery","group":"业务"},{"text":"供应链","icon":"shopping-bag","path":"/supplychain","group":"业务"},{"text":"库存管理","icon":"inventory","path":"/inventory","group":"业务"},{"text":"客户管理","icon":"users","path":"/members","group":"客户"},{"text":"AI 团队","icon":"users","path":"/teams","group":"AI"},{"text":"AI 知识库","icon":"book-open","path":"/ai-knowledge","group":"AI"},{"text":"数据看板","icon":"bar-chart","path":"/analytics","group":"分析"}],"remove":["/datacenter","/contacts","/messages","/cloud-store","/ucenter","/pos"]},"ui":{"theme":{"primary":"#16a34a","secondary":"#86efac"},"quickActions":[{"label":"今日配送","icon":"truck","action":"openTodayDelivery","color":"#16a34a"},{"label":"周期订单","icon":"refresh-cw","action":"openRecurringOrders","color":"#8b5cf6"},{"label":"新鲜度预警","icon":"alert-triangle","action":"openFreshnessAlert","color":"#ef4444"},{"label":"报价单","icon":"file-text","action":"openQuotation","color":"#f59e0b"}]}}',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    manifest_json = EXCLUDED.manifest_json,
    description = EXCLUDED.description,
    updated_at = NOW(),
    published_at = COALESCE(industry_plugins.published_at, EXCLUDED.published_at);

-- 8. 汽车配件行业版
INSERT INTO industry_plugins (id, name, version, status, min_app_version, icon, description, manifest_json, published_at)
VALUES (
    'auto-parts',
    '汽车配件行业版',
    '1.0.0',
    'published',
    '>=0.1.0',
    '🔧',
    '面向汽配城档口、汽车维修店供货商，覆盖OE号管理、车型匹配查询、VIN码解码、品牌分类（原厂/品牌/副厂/拆车件）、溯源管理等场景。AI OE号查询 + 适配推荐辅助经营。',
    '{"id":"auto-parts","name":"汽车配件行业版","version":"1.0.0","icon":"🔧","category":"official","tags":["汽配","OE号","车型匹配","配件"],"features":{"modules":["products","vehicle-db","sales","supplychain","inventory","members","reports","ai-teams","ai-knowledge"],"dashboards":["oe-search","vehicle-match","part-grade-stats","sales-trend"],"reports":["sales-report","oe-analysis","grade-distribution","traceability-report"]},"navigation":{"add":[{"text":"商品管理","icon":"package","path":"/products","group":"业务"},{"text":"车型库","icon":"car","path":"/vehicle-db","group":"业务"},{"text":"销售管理","icon":"finance","path":"/sales","group":"业务"},{"text":"供应链","icon":"truck","path":"/supplychain","group":"业务"},{"text":"库存管理","icon":"inventory","path":"/inventory","group":"业务"},{"text":"客户管理","icon":"users","path":"/members","group":"客户"},{"text":"AI 团队","icon":"users","path":"/teams","group":"AI"},{"text":"AI 知识库","icon":"book-open","path":"/ai-knowledge","group":"AI"},{"text":"数据看板","icon":"bar-chart","path":"/analytics","group":"分析"}],"remove":["/datacenter","/contacts","/messages","/cloud-store","/ucenter","/pos"]},"ui":{"theme":{"primary":"#4f46e5","secondary":"#a5b4fc"},"quickActions":[{"label":"OE号查询","icon":"search","action":"openOeSearch","color":"#4f46e5"},{"label":"VIN解码","icon":"car","action":"openVinDecoder","color":"#8b5cf6"},{"label":"车型匹配","icon":"list","action":"openVehicleMatch","color":"#f59e0b"},{"label":"新建销售","icon":"shopping-cart","action":"openNewSale","color":"#10b981"}]}}',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    manifest_json = EXCLUDED.manifest_json,
    description = EXCLUDED.description,
    updated_at = NOW(),
    published_at = COALESCE(industry_plugins.published_at, EXCLUDED.published_at);

-- 9. 五金行业版
INSERT INTO industry_plugins (id, name, version, status, min_app_version, icon, description, manifest_json, published_at)
VALUES (
    'hardware',
    '五金行业版',
    '1.0.0',
    'published',
    '>=0.1.0',
    '🔩',
    '面向五金批发店、建材五金店、工厂五金耗材供应，覆盖规格矩阵管理、多单位计价、挂账对账、板材切割计算等场景。AI 规格推荐 + 切割优化辅助经营。',
    '{"id":"hardware","name":"五金行业版","version":"1.0.0","icon":"🔩","category":"official","tags":["五金","规格矩阵","挂账","板材"],"features":{"modules":["products","sales","supplychain","inventory","credit-ledger","members","reports","ai-teams","ai-knowledge"],"dashboards":["spec-matrix","cutting-calc","credit-overview","sales-trend"],"reports":["sales-report","credit-report","spec-analysis","material-usage-report"]},"navigation":{"add":[{"text":"商品管理","icon":"package","path":"/products","group":"业务"},{"text":"销售管理","icon":"finance","path":"/sales","group":"业务"},{"text":"供应链","icon":"truck","path":"/supplychain","group":"业务"},{"text":"库存管理","icon":"inventory","path":"/inventory","group":"业务"},{"text":"挂账对账","icon":"dollar-sign","path":"/hw-credit-ledger","group":"财务"},{"text":"客户管理","icon":"users","path":"/members","group":"客户"},{"text":"AI 团队","icon":"users","path":"/teams","group":"AI"},{"text":"AI 知识库","icon":"book-open","path":"/ai-knowledge","group":"AI"},{"text":"数据看板","icon":"bar-chart","path":"/analytics","group":"分析"}],"remove":["/datacenter","/contacts","/messages","/cloud-store","/ucenter","/pos"]},"ui":{"theme":{"primary":"#64748b","secondary":"#cbd5e1"},"quickActions":[{"label":"新建销售","icon":"shopping-cart","action":"openNewSale","color":"#64748b"},{"label":"切割计算","icon":"scissors","action":"openCuttingCalc","color":"#8b5cf6"},{"label":"规格矩阵","icon":"grid-3x3","action":"openSpecMatrix","color":"#f59e0b"},{"label":"挂账催收","icon":"alert-triangle","action":"openCreditReminder","color":"#ef4444"}]}}',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    manifest_json = EXCLUDED.manifest_json,
    description = EXCLUDED.description,
    updated_at = NOW(),
    published_at = COALESCE(industry_plugins.published_at, EXCLUDED.published_at);

-- 10. 装修材料行业版
INSERT INTO industry_plugins (id, name, version, status, min_app_version, icon, description, manifest_json, published_at)
VALUES (
    'decoration-material',
    '装修材料行业版',
    '1.0.0',
    'published',
    '>=0.1.0',
    '🏗️',
    '面向装修公司、建材商、工地材料配送，覆盖项目管理、材料清单BOM、色号批号追踪、工地配送、项目利润核算等场景。AI 材料清单推荐 + 项目核算辅助经营。',
    '{"id":"decoration-material","name":"装修材料行业版","version":"1.0.0","icon":"🏗️","category":"official","tags":["装修","建材","项目核算","工地配送"],"features":{"modules":["projects","products","sales","supplychain","inventory","members","reports","ai-teams","ai-knowledge"],"dashboards":["project-profit","material-bom","delivery-status","color-batch-track"],"reports":["project-report","material-report","profit-analysis","batch-traceability"]},"navigation":{"add":[{"text":"项目管理","icon":"briefcase","path":"/projects","group":"业务"},{"text":"商品管理","icon":"package","path":"/products","group":"业务"},{"text":"销售管理","icon":"finance","path":"/sales","group":"业务"},{"text":"供应链","icon":"truck","path":"/supplychain","group":"业务"},{"text":"库存管理","icon":"inventory","path":"/inventory","group":"业务"},{"text":"客户管理","icon":"users","path":"/members","group":"客户"},{"text":"AI 团队","icon":"users","path":"/teams","group":"AI"},{"text":"AI 知识库","icon":"book-open","path":"/ai-knowledge","group":"AI"},{"text":"数据看板","icon":"bar-chart","path":"/analytics","group":"分析"}],"remove":["/datacenter","/contacts","/messages","/cloud-store","/ucenter","/pos"]},"ui":{"theme":{"primary":"#ca8a04","secondary":"#fde047"},"quickActions":[{"label":"新建项目","icon":"folder-plus","action":"openNewProject","color":"#ca8a04"},{"label":"材料清单","icon":"clipboard-list","action":"openBomTemplate","color":"#8b5cf6"},{"label":"工地配送","icon":"truck","action":"openSiteDelivery","color":"#f59e0b"},{"label":"利润核算","icon":"calculator","action":"openProfitCalc","color":"#10b981"}]}}',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    manifest_json = EXCLUDED.manifest_json,
    description = EXCLUDED.description,
    updated_at = NOW(),
    published_at = COALESCE(industry_plugins.published_at, EXCLUDED.published_at);

-- 11. 社区团购行业版
INSERT INTO industry_plugins (id, name, version, status, min_app_version, icon, description, manifest_json, published_at)
VALUES (
    'community-group-buy',
    '社区团购行业版',
    '1.0.0',
    'published',
    '>=0.1.0',
    '🛒',
    '面向社区团长、微信群接龙运营者、自提点管理，覆盖开团选品、接龙统计、采购汇总、到货核销、团长收益核算等场景。AI 接龙文本智能解析 + 到货催取辅助经营。',
    '{"id":"community-group-buy","name":"社区团购行业版","version":"1.0.0","icon":"🛒","category":"official","tags":["社区团购","团长","接龙","自提"],"features":{"modules":["group-buy","products","supplychain","inventory","members","reports","ai-teams","ai-knowledge"],"dashboards":["group-status","jielong-stats","pickup-waiting","revenue-summary"],"reports":["group-report","member-report","revenue-report","pickup-report"]},"navigation":{"add":[{"text":"团购管理","icon":"shopping-bag","path":"/group-buy","group":"前台"},{"text":"商品管理","icon":"package","path":"/products","group":"业务"},{"text":"供应链","icon":"truck","path":"/supplychain","group":"业务"},{"text":"库存管理","icon":"inventory","path":"/inventory","group":"业务"},{"text":"客户管理","icon":"users","path":"/members","group":"客户"},{"text":"AI 团队","icon":"users","path":"/teams","group":"AI"},{"text":"AI 知识库","icon":"book-open","path":"/ai-knowledge","group":"AI"},{"text":"数据看板","icon":"bar-chart","path":"/analytics","group":"分析"}],"remove":["/datacenter","/contacts","/messages","/cloud-store","/ucenter","/sales","/pos"]},"ui":{"theme":{"primary":"#0891b2","secondary":"#67e8f9"},"quickActions":[{"label":"新建团购","icon":"shopping-bag","action":"openNewGroup","color":"#0891b2"},{"label":"接龙统计","icon":"list","action":"openJielongParser","color":"#8b5cf6"},{"label":"到货核销","icon":"check-circle","action":"openPickupVerify","color":"#10b981"},{"label":"催取通知","icon":"bell","action":"openPickupReminder","color":"#ef4444"}]}}',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    manifest_json = EXCLUDED.manifest_json,
    description = EXCLUDED.description,
    updated_at = NOW(),
    published_at = COALESCE(industry_plugins.published_at, EXCLUDED.published_at);
