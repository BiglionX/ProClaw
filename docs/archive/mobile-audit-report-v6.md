# 第六轮审计报告 — Mobile Services

**日期**: 2026-06-07  
**范围**: 全部 19 个已修改文件  
**审计员**: AI Code Reviewer  

---

## 本轮新发现与修复

| # | 优先级 | 文件 | 问题 | 修复 |
|---|--------|------|------|------|
| **W5** | 🔴 高 | `SchemaManager.ts` | V2 迁移失败时 `return` 不阻止 `applySchema` 更新 schema version → 数据被孤立（旧表保留但新表为空，version=2，旧消息永远不可见） | `return` 改为 `throw`，使 `applySchema` 中断、不执行 `setSchemaVersion`，下次启动可重试 |
| **W6** | 🟡 中 | `CallManager.ts` | `createOffer` / `setLocalDescription` 未包裹 try-catch → 若抛异常则 PeerConnection 和 store 状态泄漏（通话卡在 ringing） | 添加 try-catch，失败时执行 cleanup + endCall + reset |
| **W7** | 🟢 低 | `ProfileManager.ts` | `deleteProfile` 无互斥锁 → 并发删除不同身份时 read-modify-write 丢失，被删身份可能复活 | 复用 `createProfileMutex`，delete 操作也走互斥锁 |

---

## 已知的保留问题（不阻塞，后续迭代处理）

| # | 优先级 | 文件 | 描述 |
|---|--------|------|------|
| K1 | 🟡 中 | `LanSyncProvider.ts` | `sync()` 中 `markSynced` 在 `send()` 后立即调用，未等服务端确认。若 WS 连接在发送后立即断开，变更已标记为 synced 但实际未送达。需协议层添加 `sync_push_ack` |
| K2 | 🟡 中 | `EncryptionUtil.ts` | `generateRecoveryKey` 仅 ~28 bits 熵（26 词池 × 6 词），远低于安全标准。后续升级 BIP-39 助记词 |
| K3 | 🟢 低 | `PluginDownloader.ts` | 已添加 ZIP 压缩前 50MB 上限，但未限制单个解压文件大小（zip bomb 可压缩后 < 50MB 但解压单文件 >> 1GB） |

---

## 累计修复统计

| 轮次 | 新增修复 | 累计 |
|------|----------|------|
| V1–V4 | 72 项 | 72 |
| V5 | 3 项 (W1–W4) | 75 |
| **V6** | **3 项 (W5–W7)** | **78** |

**设计保留**: 1 项 (K2)  
**已知不阻塞**: 2 项 (K1, K3)
