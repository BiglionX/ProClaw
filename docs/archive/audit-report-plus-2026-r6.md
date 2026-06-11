# ProClaw 第六轮审计报告 (R6)

## 审计范围
全量 79 个 `.rs` 文件，本轮聚焦全新类别：
1. 命令层输入验证缺失
2. 事务内 execute 静默错误（审批模块残留）
3. 配置硬编码
4. 数据库连接健壮性
5. 错误信息敏感数据泄露
6. LAN 功能 stub 修复

---

## 修复汇总

### 🔴 Critical：输入验证缺失

**`common_commands.rs` — base64 图片上传无大小限制（炸弹攻击）**

```rust
// Before: 任意大小 base64 直接回传，OOM/DoS 攻击向量
pub fn upload_image(file_data: String) -> Result<String, String> {
    Ok(file_data)
}

// After: 10MB 硬上限
const MAX_SIZE: usize = 10 * 1024 * 1024;
if file_data.len() > MAX_SIZE {
    return Err("Image too large: ...");
}
```

**`user_commands.rs` — 创建用户零输入校验**

| 修复项 | 内容 |
|--------|------|
| name 长度上限 | `> 128` chars → 拒绝 |
| email 格式检查 | 必须含 `@` 和 `.`，最长 254 字符 |
| phone 长度 | `> 20` chars → 拒绝 |

**`catering_commands.rs` — 金额负数防御**

```rust
// 负数金额可导致财务数据错误
if amount < 0.0 { return Err("Amount cannot be negative"); }
if !amount.is_finite() { return Err("Amount must be finite"); }
```

**`convenience_commands.rs` — 保质期数量必须为正**

```rust
if quantity <= 0 { return Err("Quantity must be positive"); }
```

---

### 🔴 Critical：审批事务 execute 静默错误

**`approval_commands.rs`** — 审批通过/拒绝时：

```rust
// Before: 写审批记录失败后仍然 commit
let _ = tx.execute("UPDATE approvals SET status = ...", ...);
let _ = tx.execute("UPDATE ... SET status = ...", ...);
tx.commit()?;

// After: execute 失败时 rollback + 返回错误
if let Err(e) = tx.execute(...) {
    let _ = tx.rollback();
    return Err(format!("Failed: {}", e));
}
```

---

### 🟠 High：LAN 功能修复

**`api/auth.rs`** — `get_local_ip()` 从 stub 到真实实现

```rust
// Before: 永远返回 127.0.0.1，局域网配对完全无法工作
pub fn get_local_ip() -> Vec<String> {
    vec!["127.0.0.1".to_string()]
}

// After: UDP socket 探测实际局域网 IP
// 依次尝试 114.114.114.114:53, 8.8.8.8:53, 1.1.1.1:53
```

---

### 🟠 High：数据库连接健壮性

**`database.rs`** — 添加关键 PRAGMA

```sql
-- 新增：
PRAGMA busy_timeout=5000;     -- 写锁冲突等待 5 秒而非直接报错
PRAGMA foreign_keys=ON;       -- 启用外键约束
```

---

### 🟡 发现但未修改的遗留问题（建议后续分批优化）

| 类别 | 文件数 | 说明 |
|------|--------|------|
| 硬编码端口 8888 | 4 | `main.rs`, `devices.rs`, `invitations.rs`, `invitation_commands.rs` 四处硬编码，建议抽取为 `config.rs` |
| 硬编码 API URL | 1 | `store_commands.rs` 的 `api.deepseek.com` |
| 硬编码文件路径 | 1 | `setup_commands.rs` 的 `C:\` 仅 Windows 有效 |
| 超时值散落 | 7 | `Duration::from_secs()` 分散在 7 个文件中 |
| 大量 `String` 参数无长度限制 | ~25 个命令 | 建议后续通过宏或 validator 统一处理 |
| `i32/f64` 参数无范围检查 | ~10 个命令 | 如 `days_ahead`, `min_participants` 等 |
| `#[cfg(test)]` 中的 `.unwrap()` | ~30 | 测试代码合理保留 |

---

## 六轮累计

| 轮次 | 文件数 | 修复数 | 核心焦点 |
|------|--------|--------|----------|
| R1 | 8 | 18 | Mutex Poison, unwrap 消除 |
| R2 | 12 | 28 | 资源泄漏, 错误传播 |
| R3 | 14 | 25 | 静默 DB 写入, 竞态条件 |
| R4 | 10 | 50 | JWT 零密钥, JoinHandle, DB 写入清零 |
| R5 | 6 | 26 | 事务半写修复, 裸 unwrap, 任务泄漏 |
| R6 | 7 | 13 | 输入验证, 审批事务, LAN stub, DB 健壮性 |
| **合计** | **57** | **160** | |
