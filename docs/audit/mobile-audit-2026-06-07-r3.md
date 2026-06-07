# 手机端审计报告 R3 - 2026-06-07

> 审计范围：`mobile/src/` 前两轮未覆盖的 ~50 个 TS/TSX 文件（Screen/Component/Service）
> 审计维度：正确性Bug、安全性、性能、类型安全、资源泄漏
> 发现问题：14 个（严重问题 5 个）

---

## 1. 正确性Bug (Correctness) - 5个问题

### B6. PluginMigration.computeChecksum 哈希无效 🔴 严重
- **文件**: `PluginMigration.ts` L50-58
- **描述**: `hash = hash & hash` 恒等操作，与 B1 相同模式。校验和不具备区分能力。
- **修复**: 使用 DJB2 变体，`|0` 强制 32 位整数。

### B7. ConnectionScreen 硬编码 HTTP localhost 🔴 严重
- **文件**: `ConnectionScreen.tsx` L15
- **描述**: `serverUrl` 默认值 `http://localhost:8888`，与 S7/S8 相同问题，且帮助文本泄露默认配对码。
- **修复**: 动态加载服务器地址，匹配已修复的 AuthService 惯例。

### B8. ContactsScreen 使用已弃用的 substr 🟡 中
- **文件**: `ContactsScreen.tsx` L162
- **描述**: `Math.random().toString(36).substr(2, 6)` → `substr` 已弃用 (R1-M5 遗漏处)。
- **修复**: 替换为 `substring`。

### B9. DataTransferScreen 非空断言缺乏守卫 🟡 中
- **文件**: `DataTransferScreen.tsx` L107
- **描述**: `currentProfile!.id` 使用 `!` 但 `currentProfile` 可能为 null。
- **修复**: 添加空值检查。

### B10. AISettingsScreen 双重加载 🔴 严重
- **文件**: `AISettingsScreen.tsx` L61-62
- **描述**: `useEffect` + `useFocusEffect` 在 mount 时均触发，导致 `loadConfig` 重复执行，浪费 API 调用。
- **修复**: 移除 `useEffect` 的加载调用，仅保留 `useFocusEffect`。

---

## 2. 安全性 (Security) - 2个问题

### S9. ConnectionScreen 帮助文本泄露默认配对码 🟡 中
- **文件**: `ConnectionScreen.tsx` L235
- **描述**: UI 中显示「输入配对码 888888 完成配对」，将内部默认码暴露给所有用户。
- **修复**: 移除硬编码示例码，使用通用描述。

### S10. BackupWalletScreen 恢复密钥明文分享 🔴 严重
- **文件**: `BackupWalletScreen.tsx` L419-422
- **描述**: `Share.share({ message: recoveryWords })` 通过系统分享（短信/微信/邮件等）明文传输恢复密钥，用户可能无意中泄露给不安全的第三方。
- **修复**: 分享前弹窗警告用户使用安全通道，并提示改为手动抄写。

---

## 3. 性能/架构 (Performance/Architecture) - 2个问题

### P3. ConnectionScreen 动态 import 绕过循环依赖 🟡 中
- **文件**: `ConnectionScreen.tsx` L47, L53
- **描述**: `await import('../services/ProfileManager')` 和 `await import('../services/DatabaseFactory')` 用动态 import 打破循环依赖，但引入了网络瀑布延迟和代码分割碎片化。
- **修复**: 添加重构注释，说明后续应将 import 上提。

### P4. PluginDetailScreen 生产代码含 mock SQL 数据 🟢 低
- **文件**: `PluginDetailScreen.tsx` L371-464
- **描述**: `getMockUpSql`/`getMockDownSql` 硬编码模拟 SQL 在生产环境组件中。
- **修复**: 标记为 `// TODO: flowhub-integration` 注释。

---

## 4. 类型安全 (Type Safety) - 1个问题

### T4. SettingsScreen 无效的 ConnectionMode 字面量 🟡 中
- **文件**: `SettingsScreen.tsx` L30
- **描述**: `useState<ConnectionMode>('checking')` — `'checking'` 不在 `ConnectionMode` 类型中，与 HomeScreen B3 相同。
- **修复**: 声明为 `ConnectionMode | 'checking'`。

---

## 5. 健壮性 (Robustness) - 4个问题

### R7. OnboardingWizard setTimeout(async) 反模式 🟡 中
- **文件**: `OnboardingWizard.tsx` L125
- **描述**: `setTimeout(async () => {...})` 中 async 函数的异常被静默吞掉，且组件可能在超时时已卸载。
- **修复**: 在 async 函数内部 try-catch，统一在 catch 中处理错误状态。

### R8. PluginDetailScreen 传递空 profileId 🟡 中
- **文件**: `PluginDetailScreen.tsx` L73
- **描述**: `getProfilePluginPath('')` 传递空字符串，依赖该函数内部处理边缘情况。
- **修复**: 从 AppStore 获取当前 profile ID。

### R9. LanSyncScreen QR 码解析脆弱 🟢 低
- **文件**: `LanSyncScreen.tsx` L338
- **描述**: `data.replace(/[^0-9]/g, '').substring(0, 6)` 暴力剥离所有非数字字符取前6位，对于含多个数字簇的 QR 码结果不可预测。
- **修复**: 尝试先精确匹配 6 位数字，回退到当前逻辑。

### R10. ContactsScreen 演示数据含可辨识的手机号 🟢 低
- **文件**: `ContactsScreen.tsx` L20-31
- **描述**: Demo 联系人手机号 `138****1001` 等模式可被逆向识别。
- **修复**: 添加注释说明这是演示占位数据。

---

## 汇总

| 维度 | 问题数 | 严重问题数 |
|------|--------|-----------|
| 正确性Bug | 5 | 3 |
| 安全性 | 2 | 1 |
| 性能/架构 | 2 | 0 |
| 类型安全 | 1 | 0 |
| 健壮性 | 4 | 0 |
| **合计** | **14** | **4** |

### 三轮总汇

| | R1 | R2 | R3 | 合计 |
|------|-----|-----|-----|------|
| 发现问题 | 35 | 15 | 14 | **64** |
| 严重问题 | 15 | 3 | 4 | **22** |
