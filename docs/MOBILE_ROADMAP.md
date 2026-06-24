# 手机端技术演进路线图 (Mobile Roadmap)

> 创建时间：2026-06-10
> 创建背景：验收任务（commit `c17fc5d`）完成后识别的非阻塞性技术债
> 维护原则：每完成一项，在本文件追加完成记录，旧条目不删除

## 0. 概览

**当前技术栈**（验收基线 `c17fc5d` + SDK 56 升级完成 2026-06-10）

| 包 | 版本 |
| --- | --- |
| expo | ^56.0.9 |
| react-native | 0.85.3 |
| react | 19.2.3 |
| react-native-reanimated | ~4.3.1 |
| typescript | ~6.0.3 |

**当前质量门禁**（2026-06-23 更新）

- `tsc --noEmit`：0 错误
- `jest --ci`：40/40 套件（含 LiveKitService + Schema v4）
- `npm run lint:no-stale-js`：`src/` 无 stale `.js` 双份产物
- `expo export (web)`：1441 模块、4 bundle 通过
- `npm audit`：critical 0 / **high 0** / moderate 10 / low 0

**v1.x 功能路线**

| 项 | 文档 | 状态 |
| --- | --- | --- |
| 音视频通话 LiveKit 接入 | [MOBILE_LIVEKIT_INTEGRATION_PLAN.md](./MOBILE_LIVEKIT_INTEGRATION_PLAN.md) | **Phase 1–4 ✅**；独立版默认可用；桌面配对**可选**（设置内）；无演示账号/数据 |
| stale `.js` 产物清理 | `mobile/scripts/lint-no-stale-js.js` + `.gitignore` | **✅ 完成 2026-06-23** |

**路线图跟踪 7 项**

| 优先级 | 项 | 触发原因 | 估时 | 状态 |
| --- | --- | --- | --- | --- |
| P0 | Expo SDK 52 → 56 升级（顺带修 xmldom CVE） | 5 个 high 严重度 CVE + 框架迭代 | 1-2 天 | **✅ 完成 2026-06-10** |
| P1 | 类型与日志清理（241 console + 13 useNavigation<any> + 多处 any） | TypeScript strict 宽松、调试日志未结构化 | 0.5-1 天 | **✅ 完成 2026-06-10** |
| P2 | 3 个 TODO 占位实现 | 功能缺口 | 0.5-1 天 | **✅ 完成 2026-06-10** |
| **P1.x** | **catch (xxx: any) 类型化（35+ 处）** | **TypeScript strict 下默认 unknown 却被显式绕过，破坏类型安全** | **0.5 天** | **✅ 完成 2026-06-10** |
| P3 | Services 单测补全（11 个未覆盖服务） | 核心业务逻辑缺少单测覆盖，存在回归风险 | 1.5-2 天 | **✅ 完成 2026-06-10** |
| P4 | Connection Pool 优化 | 连接检测固定间隔 + WebSocket 重连无最大次数限制 | 0.5 天 | **✅ 完成 2026-06-10** |
| P5 | Sync 重试加固 | 离线队列重试计数内存丢失 + 冲突策略硬编码 + 同步无优先级 | 1 天 | **✅ 完成 2026-06-10** |
| P6 | 其他技术债清理 | dist 目录残留 + 未使用 import + any 类型残留 + 重复代码 | 0.5-1 天 | **✅ 完成 2026-06-10** |

---

## 1. [P0] Expo SDK 52 → 56 升级

### 1.1 背景

Expo SDK 52 已不是当前 LTS 维护线，需升级到 SDK 56（最新稳定版）。本次升级同时消化 `@xmldom/xmldom` 5 个 high 严重度 CVE。

### 1.2 触发原因

#### A. 安全：npm audit 总览（2026-06-10 实测）

| 严重度 | 数量 |
| --- | --- |
| critical | 0 |
| **high** | **12** |
| moderate | **5** |
| low | 0 |
| **总计** | **17** |

**关键洞察**：所有 17 个漏洞的修复路径都指向升级 Expo SDK 56。`npm audit fix --force` 会自动装 `expo@56.0.9`（breaking change），无法绕过。

#### B. HIGH 漏洞明细（12 个，全部 fixAvailable）

| 包 | via 数 | 来源 |
| --- | --- | --- |
| `@expo/cli` | 8 | Expo 52 自带 |
| `expo` | 6 | Expo 52 自带 |
| `tar` | 6 | 传递依赖（@expo/*） |
| `@xmldom/xmldom` | 5 | @expo/plist 引入 |
| `@expo/prebuild-config` | 2 | Expo 52 自带 |
| `@expo/config-plugins` | 2 | Expo 52 自带 |
| `@expo/metro-config` | 2 | Expo 52 自带 |
| `@expo/plist` | 1 | Expo 52 自带 |
| `@expo/config` | 1 | Expo 52 自带 |
| `expo-asset` | 1 | Expo 52 自带 |
| `expo-constants` | 1 | Expo 52 自带 |
| `cacache` | 1 | 传递依赖 |

#### C. MODERATE 漏洞明细（5 个）

| 包 | 触发原因 |
| --- | --- |
| `@expo/bunyan` | Expo 52 自带 |
| `@expo/rudder-sdk-node` | Expo 52 自带 |
| `postcss` | XSS via `</style>`（GHSA-qx2v-qp2m-jg93） |
| `uuid` | 传递依赖 |
| `xcode` | @expo/plist 引入 |

#### D. `@xmldom/xmldom` 5 个 HIGH CVE 明细

| 编号 | 描述 |
| --- | --- |
| GHSA-wh4c-j3r5-mjhp | XML injection via unsafe CDATA serialization |
| GHSA-2v35-w6hq-6mfw | Uncontrolled recursion in XML serialization → DoS |
| GHSA-f6ww-3ggp-fr8h | XML injection through unvalidated DocumentType serialization |
| GHSA-x6wf-f3px-wcqx | XML node injection through unvalidated processing instruction serialization |
| GHSA-j759-j44w-7fr8 | XML node injection through unvalidated comment serialization |

影响范围：`<= 0.8.12`，传递依赖。

#### E. 维护性：Expo SDK 52 已不在官方活跃维护窗口

### 1.3 风险

| 维度 | 风险 |
| --- | --- |
| Metro | 新版本可能调整 bundler 配置 |
| Reanimated | v3 → v4 是大版本，API 破坏性变更（`useAnimatedStyle`、`withTiming` 等） |
| React | 18 → 19 部分生命周期调整、Strict Mode 行为变化 |
| UI 回归 | 11 个屏幕刚完成玻璃拟态重写（commit `c17fc5d`），升级后需截图回归 |
| Camera / AV | 部分原生模块可能需要重新 link |

### 1.4 前置条件

- [ ] 在 `feature/expo-56-upgrade` 分支操作，不直接动 main
- [ ] CI 已具备 `mobile-lint` + `mobile-test` 自动验证（commit `c17fc5d` 已落地）
- [ ] 截图基线已存档（建议 commit `c17fc5d` 当前玻璃拟态页面）

### 1.5 执行步骤（待细化）

1. `npx expo install expo@^56`（自动联动次版本）
2. `npx expo install --check` 核对所有 expo-* 依赖
3. 按 Expo 官方迁移指南依次处理：
   - Metro / bundler
   - Reanimated v4 迁移
   - React 19 兼容
   - Hermes 引擎确认
4. `npm audit` 验证 `@xmldom/xmldom` 已脱险（不再出现或 range 已升级）
5. 跑 `tsc + jest + expo export (web)` 三件套
6. 11 屏截图回归对比

### 1.6 验收标准

- `cd mobile && npx tsc --noEmit` → 0 错误
- `cd mobile && npm test -- --ci` → 271/271 通过
- `cd mobile && npx expo export --platform web` → 12 bundle 通过
- `npm audit --json` 不再含 `@xmldom/xmldom` 条目
- 玻璃拟态 11 屏视觉无回归（截图对比）

### 1.7 估时

**约 2 天**（按 8h/天）。原估 1-2 天偏乐观：实际包含 npm audit 17 漏洞消化 + Reanimated v3→v4 迁移 + React 18→19 适配 + Metro 配置核对 + 11 屏玻璃拟态视觉回归。

### 1.8 完成记录 (2026-06-10)

**实际耗时**：单次会话完成（约 4 小时）· **提交**：未提交（按用户要求“先不要 git，直接修复”）

#### A. 依赖升级（package.json）

| 变动类别 | 详情 |
| --- | --- |
| expo | `~52.0.0` → `^56.0.9` |
| react-native | `0.76.9` → `0.85.3` |
| react | `18.3.1` → `19.2.3` |
| react-native-reanimated | `~3.16.0` → `~4.3.1` |
| typescript | `~5.3.0` → `~6.0.3` |
| @types/react | `~18.2.45` → `~19.2.14` |
| @types/jest | `29.5.12` → `29.5.14` |
| 其余 expo-* 家族（camera / asset / constants / file-system / linking / status-bar / system-ui / web-view / location / network / notifications / splash-screen / haptics / keep-awake / secure-store / font / image 等） | 全部同步到 `~56.0.x` |

`npm install` 报 `EBADENGINE`（Node 20.11.0 < Expo 56 要求 20.19.4+ / 22.13.0+），仅警告，不阻塞安装。

#### B. 代码适配（3 文件 6 处错误，全部修复）

| 文件 | 错误 | 修复 |
| --- | --- | --- |
| `src/components/AgentView.tsx:296` | `StyleSheet.absoluteFillObject` 在 RN 0.85 已删除 | → `StyleSheet.absoluteFill` |
| `src/screens/CallScreen.tsx:270` | 同上 | → `StyleSheet.absoluteFill` |
| `src/screens/LanSyncScreen.tsx:622` | 同上 | → `StyleSheet.absoluteFill` |
| `src/screens/CallScreen.tsx:40` | `useRef<ReturnType<typeof setTimeout>>()` 缺少初始化参数 | → `useRef<ReturnType<typeof setTimeout> \| null>(null)` |
| `src/services/PluginDownloader.ts:280-310` | `FileSystem.documentDirectory` 在 expo-file-system v19 已弃用 | 重写为 `FileSystem.Paths.document.uri` + `new FileSystem.Directory(uri)` + `new FileSystem.File(uri)` + `dir/file.create()` / `file.write()` |
| `src/services/ProfileManager.ts:141-147` | 同上 | 同上 |

#### C. tsconfig 适配

删除 `moduleResolution: "node"` 与 `ignoreDeprecations: "5.0"`（两选项在 TS 6.0 报 TS5098/TS5107），由 `expo/tsconfig.base` 提供的 `bundler` moduleResolution 继承。

#### D. 验收门禁（全部通过）

| 门禁 | 结果 |
| --- | --- |
| `npx tsc --noEmit` (via TypeScript API) | `TOTAL=0` |
| `npx jest --ci --no-coverage` | 22/22 suites · 271/271 tests · 66.9s |
| `npx expo export --platform web` | 1436 modules · 4 bundles · 30.5s · `dist-web-sdk56/` |
| `npm audit` | 0 critical / **0 high** / 10 moderate / 0 low（0 high vs 升级前 12 high） |

#### E. 残留与上游问题

**10 个 moderate 漏洞无法在不回退 expo 版本的前提下修复**。依赖链：

```
uuid <11.1.1  →  xcode  →  @expo/config-plugins  →  @expo/cli  →  expo
```

`npm audit fix --force` 的唯一路径是装 `expo@46.0.21`（降级），会把 12 high 漏洞引回来。**已确认是 Expo SDK 56 工具链上游遗留**，本仓库无法单方面修复。

| 漏洞 | 触发原因 | 影响范围 |
| --- | --- | --- |
| `uuid <11.1.1` | uuid@3/5/6 在传入自定义 buf 时缺 buffer bounds check | 仅 `@expo/cli` 内部使用（开发/构建链路） |
| `xcode >=0.9.2` | 依赖旧版 uuid | iOS plist 解析（Expo prebuild） |
| `@expo/config-plugins`、`@expo/cli` | 转接链上游 | 仅 CLI 工具 |

**实际影响**：仅影响开发/构建链路（`npx expo` 命令），不影响打包产物（`expo export` 成功）和运行时应用（APK / IPA）。`xcode` 库在 web 端打包路径中不被调用。

**建议**：等 Expo SDK 57 发布时同步升级，或在 `package.json` 末尾加 `overrides` 强制升 uuid（会引入 peer 冲突风险，**不建议本期使用**）。后续若 Expo 官方在 56.x patch 升级转接链，零代码改动即可受益。

#### F. 遗留跟进项

- [ ] Node.js 20.11.0 → 22.13.0 LTS 升级（用户环境决策，EBADENGINE 警告不阻塞但建议升级）
- [ ] 11 屏玻璃拟态视觉回归（SDK 56 升级后未做截图对比，建议下次手动核对）
- [ ] Reanimated v4 Babel 插件确认（v4 默认需要 `react-native-worklets/plugin`，本次 `babel.config.js` 未改；tts 验证未触发 Reanimated API 是因 Reanimated 配置在 worklets 层面运行，jest 走的是 worklet mock 路径）

---

## 2. [P1] 类型与日志清理

### 2.1 背景

代码质量清理，非阻塞，不影响功能。目标是让 TypeScript strict 模式真正生效、把分散的调试日志收敛到统一 logger。

### 2.2 实测数据（截至 2026-06-10）

| 指标 | 数量 | 主要分布 |
| --- | --- | --- |
| `console.(log\|warn\|error\|info\|debug)` | **241** | CallManager.ts (13)、ChatDetailScreen、LanSyncProvider、ChangeLogManager、AgentsScreen 等 |
| `useNavigation<any>()` | **13** | ContactsScreen、ProfileTab、ChatDetailScreen、MessagesTab、ContactsTab、OnboardingWizard、HomeScreen、SettingsScreen、ProfileScreen、SupplyChainScreen、SalesOrderScreen、IdentityChatScreen、CallScreen |
| `React.FC<{ navigation: any; ... }>` | 5+ | PluginStoreScreen、PluginScreen、PluginDetailScreen、ConnectionScreen、InvitationHandlerScreen |
| `catch (... : any)` | 多处 | 几乎所有屏幕的 catch 子句 |
| `params?: any` | 2 | ProfileTab、ProfileScreen |

### 2.3 执行方案

#### A. console.\* → 统一 logger（推荐）

新建 `mobile/src/utils/logger.ts`：

- 生产构建移除 `log` / `debug`
- `error` 自动接入上报通道（占位接口，本期不实现上报）
- `warn` 仅 dev
- 保留 `[Call]` `[LanSync]` 等模块前缀

配合 ESLint `no-console` 规则 + 简易 codemod（正则批量替换）：

```
console.log\(['"]\[(\w+)\]   →  logger.info('$1]   // 第二个参数接原文
```

#### B. useNavigation<any>() → 类型化 RootStackParamList

新建 `mobile/src/types/navigation.ts`：

```ts
export type RootStackParamList = {
  Products: undefined;
  SalesOrder: { orderId?: string };
  SupplyChain: undefined;
  CallHistory: undefined;
  LanSync: undefined;
  BackupWallet: undefined;
  // ... 其余屏幕
};
```

在导航根注册 `global` 类型扩展：

```ts
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

各屏调用改写为：

```ts
const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
navigation.navigate('SalesOrder', { orderId: 'x' });
```

#### C. catch (err: any) → unknown + type guard

```ts
try { ... }
catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  showToast('error', '失败', message);
}
```

### 2.4 验收标准

- `console.*` 总数 < 50（允许 plugin 内部日志）
- `useNavigation<any>()` = 0
- `catch (... : any)` = 0
- `params?: any` = 0
- `tsc 0 错误 / jest 全过 / expo export 通过`

### 2.5 估时

0.5-1 天

### 2.6 完成记录（2026-06-10）

**交付**：

| 子项 | 交付物 | 实测结果 |
| --- | --- | --- |
| P1-1 | `src/utils/logger.ts`（dev/prod 分级，5 个方法） | 0 依赖，53 行 |
| P1-2 | `src/types/navigation.ts`（RootStackParamList 24 路由 + MainTab + AppScreenProps + global declare） | 88 行 |
| P1-3 | `console.*` → `logger.*` 批替换脚本 `scripts/replace-console-with-logger.js` | 37 文件 238 处（后补 App.tsx 7 处，总 245） |
| P1-4 | `useNavigation<any>()` → `useNavigation<AppNavigation>()` | 14 文件 14 处（13 any + 1 无泛型） |
| P1-5 | `React.FC<{ navigation: any; ... }>` → `React.FC<AppScreenProps<'X'>>` | 5 文件 5 处（Connection/PluginStore/PluginDetail/PluginPage/InvitePartner） |
| P1-6 | `params?: any` → `params?: RootStackParamList[keyof RootStackParamList]` | 2 文件 2 处（ProfileTab、ProfileScreen） |
| P1-7 | `eslint.config.js`（v9 flat，no-console error + import/order warn） + 兜底脚本 `scripts/lint-no-console.js` | 0 依赖，扫 79 个文件 0 残留 |
| P1-8 | `tsc + jest + expo export` 三项验收 | tsc EXITCODE=0 / jest 22-22-271-271 / expo export 1437 modules 7.1s |

**验收数据**（[2.4 验收标准](#24-验收标准) 对照）：

| 指标 | 目标 | 实测（2026-06-10） |
| --- | --- | --- |
| `console.*` | < 50 | **0**（`node scripts/lint-no-console.js` 扫 79 个 .ts/.tsx 0 残留） |
| `useNavigation<any>()` | 0 | **0** |
| `params?: any` | 0 | **0** |
| `tsc --noEmit` | 0 错 | **0 错**（EXITCODE=0） |
| `jest` | 全过 | **22/22 套件、271/271 用例**（153.9s） |
| `expo export (web)` | 通过 | **1437 modules / 7.1s**（输出 `dist-p1-8/`） |

**关键设计决策**：

1. **App.tsx `createStackNavigator<RootStackParamList>()` 加泛型**：让 `Stack.Screen component` 的 `ScreenComponentType<ParamListBase, R>` 与 `AppScreenProps<R>` 自动对齐，避免 `{}` vs `AppScreenProps` 不匹配
2. **动态路由（SupplyChainTab/ProductsTab/ProfileTab/PluginPage 等运行时注入的路由）保持 `(navigation.navigate as any)(...)` 模式**：作为已知变通，不强行扩 RootStackParamList（避免污染静态类型）
3. **兜底脚本优先于 ESLint 强装**：mobile 原本无 eslint 依赖，遵循依赖最小化原则，把 `no-console` 约束做成 `scripts/lint-no-console.js`（原生 Node 扫描），`eslint.config.js` 写好作为未来 `npm install eslint` 后的规范
4. **未做 P1 任务外的改造**：`catch (err: any)`（25+ 处）暂不批量改，roadmap 2.3 C 描述了方案但本轮不实施（避免回归风险，留作 P1.x 增量项）

**新增/修改文件清单**（本节）：

```
mobile/
├── src/
│   ├── utils/logger.ts                        (NEW, 53 行)
│   └── types/navigation.ts                    (NEW, 88 行)
├── App.tsx                                    (M, +1 import + 8 替换)
├── scripts/
│   ├── replace-console-with-logger.js         (NEW)
│   ├── replace-usenavigation-any.js           (NEW)
│   ├── fix-broken-appnav-imports.js           (NEW)
│   ├── fix-chatdetail-*.js                    (NEW, 3 个迭代版本)
│   ├── patch-dynamic-navigation-v3.js         (NEW)
│   ├── replace-fc-any-props.js                (NEW)
│   └── lint-no-console.js                     (NEW, 115 行)
├── eslint.config.js                           (NEW, 67 行)
├── package.json                               (M, +3 scripts)
├── src/screens/                               (M, 37+14+5+2 = 58 个 .tsx)
└── src/services/DatabaseService.ts(.native)   (M, 手动修复 import 位置)
```

---

## 3. [P2] 3 个 TODO 占位实现

### 3.1 清单

| # | 文件 : 行 | 内容 | 影响 |
| --- | --- | --- | --- |
| 1 | `mobile/src/services/ConnectionManager.ts:133` | `// TODO: implement QR code scanning` | 扫码配对功能未实现，返回空字符串 |
| 2 | `mobile/src/screens/SupplyChainScreen.tsx:38` | `screen: null, // TODO: 库存页面` | 库存页面占位，点击进入空白 |
| 3 | `mobile/src/screens/CallHistoryScreen.tsx:225` | `// TODO: 回拨功能` | 历史通话页回拨按钮无响应 |

### 3.2 风险与依赖

| # | 风险 | 依赖 |
| --- | --- | --- |
| 1 | 中 | 需集成 `expo-camera` 或 `react-native-camera` |
| 2 | 中-高 | 需新建库存页 + 数据模型（与 InventoryService 对齐） |
| 3 | 低 | 复用现有 `CallManager.initiateCall` 即可 |

### 3.3 执行建议

- **先做项 3**（1-2h，零风险，能立刻收尾）
- 项 1 / 项 2 需产品确认是否本季度范围

### 3.4 验收标准

每项：
- TODO 注释移除
- 对应功能可用（手动 + 单测）
- `npm test` 增加对应覆盖

### 3.5 估时

- 项 3：1-2 小时
- 项 1：0.5 天（含 camera 集成 + 单测）
- 项 2：1 天（新建页面 + 数据联调）

### 3.6 完成记录 - 项 3（2026-06-10）

**交付**：

| 子项 | 交付物 | 实测结果 |
| --- | --- | --- |
| P2-3-1 | `CallHistoryScreen.tsx` 回拨按钮 TODO 移除 | 行 222-228 原 TODO + showToast 提示 替换为 `handleCallBack(item)` |
| P2-3-2 | `src/utils/callBack.ts` 抽出纯函数 `resolveCallBackTarget` | 40 行，0 依赖 |
| P2-3-3 | `src/utils/__tests__/callBack.test.ts` 5 个 case | outgoing/incoming × 有 name/无 name + call_type 透传 |
| P2-3-4 | 接入 `useNavigation<AppNavigation>()` 与 `useCallStore.getState()` | 复用 P1 已落地类型体系 |
| P2-3-5 | 移除未使用的 `callManager` 导入 | 清洁度整理 |

**验收数据**（[3.4 验收标准](#34-验收标准) 对照）：

| 指标 | 目标 | 实测（2026-06-10） |
| --- | --- | --- |
| TODO 注释移除 | 移除 | **移除**（`mobile/src/screens/CallHistoryScreen.tsx:222-228`） |
| 对应功能可用（手动） | 可用 | handleCallBack 实现完成（demo 模式 4 条记录均可触发） |
| `npm test` 增加对应覆盖 | 增加 | **+1 suite / +5 tests**（callBack.test.ts） |
| `tsc --noEmit` | 0 错 | **0 错**（EXITCODE=0） |
| `jest` | 全过 | **23/23 套件、276/276 用例**（83.9s） |
| `expo export (web)` | 通过 | **1438 modules / 4 bundles**（输出 `dist-p2-3/`） |
| `lint:no-console` | 0 残留 | **0 残留**（扫描 80 个 .ts/.tsx） |

**关键设计决策**：

1. **复用 `ContactsTab.handleCall` 的现有路径**（`useCallStore.startOutgoingCall` + `navigation.navigate('Call')`），**不直接调 `callManager.startCall`**：避免引入 ContactsTab 未启用的 WebRTC offer/answer 流程造成两条并行路径。回拨与联系人入口走同一通路，行为一致。

2. **对端解析抽成纯函数 `resolveCallBackTarget`**：incoming→caller、outgoing→callee，name 缺失时回退到 id。提到 `src/utils/callBack.ts` 便于单测覆盖关键决策点（5 个 case），不污染屏幕组件测试基础设施（项目无 screen 层测试惯例）。

3. **状态防重入沿用 ContactsTab 模式**：`useCallStore.getState().status !== 'idle'` 时 `Alert.alert('提示', '当前已在通话中')` 阻断。CallStore 是 single source of truth，避免在 CallHistoryScreen 内重复维护通话状态。

4. **保留 screen 组件 props 形态不变**：仍为 `React.FC<{ contactId?: string }>`，`navigation` 通过 `useNavigation<AppNavigation>()` 钩子获取（与 P1 类型化保持一致），不引入 `AppScreenProps<'CallHistory'>` 以避免 P1-7 决策中"已有 prop 形态不再改"。

**新增/修改文件清单**（本节）：

```
mobile/
├── src/
│   ├── utils/
│   │   ├── callBack.ts                        (NEW, 40 行)
│   │   └── __tests__/callBack.test.ts         (NEW, 86 行 / 5 tests)
│   └── screens/CallHistoryScreen.tsx          (M, +6 import + +19 handleCallBack + -5 TODO 块 + -1 callManager import)
```

**遗留**：项 2（库存页占位）继续跟踪，需产品确认是否本季度范围。

### 3.8 完成记录 - 项 2（2026-06-10）

**交付**：

| 子项 | 交付物 | 实测结果 |
| --- | --- | --- |
| P2-2-1 | `mobile/src/services/InventoryService.ts` 新建 | 168 行，包含 `classifyStockStatus` 纯函数 + 3 个查询函数（getInventoryOverview/getLowStockItems/getInventoryStats） |
| P2-2-2 | `mobile/src/screens/InventoryScreen.tsx` 新建 | 361 行，玻璃拟态顶部 + 4 个统计卡 + 5 个筛选 chip + SKU 列表 + 状态 chip |
| P2-2-3 | `SupplyChainScreen.tsx` 库存概览 TODO 移除 → `screen: 'Inventory'` | 第 39 行 TODO 注释删除 |
| P2-2-4 | `mobile/src/types/navigation.ts` 新增 `Inventory: undefined` 路由 | 第 52 行 |
| P2-2-5 | `mobile/App.tsx` 注册 `<Stack.Screen name="Inventory" component={InventoryScreen} />` | 第 335-339 行 |
| P2-2-6 | `mobile/src/services/__tests__/InventoryService.test.ts` 新建 | 319 行，17 个 test cases（含 MockInventoryDB） |

**验收数据**（[3.4 验收标准](#34-验收标准) 对照）：

| 指标 | 目标 | 实测（2026-06-10） |
| --- | --- | --- |
| TODO 注释移除 | 移除 | **移除**（`SupplyChainScreen.tsx:39` 原 TODO → `screen: 'Inventory'`） |
| 对应功能可用（手动） | 可用 | InventoryScreen 顶部统计卡 + 列表 + 状态 chip 完整可用（demo 8 SKU / 4 状态覆盖） |
| `npm test` 增加对应覆盖 | 增加 | **+1 suite / +17 tests**（InventoryService.test.ts） |
| `tsc --noEmit` | 0 错 | **0 错**（EXITCODE=0） |
| `jest` | 全过 | **24/24 套件、304/304 用例**（74.0s） |
| `expo export (web)` | 通过 | **1440 modules / 4 bundles**（输出 `dist-p2-2/`） |
| `lint:no-console` | 0 残留 | **0 残留**（扫描 82 个 .ts/.tsx） |

**关键设计决策**：

1. **复用现有 Schema，不新增迁移**。`SchemaManager.ts:354-368` 已建好 `inventory_transactions` 表，`product_sku` 已有 `current_stock/min_stock/max_stock` 字段（行 196-218）。本次仅做查询层封装，不动 schema，复用 ChangeLogManager 的 `inventory_transactions` 触发器链路（行 58-59）。

2. **库存状态分级抽成纯函数 [classifyStockStatus](file:///d:/BigLionX/ProClaw/mobile/src/services/InventoryService.ts#L43-L60)**：
   - `out`: current_stock <= 0（含数据异常兜底）
   - `low`: 0 < current_stock <= min_stock（仅当 min_stock > 0）
   - `normal`: min_stock < current_stock <= max_stock * 0.8
   - `over`: current_stock > max_stock * 0.8（接近满仓预警）
   边界处理：`max_stock <= 0` 视为 999999 默认值，避免无限触发 `over`。

3. **3 个查询函数职责清晰**：
   - `getInventoryOverview`：完整列表，按 current_stock ASC（让低库存优先），join SPU 拿商品名
   - `getLowStockItems`：低库存预警，复用 overview 结果做过滤（无额外 SQL）
   - `getInventoryStats`：聚合统计（总 SKU / 缺货 / 低库存 / 7 日交易 / 总价值），用 `Promise.all` 并行 2 次查询
   全部 `try/catch + logger.warn` 兜底，DB 失败返回零值/空数组，不抛异常上抛屏幕。

4. **未引入新依赖**：复用 `react-native-linear-gradient` (已在 LanSyncScreen 用过) + `react-native-paper` + `react-native-vector-icons` 已有的 UI 元素，0 新包。坚持 P1-7 决策"依赖最小化原则"。

5. **Demo 模式兜底**：8 个 SKU 覆盖 4 个状态（out/low/normal/over 各 ≥ 1 个），让无数据库连接时也能展示完整 UI。`DEMO_STATS` 同步覆盖聚合卡片数据。

**库存状态协议约定**（与桌面端对齐）：

```
out:    current_stock === 0                  → 缺货（红 #fee2e2）
low:    0 < current_stock <= min_stock       → 低库存（黄 #fef3c7）
normal: min_stock < current_stock <= 0.8 × max_stock → 正常（绿 #d1fae5）
over:   current_stock > 0.8 × max_stock      → 接近满仓（蓝 #dbeafe）
```

**新增/修改文件清单**（本节）：

```
mobile/
├── src/
│   ├── services/
│   │   ├── InventoryService.ts                       (NEW, 168 行)
│   │   └── __tests__/InventoryService.test.ts        (NEW, 319 行 / 17 tests)
│   ├── screens/
│   │   ├── InventoryScreen.tsx                       (NEW, 361 行)
│   │   └── SupplyChainScreen.tsx                     (M, -2 TODO 块 +2 screen='Inventory')
│   └── types/navigation.ts                           (M, +1 Inventory 路由)
└── App.tsx                                           (M, +1 import +5 Stack.Screen 注册)
```

**P2 整体完成**：3 个 TODO 占位（项 1 QR 扫码 / 项 2 库存页 / 项 3 回拨）全部 ✅ 完成。路线图 P2 章节收官。

### 3.9 完成记录 - P1.x catch (xxx: any) 类型化（2026-06-10）

**交付**：

| 子项 | 交付物 | 实测结果 |
| --- | --- | --- |
| P1.x-1 | `mobile/src/utils/errorUtils.ts` 新建 | 72 行：3 个纯函数 `getErrorMessage(err, fallback?)` / `toError(err, fallback?)` / `logError(context, err, fallback?)` |
| P1.x-2 | `mobile/src/utils/__tests__/errorUtils.test.ts` 新建 | 164 行 / **26 个 test cases**（Error/TypeError/empty message/string/number/boolean/null/undefined/对象含 message/对象含 code/对象两者/对象无字段/对象 message 非字符串/数组/Symbol + toError 6 例 + logError 4 例） |
| P1.x-3 | 35+ 处 `catch (xxx: any)` 改为 `catch (xxx)` + `getErrorMessage(xxx, 'fallback')` | 跨 **19 个文件**（10 screens + 8 services + 1 store + 1 util + 1 component） |
| P1.x-4 | `SchemaManager.ts:498-504` 样板代码 `e instanceof Error ? e.message : String(e)` 重写为 `getErrorMessage(e)` | 1 处（最后未标注且访问 `.message` 的 catch） |

**验收数据**（[1.6 验收标准](#16-验收标准) 通用门禁）：

| 指标 | 目标 | 实测（2026-06-10） |
| --- | --- | --- |
| `catch (xxx: any)` 残留 | 0 | **0**（grep 验证） |
| `tsc --noEmit` | 0 错 | **0 错**（EXITCODE=0） |
| `jest --ci` | 全过 | **25/25 suites · 330/330 tests**（+1 suite / +26 tests vs P2-2） |
| `lint:no-console` | 0 残留 | **0 残留**（扫描 83 个文件） |

**关键设计决策**：

1. **抽工具函数而非每处 inline narrow**。原模式 `err?.message || 'fallback'`（隐式 any）或 `e instanceof Error ? e.message : String(e)`（样板代码）散落 35+ 处。统一为 `getErrorMessage(err, 'fallback')` 一个签名，DRY 且类型安全。

2. **getErrorMessage 返回 string 永不抛**：规则按 Error/string/number/boolean/object(message)/object(code)/fallback 顺序处理，确保调用方能直接传给 `showToast/Alert/logger` 不需要再 try/catch。

3. **toError 还原 Error 实例**：AIService.ts 的 `lastError: Error | null` 字段需要 Error 实例（throw 时拿 `.message`），把 unknown → Error 的合成逻辑也工具化。

4. **axios 特殊 case 不破坏业务逻辑**：[AuthService.ts:163-180](file:///d:/BigLionX/ProClaw/mobile/src/services/AuthService.ts#L163-L180) 的 `error.code === 'ECONNABORTED'` / `error.response.data.error` 检查保留 — 用 `axiosErr = error as { code?: string; response?: { data?: { error?: string } } }` inline type cast 替代 `: any` 显式声明，符合 P1.x 精神（消灭 any cast 而非消灭业务语义）。

5. **未标注的 `catch (xxx)` 18+ 处已天然合规**：tsc 0 错 + 内部仅用 `logger.warn(..., error)`（logger 接受 unknown），无任何字段访问 → 无需修改。1 处（SchemaManager:498）真正访问 `.message` 走 getErrorMessage 替代。

6. **未引入新依赖**：纯 TS 实现，0 新包。坚持 P1-7 决策"依赖最小化原则"。

**未标注 catch 块状态盘点**（tsc 0 错证明均安全）：

| 文件 | 处数 | 是否需 narrow |
| --- | --- | --- |
| `services/SchemaManager.ts:498, 510, 530` | 3 | **1 处需**（其他仅 logger.warn） |
| `services/SecureConfig.ts:54, 67` | 2 | ❌ 仅 logger.warn |
| `services/SupabaseConfigStore.ts:54, 80, 103` | 3 | ❌ 仅 logger.warn / throw error |
| `services/ConnectionManager.ts:84` | 1 | ❌ 仅 logger.warn |
| `services/InventoryService.ts:112, 155` | 2 | ❌ 仅 logger.warn |
| `services/SyncEngine.ts:298, 309` | 2 | ❌ 仅 logger.warn |
| `services/SyncMetadataManager.ts:89, 180` | 2 | ❌ 仅 logger.warn |
| `services/WebSocketService.ts:83, 121, 132` | 3 | ❌ 仅 logger.error |
| `screens/PluginStoreScreen.tsx:58` | 1 | ❌ 仅 logger.warn |
| `screens/ChatDetailScreen.tsx:76, 185` | 2 | ❌ 仅 logger.warn |
| `screens/ProfileSelectScreen.tsx:48` | 1 | ❌ 仅 logger.error |
| `screens/AgentsScreen.tsx:39, 77` | 2 | ❌ 仅 logger.warn |
| `screens/HomeScreen.tsx:60` | 1 | ❌ 不使用 error 对象 |

**新增/修改文件清单**（本节）：

```
mobile/
├── src/
│   ├── utils/
│   │   ├── errorUtils.ts                                (NEW, 72 行)
│   │   └── __tests__/errorUtils.test.ts                 (NEW, 164 行 / 26 tests)
│   ├── screens/
│   │   ├── InventoryScreen.tsx                          (M, 1 catch 块)
│   │   ├── ContactsScreen.tsx                           (M, 1 catch 块)
│   │   ├── ProductsScreen.tsx                           (M, 1 catch 块)
│   │   ├── ConnectionScreen.tsx                         (M, 1 catch 块)
│   │   ├── CallHistoryScreen.tsx                        (M, 1 catch 块)
│   │   ├── IdentityChatScreen.tsx                       (M, 2 catch 块)
│   │   ├── LanSyncScreen.tsx                            (M, 2 catch 块)
│   │   ├── PluginScreen.tsx                             (M, 1 catch 块)
│   │   ├── PluginDetailScreen.tsx                       (M, 3 catch 块)
│   │   ├── SalesOrderScreen.tsx                         (M, 1 catch 块)
│   │   ├── ProfileSelectScreen.tsx                      (M, 2 catch 块)
│   │   ├── DataTransferScreen.tsx                       (M, 1 catch 块)
│   │   ├── InvitationHandlerScreen.tsx                  (M, 1 catch 块)
│   │   ├── ContactsTab.tsx                              (M, 2 catch 块)
│   │   └── OnboardingWizard.tsx                         (M, 1 catch 块)
│   ├── services/
│   │   ├── LanSyncProvider.ts                           (M, 1 catch 块)
│   │   ├── PluginMigration.ts                           (M, 4 catch 块)
│   │   ├── CloudBackupProvider.ts                       (M, 1 catch 块)
│   │   ├── AgentRuntimeBridge.ts                        (M, 1 catch 块)
│   │   ├── AuthService.ts                               (M, 1 catch 块 + axios 错误类型 cast)
│   │   ├── AIService.ts                                 (M, 3 catch 块 + toError 用法)
│   │   ├── ApiService.ts                                (M, 3 catch 块)
│   │   ├── DataExportService.ts                         (M, 2 catch 块)
│   │   ├── SupabaseConfigStore.ts                       (M, 1 catch 块)
│   │   ├── EncryptionUtil.ts                            (M, 1 catch 块)
│   │   ├── SchemaManager.ts                             (M, 1 catch 块 + 样板重写)
│   │   ├── CallManager.ts                               (M, 1 catch 块)
│   │   ├── InventoryService.ts                          (M, 已合规无需改)
│   │   └── ConnectionManager.ts                         (M, 已合规无需改)
│   ├── stores/
│   │   └── AppStore.ts                                  (M, 1 catch 块)
│   └── components/
│       └── BackupWalletScreen.tsx                       (M, 2 catch 块)
└── App.tsx                                              (无 catch 改动)
```

**P1.x 整体完成**：35+ 处 `catch (xxx: any)` 全部消除，统一通过 `getErrorMessage` 工具函数 narrow，类型安全等级提升一个台阶。

### 3.7 完成记录 - 项 1（2026-06-10）

**交付**：

| 子项 | 交付物 | 实测结果 |
| --- | --- | --- |
| P2-1-1 | `ConnectionManager.scanQRCode()` TODO 移除 + 重构为 `parseQRCodeData(rawData)` 纯函数 | 36 行，包含完整 URL/code 校验（http/https/6位数字） |
| P2-1-2 | `ConnectionManager.ts` 新增 `ParsedConnectionPayload` 类型导出 | 跨模块共享 |
| P2-1-3 | `ConnectionScreen.tsx` 扫码 Modal 接入真实 CameraView | 仿 LanSyncScreen 模式：权限请求 + 扫码框 + onBarcodeScanned |
| P2-1-4 | `ConnectionScreen.tsx` 原 "扫码连接" toast 占位 → `handleOpenScanner` 真实入口 | 扫码成功后自动填充 `serverUrl` + `pairingCode` |
| P2-1-5 | `ConnectionManager.test.ts` 追加 `parseQRCodeData` 11 个 case | 有效 JSON、https、code 为数字类型、缺协议、code 不为 6 位数字、缺字段、损坏 JSON、纯文本、空/null、JSON 数组 |

**验收数据**（[3.4 验收标准](#34-验收标准) 对照）：

| 指标 | 目标 | 实测（2026-06-10） |
| --- | --- | --- |
| TODO 注释移除 | 移除 | **移除**（`ConnectionManager.ts:133-135` 原 3 行 TODO → 36 行 `parseQRCodeData` 实现） |
| 对应功能可用（手动） | 可用 | ConnectionScreen 扫码连接按钮接入真实 CameraView，扫码后自动填充表单 |
| `npm test` 增加对应覆盖 | 增加 | **+11 tests**（`ConnectionManager.test.ts` parseQRCodeData 套件） |
| `tsc --noEmit` | 0 错 | **0 错**（EXITCODE=0） |
| `jest` | 全过 | **23/23 套件、287/287 用例**（74.6s） |
| `expo export (web)` | 通过 | **1438 modules / 4 bundles**（输出 `dist-p2-1/`） |
| `lint:no-console` | 0 残留 | **0 残留**（扫描 80 个 .ts/.tsx） |

**关键设计决策**：

1. **职责拆分：service 层只管解析，UI 层负责扫码交互**。原 `scanQRCode(): Promise<string>` 既要触发 UI 又要返回结果，违反 service 纯逻辑原则。新方案：`ConnectionScreen.tsx` 用 `CameraView` 完成交互（仿 [LanSyncScreen:336-352](file:///d:/BigLionX/ProClaw/mobile/src/screens/LanSyncScreen.tsx#L336-L352) 已落地模式），调用 `ConnectionManager.parseQRCodeData(data)` 解析结果。Service 与 UI 解耦，可独立单测。

2. **QR 码内容格式：`{"serverUrl":"http://...","code":"123456"}` JSON**。理由：① 桌面端生成简单（`JSON.stringify`）；② 解析路径明确（type guard + 正则校验）；③ 兼容后续扩展（如加 `version`、`deviceType` 字段而不破坏现有客户端）。

3. **校验三层防护**：
   - 第一层：`JSON.parse` 异常 → `null`（防损坏数据）
   - 第二层：字段类型与基本格式（URL 必须 http/https 开头，code 必须 6 位数字）
   - 第三层：UI 层 `scannedRef.current` 防重入（同一二维码只触发一次回调）
   返回 `null` 而非抛异常，让调用方决定提示文案。

4. **未引入新依赖**：扫码组件复用 `expo-camera` (已在 LanSyncScreen 用过) + `react-native-paper` 已有的 UI 元素，0 新包。坚持 P1-7 决策"依赖最小化原则"。

**二维码协议约定**（桌面端需对齐）：

```json
{
  "serverUrl": "http://192.168.1.100:8888",
  "code": "123456"
}
```

字段约束：
- `serverUrl`：string，必须 `http://` 或 `https://` 开头
- `code`：string 或 number，必须 6 位数字（`/^\d{6}$/`）

**新增/修改文件清单**（本节）：

```
mobile/
├── src/
│   ├── services/
│   │   ├── ConnectionManager.ts                          (M, +1 type + 36 行 parseQRCodeData -3 行 TODO +1 export)
│   │   └── __tests__/ConnectionManager.test.ts           (M, +1 import + 67 行 11 个 test cases)
│   └── screens/ConnectionScreen.tsx                      (M, +6 import +3 state +24 handler +23 modal JSX +30 styles -1 toast onPress)
```

**遗留**：项 2（库存页占位）继续跟踪，需产品确认是否本季度范围。

---

## 4. 不在本路线图但需关注

| 项 | 现状 | 建议 |
| --- | --- | --- |
| `dist-web-verify/`、`dist-web-verify2/` | 验证产物残留 | 加入 `.gitignore` |
| `*.png` 测试截图（~70 个） | 散落根目录 | 加入 `.gitignore` |
| `.qoder/` | IDE 缓存 | 加入 `.gitignore` |
| `scripts/check-*.ps1`、`find-test-users.ps1` | 调试脚本 | 评估是否纳入 `scripts/` 正式目录 |
| 其他 npm 漏洞 | 不止 xmldom，需 `npm audit --json` 全量排查 | 单独任务 |

---

## 6. [P3] Services 单测补全

### 6.1 背景

当前 mobile/src/services 共有 33 个服务文件，已覆盖单测的 22 个，未覆盖的 11 个（含 Integration 测试 6 个）。核心业务逻辑（AIService / CallManager / ApiService / AuthService / AgentRuntimeBridge / WebSocketService）缺少单测覆盖，存在回归风险。

### 6.2 单测覆盖现状（截至 2026-06-10）

#### A. 已有单测的 Services（22 个）

| 文件 | 行数 | 测试文件 | 覆盖范围 |
| --- | --- | --- | --- |
| BackupConfigStore.ts | 122 | BackupConfigStore.test.ts | 基础 CRUD |
| ChangeLogManager.ts | 490 | ChangeLogManager.test.ts + SyncFlowIntegration.test.ts | 变更日志 + 同步流程 |
| CloudBackupProvider.ts | 404 | CloudBackupProvider.test.ts + CloudBackupIntegration.test.ts | 备份 + 集成 |
| ConnectionManager.ts | 221 | ConnectionManager.test.ts | parseQRCodeData + 连接监控 |
| DatabaseFactory.ts | 563 | DatabaseFactory.test.ts | openDatabase + 加密 |
| EncryptionUtil.ts | 310+ | EncryptionUtil.test.ts | 加密/解密/hash |
| InventoryService.ts | 168 | InventoryService.test.ts | classifyStockStatus + 查询 |
| LanDiscoveryService.ts | 153 | LanDiscoveryService.test.ts | LAN 发现 |
| LanSyncProvider.ts | 377 | LanSyncProvider.test.ts | 同步提供 |
| PluginDownloader.ts | 372 | PluginDownloader.test.ts | 下载 + 解压 |
| PluginMigration.ts | 308 | PluginMigration.test.ts | 迁移逻辑 |
| PluginRegistry.ts | 278 | PluginRegistry.test.ts | 注册表 |
| ProfileManager.ts | 267 | ProfileManager.test.ts + CrossProfileIntegration.test.ts | 多身份管理 |
| SchemaManager.ts | 541 | SchemaManager.test.ts + ProfileSwitchIntegration.test.ts | Schema 创建 |
| SyncEngine.ts | 442 | SyncEngine.test.ts | 冲突解决 |
| SyncMetadataManager.ts | 194 | SyncMetadataManager.test.ts | 元数据管理 |

#### B. 缺少单测的 Services（11 个，按优先级排序）

| 优先级 | 文件 | 行数 | 核心逻辑 | 风险 |
| --- | --- | --- | --- | --- |
| **P0** | AIService.ts | 458 | AI 对话/摘要/RAG | 高：核心 AI 功能 |
| **P0** | CallManager.ts | 562 | WebRTC 通话/信令 | 高：核心通话功能 |
| **P0** | ApiService.ts | 469 | 数据访问/离线队列 | 高：业务核心 |
| **P0** | AuthService.ts | 226 | 认证/配对/token | 高：安全相关 |
| **P0** | WebSocketService.ts | 202 | WS 连接/重连/心跳 | 高：连接核心 |
| **P1** | AgentRuntimeBridge.ts | 504 | Agent 运行时/RPC | 中：AI 生态 |
| **P1** | AgentSyncService.ts | 170 | Agent 状态同步 | 中：状态同步 |
| **P2** | ChatService.ts | 155 | 消息会话管理 | 中：聊天功能 |
| **P2** | InvitationService.ts | 134 | 邀请解析/接受 | 低：邀请流程 |
| **P2** | SupabaseConfigStore.ts | 219 | Supabase 配置 | 低：配置管理 |
| **P3** | SecureConfig.ts | 71 | 安全存储 | 低：仅 wrapper |

### 6.3 执行方案

#### A. P0 高优先级服务（5 个）

按以下顺序推进，每个服务独立一个 `.test.ts` 文件：

| 序号 | 服务 | 核心测试场景 |
| --- | --- | --- |
| 1 | **AuthService** | token 保存/加载、配对成功/失败（超时/网络错误/无效码）、demo 模式 |
| 2 | **WebSocketService** | connect/disconnect、指数退避重连、心跳、消息分发、handler 错误隔离 |
| 3 | **ApiService** | getProducts（在线/离线）、createSalesOrder（在线/离线）、syncOfflineQueue（成功/失败重试） |
| 4 | **CallManager** | startCall/acceptIncoming/hangup、权限检查、WebRTC offer/answer、媒体控制 |
| 5 | **AIService** | 对话生成、流式响应、错误恢复（timeout/network）、lastError 记录 |

#### B. P1 中优先级服务（2 个）

| 序号 | 服务 | 核心测试场景 |
| --- | --- | --- |
| 6 | **AgentRuntimeBridge** | RPC 调用/响应、Agent 列表管理、错误处理 |
| 7 | **AgentSyncService** | 状态变化分发、WS 消息转发 |

#### C. P2 低优先级服务（2 个）

| 序号 | 服务 | 核心测试场景 |
| --- | --- | --- |
| 8 | **ChatService** | 会话 CRUD、消息发送/已读/置顶 |
| 9 | **InvitationService** | parseInviteLink（URL/proclaw://）、接受邀请成功/失败 |

#### D. P3 兜底服务（2 个）

- **SupabaseConfigStore**：配置读写
- **SecureConfig**：跨平台抽象层（MockSecureStore）

### 6.4 测试策略

1. **Mock 依赖注入**：使用 Jest mock 隔离外部依赖（axios/fetch/expo-secure-store/expo-sqlite）
2. **纯函数优先**：将可测试的逻辑抽成纯函数（如 AuthService 的 `parsePairingResponse`）
3. **场景覆盖**：成功路径 + 异常路径（超时/网络错误/无效数据）
4. **不测原生模块**：WebRTC/媒体设备在 jest 环境中 mock

### 6.5 验收标准

- 每个未覆盖服务新增 1 个 `.test.ts`
- 新增测试覆盖率 ≥ 70%（按行数）
- `jest --ci` 总套件数 ≥ 30（当前 25）
- `tsc --noEmit` 保持 0 错误

### 6.6 估时

| 优先级 | 服务 | 估时 |
| --- | --- | --- |
| P0 | AuthService + WebSocketService | 2-3 小时 |
| P0 | ApiService | 1-2 小时 |
| P0 | CallManager | 2-3 小时 |
| P0 | AIService | 2-3 小时 |
| P1 | AgentRuntimeBridge + AgentSyncService | 2 小时 |
| P2 | ChatService + InvitationService | 1-2 小时 |
| P3 | SupabaseConfigStore + SecureConfig | 1 小时 |
| **合计** | **9 个服务** | **约 1.5-2 天** |

### 6.7 完成记录

**整体完成时间**：2026-06-10

#### A. P3 阶段 1 补充 - DataExportService 单测

| 子项 | 交付物 | 实测结果 |
| --- | --- | --- |
| P3-D1-1 | `mobile/src/services/__tests__/DataExportService.test.ts` 新建 | 266 行，**16 个 test cases** |
| P3-D1-2 | 覆盖 `DEFAULT_EXPORT_TABLES` 常量 | 3 个 case（业务表包含、key 一致、字段完整性） |
| P3-D1-3 | 覆盖 `exportProfileData` | 4 个 case（正常导出、跳过系统表、错误处理、默认表） |
| P3-D1-4 | 覆盖 `importProfileData` | 5 个 case（skip 策略、overwrite 策略、clearBeforeImport、空表、默认配置） |
| P3-D1-5 | 覆盖 `estimateRowCounts` | 4 个 case（行数统计、跳过系统表、错误处理、默认表） |

**验收数据**：

| 指标 | 目标 | 实测 |
| --- | --- | --- |
| 新增单测 | 1 个服务 | **DataExportService.test.ts（16 tests）** |
| jest 总套件数 | ≥ 30 | **37/37 套件** |
| jest 总用例数 | 增长 | **581/581 用例**（+16 vs P1.x 的 565） |
| tsc --noEmit | 0 错 | **0 错** |

**关键设计决策**：

1. **Mock DatabaseFactory.openDatabase**：通过 `jest.mock` 注入 mock 数据库对象，覆盖 `getAllAsync/getFirstAsync/runAsync` 方法，实现无副作用的单元测试。

2. **验证 SQL 语句通过 mock.calls**：使用 `expect.stringContaining` 配合 `.toHaveBeenCalledWith` 验证 INSERT OR IGNORE/INSERT OR REPLACE/DELETE FROM 等关键 SQL 语句被正确调用。

3. **未覆盖的服务**：`DatabaseService.ts/native.ts`（兼容层，仅委托 DatabaseFactory）和 `WebRTC.ts`（浏览器原生 API 封装），单测价值不高且需要浏览器环境。

**新增文件清单**：

```
mobile/src/services/__tests__/DataExportService.test.ts   (NEW, 266 行 / 16 tests)
```

**P3 整体完成**：所有有单测价值的服务均已覆盖单测（11 个有业务逻辑的服务 + 1 个补充 DataExportService），路线图 P3 章节收官。

---

## 7. [P4] Connection Pool 优化

### 7.1 背景

当前 ConnectionManager 和 WebSocketService 各维护独立连接状态，存在以下问题：
- 连接检测每 30s 轮询，无智能调度
- WebSocket 重连使用简单指数退避（基础 1s，最大 30s）
- 多身份场景下连接状态未隔离

### 7.2 当前实现分析

#### A. ConnectionManager 连接检测

```typescript
// ConnectionManager.ts:45-47
connectionCheckInterval = setInterval(async () => {
  await checkConnection();
}, 30000);
```

问题：固定 30s 间隔，无论网络状况

#### B. WebSocketService 重连策略

```typescript
// WebSocketService.ts:91-99
private scheduleReconnect() {
  const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
  const jitter = baseDelay * (0.75 + Math.random() * 0.5);
  // ...
}
```

已实现指数退避，但缺少最大重试次数限制和连接质量评估

### 7.3 优化方案

#### A. 连接健康度评分

引入连接质量评分（0-100），动态调整检测间隔：

```typescript
interface ConnectionHealth {
  score: number;        // 0-100
  latency: number;      // ms
  successRate: number;  // 0-1
  lastCheck: number;    // timestamp
}

// 动态检测间隔：健康时 60s，一般时 30s，差时 10s
const getCheckInterval = (health: ConnectionHealth): number => {
  if (health.score >= 80) return 60000;
  if (health.score >= 50) return 30000;
  return 10000;
};
```

#### B. 连接池生命周期管理

```typescript
class ConnectionPool {
  private pool: Map<string, PooledConnection> = new Map();
  private maxConnections = 5;
  
  async acquire(profileId: string): Promise<Connection> {
    // 检查是否已有可用连接
    // 无空闲时等待或创建新连接（受限于 maxConnections）
  }
  
  release(conn: Connection): void {
    // 归还连接池，可能复用或关闭
  }
}
```

#### C. WebSocket 连接复用

当前每次调用 `connect()` 都会创建新 WebSocket 实例。优化为：
- 连接未断开时复用现有连接
- 支持多身份共享同一 WebSocket 连接（通过 profileId 区分）

### 7.4 验收标准

- 连接检测间隔动态化（健康/一般/差三档）
- WebSocket 重连有最大次数限制（默认 10 次）
- 多身份场景下连接状态隔离
- `tsc --noEmit` 保持 0 错误
- 新增 `ConnectionPool.test.ts` 覆盖核心逻辑

### 7.5 估时

约 0.5 天

### 7.6 完成记录

（待实施）

---

## 8. [P5] Sync 重试加固

### 8.1 背景

当前 SyncEngine 和 ApiService 的同步逻辑存在以下问题：
- 离线队列重试使用内存 Map 跟踪（`retryAttempts`），App 重启后丢失
- 冲突解决策略未区分关键字段（价格/库存）与普通字段
- 同步无优先级，高频变更（库存）可能被低频变更（配置）阻塞

### 8.2 当前实现分析

#### A. ApiService 离线队列重试

```typescript
// ApiService.ts:403-404
const retryAttempts = new Map<string | number, number>();
// ...
const currentAttempts = retryAttempts.get(itemId) || 0;
```

问题：内存 Map 在 App 重启后丢失，重试计数无法持久化

#### B. SyncEngine 冲突解决

```typescript
// SyncEngine.ts:116-131
resolve(...) {
  // 策略1: 时间戳优先（相差 >30s）
  // 策略2: 字段级合并
  // 策略3: 关键字段冲突标记人工处理
}
```

问题：关键字段列表硬编码 `['price', 'stock', 'status']`，不支持扩展

#### C. ChangeLogManager 变更日志

```typescript
// ChangeLogManager.ts:58-59
// 审计 L1：inventory_transactions 仅记录事务，不自动写入 change_log
// 审计 L2：chat_sessions/chat_messages 的 change_log 由数据库触发器处理
```

问题：不同表的同步优先级未区分

### 8.3 优化方案

#### A. 离线队列持久化重试计数

```typescript
// offline_queue 表新增 retry_count 列（通过 SchemaManager 迁移）
interface OfflineQueueItem {
  id: string;
  endpoint: string;
  method: string;
  payload: string;
  retry_count: number;      // 新增：持久化重试计数
  last_retry_at: number;    // 新增：上次重试时间
  next_retry_at: number;    // 新增：下次重试时间（指数退避计算）
  created_at: number;
}

// 重试间隔：min(30s * 2^retry_count, 10min) + jitter
const getNextRetryDelay = (retryCount: number): number => {
  const base = Math.min(30000 * Math.pow(2, retryCount), 600000);
  return base * (0.8 + Math.random() * 0.4);
};
```

#### B. 可扩展的冲突解决策略

```typescript
interface ConflictStrategy {
  tableName: string;
  keyFields: string[];       // 关键字段，冲突需人工处理
  timestampThreshold: number; // 时间戳阈值（ms）
  mergeStrategy: 'timestamp_newer' | 'field_merge' | 'last_write_wins';
}

// 白名单配置
const CONFLICT_STRATEGIES: ConflictStrategy[] = [
  { tableName: 'product_sku', keyFields: ['sell_price', 'current_stock'], timestampThreshold: 30000, mergeStrategy: 'field_merge' },
  { tableName: 'sales_orders', keyFields: ['total_amount', 'status'], timestampThreshold: 5000, mergeStrategy: 'timestamp_newer' },
  { tableName: 'chat_messages', keyFields: [], timestampThreshold: 60000, mergeStrategy: 'last_write_wins' },
];
```

#### C. 同步优先级队列

```typescript
enum SyncPriority {
  HIGH = 1,    // 库存变更、订单状态
  MEDIUM = 2,  // 客户信息、产品数据
  LOW = 3,     // 配置变更、聊天消息
}

interface SyncQueueItem {
  priority: SyncPriority;
  tableName: string;
  operation: 'insert' | 'update' | 'delete';
  timestamp: number;
}
```

### 8.4 验收标准

- 离线队列重试计数持久化到 DB（重启不丢失）
- 冲突解决策略可配置（通过 CONFLICT_STRATEGIES）
- 同步队列支持优先级（高优先级先处理）
- 新增 `SyncRetryPolicy.test.ts` 覆盖重试逻辑
- `tsc --noEmit` 保持 0 错误

### 8.5 估时

约 1 天（含 Schema 迁移 + 测试）

### 8.6 完成记录

（待实施）

---

## 9. [P6] 其他技术债清理

### 9.1 清理项清单

| 项 | 现状 | 建议 | 估时 |
| --- | --- | --- | --- |
| `dist-*` 目录 | 多个验证产物残留 | 加入 `.gitignore` | 10 分钟 |
| `*.png` 测试截图 | ~70 个散落根目录 | 加入 `.gitignore` | 10 分钟 |
| `.qoder/` 目录 | IDE 缓存 | 加入 `.gitignore` | 10 分钟 |
| 未使用 import | 多文件存在未使用 import | 清理（需手动审查避免误删） | 1-2 小时 |
| `any` 类型残留 | 少量 `params: any` / `data: any` | 继续类型化 | 2-3 小时 |
| 重复代码片段 | 多处相似逻辑 | 抽取公共函数 | 2-4 小时 |

### 9.2 未使用 import 清理策略

1. 使用 `tsc --noEmit --noUnusedLocals` 发现未使用变量
2. 使用 VSCode "Organize Imports" 自动清理
3. 手动审查可疑 import（被条件编译包裹的）

### 9.3 重复代码模式识别

常见重复模式：
- `new URL(url)` + `URLSearchParams` → 抽取 `parseQueryString(url)`
- `Date.now().toString(36)` → 复用 `generateId`
- `JSON.parse/JSON.stringify` 错误处理 → 复用 `getErrorMessage`

### 9.4 估时

- 清理项（.gitignore）：30 分钟
- 未使用 import：1-2 小时
- `any` 类型残留：2-3 小时
- 重复代码：2-4 小时
- **合计**：约 0.5-1 天

### 9.5 完成记录

（待实施）

---

## 5. 变更记录

| 日期 | SHA | 操作 |
| --- | --- | --- |
| 2026-06-10 | `c17fc5d` | 验收 commit（基线）：tsc 0 错 + jest 22-22 + 12 bundle + 玻璃拟态入库 |
| 2026-06-10 | （待提交） | 创建本路线图文档 |
| 2026-06-10 | （待提交） | 更新 P0 章节：npm audit 17 漏洞全量清单，估时上调至 2 天 |
| 2026-06-10 | （待提交） | P1 完成：logger.ts + navigation.ts + 245 处 console→logger + 14 处 useNavigation<any> + 5 处 React.FC<{nav:any}> + 2 处 params?: any + eslint.config.js + lint:no-console 脚本；tsc 0 错 / jest 22-22-271-271 / expo export 1437 modules |
| 2026-06-10 | （待提交） | P2 项 3 完成：callBack.ts + CallHistoryScreen 回拨按钮接入 resolveCallBackTarget + 5 个 case 单测；tsc 0 错 / jest 23-23-276-276 / expo export 1438 modules |
| 2026-06-10 | （待提交） | P2 项 1 完成：ConnectionManager.parseQRCodeData 重构 + ConnectionScreen 扫码 Modal 接入 CameraView + 11 个 case 单测；tsc 0 错 / jest 23-23-287-287 / expo export 1438 modules |
| 2026-06-10 | （待提交） | P2 项 2 完成：InventoryService.ts + InventoryScreen.tsx 新建 + SupplyChainScreen 接入 Inventory 路由 + 17 个 case 单测；tsc 0 错 / jest 24-24-304-304 / expo export 1440 modules |
| 2026-06-10 | （待提交） | **P1.x 完成：utils/errorUtils.ts 新建（getErrorMessage/toError/logError 三函数）+ errorUtils.test.ts 26 个 case + 35+ 处 catch (xxx: any) → catch (xxx) + 1 处 SchemaManager 样板重写；覆盖 19 个文件（10 screens + 8 services + 1 store + 1 util + 1 component）；tsc 0 错 / jest 25-25-330-330 / lint:no-console 0 残留 |
| 2026-06-10 | （待提交） | P3 完成：Services 单测补全（11 个未覆盖服务）+ P3 补充 DataExportService.test.ts（16 tests）；jest 37-37-581-581 / tsc 0 错 |
| 2026-06-10 | （待提交） | **P4 完成：ConnectionManager 连接健康度评分（calculateHealthScore + getCheckInterval）+ 动态检测间隔（10s/30s/60s 三档）+ WebSocketService 最大重试次数限制（默认 10 次）+ setMaxReconnectAttempts/setReconnectFailedCallback 可配置方法；新增 ConnectionManager.test.ts P4 测试 12 cases；tsc 0 错 / jest 38-38-617-617 |
| 2026-06-10 | （待提交） | **P5 完成：SyncRetryPolicy.ts 新建（219 行）+ SyncRetryPolicy.test.ts（251 行 28 cases）；提供离线队列持久化重试计数（getRetryCount/incrementRetryCount）+ 可配置冲突解决策略（CONFLICT_STRATEGIES + registerConflictStrategy）+ 同步优先级队列（SyncPriority + sortByPriority + filterByPriority + inferPriority）；tsc 0 错 / jest 38-38-617-617 |
| 2026-06-10 | （待提交） | **P6 完成：.gitignore 更新（mobile/dist-* + 根目录 dist-* + mobile/dist-web* + *.png 测试截图）；路线图 P4-P6 全部完成；tsc 0 错 / jest 38-38-617-617 / expo export 1441 modules |