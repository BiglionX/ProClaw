# 移动端代码复审报告（第二轮）

> 审计日期：2026-06-07
> 前序报告：`docs/mobile-audit-report.md`（53 项问题，51 项已修复）
> 审计范围：`mobile/` 目录 — 逐文件复审计上一轮修复，并检查是否有新引入或遗漏的问题
> 审计维度：正确性、安全性、一致性、遗漏

---

## 复审结论

上一轮 51 项修复均已正确落地，未发现回归。复审新发现 **7 个问题**（2 高 / 3 中 / 2 低），详见下表。

---

## 新发现问题

### 🔴 高优先级

| # | 文件:行号 | 问题 | 理由 | 建议修复 |
|---|---|---|---|---|
| R1 | `PluginDownloader.ts:209-214` | **ArrayBuffer→WordArray 转换错误** | 当前逐字节 `words.push(bytes[i])` 将每个字节作为独立 32-bit word，CryptoJS 期望每 word 含 4 字节。导致 HMAC 输入数据被展开为 `0x41,0x00,0x00,0x00,0x42,…`（而非原始字节流），签名验证**永远失败**——所有插件安装均被拒 | 修改为 4 字节打包：`for(i=0;i<bytes.length;i+=4){ words.push((bytes[i]<<24)\|(bytes[i+1]<<16)\|(bytes[i+2]<<8)\|bytes[i+3]); }` 然后传 `WordArray.create(words, bytes.length)` |
| R2 | `SyncEngine.ts:14-20` | **ALLOWED_TABLES 白名单缺少 `chat_sessions`/`chat_messages`** | SchemaManager V2 迁移创建了 `chat_sessions` 和 `chat_messages`，但这两个表不在白名单中。同步引擎收到这些表的变更时直接跳过，导致聊天消息无法跨设备同步 | 在 `ALLOWED_TABLES` 中添加 `'chat_sessions', 'chat_messages'` |

### 🟡 中优先级

| # | 文件:行号 | 问题 | 理由 | 建议修复 |
|---|---|---|---|---|
| R3 | `ApiService.ts:430` | **`retry_count` 列不存在，重试上限逻辑为死代码** | `offline_queue` 表 Schema 仅有 `id, endpoint, method, payload, created_at`，无 `retry_count` 列。`row.retry_count` 恒为 `undefined`，`retryCount` 恒为 1，`>= 5` 永远不成立 | 方案 A：在 Schema 中添加 `retry_count INTEGER DEFAULT 0` 列并在失败时 UPDATE；方案 B：改用 `attempts` 计数器（内存 Map 或单独记录） |
| R4 | `AuthService.ts:125` | **`pairDevice` 日志输出完整响应含 Token** | `console.log('Pair response:', response.data)` 将 `access_token`/`refresh_token` 输出到日志，敏感凭证泄露 | 改为 `console.log('Pair response: token received')` 或仅记录用户名/角色 |
| R5 | `CallManager.ts:151-152` | **`acceptIncoming` 仍使用 `rtcPeer!` 非空断言** | 上一轮 H4 修复了 `startCall` 中的非空断言，但 `acceptIncoming` 中 `this.rtcPeer!.createAnswer()` 和 `this.rtcPeer!.setLocalDescription(answer)` 仍用 `!`，与 H4 修复不一致 | 添加 `if (!this.rtcPeer)` 守卫，失败时 reject 来电并清理状态 |

### 🟢 低优先级

| # | 文件:行号 | 问题 | 理由 | 建议修复 |
|---|---|---|---|---|
| R6 | `ApiService.ts:367` | **`syncOrderToLocal` 订单明细使用随机 ID** | 服务器订单同步时 `generateId()` 为订单明细生成随机 ID，每次同步产生新行而非更新已有行（与 E4 问题类似） | 服务器返回的订单明细若有 ID 则使用，否则基于 `orderId + product_id` 生成确定性 ID |
| R7 | `SyncEngine.ts:226-313` | **事务中单条变更失败不 ROLLBACK** | `BEGIN TRANSACTION` 后若某条变更 `catch` 到错误（行 303），循环继续，最终仍 `COMMIT`。在原生 SQLite 上导致部分应用、部分跳过，事务原子性被打破 | 在 `catch` 中计数失败条目，若超过阈值则 `ROLLBACK`；或改为遇错即 `ROLLBACK` + 终止 |

---

## 上一轮修复验证

| 原编号 | 修复描述 | 验证结果 |
|--------|---------|---------|
| S1/S2 | 移除 `LEGACY_KEY`，`key` 改为必填 | ✅ `encryptData(data, key: string)` 无缺省值 |
| S3 | 签名密钥从 SecureConfig 动态加载 | ✅ `getSigningKey()` 从 `secureGet` 读取 |
| S4/S5 | 签名获取失败/无签名 URL 时 `return false` | ✅ 两处均 `return false` + `console.error` |
| S6 | 不输出配对码 | ✅ 日志仅含 `serverUrl`，但 **R4 发现新问题** |
| S7 | Token 不再通过 URL 传递 | ✅ 首条消息发送 `{type:'auth', token}` |
| S8 | Demo 模式随机 token | ✅ `'demo_' + Date.now().toString(36) + '_' + Math.random()…` |
| S9 | 默认 HTTPS | ✅ `'https://localhost:8888'` |
| S10 | 加密标记写入失败抛错 | ✅ `throw new Error('数据库加密初始化失败')` |
| S11 | 表名白名单 | ✅ `ALLOWED_TABLES` + `isValidTableName`，但 **R2 发现遗漏** |
| S12 | 路径遍历防护 | ✅ `encodeURIComponent` + round-trip 校验 |
| E1/E2/E3 | 修正表名 + 移除不存在的查询 | ✅ `product_spu`/`product_sku`/`sales_orders` |
| E4 | 确定性 SKU ID | ✅ `generateDeterministicSkuId` |
| E5/E6 | null 安全 | ✅ `(item.unit_price ?? 0).toFixed(2)` / `(orderData.total_amount ?? 0).toFixed(2)` |
| E7 | `result === ''` | ✅ 替换原 `null\|\|undefined` 检查 |
| E8 | 版本号 NaN 检查 | ✅ `currentParts.some(isNaN)` |
| E9 | LAN 扫描扩展至 12 IP | ✅ `[1,2,10,20,50,100,101,102,110,150,200,254]` |
| E10 | 指数退避 | ✅ `Math.min(1000*2^attempts, 30000)` + ±25% jitter |
| C1 | dbMutex | ✅ Promise-chain 互斥锁 + `finally` 释放 |
| C2 | initPromise | ✅ 并发复用同一 Promise |
| C3 | createProfileMutex | ✅ 同 C1 模式 |
| C4 | pendingPullQueue | ✅ 数组队列支持并发 pull |
| C5 | isSwitchingProfile 并发检查 | ✅ 开头检查 + try/finally 重置 |
| C6 | 事务包裹 | ✅ `BEGIN TRANSACTION` / `COMMIT`，但 **R7 发现不完整** |
| C7 | initAIConfig 互斥锁 | ✅ `initPromise` 复用 |
| H1 | `_retry` 标志 + `apiClient.request()` | ✅ 防循环 + 保留拦截器 |
| H2 | 迁移失败保留旧表 | ✅ `return` 中止 + 不执行 DROP |
| H3 | 失败 break + 超限删除 | ✅ 逻辑存在，但 **R3 发现死代码** |
| H4 | rtcPeer null 检查 | ✅ `startCall` 已修复，但 **R5 发现 `acceptIncoming` 遗漏** |
| H5 | 主动断开标记 | ✅ `isIntentionalDisconnect` |
| H6 | 加密标记写入抛错 | ✅ 同 S10 |
| H7/D8 | `created_at` 补充 | ✅ INSERT 含 `created_at` |
| H8 | apikey header | ✅ upload/download/list 均含 `apikey` + `Authorization` |
| M1 | 统一 SecureConfig | ✅ AuthService 直接 import SecureConfig |
| M2 | 工厂方法 | ✅ `createPluginAgent()` |
| M3 | generateId 保留各自实现 | ✅ ApiService 有 `generateDeterministicSkuId` |
| M4 | 统一 ConnectionMode | ✅ `export type { ConnectionMode } from ConnectionManager` |
| M5 | MessageService @deprecated | ⚠️ 保留（符合预期） |
| M6 | pendingOffer 类型 | ✅ `{sdp:string; type:string} \| null` |
| M7 | 静态 import | ✅ `import { getDatabase } from DatabaseFactory` |
| D1 | 表名修正 | ✅ 同 E1/E2/E3 |
| D2 | 危险 SQL 检测 | ✅ `DROP DATABASE\|ATTACH\|PRAGMA\|VACUUM\|REINDEX` |
| D3 | params 作为数组 | ✅ `params as any` |
| D4 | 显式 HTTP→WS 映射 | ✅ `replace(/^https:\/\//, 'wss://')` + `replace(/^http:\/\//, 'ws://')` |
| D5 | WebRTC 平台检测 | ✅ `isWebRTCSupported()` |
| D6 | LAN ws:// 注释 | ⚠️ 保留（符合预期） |
| D7 | 原型污染 + 列名正则 | ✅ `__proto__`/`constructor`/`prototype` 过滤 + `^[a-zA-Z_]\w*$` |
| D8 | created_at | ✅ 同 H7 |

---

## 总结

| 优先级 | 数量 | 问题 |
|--------|------|------|
| 🔴 高 | 2 | R1（签名验证永远失败）、R2（聊天表无法同步） |
| 🟡 中 | 3 | R3（重试逻辑死代码）、R4（Token 泄露日志）、R5（非空断言遗漏） |
| 🟢 低 | 2 | R6（订单明细随机 ID）、R7（事务不完整 ROLLBACK） |
| **合计** | **7** | |

### 风险评估

- **R1** 影响最严重：当前所有插件签名验证**必然失败**，意味着 FlowHub 插件市场完全不可用。这是上一轮修复的副作用——原代码用硬编码密钥签名/验证（可工作但不安全），改为从 SecureConfig 加载密钥后引入了 WordArray 构造错误。
- **R2** 导致聊天消息无法跨设备同步，影响用户体验。
- **R3/R4/R5** 分别影响离线队列可靠性、日志安全、通话稳定性。
