# 移动端代码审计报告（第四轮）

> 审计日期：2026-06-07
> 前序报告：`docs/mobile-audit-report-v3.md`（0 项新问题）
> 审计范围：`mobile/` 全量修改文件逐行复审 + 交叉引用分析
> 审计维度：正确性、安全性、一致性、遗漏、副作用

---

## 审计结论

第三轮 7 项修复全部正确落地，未发现回归。第四轮深度审查发现 **4 个新问题**（1 中 / 3 低），主要集中在边缘数据场景和副作用遗漏。

---

## 新发现问题

### 🟡 中优先级

| # | 文件:行号 | 问题 | 理由 | 建议修复 |
|---|---|------|------|----------|
| V1 | `ApiService.ts:365` | **订单明细确定性 ID 未考虑同商品多行** | R6 修复使用 `item_${order.id}_${item.product_id}`，若同一订单含相同 `product_id` 的多条明细（如不同规格），`INSERT OR REPLACE` 会覆盖前一行导致数据丢失 | 加入行索引：`item_${order.id}_${item.product_id}_${index}` |

### 🟢 低优先级

| # | 文件:行号 | 问题 | 理由 | 建议修复 |
|---|---|------|------|----------|
| V2 | `DatabaseFactory.ts:92-102` | **`isDatabaseEncrypted` 有副作用** | 调用 `openDatabase(profileId)` 会设置 `currentProfileId` 并可能关闭当前数据库，若传入非当前 profileId 会破坏活跃会话 | 改为仅查询 `dbInstances` 缓存，或直接查询已打开的数据库而不调用 `openDatabase` |
| V3 | `DatabaseFactory.ts:117` | **`verifyEncryptionPassword` 使用非恒定时间比较** | `expectedHash === actualHash` 与其他处（PluginDownloader、EncryptionUtil）的 constant-time 比较不一致 | 改用 constant-time 比较 |
| V4 | `PluginDownloader.ts:82` | **`fetchPluginDetail` 未编码 pluginId** | `${FLOWHUB_API_BASE}/plugins/${pluginId}` 若 pluginId 含 `/` 或 `..` 可改变 API 路径 | 使用 `encodeURIComponent(pluginId)` |

---

## 第三轮修复验证

| # | 问题 | 修复 | 验证结果 |
|---|------|------|----------|
| R1 | PluginDownloader WordArray 转换 | 4 字节打包 + `?? 0` 处理尾部 | ✅ 正确，sigBytes 使用 bytes.length |
| R2 | SyncEngine 白名单 | 确认已含 chat_sessions/chat_messages | ✅ 确认无误 |
| R3 | ApiService retry_count | 内存 Map 计数 | ✅ 正确，超限时清理 Map |
| R4 | AuthService 日志含 Token | 仅记录 user.name | ✅ 正确 |
| R5 | CallManager acceptIncoming 非空断言 | null 检查 + reject 来电 | ✅ 正确 |
| R6 | ApiService 订单明细随机 ID | 确定性 ID | ✅ 正确但 **V1 发现边缘问题** |
| R7 | SyncEngine 事务 ROLLBACK | failedCount + ROLLBACK | ✅ 正确 |

---

## 交叉引用分析

| 检查项 | 结果 |
|--------|------|
| SyncEngine ALLOWED_TABLES vs SchemaManager 实际建表 | ✅ 白名单覆盖所有 Schema 建的表 |
| ApiService offline_queue INSERT 列 vs Schema 定义 | ✅ 列名匹配（id 自增、endpoint、method、payload、created_at） |
| CallManager 所有 rtcPeer 使用点 | ⚠️ `createPeerConnection:409` 和 `hangup:191` 仍有 `!` 断言，但属安全上下文 |
| EncryptionUtil 加解密对称性 | ✅ encryptBlock/decryptBlock 格式兼容（3段/4段） |
| CloudBackupProvider 上下传路径一致性 | ✅ 路径格式 `${STORAGE_BUCKET}/${userId}/${deviceId}/${timestamp}.enc` |
| AuthService token 存储与读取 | ✅ 均使用 SecureConfig（secureGet/secureSet） |
| ProfileManager 与 DatabaseFactory profileId 流转 | ⚠️ `isDatabaseEncrypted` 侧作用（V2） |

---

## 历史修复累计

| 轮次 | 发现 | 已修复 | 遗留 |
|------|------|--------|------|
| 第一轮（v1） | 53 | 51 | 2 项设计保留 |
| 第二轮（v2） | 7 | 7 | 0 |
| 第三轮（v3） | 0 | — | 0 |
| 第四轮（v4） | 4 | 4 | 0 |
| **累计** | **64** | **62 已修复 + 2 设计保留** | **0 未修复** |

---

## 第四轮修复确认

| # | 修复 | 状态 |
|---|------|------|
| V1 | `ApiService.ts:365` — 确定性 ID 加入 `_${idx}` 行索引 | ✅ 已修复 |
| V2 | `DatabaseFactory.ts:92-102` — `isDatabaseEncrypted` 优先查缓存，避免 `openDatabase` 副作用 | ✅ 已修复 |
| V3 | `DatabaseFactory.ts:117` — `verifyEncryptionPassword` 改用 constant-time 比较 | ✅ 已修复 |
| V4 | `PluginDownloader.ts:82` — `fetchPluginDetail` 使用 `encodeURIComponent(pluginId)` | ✅ 已修复 |

**移动端代码审计通过，无待修复项。**
