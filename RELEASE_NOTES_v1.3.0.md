## 🆕 v1.3.0 — 老系统数据迁移（.xls / .xlsx → ProClaw）

> 一键迁移客户 / 商品 / 供应商 + 类别自动建档 + 不限时撤销

---

### ✨ 核心功能

| 模块 | 说明 |
|------|------|
| **老格式自动识别** | 上传 .xls / .xlsx → 自动触发老系统导入向导（calamine 0.24 解析） |
| **聚合预览** | 按客户编号 / 商品编号自动聚合，SPU/SKU 关系自动建立 |
| **强制确认** | ⚠️ 检测到多联系人 / 多 SKU 时弹 confirm dialog 显示完整统计 |
| **类别自动建档** | 默认全开，用户可手动关闭 Chip toggle；新建类别记入 `categories.batch_id` |
| **不限时撤销** | 单 batch 精准撤销 3 张表（customer_contacts / product_sku / categories），主表不动 |

### 🛠️ P0 / P1 修复闭环

| 等级 | 编号 | 内容 |
|------|------|------|
| 🔴 P0 | **S1** | rollback 按 `batch_id` 精准过滤（不再按 `source` 误删全表） |
| 🔴 P0 | **S2** | 顶部预清理代替 N+1 DELETE |
| 🔴 P0 | **S3** | 22k 行单事务切 chunked 1000 行 + 进度回写 |
| 🟠 P1 | **M1** | category_resolver 过滤空字符串 |
| 🟠 P1 | **M2** | supplier 路径缺列显式报错（不再 silent fallback） |
| 🟠 P1 | **C1** | handleLegacyExecute 弹 confirm dialog 替代缺失 Step 4 UI |

### 📦 安装包

| 文件 | 大小 | 路径 |
|------|------|------|
| 🟦 `ProClaw_1.3.0_x64_en-US.msi` | 9.83 MB | Windows 安装包（WiX） |
| 🟩 `ProClaw_1.3.0_x64-setup.exe` | 7.64 MB | Windows 安装包（NSIS） |

### ⬆️ 升级路径

- **v1.0.x → v1.3.0**：覆盖安装，自动跑 migration 060 + 061
- **v1.1.0 / v1.1.1 → v1.3.0**：覆盖安装，schema 兜底段自动补齐
- 数据库 schema 增量：`customer_contacts.batch_id` / `product_sku.batch_id` / `categories.batch_id`（含索引）

### 🧪 验证

- ✅ `cargo check` exit 0（仅 5 个 pre-existing dead_code warning）
- ✅ `npm run build` 成功（14002 modules）
- ✅ MSI + NSIS 打包通过
- 📋 待回归：老格式导入 e2e + 撤销路径

### 📚 文档

- 📄 [v1.3.0 计划文档](https://github.com/BiglionX/ProClaw/blob/v1.3.0/docs/plans/v1.3_p1_legacy_data_import.md)

---

**完整变更**：commit `0190a25`（25 files changed, +3778 / -138）
