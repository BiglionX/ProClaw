# ProClaw 项目定位说明

> **重要**：本文档明确 ProClaw 项目的核心定位，避免与类似项目混淆。

## 🎯 项目定位

**ProClaw** 是一个**开源的AI驱动商户经营操作系统**（Open-Source AI-Powered Business OS）。

### 产品类型
- **桌面应用**：基于 Tauri 2.11 构建的跨平台桌面应用
- **开源项目**：GPL-3.0 许可证，代码完全开放
- **AI原生**：深度集成大语言模型和AI智能体
- **本地优先**：数据默认存储在本地，用户完全掌控

### 目标用户
1. **中小商户** - 便利店、超市、专卖店、连锁店等
2. **行业商户** - 餐饮（POS/KDS）、美业（预约/服务）、宠物（寄养/美容）
3. **虚拟公司经营者** - 通过 AI Agent 团队管理虚拟业务
4. **开发者** - 希望扩展功能或自建部署的技术人员
5. **企业IT管理员** - 需要私有化部署和数据安全的企业

## 🔑 核心功能重点

ProClaw 的核心不是传统的进销存软件，而是一个**AI赋能的业务操作系统**，重点在于：

### 1. 用户管理系统
- 注册/登录/权限控制
- 多租户支持
- 角色权限管理（店主/仓管/财务/采购/销售/客服）
- 会话管理和安全认证
- 员工邀请与外部伙伴管理

### 2. 大模型调用能力
- AI经营智能体（自然语言交互）
- CEO Agent 主控官系统（项目上下文协议/任务分派/决策确认）
- 25+ Agent Bundles（CRM、文档、HR、SEO、社媒运营等）
- Dify工作流引擎集成 / LangChain多提供商支持
- 智能数据分析（销量预测、库存预警、利润分析）
- 上下文记忆和多轮对话
- 自定义Prompt模板

### 3. Token管理
- API密钥管理（支持多个LLM提供商）
- 用量统计和监控
- 成本控制和建议
- 配额管理和限制
- 费用分析和优化建议

### 4. 外部资源桥接
- RESTful API集成
- Webhook支持
- 第三方服务连接（支付、物流、ERP、电商等）
- 自定义连接器开发
- API网关和路由管理

### 5. 技能生态
- 可扩展的插件系统
- 技能商店（财务管理、会员管理、电商对接等）
- 行业插件（餐饮 POS/KDS、美业预约/服务/营销、宠物寄养/美容、Cloud 托管）
- 会员管理（跨行业通用）
- 开发者SDK和文档
- 收益分成机制
- 社区贡献和审核

## 💾 部署模式

### 🖥️ 本地优先（默认 - 免费）

**架构**：
```
用户设备
  ├── Tauri Desktop App
  ├── SQLite (SQLCipher加密)
  ├── 本地文件系统
  └── [可选] Supabase 云端同步
```

**双模式运行**：
- **ProClaw Plus 版**：完整进销存 + AI 团队 + 行业插件
- **ProClaw Light 版**：CEO Agent 主控官 + Agent 生态 + 项目管理

**特点**：
- ✅ 完全免费，开源代码
- ✅ 数据100%本地存储，隐私安全
- ✅ 离线可用，不依赖网络
- ✅ 完全掌控，无供应商锁定
- ✅ 可自行定制和扩展
- ⚠️ 需要自行维护和数据备份
- ⚠️ 多设备同步需手动配置

**适合人群**：
- 注重数据主权的用户
- 有技术能力的用户
- 追求完全控制的用户
- 预算有限的个人或小团队

### ☁️ 云托管（可选 - 付费订阅）

**架构**：
```
用户设备
  ├── Tauri Desktop App
  └── Supabase Backend (官方托管)
        ├── PostgreSQL
        ├── Auth + RLS
        ├── Realtime Sync
        └── Edge Functions
```

**特点**：
- ✅ 自动数据同步和备份
- ✅ 多设备实时协作
- ✅ 无需自行维护基础设施
- ✅ 专业技术支持和SLA保障
- ✅ 定期更新和新功能
- 💰 需要付费订阅

**定价**：
- 基础版：¥99/月
- 专业版：¥299/月
- 企业版：联系销售定制

**适合人群**：
- 追求便捷的用户
- 需要团队协作的企业
- 不想自行维护的用户
- 需要专业技术支持的用戶

## ❌ 不是什么

为了避免混淆，明确 ProClaw **不是**：

1. ❌ **不是维修服务管理平台**（如 ProCyc/FixCycle）
   - 不涉及设备维修、配件商城、售后服务
   
2. ❌ **不是纯SaaS应用**
   - 默认是本地桌面应用，云托管是可选服务
   
3. ❌ **不是传统进销存软件**
   - 重点是AI能力和扩展性，不只是简单的库存管理
   
4. ❌ **不是企业级ERP**
   - 面向中小商户，轻量级、易用性强

## 🆚 与类似项目对比

| 特性 | ProClaw | 传统进销存 | SaaS ERP |
|------|---------|-----------|----------|
| 部署方式 | 本地优先+云托管可选 | 本地或云端 | 仅云端 |
| 数据所有权 | 用户完全掌控 | 取决于部署 | 服务商掌控 |
| AI能力 | 深度集成（25+ Agent） | 无或弱 | 有限 |
| 扩展性 | 技能商店+行业插件 | 封闭 | 有限API |
| 行业支持 | 餐饮/美业/宠物/Cloud | 通用 | 通用 |
| 离线使用 | ✅ 完全支持 | ✅ 支持 | ❌ 不支持 |
| 成本 | 免费（本地）/订阅（云） | 一次性购买 | 持续订阅 |
| 开源 | ✅ 完全开源 | ❌ 闭源 | ❌ 闭源 |

## 📊 关键指标

### 技术指标
- 安装包大小：< 10MB
- 启动时间：< 2秒
- 内存占用：< 100MB
- AI响应时间：< 1秒
- 离线可用性：100%

### 业务指标（目标）
- GitHub Stars: 5,000+
- 下载量: 10,000+
- 月活跃用户: 5,000+
- 技能数量: 100+
- 贡献者: 50+

## 🔗 相关文档

- [README.md](../README.md) - 项目主页
- [TECHNICAL_OVERVIEW.md](TECHNICAL_OVERVIEW.md) - 技术架构
- [MARKETING_SITE_RESTRUCTURE_PLAN.md](reports/MARKETING_SITE_RESTRUCTURE_PLAN.md) - 营销网站重整方案
- [INSTALLATION_GUIDE.md](guides/INSTALLATION_GUIDE.md) - 安装指南
- [QUICKSTART.md](guides/QUICKSTART.md) - 快速开始
- [integration/NVWAX_INTEGRATION.md](integration/NVWAX_INTEGRATION.md) - NvWaX 集成开发者指南
- [integration/virtual-company-package.schema.json](integration/virtual-company-package.schema.json) - 跨包数据契约
- [MULTI_PROJECT_INTEGRATION_SPEC.md](MULTI_PROJECT_INTEGRATION_SPEC.md) - 多项目集成架构规范

## 🌐 NvWaX 虚拟公司闭环（v1.3.2+）

> **官方推荐定位**：ProClaw 是 NvWaX 官方推荐的"本地壳"。NvWaX 在云端完成 AI 团队设计，ProClaw 在本地运行。

### 闭环全景

```
┌─────────────────────────┐                  ┌──────────────────────────┐
│  NvWaX Cloud (Web)        │   HTTP / JWT    │  ProClaw Desktop (Tauri)  │
│  · 对话式创建虚拟公司      │ ◄─────────────► │  · virtual-company 插件   │
│  · AI 自动匹配 Agent       │                  │  · 本地 SQLite 持久化     │
│  · 一键导出 .nvwax-vc.json │                  │  · Hermes Skill 触发     │
│  · 多设备 local_state 同步  │                  │  · 多设备 LWW 合并        │
└─────────────────────────┘                  └──────────────────────────┘
```

### 关键能力（v1.3.2 + v1.4.0 + **v1.4.1** 全交付）

| 能力 | 描述 | 引入版本 |
|------|------|----------|
| **虚拟公司一键导入** | NvWaX 完成设计后，导出 `.nvwax-vc.json`，ProClaw 一键下载/导入 | Sprint 2.13 |
| **CEO Agent 智能触发** | "帮我开一家咖啡店的虚拟公司" → 自动跳转到向导 | Sprint 2.14 |
| **本地 SSE 流式对话** | 与 NvWaX 助手对话，全程不跳出 ProClaw | Sprint 2.14 |
| **本地状态回写** | 启用/停用 Agent → 同步到 NvWaX | Sprint 2.14 |
| **多设备同步** | MacBook 启用的 Agent 自动同步到 Windows | Sprint 2.15 |
| **字段级 LWW 合并** | 智能解决多设备冲突：每个字段独立比较时间戳 | Sprint 2.15 |
| **Agent 启停状态持久化** | toggle/改名/改角色 写入 SQLite，刷新页面不再丢 | **v1.4.0** |
| **真实 SSE 流式** | 用 `reqwest::bytes_stream()` 替代 500ms 轮询，逐字推送 | **v1.4.0** |
| **虚拟公司发布到 NvWaX 市场** | 一键发布，当前虚拟公司出现在 NvWaX marketplace 供他人导入 | **v1.4.0** |
| **SSE 事件类型路由**（Sprint 2.17 收尾）| `nvwax_stream_session_v2` 按 `event:` 字段路由 6 种事件（progress / agent_message / step / status / complete / error），端到端打通 wizard 流式显示 | **v1.4.1** |

### 数据交换契约

- 跨包数据格式：`VirtualCompanyPackage`（JSON Schema v1.0.0）
- 位置：`docs/integration/virtual-company-package.schema.json`
- 镜像：[NvWaX 仓库](https://github.com/BiglionX/NvwaX)
- 必填字段：`schemaVersion` / `packageId` / `exportedAt` / `source.platform` / `team.id` `team.name` / `agents[]`

### 11 个虚拟公司专用 Tauri 命令（v1.4.1 总计）

| 命令 | 引入 | 用途 |
|------|------|------|
| `nvwax_search_vc_templates` | 2.13 | 浏览 NvWaX 虚拟公司模板 |
| `nvwax_import_virtual_company_from_url` | 2.13 | 拉取 `.nvwax-vc.json` 并导入本地 SQLite |
| `bootstrap_virtual_company_tables` | 2.13 | 首次加载时建表（幂等）+ v1.4.0 启动 ALTER 补齐 4 列 |
| `open_virtual_company_page` | 2.14 | 触发前端跳转到 `/vc/{wizard,import,companies}` |
| `nvwax_push_virtual_company_state` | 2.14 | 把本地状态变更回写到 NvWaX |
| `nvwax_stream_session` | 2.14 | 通过 SSE 流与 NvWaX 虚拟公司会话交互（500ms 轮询版，保留兼容） |
| `nvwax_stream_session_v2` | **v1.4.0** | **真实 SSE 流式**（reqwest bytes_stream + app_handle.emit，替代轮询） |
| `nvwax_set_agent_local_state` | **v1.4.0** | **把单个 Agent 的启停/别名/角色持久化到 SQLite** |
| `nvwax_fetch_local_state` | 2.15 | 拉取单个 session 的最新 `local_state`（多设备同步） |
| `nvwax_list_sessions_with_state` | 2.15 | 列出用户最近的虚拟公司会话（含 `local_state`） |
| `nvwax_publish_to_marketplace` | **v1.4.0** | **把虚拟公司发布到 NvWaX 市场**（team_skills is_public=true） |

详细使用方式见 [`integration/NVWAX_INTEGRATION.md`](integration/NVWAX_INTEGRATION.md)。

## 📝 更新历史

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-XX-XX | **v1.4.1** | Sprint 2.17 收尾真实 SSE 流式：ProClaw `nvwax_stream_session_v2` 升级按 `event:` 字段路由 6 种 SSE 事件类型，端到端打通 wizard 流式显示 NvWaX CEO Agent 回复；NvWaX v2.2.1 配套新增 `broadcastAgentMessage()` + `broadcastComplete()` + 7 个 SSE 单元测试 |
| 2026-XX-XX | **v1.4.0** | NvWaX 虚拟公司闭环收尾（Sprint 2.16）：Agent 启停状态持久化（v1.3.x 启停刷新丢失 bug 修复）+ 真实 SSE 流式（替代 500ms 轮询）+ 模板市场反向发布。3 个新 Tauri 命令 + 4 列 schema 扩展 + ALTER TABLE 兜底旧库升级 + 8 个新测试 |
| 2026-XX-XX | v1.3.2 | NvWaX 虚拟公司闭环（Sprint 2.13/2.14/2.15）：8 个新 Tauri 命令 + 4 个 React 路由 + 67 个新测试 + 1 套 JSON Schema + 2 套纯函数合并引擎 + 开发者文档 |
| 2026-05-31 | v1.2 | 新增 Light 极简版、行业插件、三模式架构、25+ Agent Bundles |
| 2026-04-14 | v1.0 | 初始版本，明确项目定位 |

---

**最后更新**: 2026-05-31  
**维护者**: ProClaw Team  
**状态**: ✅ 已确认
