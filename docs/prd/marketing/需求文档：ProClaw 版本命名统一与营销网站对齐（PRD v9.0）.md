# 需求文档：ProClaw 版本命名统一与营销网站对齐（PRD v9.0）

## 实施状态

| 字段 | 值 |
|---|---|
| **状态标签** | ✅ 已实现 v1.0+ (2026-06-08) |
| **首次落地版本** | v1.0.0 (2026-06-08) |
| **关联发布** | [RELEASE_NOTES_v1.0.0.md](../../../RELEASE_NOTES_v1.0.0.md) §"版本升级: 0.1.0 → 1.0.0" |
| **覆盖率** | 100%（桌面端/营销网站/移动端/构建脚本版本号统一为 v1.0.0） |
| **代码入口** | `package.json`、`marketing-site/package.json`、`mobile/app.json`、`mobile/package.json`、`build-release.ps1`、`app.json` |
| **数据库依赖** | N/A（版本号元数据） |
| **测试覆盖** | `e2e/` 各 spec 套件中显式引用版本号 |
| **差异与遗留** | 无显著差异；Tauri 2.11 / Next.js 16 / Expo SDK 56 等技术栈版本号同步更新 |
| **后续动作** | 维持现状；每次发布需统一更新版本号 |

### 状态变更日志

| 日期 | 状态 | 变更人/触发事件 |
|---|---|---|
| 2026-06-08 | ✅ 已实现 v1.0+ | v1.0.0 发布，版本号全端统一 |
| 2026-06-16 | ✅ 已实现 v1.0+ | 文档整理：添加实施状态区块 |

---

> **版本**: v1.1  
> **日期**: 2026-06-01  
> **范围**: ProClaw 桌面端（src/）、营销网站（marketing-site/）、构建脚本（build-release.ps1）、全局文档（README、docs/）、E2E 测试

---

## 一、背景与动机

### 1.1 现状

当前项目中不同位置对同一版本的叫法不一致，总结如下：

| 内部 ID / 概念 | 营销网站称呼 | 桌面端 UI 称呼 | 构建脚本输出命名 | PRD 文档称呼 |
|---|---|---|---|---|
| `inventory` | ProClaw 标准版 | 进销存通用版 / 进销存版 | 进销存版 | 进销存版 |
| `virtual_company` | ProClaw 虚拟公司 | 虚拟公司版 | 虚拟公司版 | 虚拟公司版 |
| `light` | ProClaw Light 极简版 | 极简零售版 | — | Light 极简版 |
| `cloud-proclaw` | Cloud 版 | — | — | — |

### 1.2 问题

1. **同名不同物**："进销存版"在桌面端UI叫这个名字，但营销网站叫"标准版"，用户切换端时感到困惑
2. **版本名称与品牌定位脱钩**：当前版本名称偏技术描述（进销存/虚拟公司），无法传递品牌价值
3. **三端命名不一致**：桌面端 UI、营销网站、构建产物三者名称各自不同，维护者容易出错
4. **缺少 Cloud 版统一命名**：Cloud 版没有在桌面端 UI 和文档中统一呈现

---

## 二、产品线定义

### 2.1 三个产品版本

ProClaw 共有 **三个产品版本**，分别为：

| 版本 | 内部 ID | 定位 | 安装方式 |
|---|---|---|---|
| **ProClaw Plus 版** | `inventory` | 完整进销存管理 + AI 经营团队 + 行业插件，面向实体商户 | 安装向导 → 选择行业插件 → 千人千面 |
| **ProClaw Light 版** | `virtual_company` | CEO Agent 主控官 + Agent 生态，面向虚拟团队/创业团队 | 安装向导 → 选择行业插件 → 千人千面 |
| **ProClaw Cloud 版** | `cloud-proclaw` | 云托管商城增值服务，在桌面端基础上可选使用 | 安装向导（跳过本地问题）→ 选择行业插件 → 千人千面 |

> 注：三个版本的安装向导均走 CEO Agent 对话式引导，并均通过行业插件实现千人千面。Cloud 版在安装向导中跳过路径选择、本地存储配置等桌面安装必要问题，但仍保留行业选择步骤以完成个性化配置。

### 2.2 行业插件实现"千人千面"

三个版本安装流程在行业选择阶段一致：
1. CEO Agent 对话引导，询问用户行业（餐饮/零售/美业/宠物等）
2. 根据行业选择，自动下载对应行业插件
3. 不同行业的安装向导后续步骤、默认功能面板各不相同
4. 用户安装完即是"千人千面"的个性化配置，无需二次手动设置

### 2.3 关于 `light`（极简零售版）的处置

`light` 模式**不是一个独立产品**，它是 `inventory`（ProClaw Plus）内部的一种简化配置模式。区别如下：

| 对比项 | ProClaw Plus（默认） | ProClaw Plus（简化模式） |
|---|---|---|
| 内部 ID | `inventory` | `light` |
| 安装包 | `build-release.ps1` 打包 | 同一安装包，通过 `VITE_BUILD_MODE=light` 环境变量启用 |
| 安装向导 | STANDARD_STEPS | LIGHT_STEPS（含店铺类型/数据导入/平台绑定步骤） |
| 页面功能 | 完整进销存功能 | 部分页面减少字段（如销售页隐藏部分列） |
| 快速指令 | 标准指令组 | `getLightQuickCommands()` 简版指令 |

**处置方案**：
- 【安装向导】不在 IndustrySelector 中作为独立版本展示
- 【内部代码】保留 `light` 模式，作为 ProClaw Plus 的可选简化配置
- 【构建脚本】可通过 `VITE_BUILD_MODE=light` 构建简化版本，但命名上不出现"Lite"
- 【插件 manifest】`retail/manifest.json` 改为 "基础配置（简化模式）"

---

## 三、命名映射规则

| 内部 ID | 旧名（需替换） | 新品牌名 | 独立产品？ |
|---|---|---|---|
| `inventory` | 进销存版 / 进销存通用版 / 标准版 | **ProClaw Plus 版** | ✅ 是 |
| `virtual_company` | 虚拟公司版 | **ProClaw Light 版** | ✅ 是 |
| `light` | 极简零售版 / Light 极简版 | 无（保留内部mode，不以独立产品名出现） | ❌ 否，Plus 的简化配置 |
| `cloud-proclaw` | Cloud 版 | **ProClaw Cloud 版** | ✅ 是 |

> **重要**：内部代码标识符（`inventory`、`virtual_company`、`light`、`cloud-proclaw`、`VITE_BUILD_MODE`、`IS_INVENTORY` 等）**不做更改**，仅修改用户可见的**展示文本和文档文案**。

---

## 四、影响文件清单

### 4.1 构建脚本（1 个文件）

| 文件 | 位置 | 修改内容 |
|---|---|---|
| `build-release.ps1` | L32-L38 | `$outputSuffix` 值：`"虚拟公司版"` → `"Light版"`，`"进销存版"` → `"Plus版"` |

### 4.2 主应用代码（4 个文件）

| 文件 | 位置 | 修改内容 |
|---|---|---|
| `src/components/SetupWizard/IndustrySelector.tsx` | L21-L41 `DEFAULT_INDUSTRIES` | 删除 `light` 条目（极简零售版不是独立产品）；进销存通用版→ProClaw Plus 版，虚拟公司版→ProClaw Light 版 |
| `src/components/SetupWizard/ModelConfigStep.tsx` | L24 注释 | 进销存版→ProClaw Plus 版 |
| `src/plugins/virtual-company/manifest.json` | L3 `name` | "虚拟公司版"→"ProClaw Light 版" |
| `src/plugins/retail/manifest.json` | L3 `name` | "极简零售版"→"基础配置（简化模式）" |
| `src/App.tsx` | L331 注释 | "虚拟公司版专属路由"→"ProClaw Light 版专属路由" |

### 4.3 营销网站（2 个文件）

| 文件 | 位置 | 修改内容 |
|---|---|---|
| `marketing-site/src/pages/HomePage.tsx` | L18 `modeCards` | `title: 'ProClaw 标准版'` → `'ProClaw Plus'` |
| 同上 | L27 `modeCards` | `title: 'ProClaw 虚拟公司'` → `'ProClaw Light'` |
| 同上 | L157 推广文案 | "标准进销存" → "ProClaw Plus" |
| 同上 | L385 CTA 文案 | "标准版 / 虚拟公司版" → "ProClaw Plus / ProClaw Light" |
| `marketing-site/src/pages/FAQPage.tsx` | L27-L28 Q&A | "进销存版和虚拟公司版怎么选？" → "ProClaw Plus 和 ProClaw Light 怎么选？"；答案同步改 |
| 同上 | L69 定价说明 | "桌面端应用（进销存版和虚拟公司版）" → "桌面端应用（ProClaw Plus 和 ProClaw Light）" |

### 4.4 文档（3 个文件）

| 文件 | 修改内容 |
|---|---|
| `README.md` | L16、L20、L80、L153-L175 所有版本名称引用，去掉"Lite 版" |
| `docs/PROJECT_POSITIONING.md` | 版本定位描述，去掉"Lite 版" |
| 本文档 | 同步更新 |

### 4.5 E2E 测试（1 个文件）

| 文件 | 位置 | 修改内容 |
|---|---|---|
| `e2e/token-billing.spec.ts` | L29-L30 `toBeVisible` 断言 | "进销存版" → "ProClaw Plus"，"虚拟公司版" → "ProClaw Light" |

---

## 五、安装向导流程差异

| 流程节点 | ProClaw Plus | ProClaw Light | ProClaw Cloud |
|---|---|---|---|
| 行业/版本选择 | 安装向导第一步 | 安装向导第一步 | 安装向导第一步 |
| 安装路径选择 | ✅ 需要 | ✅ 需要 | ❌ 跳过 |
| 公司命名 | ✅ 需要 | ✅ 需要 | ❌ 跳过 |
| 模型配置 | ✅ 需要（可跳过） | ✅ 需要（可跳过） | ❌ 跳过 |
| 店铺类型选择 | light 简化模式时出现 | ❌ 不需要 | ❌ 跳过 |
| 数据导入 | light 简化模式时出现 | ❌ 不需要 | ❌ 跳过 |
| 平台绑定 | light 简化模式时出现 | ❌ 不需要 | ❌ 跳过 |
| 行业插件下载 | ✅ 自动下载 | ✅ 自动下载 | ✅ 自动下载（按行业选择） |
| 完成 | ✅ | ✅ | ✅ 进入云商城设置 |

---

## 六、执行步骤

| 步骤 | 描述 | 依赖 |
|---|---|---|
| 1 | 编写本文档 | — |
| 2 | 修改构建脚本 `build-release.ps1` 的输出名称 | — |
| 3 | 修改 IndustrySelector 删除 light 条目；更新其余显示名称 | — |
| 4 | 更新 manifest 和注释 | — |
| 5 | 修改营销网站文案（HomePage、FAQPage） | — |
| 6 | 修改 README 和 PROJECT_POSITIONING.md | — |
| 7 | 修改 E2E 测试断言 | — |
| 8 | 编译验证 + E2E 回归测试 | 2-7 |

---

## 七、风险与注意事项

1. **内部代码耦合**：`light` 模式在代码中有大量 `mode === 'light'` 条件分支（SetupWizard、ChatPage、SalesPage 等），移除 IndustrySelector 的展示不会影响这些内部逻辑
2. **构建通道**：`VITE_BUILD_MODE=light` 仍可用于构建简化版本安装包，但不作为正式产品发布
3. **用户习惯过渡**：已有用户习惯旧名称，建议在 Release Notes 中说明改名
4. **SEO 影响**：营销网站的关键词（"进销存版"）已有一段时间积累，改名后需要做 301 重定向或保留旧关键词在页面中
