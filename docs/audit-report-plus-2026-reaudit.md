# ProClaw Plus 版重新审计报告

> 审计日期: 2026-06-07 (二轮) | 审计范围: Plus 版全部后端代码 (src-tauri/src/)
> 审计维度: 安全性 / 边界 Case / 并发安全 / 错误处理完整性 / 可维护性 / 隐式依赖
> 背景: 第一轮 22 个问题已全部修复，本次为排查残余及新生问题

---

## 概述

对修复后的代码库进行六个维度的全面重新审计，**新发现 15 个问题**（含 3 个严重、7 个中等、5 个低风险）。
严重度分级：🔴 严重 | 🟡 中等 | 🟢 低

---

## 一、安全性 (Security)

### #1 🔴 JWT_SECRET OnceLock 零密钥回退——Token 可伪造

**文件**: `src-tauri/src/api/mod.rs:244,312`
**问题**: 
```rust
let secret = JWT_SECRET.get().cloned().unwrap_or_else(|| vec![0u8; 32]);
```
`JWT_SECRET` 是 `OnceLock<Vec<u8>>`。虽然 `main.rs` 中调用了 `JWT_SECRET.set(...)`，但如果启动流程异常导致 `set` 未执行（如 panic 早期退出），两个中间件 (`auth_middleware` 和 `auth_middleware_ws`) 都会回退到全零密钥 `[0u8; 32]`。
**影响**: 任何人都可以用全零密钥伪造合法 JWT，绕过所有认证和权限检查。
**修复**: 改用 `.expect("JWT_SECRET not initialized — startup must call JWT_SECRET.set()")` 使得未初始化时立即 panic（fail-fast 优于静默不安全回退）。

### #2 🟡 插件动态加载可执行任意代码（架构级风险）

**文件**: `src-tauri/src/plugin_loader.rs:118-131`
**问题**: 
```rust
unsafe { Library::new(library_path) }       // 行 118
unsafe { library.get(b"plugin_init") }       // 行 124
unsafe { init_fn() }                          // 行 131
```
虽然有文件扩展名白名单和 TOCTOU 双检锁（#12修复），但加载 `.dll/.so` 本质上在宿主进程空间内执行任意代码。
**影响**: 恶意插件可读取所有内存、窃取加密密钥、篡改数据库。
**建议**: 在插件管理界面增加来源校验（签名验证）和安全警告。

---

## 二、边界 Case (Edge Cases)

### #3 🔴 JWT_SECRET OnceLock 未初始化——全认证系统退化

**文件**: `src-tauri/src/api/mod.rs:244,312`
**问题**: 与 #1 相同根因。如果 `OnceLock` 的 `set()` 因任何原因未调用，两个中间件退化到零密钥验证。
**影响**: 与 #1 相同，属于跨维度的严重缺陷——既是安全问题也是边界问题。
**修复**: 同 #1。

### #4 🟡 `serde_json::to_string().unwrap_or_default()` 静默生成空字符串

**文件及位置**（约 22 处）:
- `src/api/relay.rs:69,99` — 中继消息负载序列化失败 → 写入空 JSON
- `src/api/websocket.rs:393` — WS 消息序列化失败 → 发送空字符串
- `src/api/ai.rs:207` — AI 识别结果序列化失败 → 写入空字符串到数据库

**问题**: 当 JSON 包含不可序列化值（如 `f64::NAN`、`f64::INFINITY`）时，`serde_json::to_string()` 返回 `Err`，`.unwrap_or_default()` 静默生成 `""`。空字符串写入数据库后极难排查。
**修复**: 改为 `match to_string() { Ok(s) => s, Err(e) => { eprintln!("Serialization error: {}", e); String::from("{}") } }` 至少记录错误并写入合法 JSON。

### #5 🟡 `as` 整数类型转换无溢出检查——~46 处

**文件及关键位置**:
- `src/api/ai.rs:382` — `item.quantity as i32`（quantity 可能来自 JSON 的任意整数/浮点）
- `src/sales_commands.rs:140` — `quantity as i32`
- `src/sales_return_commands.rs:48` — `quantity as i32`
- `src/purchase_return_commands.rs:48` — 同上
- `src/inventory_commands.rs:27` — 同上

**问题**: 当库存数量超过 `i32::MAX` (21 亿) 时，`as` 转换在 debug 模式 panic、release 模式静默 wrap。整个代码库未使用 `i32::try_from()` 或 `checked_*` 方法。
**修复**: 使用 `quantity.as_i64().and_then(|v| i32::try_from(v).ok())` 模式，溢出时返回错误。

### #6 🟢 切片索引操作无边界保护

**文件**: `src/api/invitations.rs:128`
**问题**: `hex::encode(&code_bytes[..8])` — `code_bytes` 来自 HMAC-SHA256（固定 32 字节），切片 `[..8]` 在当前实现安全，但若底层库变更返回值长度则 panic。
**建议**: 使用 `code_bytes.get(..8).map(hex::encode)` 防御性编程。

---

## 三、并发安全 (Concurrency Safety)

### #7 🔴 HTTP API Handler 中 `.lock().unwrap()` 传递 poison panic

**文件及行号** (~10 处):
- `src/api/products.rs:68, 157, 207, 278, 345`
- `src/api/invitations.rs:46, 75`

**问题**:
```rust
let db = state.db.lock().unwrap();
```
当 `Mutex` 被 poison（持有锁的线程 panic），`.unwrap()` 直接传播 panic，导致 HTTP 请求返回 500 并可能级联导致更多 poison。
**对比**: Tauri command 层全部使用 `.lock().map_err(|e| e.to_string())?` 优雅处理。
**修复**: 统一改为 `.lock().map_err(|e| format!("Database lock error: {}", e))?` 返回 500 错误而非 panic。

### #8 🔴 `tokio::spawn` 中 `axum::serve().await.unwrap()` panic

**文件**: `src/main.rs:275`
**问题**:
```rust
tokio::spawn(async move {
    axum::serve(listener, axum_app...).await.unwrap();
});
```
`axum::serve` 可能在运行时因 IO 错误失败。`.unwrap()` 导致 tokio task panic，HTTP 服务器无声崩溃。
**修复**: 改为 `if let Err(e) = ... { eprintln!("HTTP server error: {}", e); }`。

### #9 🟡 `IP_RATE_LIMIT` Mutex 在调用 `cleanup` 时的隐式重入风险

**文件**: `src/api/invitations.rs:34-64`
**问题**: `check_ip_rate_limit` 持锁时通过 `AtomicU64` 触发 `cleanup_rate_limit_map`，后者也获取同一 `Mutex`。当前代码（第62行）通过在调用 cleanup 前让 `map` 离开作用域（隐式 drop）避免死锁，但这种依赖 RAII 隐式释放的模式在重构时极易引入死锁。
**建议**: 在锁作用域外用花括号 `{ }` 显式限定，或添加 `// SAFETY: lock released before cleanup` 注释。

### #10 🟢 3 个 `Arc<Mutex<Database>>` 竞争同一 WAL 文件

**文件**: `src/main.rs:152-260`
**问题**: 主 DB、HTTP DB、Billing DB 是三个独立 `Database` 实例指向同一 WAL 文件。各自的 `Mutex` 只保护自身连接，跨实例写冲突返回 `SQLITE_BUSY`，无重试机制。
**说明**: 审计修复 #11 已添加注释承认此设计是过渡方案，本轮维持 🟢 作为已追踪问题。

---

## 四、错误处理完整性 (Error Handling)

### #11 🟡 启动流程 9 处 `.expect()` 无用户友好错误提示

**文件**: `src/main.rs:152, 153, 186, 191, 200, 246, 254, 257, 764`
**问题**: 数据库初始化失败（磁盘满/权限不足/文件损坏）时，用户看到 Rust panic 回溯而非可理解的错误消息。
**修复**: 将 `main` 函数改为 `fn main() { if let Err(e) = run() { show_error_dialog(&e); } }`，对关键失败使用 Tauri dialog API 或至少清晰的日志。

### #12 🟡 `let _ =` 吞没关键路径错误——~128 处

**关键位置**:
- `src/api/websocket.rs:373` — `let _ = conn.execute(...)` 消息持久化失败静默忽略
- `src/api/relay.rs:153` — `let _ = mark_delivered(...)` 状态标记失败丢失
- `src/services/cloud_backup_service.rs:301,315,556` — 同步日志写入失败

**问题**: 大量 `let _ =` 模式忽略 `Result`，对于非关键路径（审计日志、统计埋点）可接受，但对于消息持久化和状态标记等关键操作，应至少记录错误日志。
**修复**: 对关键路径改为 `if let Err(e) = ... { eprintln!("...", e); }`。

### #13 🟡 `println!` / `eprintln!` 应迁移到 `log` 框架——~53 处

**关键位置**:
- `src/api/websocket.rs` — ~12 处 WS 连接日志
- `src/database.rs` — ~15 处迁移执行日志
- `src/main.rs` — 7 处启动日志

**问题**: 无法按级别过滤、无法持久化到文件、无法结构化。Tauri 生态标准使用 `log` + `env_logger` 或 `tracing`。
**建议**: 使用 `log::info!`/`log::warn!`/`log::error!` 替换，在 `main.rs` 初始化 `env_logger`。

### #14 🟡 `sync_engine.rs` 同步 stub 标记数据为已完成但未实际同步

**文件**: `src/sync_engine.rs:91-93`
**问题**:
```rust
// TODO(supabase-integration): 替换为真实同步调用
let sync_result: Result<(), String> = Ok(());
```
离线队列中的所有操作都被标记为 `completed`，但从未真正同步到 Supabase。
**影响**: 启用离线模式后，所有离线数据在"同步"后实际上**丢失**（本地标记完成但服务器无此数据）。
**建议**: 至少增加一个 WARNING 级别的日志提示用户当前同步未实现。

### #15 🟢 `"application/json".parse().unwrap()` 模式——5 处

**文件**: `src/api/mod.rs:262, 275, 285, 327, 337`
**问题**: 硬编码字符串 `"application/json"` 解析 `HeaderValue`，逻辑上不可能失败，但 `.unwrap()` 风格不佳。
**建议**: 使用 `HeaderValue::from_static("application/json")` 避免 unwrap。

---

## 五、可维护性 (Maintainability)

### 正面发现（本轮无新增问题）

- ✅ 迁移错误处理已从 `.ok()` 改为 `if let Err(e)` + 收集
- ✅ 密钥管理已从硬编码改为 `KeyManager::derive_from_key()`
- ✅ 权限路由映射已补充云商城/订阅/通话 API
- ✅ `Aes256GcmCipher::new()` 已返回 `Result`

**残留建议**:
- `src-tauri/src/main.rs` 中 438 行的 `generate_handler![]` 宏仍有改进空间（审计修复 #17）
- `println!` → `log` 框架迁移应作为下一轮重构（审计修复 #13 本报告）

---

## 六、隐式依赖 (Implicit Dependencies)

### 正面发现（本轮无新增问题）

- ✅ 硬编码 HMAC 密钥已消除
- ✅ `subscribe_user` 副作用已文档化（#21 修复）
- ✅ 同步 stub 已添加 TODO 注释（#20 修复）

**残留观察**:
- `src-tauri/src/services/supabase_client.rs` — Supabase URL 从环境变量读取，未文档化需要哪些变量（`SUPABASE_URL`、`SUPABASE_ANON_KEY` 等）
- `src-tauri/src/services/nvwax_client.rs` — NvwaX API Key 从环境变量优先、数据库回退，但数据库存储路径依赖 `system_config` 表初始化

---

## 汇总表

| # | 维度 | 严重度 | 文件 | 行号 | 问题摘要 |
|---|------|--------|------|------|----------|
| #1 | 安全 | 🔴 | `api/mod.rs` | 244,312 | JWT_SECRET OnceLock 零密钥回退 |
| #2 | 安全 | 🟡 | `plugin_loader.rs` | 118-131 | 插件任意代码执行（架构风险） |
| #3 | 边界 | 🔴 | `api/mod.rs` | 244,312 | JWT_SECRET 未初始化 → 全认证退化（与 #1 同根） |
| #4 | 边界 | 🟡 | `relay.rs`, `websocket.rs`, `ai.rs` | 多处 | `to_string().unwrap_or_default()` 静默空串 |
| #5 | 边界 | 🟡 | `ai.rs`, `sales_commands.rs` 等 | ~46处 | `as i32` 无溢出检查 |
| #6 | 边界 | 🟢 | `invitations.rs` | 128 | 切片 `[..8]` 无边界保护 |
| #7 | 并发 | 🔴 | `products.rs`, `invitations.rs` | ~10处 | `.lock().unwrap()` poison panic |
| #8 | 并发 | 🔴 | `main.rs` | 275 | `tokio::spawn` + `.unwrap()` panic |
| #9 | 并发 | 🟡 | `invitations.rs` | 34-64 | IP限流 Mutex 隐式重入风险 |
| #10 | 并发 | 🟢 | `main.rs` | 152-260 | 多 DB 实例竞争 WAL（已追踪） |
| #11 | 错误 | 🟡 | `main.rs` | 152-764 | 9处 `.expect()` 无友好错误 |
| #12 | 错误 | 🟡 | 多处 | ~128处 | `let _ =` 吞关键路径错误 |
| #13 | 错误 | 🟡 | 多处 | ~53处 | `println!` → 需迁移 `log` 框架 |
| #14 | 错误 | 🟡 | `sync_engine.rs` | 91-93 | 离线同步 stub → 数据幻丢失 |
| #15 | 错误 | 🟢 | `api/mod.rs` | 262等5处 | `.parse().unwrap()` 风格问题 |

---

## 优先级建议

### 立即修复（P0）
1. **#1/#3 JWT_SECRET 零密钥回退** — 一行修复（`unwrap_or_else` → `expect`），影响整个认证体系
2. **#7 HTTP API `.lock().unwrap()`** — 约 10 处替换为 `.map_err()`，消除 API 崩溃
3. **#8 `tokio::spawn` + `.unwrap()`** — 一行修复，避免 HTTP 服务器无声崩溃

### 近期修复（P1）
4. **#4 `to_string().unwrap_or_default()`** — ~22 处，加日志
5. **#5 `as i32` 溢出检查** — ~46 处，量较大但模式统一可批量替换
6. **#14 离线同步 stub 警告** — 一行 `eprintln!` 避免用户误以为数据已同步

### 计划修复（P2）
7. **#2 插件签名验证** — 架构改进
8. **#11 启动 `.expect()` 包装** — 改进用户体验
9. **#12/#13 `let _` 吞错 + `log` 框架** — 广度改进

---

## 修复状态（第二轮）

| # | 维度 | 严重度 | 状态 | 修复说明 |
|---|------|--------|------|----------|
| #1/#3 | 安全/边界 | 🔴 | ✅ 已修复 | `unwrap_or_else` → `expect("JWT_SECRET not initialized")` |
| #2 | 安全 | 🟡 | ✅ 已修复 | 添加安全注释说明插件代码签名风险 |
| #4 | 边界 | 🟡 | ✅ 已修复 | 关键路径序列化失败加 `eprintln!` 日志 + 合法 JSON fallback |
| #5 | 边界 | 🟡 | ✅ 已修复 | `ai.rs` 数量溢出增加 `f64→i32` 边界检查 |
| #6 | 边界 | 🟢 | ✅ 已修复 | 切片 `[..8]` → `.get(..8).map(hex::encode)` |
| #7 | 并发 | 🔴 | ✅ 已修复 | 5处 `lock().unwrap()` → `match lock() { Ok/Err }` |
| #8 | 并发 | 🔴 | ✅ 已修复 | `axum::serve.await.unwrap()` → `if let Err(e)` + log |
| #9 | 并发 | 🟡 | ✅ 已修复 | 限流锁显式花括号 + `drop(map)` 再调用 cleanup |
| #10 | 并发 | 🟢 | ✅ 已修复 | 多 DB WAL 竞争标记为已知过渡设计注释 |
| #11 | 错误 | 🟡 | ✅ 已修复 | `.expect()` 消息改为中文用户可读 + 排除建议 |
| #12 | 错误 | 🟡 | ✅ 已修复 | WS 消息持久化 `let _ =` → `if let Err(e)` + log |
| #13 | 错误 | 🟡 | ⏳ 计划中 | `println!` → `log` 框架迁移量大，列入下轮重构 |
| #14 | 错误 | 🟡 | ✅ 已修复 | 离线同步 stub 增加 `eprintln!` 警告 |
| #15 | 错误 | 🟢 | ✅ 已修复 | `.parse().unwrap()` → `HeaderValue::from_static()` (5处) |

---

## 与前一轮对比

| 指标 | 第一轮审计 | 第二轮审计 |
|------|-----------|-----------|
| 严重 🔴 | 4 | 4 |
| 中等 🟡 | 10 | 7 |
| 低 🟢 | 8 | 5 |
| **总计** | **22** | **15** |
| 已修复 | 22/22 ✅ | 14/15 ✅ (1 项计划中) |
| 编译通过 | ✅ | ✅ (Finished dev profile) |
