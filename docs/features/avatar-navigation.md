# 联系人头像跳转需求文档

**版本**: v1.0  
**日期**: 2026-06-14  
**状态**: 已实现 (commit pending)

> **本文件已整合为合并 UX 流程图**：详见 [contact-chat-profile-ux-flow.md](./contact-chat-profile-ux-flow.md)（v1.0 / 2026-06-15）。该文档包含完整的 4 阶段交互链路、跳转规则、关键交互点、数据流与边界情况。本文件保留为原始设计决策记录与代码注释参考。

## 背景

老板在 ProClaw 1.0.0 桌面版反馈两个问题：

1. **联系人-Agent 聊天状态下,点击头像,没有调整到 agent 详情**
2. **联系人-AI Team 聊天状态下,点击头像,没有跳转到 AI Team 小组列表(类似 QQ 小组)**

两个需求在原 ChatPage 中均未实现或实现错误,严重影响日常使用。

## 目标

让聊天页头部头像成为可点击的"资料入口":
- 单 Agent 联系人的头像 → 跳转到该 Agent 的**个人资料页** (技能介绍 / 能力配置 / 头像)
- AI Team 群聊的头像 → 跳转到该 AI Team 的**小组资料页** (类似 QQ 群资料)
- CEO Agent 头像保留特殊身份 → 不响应(老板总监位)
- 数据类型为"群组"的传统群聊 → 暂不响应(预留)

## 范围

### 包含
- [src/pages/ChatPage.tsx](file:///d:/BigLionX/ProClaw/src/pages/ChatPage.tsx) - 头部头像 onClick 逻辑
- [src/App.tsx](file:///d:/BigLionX/ProClaw/src/App.tsx) - 新增 `/team-profile/:teamId` 路由
- [src/pages/TeamProfilePage.tsx](file:///d:/BigLionX/ProClaw/src/pages/TeamProfilePage.tsx) - 新页面 (类似 QQ 群资料)
- [src/test/contactAvatarNavigation.test.ts](file:///d:/BigLionX/ProClaw/src/test/contactAvatarNavigation.test.ts) - 单元测试

### 不包含
- 内部联系人 (system) / 外部联系人 (客户/供应商) 的头像点击 (后续可考虑: internal 跳设置, external 跳客户/供应商详情)
- 数据类型为"群组"的传统群聊的群资料 (后续可扩展)
- 移动端 chat 页适配 (移动端 chat 由独立 chat 组件,后续单独规划)

## 详细设计

### 1. ChatPage 头部头像 onClick 规则

`handleHeadAvatarClick` 跳转规则:

| contactId 形态              | 跳转目标                      | 备注                            |
|----------------------------|----------------------------|--------------------------------|
| `ai-team-group-*` (群聊)   | `/team-profile/:teamId`     | 类似 QQ 群资料,新增页面          |
| `ceo-agent` (CEO 特殊身份)  | 不响应                       | 保留老板/总监身份特殊             |
| `ma_*` / `builtin-*` (Agent)| `/agent-profile/:agentId`   | 单 Agent 个人资料页 (已存在)     |
| 传统群组 `contact_type='group'` | 不响应                  | 预留                            |
| 内部 / 外部联系人           | `/agent-profile/:contactId` | 沿用原逻辑                       |

```typescript
// [src/pages/ChatPage.tsx#L466-L484](file:///d:/BigLionX/ProClaw/src/pages/ChatPage.tsx)
const handleHeadAvatarClick = () => {
  if (!contactId) return;
  // 1) AI Team 群聊 → 跳到 AI Team 小组详情页
  if (isGroupChat) {
    const teamId = parseTeamId(contactId);
    navigate(`/team-profile/${teamId}`);
    return;
  }
  // 2) CEO Agent 不响应
  if (isCEO) return;
  // 3) 传统群组 → 预留
  if (contact?.contact_type === 'group') return;
  // 4) 单 Agent / 内部 / 外部 → Agent 资料页
  navigate(`/agent-profile/${contactId}`);
};
```

### 2. 新增 TeamProfilePage (类似 QQ 群资料)

**路由**: `/team-profile/:teamId`

**布局**:
```
┌─────────────────────────────────────┐
│ ←  AI Team 小组详情                  │
├─────────────────────────────────────┤
│  [Icon]  小组名称                    │
│  88x88   ID: biz-ops · N 位成员     │
│          小组描述...                │
│         [打开群聊] [设置] [邀请]     │
├─────────────────────────────────────┤
│ [成员(N)] [小组描述] [快捷命令]      │
├─────────────────────────────────────┤
│  Tab0: 成员列表 (Boss + Agent 成员)  │
│  Tab1: 小组描述 (简介/典型场景/职责)  │
│  Tab2: 快捷命令 (点击复制+跳转群聊)   │
└─────────────────────────────────────┘
```

**关键交互**:
- 顶部 Banner 显示小组 icon / 名称 / ID / 成员数 / 描述
- "打开群聊" 按钮 → `navigate('/chat/' + groupId)`
- 成员列表每行: 头像 + 昵称 + 角色 + 描述
  - Boss 行: cursor: default, 不跳转
  - Agent 成员行: cursor: pointer, 点击 → `/agent-profile/:memberId`
- 小组描述 Tab: 简介 / 典型场景 (Chip 列表) / 成员职责
- 快捷命令 Tab: 4 条命令卡片,点击 → 复制 + 跳转群聊

### 3. 路由集成

[src/App.tsx](file:///d:/BigLionX/ProClaw/src/App.tsx) 新增:
```tsx
const TeamProfilePage = React.lazy(() => import('./pages/TeamProfilePage'));

<Route
  path="/team-profile/:teamId"
  element={
    <ProtectedRoute>
      <TeamProfilePage />
    </ProtectedRoute>
  }
/>
```

### 4. 视觉提示 (ToolTip)

聊天页头部 Avatar 仍保留 `Tooltip`, 根据 contact 类型变化:
- 单 Agent: "点击查看 Agent 介绍 / 能力配置"
- 群聊: "点击查看 AI Team 小组资料"
- CEO: 不显示 Tooltip (不响应)

## 数据流

```
ChatPage 头部 Avatar 点击
  ↓
handleHeadAvatarClick()
  ↓
判定 contactId 形态
  ↓
isGroupChat = isAITeamGroupId(contactId)
  ├─ true:  parseTeamId(contactId) → navigate('/team-profile/:teamId')
  │            ↓
  │         TeamProfilePage 加载,根据 :teamId 查 AI_TEAM_GROUPS[buildGroupId(teamId)]
  │         显示小组资料 + 成员列表 + 描述 + 快捷命令
  │
  └─ false: isCEO ? return : navigate('/agent-profile/:contactId')
                 ↓
              AgentProfilePage 加载 (已存在,无需修改)
```

## 测试覆盖

新增 [src/test/contactAvatarNavigation.test.ts](file:///d:/BigLionX/ProClaw/src/test/contactAvatarNavigation.test.ts) 覆盖:

1. `parseTeamId` 正确从 `ai-team-group-xxx` 提取 `teamId`
2. `parseTeamId` 对已经是 `teamId` 的输入原样返回 (向后兼容)
3. `buildGroupId` 用前缀正确拼接
4. `buildGroupId` ⇄ `parseTeamId` 互为反函数
5. `isAITeamGroupId` 只对 groupId 返回 true, 不误判 Agent ID / CEO / 团队 raw ID
6. ChatPage 跳转 URL 验证: 从 contactId 拼出 `/team-profile/:teamId`
7. 单 Agent 联系人 contactId 直接作为 `:agentId` 传给 `/agent-profile`
8. CEO Agent 特殊处理 (navigate 不应被调用)

## 验收清单

- [x] ChatPage 单 Agent 头像 → 跳转 `/agent-profile/:agentId` 显示该 Agent 资料
- [x] ChatPage AI Team 群聊头像 → 跳转 `/team-profile/:teamId` 显示小组资料
- [x] ChatPage CEO 头像 → 不响应
- [x] TeamProfilePage 包含 Banner / Tabs / 成员列表 / 描述 / 快捷命令
- [x] TeamProfilePage 成员列表 Agent 行可点 → 跳转 `/agent-profile/:memberId`
- [x] TeamProfilePage "打开群聊" 按钮可点 → 跳回 ChatPage
- [x] App.tsx 注册 `/team-profile/:teamId` 路由
- [x] TS check 0 errors
- [x] vitest 28/28 files, 362/362 tests passed (+8 new tests)

## 风险与缓解

| 风险                                | 缓解措施                                     |
|------------------------------------|--------------------------------------------|
| AI_TEAM_GROUPS 异步填充时进入页面    | TeamProfilePage 内 useEffect setInterval(1s) 轮询重试 + 加载中提示 |
| `parseTeamId` 收到非标准 ID          | 函数对非 `ai-team-group-` 前缀的输入原样返回 (向后兼容) |
| TeamProfilePage 直接 `/team-profile/biz-ops` | 支持 raw teamId 输入,内部 `buildGroupId` 归一化 |
| Lazy load TeamProfilePage 影响首屏   | 复用 React.lazy + Suspense,与已有页面一致    |

## 后续扩展

- 内部联系人 (internal) 头像 → 跳 `/ucenter` (用户中心)
- 外部联系人 (external) 头像 → 跳 `/customer/:id` / `/supplier/:id` (客户/供应商详情)
- TeamProfilePage 增加"小组活动" Tab (近期任务 / 决策日志)
- TeamProfilePage 增加"小组管理" 入口 (编辑成员 / 配置系统提示词)

---

## 相关文档

- **[contact-chat-profile-ux-flow.md](./contact-chat-profile-ux-flow.md)** — 合并 UX 流程图（v1.0 / 2026-06-15），包含 4 阶段完整交互链路、关键交互点表格、数据流与错误处理
- [AgentProfilePage.tsx](../src/pages/AgentProfilePage.tsx#L1-L15) — Agent 详情页顶部 UX 流程注释（设计要求原文）
- [ChatPage.tsx](../src/pages/ChatPage.tsx#L466-L484) — 聊天头部头像点击处理函数 `handleHeadAvatarClick`
- [contactAvatarNavigation.test.ts](../src/test/contactAvatarNavigation.test.ts) — 单元测试（8 个 case）
