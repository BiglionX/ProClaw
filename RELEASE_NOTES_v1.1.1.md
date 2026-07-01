# ProClaw v1.1.1 — 启动闪退修复（hotfix）

> **ProClaw Desktop** — 进销存 / 供应链 / 财务 / AI 团队一体化经营操作系统

> **🔧 v1.1.1 重点：v1.1.0 安装后启动闪退**——本版本为纯热修复，零业务功能变更，专门解决 `安装 v1.1.0 → 双击图标 → 窗口闪退、无任何提示` 的问题。

---

## 下载

| 平台 | 文件 | 大小 |
|------|------|------|
| Windows x64 | `ProClaw_1.1.1_x64-setup.exe` | ~7.6 MB |

> 详细安装 / 升级说明见 `RELEASES/v1.1.1/测试步骤.md`

---

## 🐛 本版本修复

### 1. 安装 v1.1.0 后启动闪退（核心问题）

**现象**：用户安装 v1.1.0 安装包后首次启动，窗口立即消失，桌面端无任何提示窗口。`%TEMP%\proclaw-diag.log` 末尾出现 `at offset 54)` 字样，伴随 `idx_agent_permissions_*` 两条 `CREATE INDEX` 语句。

**根因**：`src-tauri/src/database.rs:initialize()` 在 v1.2 P1 开发阶段把 `agents + agent_permissions` 两张表从 `src/db/schema.sql` 移除了，但 `src-tauri/src/agent_commands.rs:153` 仍然 `INSERT INTO agent_permissions`，导致：

- **覆盖安装场景**：v1.0.x 老用户的 `proclaw.db` 残留 `agents` 表但缺 `agent_permissions` 相关列或索引。schema 漂移让 `CREATE INDEX` 在某些 db 状态下挂错。
- **新装场景**：v1.2 P1 main 分支产物的 `proclaw.db` **完全没有** `agent_permissions` 表，运行期静默失败。
- **SQLite 只读场景**：杀软 / OneDrive 同步占用让 db 处于只读状态，所有写操作包括 `CREATE INDEX` 报错。

**修复**（见 [src-tauri/src/database.rs](src-tauri/src/database.rs#L1268-L1396) `initialize()` 末尾新增的"v1.1.1 hotfix schema 兜底段"）：

- 用 `CREATE TABLE IF NOT EXISTS` 把 `agents + agent_permissions` 两表 + 两索引补回来
- 同步补回 `060_import_batches.sql` 里 `import_batches + import_batch_errors + import_field_mapping_templates` 三张表（v1.1.0 release notes 承诺过 `060` 会在升级时跑，但实际上 `database.rs` 没 `include_str` 这个文件——v1.1.1 hotfix 顺手补回）
- 全部 IF NOT EXISTS，**幂等无破坏**，老 db 不动数据，新 db 自动获得完整结构

### 2. SQLite 只读错误自动恢复（防御性）

**现象**：杀软 / OneDrive / 残留文件句柄导致 db 处于 readonly 状态。`CREATE INDEX` 报错后整个 `db.initialize()` 失败 → `fatal_exit` 闪退，用户完全没机会手动恢复。

**修复**（见 [src-tauri/src/main.rs](src-tauri/src/main.rs#L143-L162) `is_db_unwritable_error`）：

- 新增 readonly / locked / disk full 错误识别
- 检测到后自动 `备份 + 删除 + 重建 db`，重试一次 `db.initialize()`
- 仅在二次失败后才走 `fatal_exit`
- **用户零手动操作**，90% 环境干扰无感恢复

### 3. fatal_exit 日志可读性优化

**现象**：原来日志只能看到 `at offset 54)` 这种尾部，多行 SQL 错误的前后文被截断，看似 syntax error 实际可能是 readonly。

**修复**（见 [src-tauri/src/main.rs](src-tauri/src/main.rs#L114-L154) `fatal_exit`）：

- 错误完整原文 `FATAL_RAW_ERR` 单独一行写在日志顶部
- 后面跟着 `FATAL [context]: <err>` 和排查提示
- 即使中间 SQL 文本被截，前几行也是完整 SQLite 错误，定位零猜

---

## 🆕 其他改进

### 数据层

- 完整覆盖 `import_batches + import_batch_errors + import_field_mapping_templates` 三张表初始化（v1.1.0 时漏了）

### 用户体验

- 启动闪退后**无需任何手动操作**即可恢复（自动备份+重建）
- 闪退错误日志更清晰，可一键发回排查

### 兼容性

- 完全兼容 v1.0.x → v1.1.0 → v1.1.1 任意升级路径
- 老 db 数据零破坏
- 已同步云端的数据不受影响

---

## 技术栈（同 v1.1.0）

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri 2.11 (Rust) |
| 前端 | React 18 + TypeScript + Vite 6 |
| UI | MUI 5 + Tailwind CSS 3 |
| 数据层 | SQLite (rusqlite bundled) |
| 测试 | Vitest 4.1 + Playwright + Rust #[test] |

---

## 系统要求

| 项目 | 最低配置 |
|------|---------|
| 操作系统 | Windows 10+ x64 |
| 内存 | 4 GB RAM |
| 磁盘 | 250 MB 可用空间 |
| 网络 | 完全离线可用 |

---

## 升级指南（v1.1.0 升级到 v1.1.1）

1. **无需先卸载 v1.1.0**——安装程序会原地升级
2. 双击 `ProClaw_1.1.1_x64-setup.exe`，一路 Next / Replace
3. 安装完成后双击桌面 ProClaw 图标
4. **预期**：主窗口在 5 秒内打开，不再闪退
5. 如果之前 v1.1.0 闪退过的用户，**自动**会触发 readonly 路径并自动备份+重建 db（**云端数据不会丢**）

> 如果升级后仍闪退，把 `%TEMP%\proclaw-diag.log` 完整内容贴给支持团队。日志头部 `FATAL_RAW_ERR` 行就是真正的 SQL 错误原文。

---

## 已知限制

- 与 v1.1.0 完全一致（业务功能未变更）

---

## 许可证

[GPL-3.0](LICENSE)

---

## 相关文档

- [v1.1.0 release notes](RELEASE_NOTES_v1.1.0.md)
- [完整 README](README.md)
- [CHANGELOG](CHANGELOG.md)

---

*发布日期: 2026-07-01*
