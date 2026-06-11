# Mobile Audit Report v14 — 图标与闪退问题深度修复

> 报告日期：2026-06-11
> 审计范围：`mobile/` 全部代码 + Android 原生层
> 触发问题：APK 安装包图标为通用平台图标、安装后打开闪退

---

## 一、问题摘要

| # | 问题 | 严重性 | 状态 |
|---|------|--------|------|
| 1 | APK 图标不是 ProClaw 红色小螃蟹 | 🔴 P0 | ✅ 已修复 |
| 2 | 安装后打开闪退 | 🔴 P0 | ✅ 已定位并修复 |
| 3 | `app.json` SDK 56 schema 错误（`splash` 字段错放顶层） | 🟡 P2 | ✅ 已修复 |
| 4 | `assets/` 残留 6 个 Expo 默认占位符 PNG | 🟡 P2 | ✅ 已清理 |
| 5 | `styles.xml` 中 `colorPrimary` 缺 `android:` 前缀 | 🟡 P2 | ✅ 已修复 |
| 6 | App.tsx 初始化流程缺 `applySchema(db)` | 🔴 P0 | ✅ 已修复 |
| 7 | `react-native-vector-icons` 字体未打包到 APK | 🟠 P1 | ✅ 已修复 |

---

## 二、图标问题修复（已完成）

### 2.1 根因分析

`mobile/app.json` 与 `mobile/package.json` 中图标的真实状态：

```jsonc
// app.json (修复前)
"icon": "./assets/proclaw-logo.png",                  // ✅ 正确
"splash": { "image": "./assets/proclaw-logo.png" },   // ⚠️ SDK 56 schema 错
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/proclaw-logo.png",   // ✅ 引用正确
    "backgroundColor": "#6366f1",
    "monochromeImage": "./assets/proclaw-logo.png"    // ✅ 引用正确
  }
}

// package.json (修复前) - 独立 expo block
"icon": "./assets/icon.png",                          // ❌ 引用了 Expo 默认占位符
"splash": { "image": "./assets/splash-icon.png" },    // ❌ 引用了 Expo 默认占位符
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/proclaw-logo.png"    // ✅
  }
}
```

但 `assets/android-icon-foreground.png` 等 6 个文件**仍然存在**于工作区（虽然被删除过，但因为某些原因又出现，或预 build 期间被恢复）。这些是 Expo 模板的默认蓝色箭头占位符。

### 2.2 修复动作

| 文件 | 修改 |
|------|------|
| `app.json` | `splash` 字段从根下移到 `web.splash`（SDK 56 schema 仅允许在 web 下） |
| `package.json` | 同上 |
| `app.json` & `package.json` | 统一图标引用为 `./assets/proclaw-logo.png` |
| `assets/icon.png` | 删除（Expo 默认蓝色箭头） |
| `assets/splash-icon.png` | 删除（Expo 默认占位符） |
| `assets/android-icon-foreground.png` | 删除（Expo 默认蓝色箭头） |
| `assets/android-icon-background.png` | 删除（Expo 默认浅蓝网格） |
| `assets/android-icon-monochrome.png` | 删除（Expo 默认灰色箭头） |
| `assets/favicon.png` | 删除（Expo 默认占位符） |

### 2.3 Android 原生层资源验证

重新 prebuild 后，所有密度 mipmap 都是 ProClaw 红色小螃蟹：

| 密度 | ic_launcher.webp | ic_launcher_foreground.webp | ic_launcher_monochrome.webp |
|------|------------------|------------------------------|------------------------------|
| mdpi | 4,425 B | 16,259 B | 16,259 B |
| hdpi | 8,538 B | 31,804 B | 31,804 B |
| xhdpi | 13,580 B | 50,882 B | 50,882 B |
| xxhdpi | 26,145 B | 100,205 B | 100,205 B |
| **xxxhdpi** | **41,809 B** | **159,482 B** | **159,482 B** |

`drawable-{m,h,xh,xxh,xxxh}dpi/splashscreen_logo.png` 启动画面 logo 也全部为 ProClaw 红色小螃蟹（从 mdpi 12KB 到 xxxhdpi 66KB）。

资源 MD5 校验：

```
mobile/assets/proclaw-logo.png   3B5A6C8560F536338EA70727563F8307  ✅
public/proclaw-logo.png          3B5A6C8560F536338EA70727563F8307  ✅ 完全一致
```

---

## 三、闪退根因分析（多因素叠加）

### 3.1 闪退根因 #1：`App.tsx` 初始化缺 `applySchema` 🔴 P0

**问题**：App.tsx 第 179-210 行的 `initializeApp` 流程：

```ts
// 修复前（有缺陷）
try {
  await openDatabase(targetProfile.id);     // ❌ 只打开 DB，没建表
  await setCurrentProfile(targetProfile.id);
  const db = (await import('./src/services/DatabaseFactory')).getDatabase();
  const deviceId = await getOrCreateDeviceId();
  await initSyncMetadata(db, deviceId);    // ❌ sync_metadata 表不存在
  await setupChangeLogTriggers(db);         // ❌ product_spu 等表不存在
  await getInstalledPlugins(db);            // ❌ plugin_registry 表不存在
} catch (e) {
  logger.warn('[App] DB init error, proceeding anyway:', e);
}
```

**对比** `src/stores/AppStore.ts` 第 68-147 行的 `switchProfile`（用户切换身份时），它正确调用了 `applySchema(db)`：

```ts
// switchProfile (正确)
await openDatabase(profile.id);
const db = getDatabase();
await applySchema(db);                       // ✅ 关键
await initSyncMetadata(db, deviceId);
await setupChangeLogTriggers(db);
await getInstalledPlugins(db);
```

**结果对比**：
- 首次安装 APK → `initializeApp` 跑 → 全部 catch → 跳到 Main → MainTabs 调用 `getDatabase()` 失败 → 闪退或白屏
- 用户切换身份 → `switchProfile` 跑 → 正常

### 3.2 修复动作

```ts
// App.tsx (修复后)
import { openDatabase, getDatabase } from './src/services/DatabaseFactory';
import { applySchema } from './src/services/SchemaManager';
// ...

try {
  await openDatabase(targetProfile.id);
  const db = getDatabase();
  // 关键修复：先 applySchema 创建业务表
  await applySchema(db);
  await setCurrentProfile(targetProfile.id);
  const deviceId = await getOrCreateDeviceId();
  await initSyncMetadata(db, deviceId);
  // ...
}
```

### 3.3 闪退根因 #2：`react-native-vector-icons` 字体未打包 🟠 P1

**问题**：
- App.tsx 第 11 行 `import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';`
- App.tsx 第 98-103 行用 MaterialCommunityIcons 渲染 Tab 图标
- `android/app/src/main/assets/fonts/` 之前**不存在**
- 字体在 `node_modules/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf` (1.1MB) 但**未被 link**

### 3.4 修复动作

新增 `mobile/react-native.config.js`：

```js
module.exports = {
  project: { ios: {}, android: {} },
  assets: ['./node_modules/react-native-vector-icons/Fonts/'],
};
```

执行 `npx react-native-asset` 后，19 个 TTF 字体全部复制到 `android/app/src/main/assets/fonts/`：

```
AntDesign.ttf                        70,344 B
Entypo.ttf                           66,200 B
MaterialCommunityIcons.ttf         1,147,844 B  ✅ App.tsx 使用的
MaterialIcons.ttf                   356,840 B
... 共 19 个字体文件
```

### 3.5 闪退根因 #3（历史）：Build b85ad4e4 缺 peer dependency

通过 build log `dist-eas-log/b85ad4e4-build.txt` 发现：
- `Missing peer dependency: react-native-svg`
- `Missing peer dependency: react-native-worklets`

这两个依赖在当前 `package.json` 中已正确声明（`react-native-svg@15.15.4`、`react-native-worklets@0.8.3`），不再触发该警告。

---

## 四、SDK 56 Schema 修复

### 4.1 `splash` 字段位置错误

`@expo/config-types/build/ExpoConfig.d.ts` line 692-709 显示 `splash` 字段只属于 `interface Web`：

```ts
export interface Web {
  // ...
  /**
   * Configuration for PWA splash screens.
   */
  splash?: { backgroundColor?: string; resizeMode?: 'cover'|'contain'; image?: string; };
}
```

顶层 `ExpoConfig` 没有 `splash` 字段。修复前 app.json 在顶层放了 `splash`，expo-doctor 报错：
> "should NOT have additional property 'splash'"

### 4.2 修复动作

`app.json` 和 `package.json` 都将 `splash` 字段移到 `web` 下：

```jsonc
"web": {
  "favicon": "./assets/proclaw-logo.png",
  "splash": {
    "image": "./assets/proclaw-logo.png",
    "resizeMode": "contain",
    "backgroundColor": "#6366f1"
  }
}
```

修复后 expo-doctor 20/21 通过（剩余 1 项为 RN Directory 警告，非错误）。

---

## 五、其他修复

### 5.1 `styles.xml` 错误修复

`android/app/src/main/res/values/styles.xml` 之前错误引用 `@color/colorPrimary`（缺 `android:` 前缀）：

```xml
<!-- 修复前（有错） -->
<item name="colorPrimary">@color/colorPrimary</item>  <!-- ❌ 缺 android: 前缀 -->

<!-- 修复后 -->
<!-- 已移除该错误行 -->
```

修复后的 styles.xml：

```xml
<resources xmlns:tools="http://schemas.android.com/tools">
  <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
    <item name="android:editTextBackground">@drawable/rn_edit_text_material</item>
    <item name="android:statusBarColor">@android:color/transparent</item>
    <item name="android:navigationBarColor">@android:color/transparent</item>
  </style>
  <style name="Theme.App.SplashScreen" parent="AppTheme">
    <item name="android:windowBackground">@drawable/splashscreen_logo</item>
  </style>
</resources>
```

---

## 六、验证结果

### 6.1 typecheck

```
$ npx tsc --noEmit
exit: 0
✅ 通过
```

### 6.2 完整 Jest 测试

```
Test Suites: 38 passed, 38 total
Tests:       617 passed, 617 total
Snapshots:   0 total
Time:        132.901 s
✅ 全部通过（耗时 132 秒）
```

### 6.3 expo-doctor

```
Running 21 checks on your project...
20/21 checks passed. 1 checks failed. Possible issues detected:
- Validate packages against React Native Directory package metadata
  - Untested on New Architecture: react-native-incall-manager, react-native-webrtc
  - No metadata available: react-native-vector-icons, expo-modules-jsi
✅ schema 错误已修复（剩余仅为已知警告，不影响功能）
```

### 6.4 expo config 校验

```json
{
  "icon": "./assets/proclaw-logo.png",                    ✅
  "android": {
    "adaptiveIcon": {
      "foregroundImage": "./assets/proclaw-logo.png",     ✅
      "backgroundColor": "#6366f1",
      "monochromeImage": "./assets/proclaw-logo.png"      ✅
    }
  },
  "web": {
    "favicon": "./assets/proclaw-logo.png",               ✅
    "splash": { "image": "./assets/proclaw-logo.png" }    ✅ 在 web 下
  }
  // 顶层无 splash 字段                                   ✅ SDK 56 schema 合规
}
```

### 6.5 资源 MD5 一致性

```
mobile/assets/proclaw-logo.png   3B5A6C8560F536338EA70727563F8307
public/proclaw-logo.png          3B5A6C8560F536338EA70727563F8307
✅ 哈希完全一致
```

---

## 七、修改清单汇总

| 文件 | 类型 | 说明 |
|------|------|------|
| `mobile/app.json` | 修改 | splash 字段移到 web.splash；保持 ProClaw 图标引用 |
| `mobile/package.json` | 修改 | 同上 |
| `mobile/App.tsx` | 修改 | 修复 initializeApp 缺 applySchema 调用（**闪退核心修复**） |
| `mobile/react-native.config.js` | 新增 | 配置字体打包到 APK（修复 Tab 图标缺失） |
| `mobile/assets/icon.png` | 删除 | Expo 默认蓝色箭头占位符 |
| `mobile/assets/splash-icon.png` | 删除 | Expo 默认占位符 |
| `mobile/assets/android-icon-foreground.png` | 删除 | Expo 默认蓝色箭头 |
| `mobile/assets/android-icon-background.png` | 删除 | Expo 默认浅蓝网格 |
| `mobile/assets/android-icon-monochrome.png` | 删除 | Expo 默认灰色箭头 |
| `mobile/assets/favicon.png` | 删除 | Expo 默认占位符 |
| `mobile/android/app/src/main/res/values/styles.xml` | 修改 | 移除错误的 colorPrimary 项 |
| `mobile/android/app/src/main/res/mipmap-*/ic_launcher*.webp` | 重新生成 | prebuild 后全部为 ProClaw 红色小螃蟹 |
| `mobile/android/app/src/main/res/drawable-*/splashscreen_logo.png` | 重新生成 | prebuild 后全部为 ProClaw 红色小螃蟹 |
| `mobile/android/app/src/main/assets/fonts/*.ttf` | 新增 | 19 个 react-native-vector-icons 字体 |

---

## 八、待办（构建验证）

完成所有代码修复后，建议执行以下步骤验证：

1. **本地 prebuild 验证**：
   ```bash
   cd mobile
   npx expo prebuild --clean
   ```
   应成功生成 `android/` 目录，所有 mipmap-* 都是 ProClaw 红色小螃蟹。

2. **提交并触发 EAS Build**：
   ```bash
   git add mobile/app.json mobile/package.json mobile/App.tsx \
           mobile/react-native.config.js mobile/assets/
   git commit -m "fix(mobile): v14 图标与闪退深度修复

   - app.json schema 修复（splash 移到 web.splash）
   - App.tsx 初始化流程补全 applySchema（修复首次启动闪退）
   - 添加 react-native.config.js 打包字体（修复 Tab 图标缺失）
   - 清理 assets 残留的 6 个 Expo 默认占位符 PNG
   - 修复 styles.xml 中 colorPrimary 错误"
   eas build --platform android --profile preview
   ```

3. **APK 安装验证清单**：
   - [ ] 图标显示为 ProClaw 红色小螃蟹
   - [ ] App 启动不再闪退
   - [ ] Tab 图标正常显示（contacts / messages / profile）
   - [ ] 首次启动进入 OnboardingWizard（小如对话界面）
   - [ ] 创建身份后进入 MainTabs
   - [ ] 数据库正常初始化（SQLite 表创建成功）

---

## 九、附录：审计历史

| 报告 | 主要内容 |
|------|----------|
| v9 | 中期审计 |
| v10 | 核心功能模块审计 |
| v11 | 同步与冲突解决审计 |
| v12 | 插件系统审计 |
| v13 | Expo SDK 56 升级审计 |
| **v14** | **图标与闪退深度修复（本报告）** |