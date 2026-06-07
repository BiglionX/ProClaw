# ProClaw Plus 代码审计报告 - 第三轮 (2026-06-07)

## 审计概述

第二轮修复了15个问题中的14个，但第三轮全量扫描发现了**大量剩余问题**，主要集中在前两轮未覆盖的区域：
Tauri命令层、数据库写入静默忽略、序列化崩溃、Mutex Poison残留等。

**关键发现：** 代码中约有 **97+ 处 `let _ =`** 模式，其中 **40+ 处**位于数据库写入/状态更新等关键路径。

---

## 一、Mutex Poison 残留 (🔴 Critical)

### 1.1 `api/invitations.rs:49` - IP_RATE_LIMIT 限流锁
```rust
let mut map = IP_RATE_LIMIT.lock().unwrap();
```
前轮修复添加了 `drop(map)` 但保留了 `unwrap()`。若Mutex poisoned，后续所有请求panic。

### 1.2 `api/invitations.rs:82` - cleanup_rate_limit_map
```rust
let mut map = IP_RATE_LIMIT.lock().unwrap();
```
同上。

### 1.3 `invitation_commands.rs:30` - ACCEPT_RATE_LIMIT
```rust
let mut map = ACCEPT_RATE_LIMIT.lock().unwrap();
```
Tauri命令层Mutex Poison导致panic传播。

**修复：** 使用 `match lock()` 模式或 `clear_poison()` 恢复。

---

## 二、`reqwest::Client` 构建失败回退 (🔴 Critical)

### 2.1 `services/supabase_client.rs:37`
```rust
let client = Client::builder()
    .timeout(Duration::from_secs(30))
    .connect_timeout(Duration::from_secs(10))
    .build()
    .unwrap_or_default();
```
`unwrap_or_default()` 在构建失败时回退到 `reqwest::Client::default()`，**丢失所有超时设置**。Supabase调用可能永久阻塞。

**修复：** 改为 `expect("Failed to create Supabase HTTP client")`。

---

## 三、数据库写入静默忽略 (🔴 Critical)

### 3.1 `api/ai.rs` - AI识别相关
| 行号 | 操作 | 风险 |
|------|------|------|
| 224 | `let _ = conn.execute("INSERT INTO order_drafts")` | 草稿丢失 |
| 243 | `let _ = conn.execute("INSERT INTO ai_recognition_logs")` | 识别日志丢失 |
| 267 | `let _ = conn.execute("INSERT INTO ai_recognition_logs...failed")` | 失败日志丢失 |

### 3.2 `api/websocket.rs` - 消息持久化
| 行号 | 操作 | 风险 |
|------|------|------|
| 385 | `let _ = conn.execute("INSERT INTO offline_messages")` | 离线消息丢失 |
| 468 | `let _ = conn.execute("UPDATE offline_messages SET is_sent=1")` | 重复推送 |
| 513-684 | `let _ = db.connection().execute("INSERT/UPDATE call_records")` (x7处) | 通话记录丢失 |

### 3.3 `api/relay.rs` - 云中继
| 行号 | 操作 | 风险 |
|------|------|------|
| 98 | `let _ = db.connection().execute("INSERT INTO offline_queue")` | 同步队列丢失 |
| 162 | `let _ = db.connection().execute("UPDATE relay_messages SET status='delivered'")` | 状态不一致 |
| 250 | `let _ = db.connection().execute("INSERT INTO sync_log")` | 同步日志丢失 |
| 301 | `let _ = db.connection().execute("UPDATE offline_queue SET status='processing'")` | 重复处理 |
| 311 | `let _ = db.connection().execute("UPDATE offline_queue SET status='completed'")` | 状态不一致 |
| 320 | `let _ = db.connection().execute("UPDATE offline_queue SET status='pending'")` | 重试丢失 |
| 336 | `let _ = db.connection().execute("UPDATE sync_log SET status=...")` | 日志不准确 |

### 3.4 `api/invitations.rs` - 邀请流程 (Critical: 无认证接口)
| 行号 | 操作 | 风险 |
|------|------|------|
| 394 | `let _ = conn.execute("UPDATE users SET user_type='internal'")` | 用户类型丢失 |
| 431 | `let _ = conn.execute("INSERT INTO user_roles")` | 角色未分配 |
| 442,449 | `let _ = conn.execute("INSERT INTO user_contacts")` (x2) | 联系人缺失 |
| 466 | `let _ = conn.execute("INSERT INTO messages")` | 欢迎消息丢失 |
| 473 | `let _ = conn.execute("UPDATE invitations SET status='used'")` | 邀请可重复使用 |
| 701,709 | `let _ = conn.execute("INSERT INTO user_contacts")` (x2) | 联系人缺失 |
| 726 | `let _ = conn.execute("INSERT INTO messages")` | 消息丢失 |
| 733 | `let _ = conn.execute("UPDATE invitations SET status='used'")` | 邀请可重复使用 |

### 3.5 其他关键位置
| 文件 | 行号 | 操作 | 风险 |
|------|------|------|------|
| `api/auth.rs` | 112 | `let _ = conn.execute("UPDATE pairing_codes")` | 配对码可重复使用 |
| `api/auth.rs` | 133 | `let _ = conn.execute("INSERT INTO devices")` | 设备信息丢失 |
| `api/auth.rs` | 218 | `let _ = conn.execute("UPDATE users SET last_login_at")` | 登录时间不准 |
| `store_commands.rs` | 86 | `let _ = conn.execute("INSERT INTO cloud_store_themes")` | 默认主题丢失 |
| `approval_commands.rs` | 54 | `let _ = conn.execute("UPDATE ... SET status='submitted'")` | 订单状态不更新 |
| `user_commands.rs` | 326 | `let _ = conn.execute("DELETE FROM user_roles")` | 角色残留 |

---

## 四、序列化/反序列化 `unwrap_or_default()` 问题 (🟠 High)

### 4.1 权限解析失败静默空权限
`auth/permissions.rs:80` - `parse_permissions()` 返回空 Vec，已记录日志但行为不变。保留此行为因为它是设计折衷（管理员可通过角色重设权限）。已增加 eprintln 日志。

### 4.2 其他高风险位置
| 文件 | 行号 | 内容 |
|------|------|------|
| `api/invitations.rs:275` | role_ids JSON 序列化失败 | 
| `api/invitations.rs:374` | role_ids JSON 反序列化失败 |
| `api/websocket.rs:396` | 消息序列化失败发送空字符串 |
| `team_commands.rs:59,64` | 标签/成员数据损坏 |
| `api/relay.rs:512` | relay 消息 content JSON 反序列化 |
| `api/ai.rs:471` | 草稿 items_json 序列化 |

---

## 五、WebSocket 连接层 (🟠 High)

### 5.1 Writer Task JoinHandle 丢失
`api/websocket.rs:225` - `tokio::spawn` 未保存 JoinHandle，连接断开后 writer task 依赖 channel 关闭机制退出，但无法主动取消。

### 5.2 `extract_user_id_from_token` 硬编码密钥
`api/websocket.rs:700` - 使用 `&[0u8; 32]` 作为 JWT 解码密钥，无法正确验证任何 token。

**修复：** 该函数标记为 `#[allow(dead_code)]`，保留但增加文档说明不可直接使用。

---

## 六、主进程管理 (🟠 High)

### 6.1 HTTP Server JoinHandle 丢失
`main.rs:282` - axum 服务器 spawn 后未保存 JoinHandle，Tauri 关闭时没有 `graceful_shutdown` 机制。

### 6.2 硬编码的邀请密钥回退
`invitation_commands.rs:55` - Tauri命令层使用 `b"ProClaw-Invite-Secret-Key-2026"` 硬编码密钥作为 INVITE_SECRET_KEY 回退，与 HTTP API 层的密钥不一致。

---

## 七、修复策略

本轮修复分三个优先级：

**P0 (立即修复):**
1. Mutex Poison 3处
2. supabase_client.rs client builder
3. 所有 api/ 目录下的 `let _ =` DB写入 → `if let Err(e)`
4. 关键序列化 `unwrap_or_default()` → 有日志的回退

**P1 (建议修复):**
5. Tauri命令层 `let _ =` → `if let Err(e)`
6. Writer task JoinHandle
7. invitation_commands.rs 硬编码密钥

**P2 (后续优化):**
8. HTTP server graceful shutdown
9. `extract_user_id_from_token` 重新设计
