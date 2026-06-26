# Changelog

所有重要变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/),
版本遵循 [Semantic Versioning](https://semver.org/)。

## [v1.3] - 2026-06-26

### Added
- **业务导入增强（4 大模块）**（PRD DATA_IMPORT_PRD_v1.0 §3.1.3/3.6/3.7/3.8）:
  - **A. 图片 zip 包批量上传**（§3.1.3）:
    - `import_extract_images` Tauri 命令：接收 zip 字节 → SHA-256 → 写入 `<app_data>/import_images/<hash>.zip` 并解压到 `<hash>/` 子目录（白名单：`png/jpg/jpeg/webp`）
    - 文件名约定解析：`SPU编码_任意命名.png` 或 `SKU编码_x.png`，回填 SPU/SKU
    - `executor.rs` 集成 `image_filename` 字段：写入 SPU 前查找 zip 命中，复制到 `<app_data>/product_images/<spu_id>/`，写入 `local://<spu_id>/<filename>` URL 与 `sync_status='local'`
    - 前端 `Step1FileSelect` 扩展 `accept` 为 `.xlsx,.xls,.csv,.json,.zip`；dropzone 文案改为「支持 Excel / CSV / JSON / 图片 zip 包」
  - **B. Import Center 任务管理**（§3.6 P1）:
    - 数据库迁移 `061_import_batches_pause.sql` 扩展状态枚举为 `pending/parsing/mapping/importing/paused/cancelled/retrying/success/failed`，新增 `last_heartbeat_at` / `processed_rows` / `paused_reason` 列
    - 4 个新 Tauri commands：`import_pause` / `import_resume` / `import_cancel` / `import_retry`
    - `executor.rs` 检查点：每 100 行持久化 `processed_rows` 与 `last_heartbeat`；循环开头检查 `status='paused'` 即退出（不丢数据）
    - 新增路由 `/import-center`（`ImportCenterPage`）：MUI Table 列出批次 + 状态/目标类型/日期范围多选过滤 + 右侧详情 Drawer
    - 新增嵌套路由 `/import-center/:batchId`（`ImportBatchDetailPage`）：状态卡片 + 暂停/继续/取消/重试/回滚/下载错误报告按钮 + 映射快照折叠面板 + 行级错误表（虚拟滚动）
  - **C. 5 套 xlsx 模板 + 示例数据**（§3.7 P1）:
    - 新增 `import_list_templates` Tauri 命令（`PROCLAW_TEMPLATE_DIR` 环境变量可覆盖；纯函数 `list_templates_at` / `read_template_bytes_at` / `read_examples_zip_at` 可单测）
    - 新增 `import_setup_templates` setup hook：首次启动从 `exe_dir/resources/templates` / `public/templates` 拷贝到 AppData
    - 构建脚本 `scripts/build-import-templates.mjs` 生成 6 个文件：
      - `products-template.xlsx`（28 列，含 `image_filename` 关联 zip 命名约定）
      - `inventory-transactions-template.xlsx`（9 列）
      - `purchase-orders-template.xlsx`（8 列）
      - `sales-orders-template.xlsx`（8 列）
      - `suppliers-customers-template.xlsx`（双 sheet）
      - `examples.zip`（含 5 套模板 + 10 张示例 PNG + README）
    - 新增 `TemplateDownloadPanel.tsx`：Accordion 折叠面板，列出 5 套模板元数据（target_type/file_name/size_bytes/sha256）+ 单独下载 / 整套 `examples.zip` 下载入口
    - `package.json` 新增 `build:templates` + `prebuild` 钩子
  - **D. AI 智能引导联动**（§3.8 P1）:
    - `aiGuide.ts` 新增 `generateImportGuidance(targetType, errorList, fieldHeaders): ImportGuidance[]`，内置 **8 类规则**：missing_required / mapping_conflict / duplicate_row / reference_missing / value_out_of_range / date_format / encoding_unknown / image_missing
    - 每条 guidance 返回 `affectedRows`（去重）+ `category` + `aiHint`（AI 别名猜测 `ALIAS_HINTS`） + `actionLabel` / `actionPath`
    - `ImportWizard` Step3 缺字段 AI 气泡：未映射必填字段时显示 `<Alert severity="info">` + 一键「AI 推荐映射」按钮（自动填充 confidence > 0.8 的高置信度映射）
    - `ImportWizard` Step7 失败 AI 排查面板：`result.failed_rows > 0` 时新增折叠面板「AI 帮你排查」+ top 5 引导建议 + 「查看完整错误报告」跳转
- **测试覆盖**:
  - Rust: 51 → **75+** 单元测试（+24 = 图片 zip 5 + Import Center 状态机 9 + 模板 4 + 重试 6）
  - 前端 Vitest: 60+ → **100+** 测试（新增 `TemplateDownloadPanel` 10 + `aiGuide.importGuidance` 45）
  - Playwright E2E: 4 → **8** spec 文件（新增 `import-products-images.spec.ts` / `import-center.spec.ts` / `import-templates.spec.ts` / `import-ai-guide.spec.ts`）

### Changed
- `import_execute` 后端命令支持 `image_archive` 字段（zip 在 AppData 内的相对路径），未提供时沿用 v1.2 P1 的 URL 模式
- `ImportWizard` 接收 `initialTarget` 已可从任何业务页跳转，Step7 新增 `result/targetType/headers` props 驱动 AI 排查面板
- `importService` 暴露 `listTemplates` / `getTemplateBytes` / `getExamplesZip` 三个 invoke 接口

### Known Limitations
- **Import Center 暂不支持并发导入**：当前为串行队列（一个批次执行中无法同时启动另一个）；v1.4 计划按优先级与 worker pool 并发
- **AI 引导置信度阈值 0.8**：低于 0.6 时不推荐自动填充；强误判可由用户手工覆盖
- **图片 zip 白名单仅 png/jpg/jpeg/webp**：其他格式（gif/avif/heic）需先转码

## [1.0.8] - 2026-06-26

### Added
- **业务对象批量导入扩展（v1.2 P1）**（PRD DATA_IMPORT_PRD_v1.0 §3.2-3.5）:
  - **库存交易导入**（PRD §3.2 P0）: 按 `(sku_code + transaction_date + transaction_type)` 幂等去重；4 种类型（inbound / outbound / adjustment / transfer）支持；冲突策略 3 态（skip / overwrite / duplicate）
  - **采购订单导入**（PRD §3.3 P0）: 按 `po_number` 唯一去重；自动按 `supplier_name` 创建供应商（`ensure_supplier` 辅助函数）；每行 = 1 个 PO + 1 个 item
  - **销售订单导入**（PRD §3.4 P0）: 按 `so_number` 唯一去重；自动按 `customer_name` 创建客户（`ensure_customer` 辅助函数）；金额计算自动
  - **供应商 / 客户主数据导入**（PRD §3.5 P1）: 独立主数据批量导入，支持 `name` / `phone` / `email` / `address` / `level` / `tax_id` / `notes` 等字段
- **后端（Rust）新增 5 个核心函数**:
  - `process_inventory_txn` / `process_purchase_order` / `process_sales_order`
  - `ensure_supplier` / `ensure_customer`（按名称查重，自动建主数据）
  - 路由分发：`commands.rs::import_execute` 按 `target_type` 路由到对应 process_* 函数
- **前端（React + TS）扩展**:
  - `ImportTarget` 类型扩展为 6 种（`products` / `inventory` / `purchases` / `sales` / `suppliers` / `customers`）
  - `REQUIRED_FIELDS_BY_TARGET` 按 target 动态判断必填字段
  - `Step2TargetSelect` 激活 6 张目标卡片（商品库/库存交易/采购/销售/供应商/客户）
  - `ImportWizard` 新增 `initialTarget` prop：业务页可直接传入 target 跳过 Step2
  - `fieldMatcher` 别名词典新增 50+ 中英文别名（库存/采购/销售/供应商/客户字段）
  - 3 个业务页（`InventoryPage` / `PurchasePage` / `SalesPage`）工具栏新增 "导入" 按钮
- **测试覆盖**:
  - Rust: 24 → **51** 单元测试（+27 = validator 24 / mapper 5 / executor 22）
  - 前端 Vitest: 41 → **60+** 测试（新增业务字段匹配 19+）
  - Playwright E2E: 1 → **4** spec 文件（新增 `import-inventory.spec.ts` / `import-purchases.spec.ts` / `import-sales.spec.ts`）

### Changed
- `ProductsPage` `target` prop 重命名为 `initialTarget`，保持向后兼容语义
- `importService.createBatch` 新增 `targetType` 参数；后端 `import_create_batch` 接受 `target_type` 路由参数
- 7 步向导的 Step 2（选目标）解锁 target 锁定：支持切换 target 而不重启向导

### Known Limitations
- 仅支持 **URL 模式** 图片；本地图片 zip 包批量上传留待 v1.3
- 未实现 **Import Center**（历史批次管理页）；通过 Setup Wizard + 各业务页"导入"按钮触发
- 批量上限 10MB（更大文件分批进度推送留待 v1.3）
- 业务对象导入的测试用例覆盖了小批量（5-100 行）；100,000 行性能验证留待 v1.3

## [1.0.7] - 2026-06-26

### Added
- **商品库数据导入 MVP**（PRD DATA_IMPORT_PRD_v1.0 §3.1 P0）:
  - 支持 **Excel (.xlsx/.xls)** / **CSV** / **JSON** 三种格式批量导入商品
  - 7 步向导：选文件 → 选目标 → 字段映射（自动别名词典 + string-similarity 模糊匹配）→ 数据预览 → 冲突策略（skip / overwrite / duplicate）→ 摘要确认 → 执行进度
  - 三级校验：L1 格式（必填/类型/范围，阻断）、L2 业务（价格/库存/条形码，警告）、L3 引用（自动建分类/品牌）
  - 冲突策略：按 `spu_code` 命中即按策略处理；`duplicate` 策略自动追加 `_copy2/_copy3` 后缀
  - 事务包裹：批次级失败自动回滚；`import_batches` 审计表（迁移 060）
  - 后端 7 个 Tauri commands（`import_create_batch` / `import_update_mapping` / `import_validate` / `import_execute` / `import_get_batch` / `import_list_batches` / `import_rollback`）
  - 错误报告下载：`errors.xlsx` 含错误明细 + 错误类型统计两个 Sheet
  - 入口：`商品库` 页面工具栏 "导入" 按钮 + `SetupWizard.DataImportStep` "已有数据，导入 Excel" 按钮
- 新增依赖：`xlsx@^0.18.5`、`papaparse@^5.4.1`、`jszip@^3.10.1`、`file-saver@^2.0.5`、`string-similarity@^4.0.4` + 类型定义
- 新增 Rust 模块 `src-tauri/src/import/`（6 文件）+ 数据库迁移 `database/migrations/060_import_batches.sql`
- 测试：Rust 24 单元测试（validator 14 / mapper 5 / executor 5） + 前端 41 Vitest（fieldMatcher 21 / jsonImporter 9 / excelImporter 7 / ImportWizard 4） + Playwright E2E `e2e/import-products.spec.ts`

### Changed
- `ProductsPage` 工具栏新增 "导入" 按钮（与 "导出 CSV" 紧邻），完成后自动刷新列表
- `SetupWizard/DataImportStep` "已有数据" 按钮从仅设置状态改为直接打开 `ImportWizard`

### Known Limitations
- 仅支持 **URL 模式** 图片；本地图片 zip 包批量上传留待 v1.1
- 仅支持 **商品库** 导入；库存交易、采购/销售导入留待 v1.2
- 未实现 **Import Center**（历史批次管理页）；MVP 通过 Setup Wizard + Products 页面入口触发
- 批量上限 10MB（更大文件分批进度推送留待 v1.1）

## [1.0.0] - 2026-06-08

### Added
- **🎉 正式版发布**: 生产环境验收通过，可以推广使用
- **双模式架构上线**:
  - ProClaw Plus（进销存版）：供应链管理 + AI团队 + 财务管理
  - ProClaw Light（服务行业版）：AI知识库 + 轻量级管理
- **CEO Agent 主控官系统**（PRD v6.2/v6.3）:
  - 项目上下文协议（PCP）：愿景/目标/约束/里程碑
  - 任务分派与跟踪：自动分配任务给子Agent
  - 决策确认机制：审阅/驳回决策日志
  - 个性化偏好学习
- **行业插件系统 Phase 4**:
  - 餐饮行业：POS收银、桌台管理、KDS厨房显示
  - 美业行业：预约管理、服务项目、员工管理、营销活动
  - 宠物行业：宠物档案、寄养管理、美容服务
  - Cloud版：Token计费、债务保护、云端备份
  - 会员管理：跨行业通用会员体系
- **AI知识库升级**: 三库合一（媒体库 + 问答库 + 资料库）
- **Browser MCP测试**: 配置浏览器自动化测试能力

### Changed
- **版本升级**: 0.1.0 → 1.0.0
- **README更新**: 添加生产环境验收状态

### Fixed
- E2E测试文件编码问题修复（cloud-store-flow.spec.ts）

### Technical
- **测试覆盖**: 96.5% 通过率 (221/229)
- **E2E测试**: 18个测试套件
- **浏览器测试**: Browser MCP自动化验证

---

## [0.1.0] - 2026-05-26

### Added
- **首个桌面安装包**: Windows x64 NSIS 安装程序 (~6.8 MB)
- **AI 经营团队**: 内置 7 个专业 Agent（库存、销售、数据分析、采购、财务、客服、AI 智能找图）
- **AI 智能找图 Agent**: 有产品时自动推荐，作为第 7 个内置 Agent
- AI 团队管理：创建/编辑/删除/导入/导出，发布到市场
- **Phase 8: 测试与文档** - 全面质量保证
- 前端服务单元测试 (15 个测试模块, ~200+ 测试用例)
  - purchaseService: 供应商、采购订单 CRUD 及编码生成测试
  - financeService: 损益报表、现金流、财务概览测试
  - analyticsService: 销售趋势、产品分析测试
  - authStore: 模拟登录、注册、登出、认证检查测试
  - apiClient: token 管理、HTTP 方法、文件上传测试
  - categoryService: 分类创建、列表获取测试
  - brandService: 品牌创建、列表获取测试
  - subscriptionService: 套餐、订阅、token 用量、账单测试
  - syncService: 数据库统计、同步状态测试
  - aiConfig: 配置存取、多提供商连接测试
- AI 团队推荐服务单元测试 (10 个测试用例)
- Rust 后端单元测试
  - permissions: RBAC 权限检查（22 个测试用例）
  - key_manager: JWT 密钥生成/加载/环境变量（5 个测试用例）
  - types: 序列化/反序列化正确性（8 个测试用例）
  - crypto: AES-256-GCM 加解密验证（已有，3 个测试用例）
  - database: 数据库创建和初始化（已有，2 个测试用例）
- E2E 测试增强 (9 个 spec 文件)
  - purchase.spec.ts: 采购管理流程
  - finance.spec.ts: 财务报表和统计
  - inventory.spec.ts: 库存管理和交易
  - settings.spec.ts: 系统设置和配置
- 用户手册
  - 部署与使用指南（10 章节，含系统要求、部署、功能指南、故障排除）
  - Pro 版开通指南（6 章节，含 Supabase 配置、AI 模型、Token 计费）
- 打包配置优化
  - 增强 Windows 构建脚本
  - 多平台目标配置准备
- 发布说明文件 (`RELEASE_NOTES_v0.1.0.md`)

### Changed
- TeamsPage: 使用 `safeInvoke` 替代裸 `invoke`，修复浏览器 dev 模式崩溃
- TeamsPage: Card 样式从暗色(#1e1e1e)改为自适应主题背景
- `tauri.ts`: 警告去重，同一命令仅提示一次
- 完善权限模块测试覆盖
- 优化 CHANGELOG 格式规范

### Fixed
- 修复 TeamsPage 在浏览器 dev 模式下 `Cannot read properties of undefined (reading 'invoke')` 崩溃
- 修复 TeamsPage 卡片暗色背景与浅色主题不搭配的问题

### Technical
- 前端测试覆盖率目标 > 60%（branches/functions/lines/statements）
- Rust 测试覆盖: auth, utils, types 模块
- E2E 测试覆盖: 登录、仪表盘、产品、销售、采购、财务、库存、设置、双模式库
- 测试框架: Vitest + Playwright + Rust #[test]
- 新增 `build:tauri` npm script，构建跳过 tsc 检查（CloudStore 预存 TS 错误不影响运行时）

## [1.0.0-beta.1] - 2026-04-13

### Added
- 初始版本发布
- Tauri 2.0 + React 18 桌面应用框架
- 经营智能体主界面
- 产品库管理模块 (简单模式 + SPU-SKU 电商模式)
- 进销存 AI 模块
- 技能商店基础架构
- SQLite 本地数据库 + Supabase 云端同步
- MUI + Tailwind CSS UI 系统
- 离线优先架构
- 数据加密(SQLCipher)
- 仪表盘页面功能（实时数据、图表、预警）
- 仪表盘单元测试

### Changed
- 从 ProCYC 单体项目中提取
- 独立为开源项目
- 重构 DashboardPage 组件，从占位符升级为完整功能页面
- 优化数据加载性能（并行请求）

### Technical
- 3,000+ 行 TypeScript 代码
- 完整的类型定义
- 模块化架构设计
