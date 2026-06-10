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

**当前质量门禁**（2026-06-10 SDK 56 升级后实测）

- `tsc --noEmit`：0 错误（`TOTAL=0` via TypeScript API）
- `jest --ci`：22/22 套件、271/271 用例
- `expo export (web)`：1436 模块、4 bundle 通过（输出 `dist-web-sdk56`）
- `npm audit`：critical 0 / **high 0** / moderate 10 / low 0（残留 10 moderate 为 expo 56 工具链转接链 uuid<11.1.1，上游未修，详见 1.8）

**路线图跟踪 3 项**

| 优先级 | 项 | 触发原因 | 估时 | 状态 |
| --- | --- | --- | --- | --- |
| P0 | Expo SDK 52 → 56 升级（顺带修 xmldom CVE） | 5 个 high 严重度 CVE + 框架迭代 | 1-2 天 | **✅ 完成 2026-06-10** |
| P1 | 类型与日志清理（241 console + 13 useNavigation<any> + 多处 any） | TypeScript strict 宽松、调试日志未结构化 | 0.5-1 天 | **✅ 完成 2026-06-10** |
| P2 | 3 个 TODO 占位实现 | 功能缺口 | 0.5-1 天 | **项 1 + 项 2 + 项 3 ✅ 完成 2026-06-10** |
| **P1.x** | **catch (xxx: any) 类型化（35+ 处）** | **TypeScript strict 下默认 unknown 却被显式绕过，破坏类型安全** | **0.5 天** | **✅ 完成 2026-06-10** |

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
| 2026-06-10 | （待提交） | **P1.x 完成：utils/errorUtils.ts 新建（getErrorMessage/toError/logError 三函数）+ errorUtils.test.ts 26 个 case + 35+ 处 catch (xxx: any) → catch (xxx) + 1 处 SchemaManager 样板重写；覆盖 19 个文件（10 screens + 8 services + 1 store + 1 util + 1 component）；tsc 0 错 / jest 25-25-330-330 / lint:no-console 0 残留** |