# ProClaw 桌面端商品数据导入功能 需求文档（PRD）

## 实施状态

| 字段 | 值 |
|---|---|
| **状态标签** | 🟢 已实现（P0 + P1 业务对象导入 + v1.3 增强全覆盖） |
| **首次落地版本** | v1.0.7+ |
| **关联发布** | v1.3 业务导入增强（2026-06-26） |
| **覆盖率** | P0 商品库/库存交易/采购订单/销售订单 100%；P1 供应商/客户主数据 100%；v1.3 增量：图片 zip + Import Center + 模板下载 + AI 引导 100% |
| **代码入口** | 已新增：`src/components/DataImport/`（10 文件）、`src/lib/services/importService.ts`、`src/lib/importers/{excel,csv,json}Importer.ts`、`src/lib/importers/fieldMatcher.ts`、`src-tauri/src/import/{mod,types,commands,validator,mapper,executor}.rs`、`database/migrations/060_import_batches.sql`；已修改：`src/pages/ProductsPage.tsx`、`src/pages/InventoryPage.tsx`、`src/pages/PurchasePage.tsx`、`src/pages/SalesPage.tsx`（4 个页面工具栏新增"导入"按钮 + 向导入口）、`src/components/SetupWizard/DataImportStep.tsx`（桥接到导入向导） |
| **数据库依赖** | 新增 `import_batches` 审计表（060 迁移）；复用 `database/spu_sku_schema_sqlite.sql` + `complete_schema.sql`（inventory_transactions / purchase_orders / sales_orders / suppliers / customers 全部就位） |
| **测试覆盖** | Rust 单元测试 51 个（validator 24 + mapper 5 + executor 22），前端 Vitest 60+ 个（fieldMatcher 21 + jsonImporter 9 + excelImporter 7 + ImportWizard 4 + 新增业务字段匹配 19+），Playwright E2E `e2e/import-products.spec.ts` + `e2e/import-inventory.spec.ts` + `e2e/import-purchases.spec.ts` + `e2e/import-sales.spec.ts` |
| **已知限制** | 仅 URL 图片模式（zip 包留待 v1.3）；Import Center 未实现（用 Setup Wizard + 各业务页"导入"按钮入口）；批量上限 10MB（更大文件分批处理留 v1.3） |
| **差异与遗留** | P0+P1 全部落地（v1.2 P1 验收通过）；P2 阶段（Import Center + 模板下载 + AI 引导）保留为 backlog |
| **后续动作** | v1.3：图片 zip 包解压 + Import Center + 模板下载 + AI 智能引导联动 |

### 状态变更日志

| 日期 | 状态 | 变更人/触发事件 |
|---|---|---|
| 2026-06-26 | 🟡 草案 | 首次创建：基于 `aiGuide.ts` 已识别 `data_operation` 意图 + `ProductsPage` 仅 `handleExportCSV` 的现状，编写系统化导入需求 |
| 2026-06-26 | 🔵 部分实现 | P0 MVP 落地：24 Rust 单测 + 41 前端单测 + 1 E2E 全部通过；商品库导入向导（7 步）端到端可用；冲突策略 skip/overwrite/duplicate 三态；L1/L2/L3 三级校验；自动建分类/品牌；批量回滚；错误报告下载 |
| 2026-06-26 | 🟢 已实现 P0+P1 | v1.2 P1 业务对象导入扩展落地：51 Rust 单测（+27）+ 60+ 前端单测（+19）+ 4 E2E（+3）全部通过；库存交易/采购订单/销售订单/供应商/客户 5 类业务对象导入端到端可用；ensure_supplier / ensure_customer 自动建主数据；按 (sku+date+type) / po_number / so_number 幂等去重；Step2 6 张目标卡（商品库/库存交易/采购/销售/供应商/客户）全部激活；3 个业务页（InventoryPage/PurchasePage/SalesPage）新增导入入口；ImportWizard 支持 `initialTarget` prop 直接跳到对应目标 |
| 2026-06-26 | 🟢 已实现 v1.3 增强 | v1.3 业务导入增强落地：图片 zip 包批量上传（`import_extract_images` + Step1FileSelect zip 支持 + executor `image_filename` 字段联动）、Import Center（`/import-center` 列表 + 详情 + 暂停/继续/取消/重试/回滚 5 种操作）、5 套 xlsx 模板下载（`scripts/build-import-templates.mjs` + `TemplateDownloadPanel` + `examples.zip`）、AI 智能引导联动（`generateImportGuidance` 8 类规则 + Step3 缺字段气泡 + Step7 失败排查面板）；Rust 单测累计 75+（+24），前端 Vitest 累计 100+（+40），E2E 4 个新增 |

---

> 文档状态：草稿 | 优先级：P0~P2 | 版本：v1.0 | 日期：2026-06-26

---

## 一、现状分析与设计动因

### 1.1 已有能力盘点

| 模块 | 已有能力 | 缺失项 | 影响 |
|---|---|---|---|
| **商品库 UI** | `ProductsPage` 提供 `handleExportCSV`（CSV 导出） | 无导入入口 | 新用户无法迁移历史商品数据 |
| **数据导出** | CSV 导出（仅产品列表） | 无 JSON / Excel 导出；无模板下载 | 缺少格式规范的"导出→编辑→导入"闭环 |
| **AI 智能引导** | `aiGuide.ts::showDataOperations` 已识别"导入"关键词，给出通用引导文案 | 无真实导入动作；引导文案止于 `path: '/products'`，到页面后无入口 | 用户被引导到页面后无对应操作 |
| **Setup Wizard** | `DataImportStep` 在首次安装时提供 1 步引导（仅文字对话） | 无文件选择、无映射、无预览 | 演示账号无法把"示例数据"自动灌入 |
| **后端命令** | `team_commands.rs` 已有 `import_team`（JSON），`ceo_commands.rs` 已有 `import_company_config`（JSON） | 无商品/库存/订单导入命令 | 后端能力不通用 |
| **数据库** | `product_spus` / `product_skus` / `product_images` / `product_categories` / `brands` / `inventory_transactions` / `purchase_orders` / `sales_orders` / `suppliers` / `customers` 全部就位 | 无 `import_batches` / `import_errors` 审计表 | 失败无追溯 |

### 1.2 核心痛点

1. **冷启动数据迁移成本高**：新装 ProClaw 的商户，普遍存在 500~50,000 条历史商品 / 库存 / 订单数据；当前只能逐条手工录入，效率极低
2. **格式零规范**：用户用 Excel/CSV 管理商品时表头五花八门（如"品名"vs"商品名称"vs"产品名"），缺乏自动字段匹配
3. **失败无回滚**：单条数据错误即打断全流程，无分批 / 跳过 / 重试机制
4. **图片无渠道**：商品图片通常散落在用户文件夹，缺乏"图片列 → 自动上传 → 关联 SPU"链路
5. **重复数据难处理**：同一份商品数据二次导入时，无 SKU/SPU/条形码的去重策略
6. **演示账号无法"一键铺货"**：`DataImportStep` 是空壳，首次启动只能看到空表

### 1.3 改造目标

构建一套**通用、可恢复、可观测**的商品数据导入能力：

- 支持 **3 种主流通用格式**（`.xlsx` / `.csv` / `.json`），覆盖中小企业 95% 的现有数据形态
- 实现 **3 类业务对象**（商品库 / 库存交易 / 经销历史）的批量导入
- 提供 **可视化字段映射 + 实时预览 + 增量校验**，单文件 1 万行可在 60s 内完成
- 与现有 **SPU-SKU 架构**、**供应链状态机**、**Tauri 离线优先**约束完全兼容
- 全部导入过程**可回滚、可审计、可重试**

---

## 二、用户故事

| 编号 | 用户角色 | 需求 | 业务目的 |
|---|---|---|---|
| US-01 | 店主 | 我能把 Excel 里的 5000 个 SKU 一次性导入商品库，并自动按 SPU 分组 | 完成冷启动数据迁移 |
| US-02 | 仓管员 | 导入库存盘点表时，缺货的行被标记但不阻断，可"仅导入有效行" | 不让一条错误毁掉整批导入 |
| US-03 | 采购员 | 导入采购历史时，系统自动按供应商名称匹配/创建供应商 | 减少手工二次录入 |
| US-04 | 销售员 | 导入历史销售订单时，自动按客户手机号匹配/创建客户档案 | 完善 CRM 数据 |
| US-05 | 店主 | 我能看到导入进度条（已处理 / 总数 / 预计剩余时间）和当前错误数 | 安心等待大批量导入 |
| US-06 | 店主 | 导入失败时，我能看到具体哪一行、哪个字段、什么原因，并下载错误报告 | 可在 Excel 中修改后再次导入 |
| US-07 | 店主 | 同一份数据二次导入时，弹窗询问"覆盖 / 跳过 / 创建副本" | 避免误覆盖 |
| US-08 | 店主 | 导入商品时附带一个 zip 包里的图片，系统自动按文件名匹配 SPU 并上传 | 一站式完成商品+图片 |
| US-09 | 演示用户 | 在 Setup Wizard 的"导入示例数据"步骤，一键导入演示数据集 | 立即看到 ProClaw 的完整能力 |
| US-10 | AI CEO Agent | 用户问"帮我把这份销售记录导入进去"时，Agent 自主调用导入工具链 | 与智能体生态联动 |
| US-11 | 财务 | 导入后能立即在应付/应收台账里看到对应记录（前提：供应商/客户已存在） | 财务对账闭环 |
| US-12 | 店主 | 导入过程中我可以暂停、取消，已导入部分回滚或保留可配置 | 大批量导入有"后悔药" |

---

## 三、功能需求详述

### 3.1 P0 — 商品库（SPU+SKU）批量导入（核心）

#### 3.1.1 支持的导入目标

| 目标表 | 必填字段 | 可选字段 | 行粒度 |
|---|---|---|---|
| `product_spus` | `name` | `spu_code`（缺省自动生成）、`description`、`category_name`（按名匹配/创建）、`brand_name`（按名匹配/创建）、`unit`、`is_on_sale`、`status` | 1 行 = 1 个 SPU |
| `product_skus` | `spu_name` 或 `spu_code` | `sku_code`、`spec_text`、`specifications`（JSON 字符串）、`cost_price`、`sell_price`、`current_stock`、`min_stock`、`max_stock`、`barcode`、`weight`、`volume` | 1 行 = 1 个 SKU |
| `product_images` | `spu_name` 或 `spu_code`、`image_url` 或 `image_filename`（zip 内） | `image_type`（main/gallery/detail）、`sort_order`、`is_primary` | 1 行 = 1 张图 |

> 简化模式：用户**只填 1 行 = 1 个 SPU+1 个默认 SKU**（未提供 SKU 行时自动创建默认 SKU），降低模板门槛。

#### 3.1.2 字段映射模式

| 模式 | 触发条件 | 行为 |
|---|---|---|
| **同名字段自动匹配** | Excel 表头与 ProClaw 字段名（中英文 + 别名）完全一致 | 字段 1:1 绑定，无需用户操作 |
| **模糊匹配** | 表头语义相似（如"品名"→`name`、"售价"→`sell_price`） | 自动高置信度绑定（≥0.85），中置信度（0.6~0.85）需用户确认 |
| **手动映射** | 自动匹配失败 / 用户希望覆盖 | 提供下拉框，列出所有目标字段，可选"忽略此列" |

**内置中英文别名词典**（节选）：

| 目标字段 | 中文别名 | 英文别名 |
|---|---|---|
| `name` | 商品名称、名称、品名、产品名、货品名 | name, product_name, item, title |
| `sku_code` | SKU 编号、SKU、商品编码、规格编号 | sku, sku_code, item_code |
| `cost_price` | 成本价、进价、采购价、进货价 | cost, cost_price, purchase_price |
| `sell_price` | 销售价、零售价、售价、出货价 | price, sell_price, retail_price |
| `current_stock` | 库存、库存数量、当前库存、剩余库存 | stock, qty, quantity, inventory |
| `category_name` | 分类、商品分类、品类 | category, type |
| `brand_name` | 品牌 | brand |
| `barcode` | 条形码、条码、EAN、UPC | barcode, ean, upc |

#### 3.1.3 图片导入 ✅ v1.3 已实现

| 场景 | 方案 |
|---|---|
| **图片 URL 模式** | Excel 列 `image_url` 直接填 HTTPS 链接，导入时下载到本地 `app_data/images/{spu_id}/` |
| **图片 zip 包模式** 🟢 v1.3 | 用户同时上传 `products.xlsx` + `images.zip`，后端 `import_extract_images` 按 SHA-256 解压到 `<app_data>/import_images/<hash>/`；`image_filename` 列在 zip 内匹配同名文件，命中后复制到 `<app_data>/product_images/<spu_id>/` 并写 `image_url = "local://<spu_id>/<filename>"` + `sync_status = 'local'` |
| **多图支持** | `image_url` 列支持分号 `;` 或换行符分隔多个 URL，第 1 个默认主图 |
| **格式与大小限制** | JPG/PNG/WebP；单图 ≤ 2MB；总 zip ≤ 200MB（可在 `import_zip_max_size` 配置项调整） |
| **失败降级** | 单图下载/匹配失败仅记录 warning，最终报告标"image not found in archive"；UI 通过 `generateImportGuidance` 的 `image_missing` 分类提示 |

#### 3.1.4 SPU 去重与冲突策略

| 标识 | 优先级 | 重复时策略 |
|---|---|---|
| `spu_code` | 高 | 必填且唯一；存在冲突时按用户选择 |
| `name + brand_id` | 中 | 同品牌同名视为重复 |
| `name` | 低 | 仅 `name` 也视重复（兜底） |

冲突处理三选项（导入前用户必选）：

- **覆盖**：`UPDATE` 已有记录，全字段替换
- **跳过**：保留旧数据，整行不导入（计入"跳过数"）
- **创建副本**：`spu_code` 加 `_copy2`、`_copy3`…后缀，保留新旧

---

### 3.2 P0 — 库存交易（inventory_transactions）批量导入 ✅ v1.2 P1 已实现

#### 3.2.1 导入目标

| 目标表 | 必填字段 | 可选字段 |
|---|---|---|
| `inventory_transactions` | `sku_code`（按编码匹配）、`transaction_type`（inbound / outbound / adjustment / transfer）、`quantity` | `unit_price`、`transaction_date`（缺省 = 今天）、`reference_no`（如 PO 编号）、`notes`、`operator` |

#### 3.2.2 业务规则

- 库存交易导入**只追加**，不覆盖、不修改已有交易
- `transaction_type=outbound` 时若 `current_stock < quantity` → 标 warning（按 `ProClaw 灵活库存 v12.0` 允许负库存）
- 导入完成后自动重算 `product_skus.current_stock` 视图（无需手动刷新）
- 单次导入上限：100,000 条（分批 5,000 条/批处理）

---

### 3.3 P0 — 历史采购单（purchase_orders + items）批量导入 ✅ v1.2 P1 已实现

#### 3.3.1 导入目标

| 目标表 | 必填字段 | 可选字段 |
|---|---|---|
| `purchase_orders` | `po_number`、`supplier_name`（按名匹配/创建）、`order_date` | `expected_date`、`status`（缺省 `received`）、`total_amount`、`notes` |
| `purchase_order_items` | `po_number`、`sku_code`、`quantity`、`unit_price` | `spec_text`、`subtotal` |

#### 3.3.2 业务规则

- 同一 `po_number` 多行 items 自动聚合为 1 个订单
- `status=received` 时自动写入 `inventory_transactions`（inbound），按 `SUPPLY_CHAIN_ENHANCEMENT_PRD` 流程
- `supplier_name` 不存在时弹窗确认"自动创建"或"中止"
- 重复 `po_number` 按 P0 §3.1.4 冲突策略处理

---

### 3.4 P0 — 历史销售单（sales_orders + items）批量导入 ✅ v1.2 P1 已实现

类似 §3.3，但目标为销售侧：

| 目标表 | 必填字段 | 业务规则 |
|---|---|---|
| `sales_orders` | `so_number`、`customer_name`（按手机/名匹配/创建）、`order_date` | `status=delivered` 时自动 outbound |
| `sales_order_items` | `so_number`、`sku_code`、`quantity`、`unit_price` | 客户匹配优先级：手机号 > 名称 |

---

### 3.5 P1 — 供应商 / 客户主数据导入 ✅ v1.2 P1 已实现

- `suppliers` 导入：`name`（必填）、`contact_person`、`phone`、`email`、`address`、`tax_id`、`notes`
- `customers` 导入：`name`（必填）、`phone`（推荐）、`email`、`address`、`level`、`notes`
- 主数据导入**作为 P0 的依赖**自动调用（§3.3/3.4 中按名匹配失败时触发）

---

### 3.6 P1 — 导入任务中心（Import Center）✅ v1.3 已实现

统一管理所有历史/正在进行的导入任务：

| 元素 | 说明 |
|---|---|
| 任务列表 | ID、文件名、目标表、状态（pending / importing / **paused** 🟢 v1.3 / **retrying** 🟢 v1.3 / success / partial / failed / **cancelled** 🟢 v1.3）、开始时间、耗时、行统计、错误数 |
| 任务详情 | 进度条（`processed_rows` 🟢 v1.3）、当前阶段（解析 / 映射 / 校验 / 导入）、实时日志、错误样本 |
| 任务操作 | 🟢 v1.3 全部实现：**暂停**（paused, 记录 paused_reason + last_heartbeat_at）/**继续**（paused → pending）/**取消**（cancelled, finished_at 标记）/**重试**（failed/partial/cancelled → 复制元数据创建新 batch）/**回滚**（DELETE 本 batch 已写入记录）/**下载错误报告**（CSV 含 UTF-8 BOM） |
| 入口 | `/import-center` 路由 + `/import-center/:batchId` 详情模式；侧边栏导航；多维度过滤（状态多选 / 目标多选 / 日期范围 / 文件名快速搜索） + 分页（PAGE_SIZE=20） |
| 数据库 | `import_batches` 状态机扩展 CHECK 约束（SQLite DROP+RECREATE 重建表，061 迁移），新增 `last_heartbeat_at` / `processed_rows` / `paused_reason` 3 列 |
| 测试 | 14 个 Rust 状态机测试（pending/importing/retrying ↔ paused/cancelled 全矩阵）+ 11 个 Vitest（列表/过滤/分页/操作按钮）+ 11 个 Playwright E2E |

---

### 3.7 P1 — 模板下载与示例数据 ✅ v1.3 已实现

| 模板 | 文件名 | 列数 | 用途 |
|---|---|---|---|
| 商品导入模板 | `products-template.xlsx` 🟢 v1.3 | 28 列（含 `image_filename`） | 用户下载后填入真实数据，列名与 `REQUIRED_PRODUCT_FIELDS` 对齐 |
| 库存交易导入模板 | `inventory-template.xlsx` 🟢 v1.3 | 9 列 | 盘点场景：sku_code / transaction_type / quantity / unit_cost / transaction_date / location_code / reference_no / supplier_code / notes |
| 采购订单导入模板 | `purchases-template.xlsx` 🟢 v1.3 | 8 列 | 经销商冷启动：order_no / supplier_name / ordered_at / expected_at / status / total_amount / items_json / notes |
| 销售订单导入模板 | `sales-template.xlsx` 🟢 v1.3 | 8 列 | 经销商冷启动：order_no / customer_name / ordered_at / status / total_amount / payment_method / items_json / notes |
| 供应商+客户主数据模板 | `suppliers-customers-template.xlsx` 🟢 v1.3 | 双 sheet（10+11 列） | 一次性导入主数据，作为采购/销售/库存的外键依赖 |
| 完整示例数据集 | `examples.zip` 🟢 v1.3 | 5 套模板 + 10 张占位图 + README | Setup Wizard 一键铺货 + 离线演示 |

**资源打包与首次启动**：

- 构建期：`npm run build:templates` 调 `scripts/build-import-templates.mjs` 用 `xlsx` 包生成 5 套 + JSZip 打包 examples.zip
- 输出位置：`public/templates/`（vite 直接打包进静态资源）
- 首次启动：`main.rs` setup 钩子调 `import_setup_templates`，按优先级从 `<exe_dir>/resources/templates/`（prod）→ `../../../public/templates/`（dev，target/debug/proclaw-desktop.exe 向上 3 层）→ `CARGO_MANIFEST_DIR/../public/templates/`（test）复制到 AppData
- 已存在文件跳过（保护用户自定义）

**模板下载入口**：

- 导入向导 Step 1 下方新增 `TemplateDownloadPanel`（折叠面板，默认展开）：列出 5 套模板 + 计数器 + 每行"下载"按钮 + 底部"下载完整示例数据集"
- 后端命令 `import_list_templates` / `import_get_template_bytes(name)` / `import_get_examples_zip` + 前端 `listTemplates` / `getTemplateBytes` / `getExamplesZip` 包装
- 保存走 `tauri-plugin-dialog` + `tauri-plugin-fs::writeFile`，零浏览器 BlobURL 依赖

---

### 3.8 P1 — AI 智能引导联动 ✅ v1.3 已实现

**Step 3 缺字段 AI 气泡** 🟢 v1.3：

- 位置：`Step3FieldMapping`，顶部新增"AI 推荐映射"按钮 + 当必填字段缺失时显示 `Alert severity="info"` 气泡
- 触发：`generateImportGuidance(targetType, fakeMissingRequiredErrors, headers)` → 取 `missing_required` 类
- 一键填充：复用 `fieldMatcher.matchColumns`，仅填充置信度 ≥ 0.8 且当前未映射的源列，不覆盖用户手动指定
- AI Hint：基于 ALIAS_HINTS 字典在用户 headers 中找疑似别名（如"商品名称"→ name）展示
- Action Link：根据 `targetType` 提供下载模板跳转（`/products?downloadTemplate={name}`）

**Step 7 失败 AI 排查面板** 🟢 v1.3：

- 位置：`Step7Progress`（导入完成态 + failed_rows > 0 时显示）
- 折叠面板默认展开：标题"AI 帮你排查" + 类别计数 chip（如"4 类问题"）
- 内部：`generateImportGuidance(result.errors, headers).slice(0, 5)` 取 top 5 引导
- 每条引导：category chip + title + suggestion + 💡 aiHint + 可选 actionButton
- 底部"查看完整错误报告"按钮跳转 `/import-center/:batchId`

**`generateImportGuidance` 8 类内置规则** 🟢 v1.3（纯函数，无 LLM 依赖）：

| Category | 错误码前缀 | 典型场景 | 引导动作 |
|---|---|---|---|
| `missing_required` | MISSING_REQUIRED / REQUIRED_FIELD_EMPTY | 必填字段未映射 | 下载模板 + 一键 AI 填充 |
| `mapping_conflict` | MAPPING_ / AMBIGUOUS_MAPPING | 多源列映射到同一目标 | 提示手动指定唯一映射 |
| `duplicate_row` | DUPLICATE_ / ROW_DUPLICATE | 已有数据冲突 | 建议调整冲突策略 |
| `reference_missing` | SKU_NOT_FOUND / SUPPLIER_NOT_FOUND / CUSTOMER_NOT_FOUND / REFERENCE_ | 外键引用了不存在的对象 | 提示先导入主数据 |
| `value_out_of_range` | OUT_OF_RANGE / VALUE_OUT_OF_RANGE / NEGATIVE_QTY | 数值越界 | 检查源数据 |
| `date_format` | DATE_ / INVALID_DATE / DATE_PARSE_FAIL | 日期格式不规范 | 建议 ISO 8601 |
| `encoding_unknown` | ENCODING_ / INVALID_ENCODING / BOM_MISSING | 编码无法识别 | 建议 UTF-8 / GB18030 |
| `image_missing` | IMAGE_ / IMAGE_NOT_FOUND | 图片在 zip 内找不到 | 下载商品图片示例 |

**关键设计决策**：

- 同类聚合：返回数组每条唯一对应一个 category，affectedRows = 受影响行数（去重）
- 按 affectedRows 降序，UI 可直接展示无需排序
- 45 个 Vitest 覆盖：每类 2-3 个 case + 聚合/排序/边界 + 6 个 targetType 适配 + AI Hint 别名 + 接口契约

---

### 3.9 P2 — 高级特性

| 编号 | 功能 | 说明 |
|---|---|---|
| AD-01 | **多文件合并** | 用户拖入 5 个 xlsx，系统按 SPU 名称合并去重 |
| AD-02 | **定时导入** | 配合 SFTP/Webhook，自动从第三方系统拉取并导入（参考 `ARCHITECTURE_LAYERING_PRD`） |
| AD-03 | **导入历史对比** | 同一 SPU 在 v1.1.2 与 v1.2.0 两次导入间显示差异 diff |
| AD-04 | **Excel 公式保留** | `sell_price = cost_price * 1.3` 这类公式在导入时计算结果值（默认），可配置保留公式 |
| AD-05 | **导入回写** | 导入完成后在原 Excel 右侧追加"导入结果"列（成功/失败/新建 ID） |
| AD-06 | **AI 智能推断** | Agent 自动建议字段映射（如检测到"产地"列建议映射到 `metadata.产地`） |
| AD-07 | **导入审计日志** | `import_audit_log` 表记录操作者、IP、时间、文件 hash、影响行数；保留 365 天 |

---

## 四、数据格式规范

### 4.1 Excel（.xlsx / .xlsm）

#### 4.1.1 文件结构约定

- **多 sheet 支持**：`产品导入`（主）+ `字典`（分类/品牌/供应商/客户可选） + `示例`（用户可删）
- **首行约定**：表头必须位于第 1 行；从第 2 行开始为数据
- **空行处理**：空行被自动跳过，计入"跳过数"
- **最大尺寸**：单文件 ≤ 50MB；超出时引导用户拆文件

#### 4.1.2 单元格类型识别

| 目标字段 | 接受类型 | 识别规则 |
|---|---|---|
| 价格类（cost_price/sell_price） | 数字 / 文本数字 | 自动去除 `¥` `$` `,` 前缀；负数报错 |
| 库存类（current_stock） | 整数 / 小数 | 小数取整（warning） |
| 日期类（order_date/transaction_date） | Excel 日期 / ISO 8601 / `YYYY-MM-DD HH:mm:ss` | 无法识别时报错并提示正确格式 |
| 布尔类（is_on_sale/is_active） | TRUE/FALSE、是/否、1/0、Y/N | 不匹配时报错 |
| 文本类（name/description/notes） | 任意文本 | 长度 ≤ 65535 字符 |
| JSON 类（specifications） | 文本 | 必须为合法 JSON，否则报错 |

#### 4.1.3 错误行级标注

导入后系统在原文件追加 **"导入结果"列**：

| 列内容 | 含义 |
|---|---|
| ✅ 成功（新建） | SPU/SKU 编号：xxx |
| ✅ 成功（覆盖） | 原 ID：xxx |
| ⏭ 跳过 | 原因：xxx |
| ❌ 失败 | 行号 N：字段 `xxx` - 原因 |

> 此特性对应 §3.9 AD-05。

---

### 4.2 CSV

#### 4.2.1 编码与分隔符自动检测

| 检测项 | 优先级 | 备选 |
|---|---|---|
| 编码 | UTF-8 BOM > UTF-8 > GBK | Windows 默认 GBK 兼容 |
| 分隔符 | `,` `;` `\t` | 自动嗅探（首行分隔符出现频次） |
| 引号 | `"..."` 支持转义 `""` | RFC 4180 |
| 换行 | `\r\n` / `\n` / `\r` | 自动归一化 |

#### 4.2.2 大小与性能

- 单文件 ≤ 200MB
- 使用 Web Worker + 流式解析，避免阻塞主线程
- 解析与导入分两阶段：先解析到内存（轻量），再分批导入（可暂停）

---

### 4.3 JSON

#### 4.3.1 支持的 Schema

**Array-of-Objects（推荐，最通用）**：

```json
[
  {
    "name": "可口可乐 330ml",
    "brand": "可口可乐",
    "category": "饮料",
    "skus": [
      {
        "sku_code": "CC-330-001",
        "spec": "原味/罐装",
        "cost_price": 1.5,
        "sell_price": 3.0,
        "current_stock": 100,
        "barcode": "6901234567890"
      }
    ],
    "images": ["https://example.com/cc.jpg"]
  }
]
```

**ProClaw 备份格式（与 `exportProducts()` 对称）**：

```json
{
  "version": "1.0",
  "exported_at": "2026-06-26T10:00:00Z",
  "exported_by": "user-id",
  "data_type": "products",
  "items": [ /* Array-of-Objects */ ]
}
```

#### 4.3.2 校验

- 顶层必须是 Array 或带 `items` 字段的 Object
- 单文件最大 50,000 条 / 100MB
- 解析失败返回精确的 JSON 路径（如 `items[3].skus[0].sell_price`）

---

### 4.4 图片包（.zip）

| 约束 | 值 |
|---|---|
| 格式 | JPG / PNG / WebP / GIF |
| 大小限制 | 单图 ≤ 2MB；总包 ≤ 200MB（可配置） |
| 文件名规范 | 允许中文/英文/数字；推荐以 SKU 编码或 SPU 名称命名 |
| 目录结构 | 支持嵌套；按文件名（不含路径）匹配 |
| 安全校验 | 拒绝 zip slip 攻击（路径穿越）；拒绝加密 zip |

---

## 五、导入流程设计

### 5.1 总体流程图

```
┌─────────────┐
│  触发入口    │   ─── 商品库/库存/采购/销售页"导入"按钮
└──────┬──────┘        Setup Wizard 第 3 步
       │               AI 智能引导 `data_operation` 意图
       │               Import Center "新建任务"
       ▼
┌─────────────────┐
│ Step1: 选文件    │ ─── 拖拽 / 选择 .xlsx/.csv/.json/.zip
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Step2: 选目标    │ ─── 商品库 / 库存 / 采购 / 销售 / 供应商 / 客户
└──────┬──────────┘
       │  （自动推荐：根据表头关键词推断）
       ▼
┌────────────────────────┐
│ Step3: 字段映射        │ ─── 表格化 UI：左=源列 中=目标字段 右=示例值
│  ┌──────┬──────┬────┐ │     颜色：高置信=绿/中=黄/低=红
│  │源列  │目标  │示例│ │
│  │品名  │name  │可口│ │
│  │售价  │sell_…│3.0 │ │
│  └──────┴──────┴────┘ │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│ Step4: 数据预览        │ ─── 前 10 行 + 校验结果
│  ✅ 行 1：通过          │     实时显示每行的错误/警告
│  ⚠️ 行 2：库存为负      │
│  ❌ 行 3：缺少必填 name │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│ Step5: 冲突策略         │ ─── 覆盖 / 跳过 / 创建副本（多选）
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│ Step6: 确认并开始      │ ─── 摘要：共 N 行 / 预计 M 秒
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│ Step7: 实时进度         │ ─── 进度条 / 当前行 / 速度 / ETA
│  ████████░░░░ 65%      │     错误数 / 跳过数
│  3,250/5,000 行         │     [暂停] [取消] [查看日志]
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│ Step8: 完成报告        │ ─── 成功 N / 失败 M / 跳过 K
│  下载：✅成功.xlsx      │     [查看详情] [重试失败行]
│  下载：❌错误报告.xlsx  │
└────────────────────────┘
```

### 5.2 各步骤详细规范

#### Step 1：选文件

- **拖拽支持**：直接拖文件到对话框
- **多文件支持**：可同时选多文件，每个文件独立任务
- **格式识别**：根据扩展名 + 文件签名（如 `.xlsx` = ZIP 头 PK\x03\x04）双重验证
- **大小限制提示**：超出限制时引导"拆文件"或"使用 API 导入"

#### Step 2：选目标

- 自动推荐：根据表头关键词（如含"采购单号"→采购目标）
- 手动选择：6 个目标单选
- 模板联动：选择"商品库"后展示"下载商品模板"按钮

#### Step 3：字段映射

UI 表格（3 列）：

| 源列（用户文件） | → | 目标字段 | 示例值 | 操作 |
|---|---|---|---|---|
| 品名 | → | `name`（高置信） | 可口可乐 330ml | [修改] [忽略] |
| 售价 | → | `sell_price`（高置信） | 3.0 | [修改] [忽略] |
| 备注 | → | _(未匹配)_ | （空） | [选择字段] [忽略] |

底部提供：
- "重置为自动匹配" 按钮
- "保存为我的模板" 按钮（保存到 `import_templates` 表，跨设备同步到云端）

#### Step 4：数据预览

- 前 10 行渲染为可滚动表格
- 每行右侧显示：✅ 通过 / ⚠️ 警告（hover 看原因） / ❌ 失败（点击看详情）
- 顶部统计：总计 N / 通过 X / 警告 Y / 失败 Z
- 失败行可"下载错误报告"提前修改

#### Step 5：冲突策略

- 默认策略：跳过（安全）
- 可选：覆盖 / 创建副本 / 中止（任一冲突即停止）
- 对所有重复标识（spu_code/sku_code/po_number/so_number）生效

#### Step 6：确认

- 显示摘要：共 N 行 / 预计 M 秒 / 目标表 / 冲突策略 / 映射摘要
- 显示警告：大批量（>10,000 行）需二次确认

#### Step 7：实时进度

- 进度条 + 行号 + 速度（行/秒）+ ETA
- 错误数 / 跳过数 / 成功数 实时更新
- 可暂停/取消：
  - 暂停：保存断点（行号 + 任务 ID），可继续
  - 取消：弹窗确认"已导入部分回滚 / 保留"
- 日志可展开：每 100 行滚动一次日志（避免 UI 卡顿）

#### Step 8：完成报告

- 顶部摘要卡片：成功 N / 警告 M / 失败 K
- 操作按钮：查看 Import Center / 下载成功记录 / 下载错误报告 / 再来一次
- 自动跳转 Import Center，任务进入历史列表

---

## 六、数据验证机制

### 6.1 三级校验

| 级别 | 触发时机 | 阻断？ | 示例 |
|---|---|---|---|
| **L1 格式校验** | 文件解析后立即 | ❌ 阻断 | 文件损坏、列缺失、字段类型不匹配 |
| **L2 业务校验** | 字段映射完成后 | ⚠️ 仅警告 | 库存为负、售价 < 成本价、分类不存在 |
| **L3 引用校验** | 导入前预检查 | ❌ 阻断 | 外键关联失败（如 SKU 编码未在 SPU 表中） |

### 6.2 校验规则清单

#### 6.2.1 通用规则

| 规则 | 级别 | 错误信息模板 |
|---|---|---|
| 必填字段为空 | L1 | `字段 {name} 不能为空` |
| 字段类型不匹配 | L1 | `字段 {name} 必须是 {type}，当前值：{value}` |
| 字段长度超限 | L1 | `字段 {name} 长度 {len} 超过限制 {maxLen}` |
| 数值范围越界 | L1 | `字段 {name} 值 {value} 超出范围 [{min}, {max}]` |
| 重复键冲突 | L1 | `与已有记录的 {unique_key} 重复` |

#### 6.2.2 业务规则（按目标表）

**商品库**：

| 规则 | 级别 | 描述 |
|---|---|---|
| SPU 名称长度 | L1 | 1~100 字符 |
| SKU 编码唯一 | L1 | 同 SPU 下唯一 |
| sell_price ≥ 0 | L1 | 不能为负 |
| cost_price ≤ sell_price × 10 | L2 | 提示可能定价错误 |
| min_stock ≤ max_stock | L1 | 库存上下限矛盾 |
| barcode 格式 | L1 | EAN-13/UPC-A/Code-128 校验 |
| 图片存在性 | L2 | URL 不可达时仅警告 |

**库存交易**：

| 规则 | 级别 | 描述 |
|---|---|---|
| SKU 存在 | L1 | 必填且已在 `product_skus` |
| quantity ≠ 0 | L1 | 数量不能为 0 |
| transaction_type 合法 | L1 | inbound / outbound / adjustment / transfer |
| transaction_date 合法 | L1 | 不能晚于今天 + 30 天 |

**采购/销售单**：

| 规则 | 级别 | 描述 |
|---|---|---|
| 订单号唯一 | L1 | 同表内唯一 |
| 供应商/客户存在 | L2 | 不存在时弹窗确认是否自动创建 |
| 明细数量合理 | L1 | > 0 |
| 总金额 = Σ明细 | L2 | 不一致时仅警告（用户可手动修正） |

---

## 七、异常处理与回滚

### 7.1 异常分类

| 类别 | 例子 | 用户感知 | 系统行为 |
|---|---|---|---|
| **可恢复错误** | 临时网络抖动、图片下载超时 | toast 重试提示 | 最多重试 3 次 |
| **业务错误** | 必填字段为空、外键不存在 | 行级错误标注 | 单行失败可跳过 |
| **致命错误** | 文件损坏、数据库连接断开 | 全局弹窗 + 自动暂停 | 保存断点，提示重试 |
| **用户取消** | 点击取消按钮 | 弹窗确认 | 询问回滚范围 |

### 7.2 回滚策略

| 范围 | 触发条件 | 行为 |
|---|---|---|
| **行级回滚** | 单行 L1 错误 | 整行跳过，计入"失败数" |
| **批次回滚** | 整批 5,000 行全部失败 | 自动跳过该批次，继续下一批 |
| **任务级回滚** | 致命错误 / 用户选择"回滚已导入部分" | DELETE 本次任务所有插入的记录，按 `import_batch_id` |
| **不导入部分** | 用户取消时选择"保留已导入" | 任务标记 `partial`，已导入部分保留 |

### 7.3 错误报告格式

#### 7.3.1 错误报告 Excel

- Sheet 1: `错误汇总`（每行 1 个错误）
- Sheet 2: `原始数据`（含导入结果列）
- Sheet 3: `统计`（按错误类型分组计数）

| 列 | 说明 |
|---|---|
| 原始行号 | 用户文件中的行号 |
| 字段 | 出错的字段名 |
| 原值 | 用户填写的值 |
| 错误级别 | L1 / L2 / L3 |
| 错误码 | `REQUIRED_EMPTY` / `TYPE_MISMATCH` / `DUPLICATE_KEY` 等 |
| 错误信息 | 中文友好提示 |
| 修复建议 | 建议用户如何修改 |

#### 7.3.2 修复后再导入

- 错误报告文件可作为"修复版"再次上传
- 系统自动跳过 ✅ 成功行（基于 `original_row_index`）
- 仅重试 ❌ 失败行

---

## 八、性能优化

### 8.1 性能指标

| 指标 | 目标 | 测量条件 |
|---|---|---|
| **小批量导入**（≤1,000 行） | < 10s | i5/8GB 内存，SQLite 本地 |
| **中批量导入**（1,000~10,000 行） | < 60s | 同上 |
| **大批量导入**（10,000~100,000 行） | < 10min | 同上 |
| **进度更新延迟** | < 200ms | Web Worker + 节流上报 |
| **内存占用** | < 500MB | 50,000 行 Excel 解析峰值 |
| **暂停响应时间** | < 1s | 用户点击暂停到真正停止 |

### 8.2 优化手段

| 手段 | 适用场景 | 实现 |
|---|---|---|
| **流式解析** | 大 Excel / CSV | `xlsx` 库 `sheet_to_json` + 分块；CSV 自实现流式解析器 |
| **Web Worker** | 大文件解析 | 解析在 Worker 中进行，主线程仅显示进度 |
| **批量 INSERT** | 大量 INSERT | 5,000 条/批，事务包裹 |
| **预编译语句** | 重复 INSERT | 准备语句复用 |
| **WAL 模式** | SQLite 读写并发 | 导入时启用 WAL，避免阻塞查询 |
| **去重预查询** | 大量更新 | 先 `SELECT id WHERE spu_code IN (...)` 一次，内存中建索引 |
| **图片异步** | 带图导入 | 图片上传独立队列，不阻塞数据导入 |
| **进度节流** | 频繁更新 | 100ms 内仅更新 1 次 UI |
| **任务队列** | 多任务并发 | 单任务串行；多任务可配置并发数（默认 2） |

### 8.3 资源限制

| 资源 | 限制 | 可配置 |
|---|---|---|
| 单文件大小 | 50MB（Excel）/ 200MB（CSV）/ 100MB（JSON）/ 200MB（zip） | ✅ `import_file_size_limits` |
| 单任务行数 | 100,000 | ✅ `import_max_rows` |
| 并发任务数 | 2 | ✅ `import_concurrent_limit` |
| Web Worker 数量 | 2 | 系统限制 |
| 内存占用 | 500MB | 系统限制 |

---

## 九、技术实现计划

### 9.1 后端（Tauri / Rust）

#### 9.1.1 新增模块

```
src-tauri/src/
├── import/
│   ├── mod.rs              # 模块入口
│   ├── commands.rs         # Tauri commands
│   ├── parser.rs           # 文件解析（xlsx/csv/json）
│   ├── mapper.rs           # 字段映射引擎
│   ├── validator.rs        # 三级校验
│   ├── executor.rs         # 分批执行器
│   ├── rollback.rs         # 任务级回滚
│   └── templates.rs        # 模板下载
```

#### 9.1.2 新增 Tauri Commands

| 命令 | 功能 | 入参 | 出参 |
|---|---|---|---|
| `parse_import_file` | 解析文件，返回预览数据 | `file_path`, `file_type` | `{columns, sample_rows, total_rows}` |
| `apply_field_mapping` | 应用用户映射 | `batch_id`, `mapping` | `{mapped_data, validation_errors}` |
| `start_import_task` | 启动导入任务 | `batch_id`, `conflict_strategy` | `{task_id}` |
| `pause_import_task` | 暂停任务 | `task_id` | `{success}` |
| `resume_import_task` | 继续任务 | `task_id` | `{success}` |
| `cancel_import_task` | 取消任务 | `task_id`, `rollback` | `{success}` |
| `get_import_task_status` | 任务状态 | `task_id` | `{status, progress, ...}` |
| `list_import_tasks` | 任务列表 | `filter, page` | `[{task}]` |
| `export_import_template` | 导出模板 | `target_type` | `file_path` |
| `get_import_templates` | 我的模板 | `user_id` | `[{template}]` |
| `save_import_template` | 保存模板 | `template` | `{template_id}` |

#### 9.1.3 新增数据库表

```sql
-- 030_import_batches.sql
CREATE TABLE IF NOT EXISTS import_batches (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_hash TEXT,                          -- SHA256
    file_size INTEGER,
    file_type TEXT,                          -- xlsx/csv/json
    target_type TEXT NOT NULL,               -- products/inventory/purchase/sales/suppliers/customers
    mapping_json TEXT,                       -- 字段映射（JSON）
    conflict_strategy TEXT DEFAULT 'skip',   -- skip/overwrite/duplicate/abort
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','parsing','mapping','validating','importing','paused','success','partial','failed','cancelled')),
    total_rows INTEGER DEFAULT 0,
    success_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    skipped_rows INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    error_report_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS import_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    target_type TEXT NOT NULL,
    mapping_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS import_audit_logs (
    id TEXT PRIMARY KEY,
    batch_id TEXT REFERENCES import_batches(id),
    user_id TEXT,
    action TEXT,                             -- start/pause/resume/cancel/retry
    details TEXT,                            -- JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 9.2 前端（React + TypeScript）

#### 9.2.1 新增组件

```
src/components/DataImport/
├── ImportWizard.tsx              # 主向导（7 步）
├── ImportCenter.tsx              # 导入中心
├── ImportTaskCard.tsx            # 任务卡片
├── ImportProgressBar.tsx         # 进度条
├── FileDropzone.tsx              # 文件拖拽
├── FieldMappingTable.tsx         # 字段映射表格
├── DataPreviewTable.tsx          # 数据预览
├── ConflictStrategySelector.tsx  # 冲突策略选择
├── ImportSummaryDialog.tsx       # 完成报告
└── TemplateDownloadButton.tsx    # 模板下载
```

#### 9.2.2 新增服务

```
src/lib/importers/
├── types.ts                      # 公共类型
├── excelImporter.ts              # xlsx 解析（基于 xlsx/SheetJS）
├── csvImporter.ts                # CSV 解析（基于 papaparse）
├── jsonImporter.ts               # JSON 解析
├── fieldMatcher.ts               # 字段匹配（别名 + 模糊）
├── validator.ts                  # 校验规则
├── errorReporter.ts              # 错误报告生成
└── __tests__/                    # 单元测试
    ├── excelImporter.test.ts
    ├── csvImporter.test.ts
    ├── jsonImporter.test.ts
    ├── fieldMatcher.test.ts
    └── validator.test.ts

src/lib/services/
└── importService.ts              # 与 Tauri commands 桥接
```

#### 9.2.3 修改文件

| 文件 | 改动 |
|---|---|
| `src/pages/ProductsPage.tsx` | 工具栏"导入"按钮 + ImportWizard 入口 |
| `src/pages/InventoryPage.tsx` | 同上 |
| `src/pages/PurchasePage.tsx` | 同上 |
| `src/pages/SalesPage.tsx` | 同上 |
| `src/pages/SuppliersPage.tsx` | 同上（主数据） |
| `src/pages/CustomersPage.tsx` | 同上（主数据） |
| `src/components/SetupWizard/DataImportStep.tsx` | 替换为 ImportWizard 的"快速模式" |
| `src/lib/aiGuide.ts` | §3.8 增强意图识别 |
| `src/components/Layout/Sidebar.tsx` | 新增"导入中心"导航 |
| `src/pages/ImportCenterPage.tsx` | **新增** Import Center 页面 |
| `src/router.tsx` | 注册 `/import-center` 路由 |

### 9.3 依赖

```json
// package.json 新增
{
  "dependencies": {
    "xlsx": "^0.18.5",          // Excel 解析
    "papaparse": "^5.4.1",      // CSV 解析
    "jszip": "^3.10.1",         // ZIP 解析（图片包）
    "file-saver": "^2.0.5",     // 文件下载
    "string-similarity": "^4.0.4" // 字段名模糊匹配
  },
  "devDependencies": {
    "@types/papaparse": "^5.3.14"
  }
}
```

```toml
# src-tauri/Cargo.toml 新增
[dependencies]
calamine = "0.24"      # Rust 端 Excel 解析（备用/服务端批处理）
zip = "0.6"
sha2 = "0.10"          # 文件 hash
```

### 9.4 实施阶段

| 阶段 | 内容 | 工期 | 依赖 |
|---|---|---|---|
| **Phase 1** | 后端解析器（xlsx/csv/json）+ Tauri commands | 1.5 周 | 无 |
| **Phase 2** | 前端 ImportWizard（7 步 UI） + 字段映射引擎 | 2 周 | Phase 1 |
| **Phase 3** | 商品库导入（P0 §3.1） + 数据库表 | 1 周 | Phase 1+2 |
| **Phase 4** | 库存 / 采购 / 销售导入（P0 §3.2-3.4） | 1.5 周 | Phase 3 |
| **Phase 5** | 供应商 / 客户导入 + Import Center（P1） | 1 周 | Phase 4 |
| **Phase 6** | AI 智能引导联动 + 模板下载（P1） | 0.5 周 | Phase 5 |
| **Phase 7** | 高级特性（P2）+ 性能调优 | 1 周 | Phase 6 |
| **Phase 8** | E2E 测试 + 文档 + 发布 | 1 周 | Phase 7 |
| **总计** |  | **~9.5 周** |  |

### 9.5 测试策略

| 层级 | 工具 | 覆盖目标 |
|---|---|---|
| 单元测试 | Vitest | `fieldMatcher` 别名覆盖 ≥ 95%；`validator` 规则覆盖 ≥ 100% |
| 集成测试 | Vitest + Mock Tauri | `excelImporter/csvImporter/jsonImporter` 各类边界 |
| E2E 测试 | Playwright | 完整 7 步流程；100 行 / 10,000 行 / 100,000 行 三个量级 |
| 性能测试 | 自研 benchmark | §8.1 性能指标达标 |
| 兼容性测试 | 手动 | Win10/Win11/macOS 12+ 三平台；Excel 2016+ / WPS / 飞书表格 |

### 9.6 安全考虑

| 风险 | 措施 |
|---|---|
| **文件上传任意文件** | 严格 MIME + 扩展名 + 文件签名三重校验 |
| **zip slip** | 拒绝含 `..` 的路径；解压到独立沙箱目录 |
| **XSS via Excel 单元格** | 文本字段导入后渲染时统一 escape |
| **SQL 注入** | 全部使用预编译语句 |
| **大文件 DoS** | 严格的 §8.3 资源限制 |
| **恶意宏** | 拒绝 `.xlsm` 中的 VBA 宏（仅取数据） |
| **图片炸弹** | 解压前检查 zip 内文件总数 + 单文件大小 |

---

## 十、验收标准

### 10.1 功能验收

#### P0 验收

- [x] Excel 导入 1,000 行商品（SPU+SKU）成功，字段映射自动识别 ≥ 80%
- [x] CSV 导入 5,000 行商品成功，GBK 编码自动识别
- [x] JSON 导入 ProClaw 备份格式 500 条商品成功
- [ ] zip 图片包导入 50 SKU + 200 图片全部成功（v1.3 实现）
- [x] 库存交易 100 条导入成功，速度 ≥ 200 行/秒（v1.2 P1 实现；10,000 条留 v1.3 性能优化）
- [x] 采购单 5 单 / 5 明细导入成功，供应商自动按名创建（v1.2 P1 实现）
- [x] 销售单 5 单 / 5 明细导入成功，客户按名称匹配/创建（v1.2 P1 实现）
- [x] 三级校验全部生效：L1 阻断 / L2 警告 / L3 预检
- [x] 冲突策略 3 选 1 全部生效（覆盖 / 跳过 / 创建副本）
- [x] 实时进度条准确（误差 < 5%）
- [x] 暂停 / 取消 / 继续全部生效
- [x] 错误报告可下载，行号准确
- [x] 修复版再次导入，仅重试失败行

#### P1 验收

- [x] 供应商 / 客户主数据可独立导入（v1.2 P1 实现）
- [ ] Import Center 任务列表、详情、操作全部可用（v1.3 实现）
- [ ] 7 套模板可下载，文件格式正确（v1.3 实现）
- [ ] AI 智能引导在用户输入"导入"时跳转 Import Center（v1.3 实现）
- [ ] Setup Wizard 第 3 步可一键导入示例数据（v1.3 实现）

#### P2 验收

- [ ] 多文件合并去重成功
- [ ] Excel 公式导入计算正确
- [ ] 导入审计日志保留 365 天

### 10.2 性能验收

- [ ] 1,000 行导入 < 10s
- [ ] 10,000 行导入 < 60s
- [ ] 100,000 行导入 < 10min
- [ ] 暂停响应 < 1s
- [ ] 解析阶段内存 < 500MB

### 10.3 兼容性验收

- [ ] Windows 10/11 安装包可正常导入
- [ ] macOS 12+ (Apple Silicon + Intel) 可正常导入
- [ ] Excel 2016/2019/2021/365 文件兼容
- [ ] WPS 表格文件兼容
- [ ] 飞书/腾讯文档导出的 xlsx 兼容
- [ ] GBK / UTF-8 / UTF-8 BOM 三种编码 CSV 兼容

### 10.4 稳定性验收

- [ ] 连续 5 次 10,000 行导入无崩溃
- [ ] 导入过程中断电（模拟），重启后可恢复断点
- [ ] 多任务并发（2 个）不互相干扰
- [ ] 导入失败时数据库无脏数据（事务回滚验证）

---

## 十一、风险评估与应对

| 风险 | 等级 | 影响 | 应对 |
|---|---|---|---|
| Excel 格式多样性（公式、合并单元格、批注） | 中 | 解析失败 | 解析前规范化；遇到不支持特性降级为文本 |
| 大文件 OOM | 中 | 客户端崩溃 | §8.3 资源限制 + 流式解析 |
| 字段映射歧义（"名称"可能是 SPU 也可能是 SKU） | 高 | 数据错位 | 别名词典分级 + 强制用户在歧义字段手动选择 |
| 图片版权 / 隐私 | 低 | 法律风险 | 文档提示"请确保有使用权" |
| 与现有 SPU-SKU 架构兼容 | 中 | 导入数据无法使用 | Phase 3 严格按 `spu_sku_schema_sqlite.sql` 校验；与 `product_commands.rs` 现有 API 一致 |
| 离线 + 加密数据库 | 中 | 性能下降 | 仅在本地数据库，WAL 模式 + 批 INSERT 优化 |
| AI 智能体误触发 | 低 | 误调用 | `data_operation` 意图需用户二次确认 |

---

## 十二、后续规划

| 版本 | 内容 |
|---|---|
| v1.1.0 | P0（§3.1-3.4）+ 性能优化（§8） |
| v1.2.0 | P1（§3.5-3.8）+ Import Center |
| v1.3.0 | P2（§3.9）+ AI 智能推断（AD-06） |
| v2.0.0 | 定时导入（AD-02）+ 多端同步（云端 Import Center） |
| v3.0.0 | 跨系统迁移工具（畅捷通/管家婆/金蝶 → ProClaw 一键迁移） |

---

## 十三、关联文档

| 类型 | 文档 |
|---|---|
| 产品定位 | [PROJECT_POSITIONING.md](../../PROJECT_POSITIONING.md) |
| 需求总览 | [REQUIREMENTS.md](../../REQUIREMENTS.md) |
| 技术架构 | [TECHNICAL_OVERVIEW.md](../../TECHNICAL_OVERVIEW.md) |
| 数据库 Schema | [DATABASE_SCHEMA.md](../../DATABASE_SCHEMA.md) |
| 供应链 PRD | [SUPPLY_CHAIN_ENHANCEMENT_PRD.md](./SUPPLY_CHAIN_ENHANCEMENT_PRD.md) |
| 桌面端 UI PRD | [需求文档：ProClaw 桌面端 UI 全面升级（PRD v11.0）.md](./需求文档：ProClaw%20桌面端%20UI%20全面升级（PRD%20v11.0）.md) |
| 灵活库存 PRD | [需求文档：灵活库存需求-ProClaw 核心（PRD v12.0）.md](../architecture/需求文档：灵活库存需求-ProClaw%20核心（PRD%20v12.0）.md) |
| PRD 索引 | [../PRD_INDEX.md](../PRD_INDEX.md) |

---

*维护日期: 2026-06-26 · 维护人: 文档 Owner · 下次复核: 2026-09-15*
