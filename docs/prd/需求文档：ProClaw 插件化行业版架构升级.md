# 需求文档：ProClaw 插件化行业版架构升级

> **版本**: v1.0  
> **日期**: 2026-05-30  
> **适用范围**: ProClaw 桌面端 + 营销网站 + Admin 后台

---

## 一、背景与问题

### 1.1 现状

当前 ProClaw 桌面端通过**编译时构建模式**区分版本：

| 版本 | 构建变量 `VITE_BUILD_MODE` | 定位 |
|------|---------------------------|------|
| 进销存版 | `inventory`（默认） | 通用进销存商户 |
| 虚拟公司版 | `virtual_company` | 虚拟团队协作 |
| Light 极简版 | `light` | 县区小微商家（餐饮/零售/服务/生鲜） |

版本差异通过 `IS_LIGHT` / `IS_VIRTUAL_COMPANY` / `IS_INVENTORY` 三个编译时常量驱动，在 App.tsx 路由、Sidebar 导航、DashboardPage 等位置使用条件渲染。

### 1.2 问题分析

| 问题 | 描述 |
|------|------|
| **版本爆炸** | 每增加一个行业（餐饮版、服装版、美业版、宠物版...），需要新增一个构建变体，条件分支指数级增长 |
| **构建成本高** | N 个版本需要 N 次完整构建，CI/CD 流水线成倍膨胀 |
| **更新不一致** | 各版本独立发布，Bug 修复需要逐个版本重新构建和分发 |
| **下载体验差** | 用户在营销网站面对多个版本选择，困惑率高 |
| **代码污染** | `if (IS_LIGHT)` / `if (IS_VIRTUAL_COMPANY)` 散落各处，维护困难 |
| **无法热切换** | 用户不能在使用中切换行业模式，必须卸载重装 |

### 1.3 核心诉求

**用一个基础桌面端 + 按需下载行业插件/补丁，替代多版本独立构建。** 类似 VS Code 的插件机制：基础编辑器统一，语言支持、主题、调试器等通过插件扩展。

---

## 二、目标架构：插件化行业版

### 2.1 架构总览

```
┌─────────────────────────────────────────────────────┐
│              ProClaw 基础桌面端（统一构建）             │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐          │
│  │ 核心引擎   │ │ AI 底座    │ │ 数据层    │          │
│  │ (路由/导航) │ │ (Agent系统) │ │ (SQLite)  │          │
│  └───────────┘ └───────────┘ └───────────┘          │
│                       │                             │
│              ┌────────┴────────┐                    │
│              │  插件加载器 (Plugin Manager)  │        │
│              └────────┬────────┘                    │
│         ┌─────────────┼─────────────┐               │
│    ┌────┴────┐  ┌─────┴─────┐  ┌───┴────┐          │
│    │ 餐饮插件 │  │ 零售插件   │  │ 美业插件│  ...     │
│    │ (按需下载)│  │ (按需下载) │  │ (按需下载)│         │
│    └─────────┘  └───────────┘  └────────┘          │
└─────────────────────────────────────────────────────┘
```

### 2.2 插件定义（Industry Plugin Manifest）

每个行业插件是一个 **JSON manifest + 资源包**（打包为 `.proclaw-industry-plugin` 或远程下载）：

```typescript
interface IndustryPluginManifest {
  id: string;                    // 唯一标识，如 'catering'、'retail-fashion'
  name: string;                  // 显示名，如 '餐饮行业版'
  version: string;               // 语义版本号
  description: string;           // 行业描述
  icon: string;                  // 图标 URL 或内联 SVG
  compatibleAppVersion: string;  // 兼容的基础桌面端版本范围

  // --- 功能开关与覆盖 ---
  features: {
    modules: string[];           // 启用的功能模块，如 ['pos', 'kitchen-display', 'reservation']
    aiTeams: AITeamPreset[];     // 预装 AI 团队定义
    dashboards: string[];        // 专属仪表板组件
    reports: string[];           // 专属报表
  };

  // --- 导航定制 ---
  navigation: {
    add: NavItem[];              // 新增的侧边栏导航项
    remove: string[];            // 需要隐藏的默认导航项（路径匹配）
    reorder?: string[];          // 导航项排序（可选）
  };

  // --- 数据模型扩展 ---
  dataModels?: {
    tables: string[];            // 额外的 SQLite 建表 SQL
    migrations: string[];        // 数据迁移脚本
  };

  // --- UI 定制 ---
  ui: {
    theme?: ThemeOverride;       // 主题颜色覆盖
    onboarding?: string;        // 行业专属安装向导组件
    quickActions?: QuickAction[];// 行业专属一键操作
  };

  // --- 资源文件 ---
  assets: {
    path: string;               // 资源路径（本地或远程）
    files: string[];            // 文件清单
  };
}
```

### 2.3 插件生命周期

```
用户选择行业
    │
    ▼
插件管理器检查本地缓存
    │
    ├── 已缓存且版本最新 ──► 直接激活
    │
    └── 未缓存或需更新
          │
          ▼
      从插件仓库下载 (marketing-site API)
          │
          ▼
      校验签名（防止篡改）
          │
          ▼
      解压到本地插件目录 (%APPDATA%/ProClaw/plugins/{plugin-id}/)
          │
          ▼
      加载 manifest → 注册模块/路由/导航
          │
          ▼
      重启渲染进程（或热重载）
          │
          ▼
      行业专属安装向导（如需要）
```

### 2.4 对现有代码的改造

| 文件 | 改造内容 |
|------|---------|
| `src/config/appMode.ts` | 废弃编译时常量，改为运行时 `PluginManager.getActiveIndustry()` |
| `src/App.tsx` | 移除 `IS_LIGHT`/`IS_VIRTUAL_COMPANY` 条件路由，改为插件注册的动态路由 |
| `src/components/Layout/Sidebar.tsx` | 导航项从插件 manifest 动态合并 |
| `src/pages/DashboardPage.tsx` | AI Team 卡片、一键操作从插件 manifest 读取 |
| `src-tauri/src/` | 新增 `plugin_manager` 模块（下载、校验、解压、加载） |
| `src-tauri/tauri.conf.json` | 移除 `beforeBuildCommand` 中的行业变量 |

---

## 三、营销网站前端改造

### 3.1 下载页面（DownloadPage）

**现状**：按操作系统分平台卡片（Windows/macOS/Linux），每个卡片一个下载按钮。

**改造后**：

```
┌──────────────────────────────────────────────────────────┐
│  下载 ProClaw                                             │
│  当前版本：v1.0.0  |  基础桌面端统一构建                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  📦 ProClaw 基础桌面端                            │   │
│  │  适用所有行业 · 插件按需下载                       │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐          │   │
│  │  │ Windows  │  │  macOS  │  │  Linux  │          │   │
│  │  │ 下载     │  │ 即将推出 │  │ 即将推出 │          │   │
│  │  └─────────┘  └─────────┘  └─────────┘          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  🧩 行业插件（安装后从桌面端内下载）               │   │
│  │                                                  │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │   │
│  │  │ 🍽️    │ │ 🛍️    │ │ 💇    │ │ 🐾    │    │   │
│  │  │ 餐饮版 │ │ 零售版 │ │ 美业版 │ │ 宠物版 │    │   │
│  │  │ v1.2  │ │ v1.1  │ │ 即将   │ │ 即将   │    │   │
│  │  │ 已发布 │ │ 已发布 │ │ 推出   │ │ 推出   │    │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  💡 安装后选择行业即可自动下载对应插件                      │
└──────────────────────────────────────────────────────────┘
```

### 3.2 定价页面（PricingPage）

**现状**：桌面端分"进销存版"和"虚拟公司版"两个卡片，均为免费。

**改造后**：

| 层级 | 定位 | 价格 |
|------|------|------|
| **基础桌面端** | 所有行业通用核心（进销存 + AI 底座） | 免费 |
| **行业插件** | 每个行业插件在安装向导中选择后免费下载 | 免费 |
| **高级行业插件** | 含行业专属 AI 模型/数据预训练（如餐饮菜品识别） | 按 token 或订阅 |
| **Token 充值** | AI 调用消耗（不变） | 现有定价 |

定价页面结构：
- **桌面端 Tab** → 一张"免费"大卡片 + 行业插件免费说明
- **云托管商城 Tab** → 不变

### 3.3 使用场景页面（UseCasesPage）

**改造后**：按**行业**组织场景，每个行业有独立的场景卡片：

```
┌──────────────────────────────────────────────────────────┐
│  使用场景                                                 │
├──────────────────────────────────────────────────────────┤
│  [全部] [🍽️ 餐饮] [🛍️ 零售] [💇 美业] [🐾 宠物] ...     │
│                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐        │
│  │ 餐饮行业              │  │ 零售行业              │        │
│  │ · 扫码点餐 + 后厨打印 │  │ · 服装进销存 + 会员管理│        │
│  │ · 美团/抖音团购对接    │  │ · 多店库存同步        │        │
│  │ · 桌台管理 + 预订      │  │ · 小程序商城一键开店   │        │
│  │ [安装餐饮插件]        │  │ [安装零售插件]        │        │
│  └─────────────────────┘  └─────────────────────┘        │
└──────────────────────────────────────────────────────────┘
```

### 3.4 首页（HomePage）

- Hero 区域强调"一个软件，所有行业"
- 增加行业轮播/标签云展示已支持的行业

---

## 四、Admin 后台管理改造

### 4.1 现有 Admin 页面结构

| 页面 | 路径 | 功能 |
|------|------|------|
| AdminDashboard | `/admin` | 总览面板 |
| AdminUsersPage | `/admin/users` | 用户管理 |
| AdminPackagesPage | `/admin/packages` | 套餐/Token 包管理 |
| AdminOrdersPage | `/admin/orders` | 订单管理 |
| AdminIntegrationsPage | `/admin/integrations` | 集成管理 |
| AdminAnalyticsPage | `/admin/analytics` | 数据分析 |
| AdminSettingsPage | `/admin/settings` | 系统设置 |
| AdminReportsPage | `/admin/reports` | 报表 |
| AdminTasksPage | `/admin/tasks` | 任务管理 |
| AdminRateLimitingPage | `/admin/rate-limiting` | 限流管理 |
| AdminAuditLogsPage | `/admin/audit-logs` | 审计日志 |
| AdminTokenMonitorPage | `/admin/tokens` | Token 监控 |

### 4.2 需要新增的 Admin 页面

#### (1) 插件管理（`/admin/plugins`）-- 新建 `AdminPluginsPage`

```
┌──────────────────────────────────────────────────────────┐
│  🧩 行业插件管理                                          │
│  [+ 发布新插件]  [+ 上传新版本]                            │
├──────────────────────────────────────────────────────────┤
│  搜索: [________]  状态: [全部 ▾]  行业: [全部 ▾]         │
├──────────────────────────────────────────────────────────┤
│  ID          │ 名称       │ 版本  │ 状态    │ 下载量  │ 操作│
│  catering    │ 餐饮行业版  │ v1.2  │ 已发布  │ 1,234  │ ...│
│  retail      │ 零售行业版  │ v1.1  │ 已发布  │ 856    │ ...│
│  beauty      │ 美业版     │ v0.9  │ 审核中  │ -      │ ...│
│  pet         │ 宠物行业版  │ v0.1  │ 草稿   │ -      │ ...│
└──────────────────────────────────────────────────────────┘
```

**功能**：
- 插件 CRUD（创建/编辑/删除/发布/下架）
- 版本管理（上传新版本包、回滚、版本历史）
- Manifest 在线编辑器（JSON 编辑器 + 可视化表单）
- 插件包上传（`.proclaw-industry-plugin` 文件）
- 审核流程（草稿 → 审核中 → 已发布 / 驳回）
- 灰度发布（按用户百分比 / 指定用户）
- 下载统计与活跃用户数

#### (2) 插件编辑对话框

```
┌──────────────────────────────────────────────────────────┐
│  编辑插件 - 餐饮行业版 (catering)                    [✕]  │
├──────────────────────────────────────────────────────────┤
│  基本信息                                                 │
│  名称: [餐饮行业版              ]  版本: [1.2.0   ]       │
│  描述: [面向餐饮行业的经营方案...]                         │
│                                                          │
│  ── 功能开关 ──                                          │
│  ☑ POS 收银    ☑ 后厨打印    ☑ 桌台管理                  │
│  ☑ 扫码点餐    ☑ 预订系统    ☐ 外卖对接                  │
│                                                          │
│  ── 预装 AI 团队 ──                                      │
│  ┌────────────────────────────────────────────────┐     │
│  │ 🍽️ 餐饮运营团队 (3 Agent)              [编辑]  │     │
│  │ · 菜单优化师 · 库存预测师 · 客服助手      [删除]│     │
│  └────────────────────────────────────────────────┘     │
│  [+ 添加预装团队]                                        │
│                                                          │
│  ── 导航定制 ──                                          │
│  新增导航项:                                             │
│  · [收银台] → 路径 [/pos]                                │
│  · [桌台管理] → 路径 [/tables]                 [+ 添加]  │
│                                                          │
│  隐藏默认项:                                             │
│  ☑ 供应链管理 (/supplychain)                             │
│                                                          │
│  ── 主题 ──                                              │
│  主色: [#e74c3c]  辅助色: [#f39c12]                      │
│                                                          │
│  ── 插件包上传 ──                                        │
│  [📎 catering-v1.2.plugin (2.3MB)]  [上传新版本]         │
│                                                          │
│  [保存草稿]  [提交审核]  [发布]                           │
└──────────────────────────────────────────────────────────┘
```

#### (3) 版本发布管理（集成到 AdminPluginsPage 子视图）

- 版本号遵循语义化版本 (`major.minor.patch`)
- 发布时强制填写 Changelog
- 支持强制更新标记（安全修复必须更新）
- 兼容性检查：插件版本与基础桌面端版本范围校验

### 4.3 需要修改的现有 Admin 页面

#### AdminDashboard 增强

在总览面板新增：
- **插件下载趋势图**（近 30 天各行业插件下载量）
- **活跃行业分布饼图**（各行业活跃安装占比）
- **最新插件发布动态**

#### AdminSettingsPage 增强

- 新增"插件仓库配置"分区：
  - CDN 地址配置
  - 插件签名公钥管理
  - 自动更新策略（用户可选：自动更新 / 手动更新）

---

## 五、技术实施要点

### 5.1 桌面端

| 模块 | 技术方案 |
|------|---------|
| 插件包格式 | `.proclaw-industry-plugin` = tar.gz (manifest.json + assets/) |
| 下载 | Tauri HTTP plugin 从 marketing-site API 下载 |
| 校验 | SHA256 + Ed25519 签名验证 |
| 存储 | `%APPDATA%/ProClaw/plugins/{plugin-id}/` |
| 加载 | Rust side plugin_manager 读取 manifest，注入到前端 window.__PLUGIN__ |
| 热切换 | 切换行业 → 重载插件 → 刷新 React Router（无需重启应用） |
| 兼容性 | 插件 manifest 声明兼容的 base app 版本范围，不兼容时提示升级 |

### 5.2 营销网站

| 功能 | 技术方案 |
|------|---------|
| 插件目录 API | Next.js API Route: `GET /api/plugins` 返回已发布插件列表 |
| 下载分发 | Next.js API Route: `GET /api/plugins/:id/download` 返回插件包文件 |
| 下载统计 | 记录每次下载（匿名化），用于 Admin 面板统计 |
| 静态页面 | DownloadPage / PricingPage / UseCasesPage 从 API 动态获取 |

### 5.3 Admin 后台

| 功能 | 技术方案 |
|------|---------|
| 插件管理界面 | 新建 `AdminPluginsPage`，复用 MUI 组件 |
| 文件存储 | Supabase Storage 或本地文件系统（开发阶段） |
| 签名生成 | Admin 端生成 Ed25519 密钥对，私钥签名发布包 |
| 灰度发布 | 基于用户 ID hash 取模实现 |

### 5.4 数据库变更

```sql
-- 新增表：行业插件
CREATE TABLE industry_plugins (
  id TEXT PRIMARY KEY,          -- plugin id
  name TEXT NOT NULL,           -- 显示名称
  version TEXT NOT NULL,        -- 当前版本
  status TEXT DEFAULT 'draft',  -- draft / review / published / deprecated
  manifest_json TEXT NOT NULL,  -- 完整 manifest JSON
  package_url TEXT,             -- 插件包下载地址
  package_hash TEXT,            -- SHA256
  package_size INTEGER,         -- 字节数
  min_app_version TEXT,         -- 最低兼容桌面端版本
  downloads INTEGER DEFAULT 0,  -- 总下载量
  active_installs INTEGER DEFAULT 0, -- 活跃安装数
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  published_at TEXT
);

-- 新增表：插件版本历史
CREATE TABLE plugin_versions (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL REFERENCES industry_plugins(id),
  version TEXT NOT NULL,
  changelog TEXT,
  package_url TEXT NOT NULL,
  package_hash TEXT NOT NULL,
  package_size INTEGER NOT NULL,
  min_app_version TEXT,
  is_force_update BOOLEAN DEFAULT 0,
  rollout_percentage INTEGER DEFAULT 100,  -- 灰度比例
  created_at TEXT DEFAULT (datetime('now'))
);

-- 新增表：安装统计
CREATE TABLE plugin_installs (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  app_version TEXT,             -- 桌面端版本
  os TEXT,                      -- 操作系统
  install_id TEXT,              -- 匿名安装 ID
  action TEXT,                  -- 'install' / 'update' / 'uninstall'
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## 六、迁移路径

### 阶段一：基础桌面端统一（v1.0）
1. 移除 `appMode.ts` 中的 `VITE_BUILD_MODE` 编译时判断
2. 将 `IS_LIGHT`/`IS_VIRTUAL_COMPANY` 逻辑全部转为配置驱动
3. 构建单一"ProClaw 基础桌面端"

### 阶段二：插件系统上线（v1.1）
1. 实现 Plugin Manager（Tauri Rust 侧）
2. 实现前端插件加载器
3. 将现有 Light 版的差异功能提取为"零售行业插件"
4. 在桌面端安装向导中添加行业选择步骤

### 阶段三：营销网站 + Admin 改造（v1.2）
1. 改造 DownloadPage / PricingPage / UseCasesPage
2. 新建 AdminPluginsPage
3. 实现插件发布/审核流程
4. 部署 CDN 分发

### 阶段四：扩展更多行业（v1.3+）
1. 发布餐饮、美业、宠物等新行业插件
2. 开放第三方行业插件开发规范
3. 建立插件市场生态

---

## 七、验收标准

1. 桌面端单一构建产物，安装后可通过向导选择行业
2. 切换行业无需卸载重装，10 秒内完成插件下载和激活
3. 营销网站下载页展示行业插件目录（非多版本列表）
4. Admin 后台可创建/编辑/发布/下架行业插件
5. Admin 后台可上传插件新版本并填写 Changelog
6. 插件包经过签名校验，防止篡改
7. 下载/安装统计数据在 Admin 面板可见
8. 现有三个版本（进销存/虚拟公司/Light）的功能通过插件机制完整保留
