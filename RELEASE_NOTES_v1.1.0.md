# ProClaw v1.1.0 — 批量导入中心上线（P1）

> **ProClaw Desktop** — 进销存 / 供应链 / 财务 / AI 团队一体化经营操作系统

> **✨ v1.1.0 重点：批量导入中心**——一键导入商品库 / 库存交易 / 采购订单 / 销售订单 / 供应商 / 客户 6 类业务对象。

---

## 下载

| 平台 | 文件 | 大小 |
|------|------|------|
| Windows x64 | `ProClaw_1.1.0_x64-setup.exe` | ~7.5 MB |
| Windows x64 | `ProClaw_1.1.0_x64_en-US.msi` | ~9.6 MB |

> 详细安装说明见 `RELEASES/v1.1.0/测试步骤.md`

---

## 🌟 本版本核心特性：批量导入中心

v1.1.0 上线全新 **「批量导入中心」** —— 为进销存业务提供一站式 CSV / JSON 批量录入能力，覆盖以下 6 类业务对象：

| 导入目标 | 必填字段 | 可选字段数 |
|---------|---------|-----------|
| 📦 商品库（products） | SKU / 商品名称 | 10 |
| 📊 库存交易（inventory） | SKU / 交易类型 / 数量 | 4 |
| 🛒 采购订单（purchases） | 采购单号 / 供应商 / 采购日期 / SKU / 数量 / 单价 | 3 |
| 💼 销售订单（sales） | 销售单号 / 客户 / 销售日期 / SKU / 数量 / 单价 | 2 |
| 🏢 供应商（suppliers） | 名称 | 6 |
| 👥 客户（customers） | 名称 | 6 |

### 7 步导入向导

```
选目标与文件 → 解析预览 → 字段映射 → 数据校验 → 执行导入 → 结果报告 → 完成
```

### 🀄 中英文智能别名词典（v1.1.0）

- **47+ 字段 / 80+ 别名**——支持中文 / 英文 / 拼音缩写
- **3 级匹配**：精确（key / label）→ 精确别名 → 归一化别名（lowercase + `_ -` 转空格）
- 自动识别 `item_code / 商品编码 / 货号 / SKU` 等同一字段的不同表达
- 用户可手动调整映射并保存为模板，下次自动复用

### 📑 CSV 模板一键下载

应用首次启动时自动在 `%APPDATA%/proclaw/desktop/import_templates/` 写入 6 套 CSV 模板：

- `products_template.csv`
- `inventory_template.csv`
- `purchases_template.csv`
- `sales_template.csv`
- `suppliers_template.csv`
- `customers_template.csv`

每条模板都带字段说明（`#` 开头注释行）+ 1 行示例数据。

### 🛡️ 数据安全策略

| 业务对象 | 幂等策略 |
|---------|---------|
| 商品库 | 按 `sku` upsert（同名更新） |
| 库存交易 | 按 `(product_id, date, type, ref)` 跳过重复 |
| 采购订单 | 按 `po_number` upsert |
| 销售订单 | 按 `so_number` upsert |
| 供应商 | 按 `code` upsert，无 code 按 `name` upsert |
| 客户 | 按 `code` upsert，无 code 按 `name` upsert |

**支持错误跳过（`skip_errors=true` 默认）**——单行错误不影响其他行继续导入。

### 📋 导入中心管理页

- 历史批次列表（按 target 过滤 / 按状态过滤 / 分页）
- 批次状态机可视化：`待处理 → 解析中 → 待映射 → 校验中 → 导入中 → (成功 / 部分成功 / 失败 / 已暂停 / 已取消)`
- 批次详情查看 + 错误 CSV 下载
- 重新解析 / 暂停 / 取消 / 重试 操作

### 🎯 业务页入口

4 个业务页顶部新增 **「批量导入」** 按钮（一键跳转到对应 target 的导入向导）：

- 商品管理（`/products`）
- 库存管理（`/inventory`）
- 采购管理（`/purchase`）
- 销售管理（`/sales`）

---

## 🆕 其他改进

### 数据层
- 新增 2 张表 `import_batches` + `import_batch_errors`，迁移文件：`database/migrations/060_import_batches.sql`
- 6 类导入目标使用现有业务表（`products` / `inventory_transactions` / `purchase_orders` 等），不重复建表

### 后端架构
- 新增 `src-tauri/src/import/` 模块（types / parser / executor / templates / commands 共 5 个文件）
- 13 个新 Tauri 命令：`import_create_batch` / `import_parse_file` / `import_validate_batch` / `import_execute_batch` / `import_pause_batch` / `import_cancel_batch` / `import_retry_batch` / `import_get_batch` / `import_list_batches` / `import_get_batch_errors` / `import_get_templates` / `import_list_mapping_templates` / `import_save_mapping_template`
- 启动时自动 copy 6 套 CSV 模板到 APPDATA（首次启动一次写入）

### 测试覆盖
- **76 个 Vitest 单元测试全部通过**：
  - `fieldMatcher.test.ts`：48 个测试（中英文别名匹配、归一化、覆盖率断言 ≥80）
  - `importService.test.ts`：23 个测试（13 个 Tauri 命令封装、fileToBase64、downloadTextFile）
  - `ImportButton.test.tsx`：5 个组件测试
- 4 套 Playwright E2E（`e2e/import-{products,inventory,purchases,sales}.spec.ts`）

### 性能与稳定性
- 后端 0 errors / 0 warnings 编译干净（`cargo check`）
- 字段映射采用 3 级匹配（精确 / 别名 / 归一化），无需数据库查询
- 大文件流式解析 + 批量插入

---

## 技术栈（同 v1.0.x）

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri 2.11 (Rust) |
| 前端 | React 18 + TypeScript + Vite 6 |
| UI | MUI 5 + Tailwind CSS 3 |
| 状态管理 | Zustand + TanStack Query |
| 数据层 | SQLite (rusqlite bundled) |
| 解析 | csv 1.3 + serde_json |
| 测试 | Vitest 4.1 + Playwright + Rust #[test] |

---

## 系统要求

| 项目 | 最低配置 | 推荐配置 |
|------|---------|---------|
| 操作系统 | Windows 10+ (x64) | Windows 11 |
| 内存 | 4 GB RAM | 8 GB RAM |
| 磁盘 | 250 MB 可用空间 | 1 GB 可用空间 |
| 网络 | 可选（离线可用） | 推荐宽带连接 |

---

## 安装说明

1. 下载 `ProClaw_1.1.0_x64-setup.exe`
2. 双击运行安装程序
3. 按向导完成安装
4. 启动 ProClaw Desktop
5. 登录后点击业务页（商品 / 库存 / 采购 / 销售）顶部的 **「批量导入」** 按钮
6. 在导入向导中选择「下载模板」获取 CSV，按格式填好数据后上传
7. 系统自动识别字段映射 → 校验 → 执行 → 完成

**快速体验**：`boss / IamBigBoss` 登录即可使用全部功能。

---

## 升级指南（从 v1.0.x 升级）

1. 卸载旧版本（数据保留在 `%APPDATA%/proclaw/`）
2. 安装 `ProClaw_1.1.0_x64-setup.exe`
3. 首次启动会自动执行 `060_import_batches.sql` 迁移，创建 2 张新表
4. 业务数据完全保留，无破坏性变更

---

## 已知限制

- **XLSX 格式**：当前为 stub 实现（暂不支持真 XLSX 解析），推荐先用 CSV / JSON
- **文件大小**：单文件建议 < 10 MB（约 50,000 行），更大请分批
- **网络依赖**：完全离线可用（除 AI 功能外）

---

## 许可证

[GPL-3.0](LICENSE)

---

## 相关文档

- [完整 README](README.md)
- [CHANGELOG](CHANGELOG.md)
- [v1.1.0 计划文档](docs/plans/v1.2_p1_import_plan.md)
- [v1.0.8 测试步骤](RELEASES/v1.0.8/测试步骤.md)

---

*发布日期: 2026-07-01*