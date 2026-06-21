## 1. ProClaw 插件系统 PRD（行业工作流插件）

## 实施状态

| 字段 | 值 |
|---|---|
| **状态标签** | 🟡 草案 (待 v1.x 规划) |
| **首次落地版本** | 未落地（v1.0.0 仅实现基础插件加载，完整生态联动待 v1.x） |
| **关联发布** | [RELEASE_NOTES_v1.0.0.md](../../../RELEASE_NOTES_v1.0.0.md) 未涉及 |
| **覆盖率** | 0% |
| **代码入口** | 未来：`src-tauri/src/commands/plugin.rs` 扩展点；Nuwax/SkillHub/FlowHub 联动需 v1.x 规划 |
| **数据库依赖** | 未来：plugin marketplace schema |
| **测试覆盖** | N/A |
| **差异与遗留** | v10.0 依赖 Nuwax（AI Team 市场）/ SkillHub（技能仓库）/ FlowHub（插件市场）三个外部平台；v1.0.0 中未独立发布；需三个上游平台同步落地 |
| **后续动作** | 等待 v1.x 路线图；与 Nuwax+SkillHub+FlowHub 团队协同推进 |

### 状态变更日志

| 日期 | 状态 | 变更人/触发事件 |
|---|---|---|
| 2026-05-30 | 🟡 草案 | PRD 创建，依赖 Nuwax/SkillHub/FlowHub 上游平台 |
| 2026-06-16 | 🟡 草案 | 文档整理：添加实施状态区块；标记为 v1.x 路线图项 |

---

**项目**：ProClaw 桌面端 / 手机端  
**版本**：v1.0  
**依赖**：ProClaw v10.0 通用同步框架、Nuwax（AI Team 市场）、SkillHub（技能仓库）  
**目标**：为 ProClaw 提供原生扩展能力，支持行业工作流插件（如餐厅点餐、维修工单等），实现与 AI Team 的深度联动。

---

### 1.1 背景与目标

#### 1.1.1 背景
- ProClaw 已具备通用进销存、AI Team、同步框架等能力。
- 不同行业（餐饮、维修、零售等）有独特的业务流程、界面和设备需求，通用功能无法满足。
- 用户希望通过安装插件，获得行业定制化体验，同时保持与 AI Team 的协同。

#### 1.1.2 目标
- 提供标准化的**插件打包、安装、加载、卸载**机制。
- 插件能够：
  - 扩展数据库结构（新增表、字段、索引）。
  - 新增导航菜单和页面（React 组件）。
  - 注册后端命令（Rust）以访问硬件（打印机、扫码枪）。
  - 调用 ProClaw 核心 API（数据、聊天、设备）。
  - 与已安装的 AI Team 交互（读取上下文、触发任务）。
- 建立**插件市场**（FlowHub）作为分发自定义工作流的渠道。
- 确保安全：插件需声明权限，用户确认后方可安装。

---

### 1.2 用户故事

- **作为** 餐厅老板，我在 ProClaw 扩展市场中安装“餐厅工作流插件”，系统自动添加“点餐”、“后厨看板”、“收银台”菜单。我用手机点菜，后厨电脑实时显示订单，收银台一键结账并打印小票。
- **作为** 手机维修店主，我安装“维修工单插件”，工单状态跟踪、配件库存管理自动融入现有进销存，客户还能收到维修进度推送。
- **作为** 开发者，我将自己为奶茶店开发的插件上传到市场，设置价格，供其他用户安装使用。

---

### 1.3 功能需求

#### 1.3.1 插件包格式

插件是一个签名的 ZIP 包，结构如下：

```
my-plugin/
├── manifest.json          # 元数据（见1.3.2）
├── frontend/              # 前端资源
│   ├── index.js           # 入口（React 组件注册）
│   └── *.css
├── backend/               # Rust 后端插件（可选）
│   ├── target/release/... # 编译后的库文件（.dll/.so/.dylib）
│   └── plugin.rs          # 源代码（可选）
├── migrations/
│   ├── up.sql             # 数据库升级脚本
│   └── down.sql           # 卸载回滚脚本
└── assets/                # 图标、截图等
```

#### 1.3.2 manifest.json 规范

```json
{
  "id": "com.proclaw.plugin.restaurant",
  "name": "餐厅工作流",
  "version": "1.0.0",
  "min_proclaw_version": "10.0.0",
  "author": "ProClaw Labs",
  "description": "为餐厅提供点餐、后厨看板、收银功能。",
  "permissions": [
    "database:create_table",
    "database:read:products",
    "database:write:sales_orders",
    "menu:add",
    "printer:write",
    "notification:send"
  ],
  "entry_points": {
    "frontend": "frontend/index.js",
    "backend": "backend/plugin.dll",
    "migrations": "migrations/up.sql"
  },
  "settings_schema": {      // 插件配置界面 JSON Schema
    "type": "object",
    "properties": {
      "printer_name": { "type": "string" }
    }
  }
}
```

#### 1.3.3 前端插件 API

ProClaw 主应用向插件暴露全局对象 `ProClawPlugin`，提供以下方法：

- `registerRoute(path, component)`：注册新路由，`component` 为 React 组件。
- `addMenuItem(parent, label, icon, route)`：在侧边栏增加菜单项。
- `db.query(sql, params)`：执行只读 SQL（仅限插件自己的表）。
- `db.execute(sql, params)`：写操作（需权限）。
- `invoke(command, args)`：调用插件后端命令。
- `getAgentContext()`：获取当前已安装的 AI Team 列表及其能力。
- `sendToAgent(agentId, message)`：向指定 AI Team 发送消息并接收回复。

#### 1.3.4 后端插件（Rust）开发规范

- 插件需实现一个导出函数 `plugin_init`，返回一个命令映射表。
- 示例：
  ```rust
  #[no_mangle]
  pub fn plugin_init() -> *mut std::ffi::c_void {
      let commands = vec![
          ("print_ticket", print_ticket),
          ("get_printer_status", get_printer_status),
      ];
      Box::into_raw(Box::new(commands)) as *mut _
  }
  ```
- ProClaw 主应用通过动态加载库，调用插件命令。

#### 1.3.5 插件生命周期管理

| 操作 | 行为 |
|------|------|
| **安装** | 下载 ZIP → 校验签名 → 解压到 `plugins/` 目录 → 执行 `up.sql` → 加载前端路由和菜单 → 注册后端命令。 |
| **启用/禁用** | 启用时动态加载路由和菜单；禁用时从 UI 移除，但保留数据库表。 |
| **卸载** | 执行 `down.sql` 删除表 → 删除插件目录 → 移除路由和菜单。 |
| **更新** | 检查新版本 → 下载替换 → 执行迁移脚本（增量）。 |

#### 1.3.6 插件市场（FlowHub）

- 独立子域名：`flowhub.proclaw.cc`（或整合到主网站）。
- 功能：
  - 开发者注册、上传插件包（提供 ZIP）。
  - 审核后上架（支持免费/付费）。
  - 用户可浏览、搜索、安装、评价。
  - 插件更新推送。
- 与 ProClaw 客户端集成：通过 REST API 获取插件列表，一键安装。

---

### 1.4 安全与隐私

- 插件使用代码签名（开发者在 FlowHub 上传时使用私钥签名，ProClaw 内置公钥验证）。
- 权限声明在安装时向用户展示，用户必须点击“同意”才能继续。
- 前端代码运行在 WebView 中，受同源策略限制；后端命令只暴露显式注册的函数。
- 禁止插件访问文件系统（除非声明 `filesystem:read/write` 权限）。

---

### 1.5 实施路线图

| 阶段 | 时间 | 任务 |
|------|------|------|
| 1 | 2周 | 设计插件 API（Rust + TS 类型定义），实现插件加载器、动态路由。 |
| 2 | 1周 | 实现数据库迁移执行器、权限验证。 |
| 3 | 2周 | 开发示例插件（餐厅），验证完整链路。 |
| 4 | 2周 | 搭建 FlowHub 市场（前端 + 后端），支持上传、下载、签名。 |
| 5 | 1周 | 集成到 ProClaw 设置页面，提供扩展管理 UI。 |

---

## 2. SkillHub 平台增强需求

**项目**：SkillHub（`skillhub.proclaw.cc`）  
**版本**：v2.0  
**目标**：支持行业技能分类、知识库片段，为 Nvwax 提供更丰富的技能来源。

---

### 2.1 背景与目标

- 当前 SkillHub 主要存储提示词模板和通用技能。
- 行业插件需要特定的知识（如菜品分类、手机维修故障码），这些知识应以 Skill 形式供 Nvwax 的 Agent 调用。
- 需要扩展 SkillHub 的数据模型和 API，支持**结构化知识片段**和**行业标签**。

---

### 2.2 功能需求

#### 2.2.1 新增技能类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `prompt` | 通用提示词模板 | “生成抖音文案” |
| `knowledge` | 结构化知识片段（JSON/CSV） | 餐厅菜品分类、手机型号与配件对应表 |
| `rule` | 业务规则（if-then） | “如果订单总价>100元，则自动赠送小礼品” |
| `skill_pack` | 技能组合包（包含多个子技能） | 维修工单工作流所需的故障诊断技能集 |

#### 2.2.2 技能元数据扩展

原有字段基础上增加：

- `industry_tags`：字符串数组，如 `["餐饮", "零售", "维修"]`。
- `plugin_compatible`：布尔值，标记该技能是否可与 ProClaw 插件联动。
- `input_schema` / `output_schema`：JSON Schema，定义技能输入输出格式，便于 Nvwax 编排。

#### 2.2.3 知识片段管理

- 支持上传 CSV/JSON 文件作为知识库。
- 提供 API 进行向量化检索（可由 Nvwax 调用）。
- 版本控制：知识片段可更新，保留历史。

#### 2.2.4 API 变更

| 端点 | 方法 | 说明 |
|------|------|------|
| `/v2/skills` | GET | 支持按 `industry_tags` 过滤，返回技能列表 |
| `/v2/skills/:id/knowledge` | GET | 获取知识片段内容（支持分页） |
| `/v2/skills/:id/vector_search` | POST | 在知识片段中进行向量检索 |
| `/v2/skills/:id/versions` | GET | 获取版本历史 |

#### 2.2.5 开发者控制台增强

- 创建技能时可选择类型（prompt/knowledge/rule/skill_pack）。
- 上传知识片段时，提供预览和测试检索功能。

---

### 2.3 与 Nvwax 的协同

- Nvwax 在构建 Agent 时，可以从 SkillHub 拉取特定行业的 `knowledge` 类型技能，作为 Agent 的上下文。
- 当 ProClaw 安装行业插件后，可调用 SkillHub API 获取该行业相关技能列表，推荐给用户安装对应的 AI Team。

---

### 2.4 实施路线图

| 阶段 | 时间 | 任务 |
|------|------|------|
| 1 | 1周 | 数据库增加 `industry_tags`、`input_schema` 等字段，支持新技能类型。 |
| 2 | 1周 | 实现知识片段上传、向量化存储（使用 pgvector）。 |
| 3 | 1周 | 开发 API v2，更新开发者控制台。 |

---

## 3. Nvwax 平台增强需求

**项目**：Nvwax（`nvwax.proclaw.cc`）  
**版本**：v2.0  
**目标**：支持 Agent 感知 ProClaw 插件上下文，并能输出插件可理解的任务指令。

---

### 3.1 背景与目标

- 当前 Nvwax 生成的 Agent 主要面向对话场景，输出文本或简单卡片。
- 行业工作流插件需要 Agent 能够触发插件内的具体操作（如“创建维修工单”、“打印后厨订单”）。
- 需要扩展 Agent 的能力，使其可以调用 ProClaw 插件的 API，并与插件状态同步。

---

### 3.2 功能需求

#### 3.2.1 Agent 输出类型扩展

原有输出（纯文本、Markdown、卡片）基础上，增加 **动作（Action）** 类型：

```json
{
  "type": "action",
  "action_name": "create_repair_order",
  "parameters": {
    "customer_name": "张三",
    "device_model": "iPhone 12",
    "fault": "屏幕破裂"
  }
}
```

ProClaw 主应用接收到 Action 后，若已安装对应插件，则调用插件的相应命令。

#### 3.2.2 插件上下文注入

- 当 Agent 运行在已安装特定插件的 ProClaw 实例中时，Agent 的系统提示词会自动注入该插件的能力描述。
- 例如：如果 ProClaw 安装了“维修工单插件”，Agent 的上下文会包含：
  > “你所在的环境支持 create_repair_order 动作。当用户要求创建维修单时，请使用该动作。”

实现方式：ProClaw 在调用 Agent API 时，通过 `X-Plugin-Capabilities` header 传递已安装插件的动作列表。

#### 3.2.3 Agent 访问插件内部数据

- 允许 Agent（经用户授权）读取插件创建的特定表数据。例如，Agent 可以查询“当前未完成的维修工单数量”。
- 在 Agent 的 manifest 中增加 `data_queries` 字段，声明需要读取哪些表或视图。

#### 3.2.4 技能推荐与自动安装

- 当用户首次安装行业插件时，ProClaw 可向 Nvwax 请求推荐该插件配套的 AI Team。
- Nvwax 返回推荐的 Agent ID 列表，ProClaw 询问用户是否一并安装。

#### 3.2.5 API 变更

| 端点 | 方法 | 说明 |
|------|------|------|
| `/v2/agents/:id/presets` | GET | 根据插件能力返回 Agent 预设提示词 |
| `/v2/agents/recommend` | POST | 提交插件 ID，返回推荐的 Agent 列表 |
| `/v2/agents/:id/validate_action` | POST | 验证动作名称和参数是否符合插件定义 |

---

### 3.3 与 SkillHub 的协同

- Nvwax 在构建 Agent 时，可以从 SkillHub 拉取特定行业的知识技能，自动组装成 Agent 的提示词。
- Agent 执行动作后，可将结果保存回 SkillHub 的知识库，形成闭环（例如积累常见故障处理方案）。

---

### 3.4 实施路线图

| 阶段 | 时间 | 任务 |
|------|------|------|
| 1 | 2周 | 设计 Action 输出格式，实现 Agent 编排引擎对 Action 的支持。 |
| 2 | 1周 | 开发插件上下文注入机制（在调用 Agent API 时传递能力列表）。 |
| 3 | 1周 | 实现推荐 Agent 功能，集成到 ProClaw 扩展市场。 |
| 4 | 1周 | 更新 Nvwax 控制台，支持开发者定义 Agent 的数据查询权限。 |

---

## 总结

以上三份需求分别定义了：

1. **ProClaw 插件系统**：让行业工作流可原生扩展，与 AI Team 联动。
2. **SkillHub 增强**：支持行业知识片段，为 Agent 提供更丰富的技能。
3. **Nvwax 增强**：使 Agent 能理解并触发插件动作，实现业务流程自动化。

三者协同构成从技能、智能体到行业落地的完整生态。