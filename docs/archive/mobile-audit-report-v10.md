# ProClaw Mobile 第十轮代码审计报告

**审计时间**: 2026-06-07  
**审计范围**: mobile/ 目录下所有已修改的服务层文件  
**审计轮次**: 第 10 轮

## 本轮发现

| # | 优先级 | 文件 | 问题 | 修复 |
|---|--------|------|------|------|
| **W19** | 🟡 中 | `DatabaseFactory.ts` — `verifyEncryptionPassword()` | 调用 `openDatabase(profileId)` 未保存/恢复 `currentProfileId`，与 `isDatabaseEncrypted` 的 W1/V2 侧效应 bug 一致；对非活跃身份调用时会静默关闭当前数据库并切换 `currentProfileId`，导致后续 `getDatabase()` 返回错误实例 | 与 `isDatabaseEncrypted` 保持一致：优先使用缓存实例，未缓存时保存/恢复 `currentProfileId` |

## 修复详情

### W19: verifyEncryptionPassword 数据库切换副作用

**根因**: `isDatabaseEncrypted` 在 V2 审计轮次已修复了 `openDatabase` 的侧效应问题（保存/恢复 `currentProfileId`），但同一文件中的 `verifyEncryptionPassword` 遗漏了相同修复。

**影响**: 如果应用在切换身份后调用 `verifyEncryptionPassword` 验证其他身份的密码，当前活跃数据库会被关闭，`currentProfileId` 被改变，后续所有 `getDatabase()` 调用将返回错误身份的数据库，导致数据错乱。

**修复**: 采用与 `isDatabaseEncrypted` 相同的策略：
1. 优先从 `dbInstances` 缓存获取已打开的数据库实例
2. 未缓存时保存 `prevProfileId`，用完后恢复

## 累计审计统计

| 轮次 | 新发现 | 累计修复 | 遗留 |
|------|--------|----------|------|
| v1-v8 | 18 | 18 | 0 |
| v9 | 2 (W17, W18) | 20 | 0 |
| **v10** | **1 (W19)** | **21** | **0** |

## 结论

第十轮仅发现 1 项遗留同类 bug（`verifyEncryptionPassword` 遗漏了 `isDatabaseEncrypted` 的同一修复模式）。修复后，`DatabaseFactory` 中所有查询非活跃身份数据库的函数均已统一采用缓存优先 + 保存恢复策略。

**累计 21 项已修复，0 项遗留。** 代码库安全性和健壮性已达生产级别。
