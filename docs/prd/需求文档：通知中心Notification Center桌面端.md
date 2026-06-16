# 需求文档：通知中心（桌面端 Notification Center）

## 实施状态

| 字段 | 值 |
|---|---|
| **状态标签** | ✅ 已实现 v1.0+ (2026-06-08) |
| **首次落地版本** | v1.0.0 (2026-06-08) |
| **关联发布** | [RELEASE_NOTES_v1.0.0.md](../../RELEASE_NOTES_v1.0.0.md) §"双模式架构" / "AI 经营团队增强"（通知系统融入） |
| **覆盖率** | ~90%（实时通知/未读管理/抽屉式面板已上线；与 AI 智能提醒的深度联动部分完成） |
| **代码入口** | `src/pages/notifications/`、`src/components/Layout/TopBar.tsx`（铃铛入口）、`src-tauri/src/commands/notification.rs`、`src-tauri/src/api/websocket.rs` |
| **数据库依赖** | `database/complete_schema.sql`（notifications 表） |
| **测试覆盖** | `e2e/dashboard.spec.ts`（含 TopBar 通知铃铛交互） |
| **差异与遗留** | 通知中心主功能已上线；与 AI Agent 主动报告的深度联动持续优化中 |
| **后续动作** | 维持现状；按市场反馈增强通知策略 |

### 状态变更日志

| 日期 | 状态 | 变更人/触发事件 |
|---|---|---|
| 2026-06-08 | ✅ 已实现 v1.0+ | v1.0.0 发布，通知中心上线 |
| 2026-06-16 | ✅ 已实现 v1.0+ | 文档整理：添加实施状态区块 |

---

> **版本**：v1.0
> **日期**：2026-06-06
> **关联**：Tauri WebSocket 后端、TopBar 铃铛占位符
> **目标**：将当前静态铃铛占位符升级为完整的通知中心系统，支持实时消息推送、通知持久化、未读管理、抽屉式通知面板

---

## 一、背景与现状分析

### 1.1 当前状态

| 项目 | 状态 | 描述 |
|------|------|------|
| 铃铛按钮 | 🟡 占位符 | `TopBar.tsx` 第 200-239 行：显示铃铛 emoji + 硬编码的红色徽章 "3"，无 `onClick` 交互 |
| 通知面板 | 🔴 不存在 | 点击铃铛无任何反应 |
| 状态管理 | 🔴 不存在 | 无 `notificationStore`，未读数无法动态更新 |
| 后端推送 | 🟢 已就绪 | `websocket.rs` 有完整 `WebSocketManager`，支持 `send_to_user` 按用户推送 |
| 通知数据源 | 🟡 部分就绪 | 邀请被接受（`invitations.rs`）等场景已经推送 WebSocket 消息，但前端未消费 |

### 1.2 核心问题

1. **硬编码假数据**：徽章显示 "3" 是写死的，与真实未读数无关
2. **无交互入口**：用户无法查看通知内容、标记已读、执行通知关联操作
3. **浪费后端能力**：后端 WebSocket 架构已具备推送能力，但前端没有消费端
4. **缺少统一管理**：通知（邀请、任务完成、预警等）散落在各个模块，没有统一汇聚入口

### 1.3 定位

> **通知中心是 ProClaw 的「全局消息枢纽」**，汇聚系统通知、任务完成提醒、员工邀请状态变更、库存预警、AI Agent 工作结果等所有需要告知 Boss 的信息，提供统一的未读管理和跳转执行能力。

---

## 二、功能设计

### 2.1 架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                        通知中心系统架构                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  数据层                                                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ useNotificationStore (Zustand)                           │  │
│  │  - notifications: NotificationItem[]                     │  │
│  │  - unreadCount: number                                   │  │
│  │  - panelOpen: boolean                                    │  │
│  │  + addNotification() / markRead() / markAllRead()        │  │
│  │  + fetchNotifications() / clearAll()                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                      │
│  接入层                     │                                      │
│  ┌────────────────────┐    │    ┌───────────────────────────┐   │
│  │ Tauri WebSocket    │────┼────│ REST API (兜底轮询)       │   │
│  │ 实时推送消费端      │    │    │ GET /notifications        │   │
│  │                    │    │    │ POST /notifications/read   │   │
│  └────────────────────┘    │    └───────────────────────────┘   │
│                            │                                      │
│  表现层                     │                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ NotificationPanel (MUI Drawer, 右侧面版)                   │  │
│  │  - 通知列表 + 分组（今天/昨天/更早）                        │  │
│  │  - 未读标记 + 批量已读 + 全部已读                          │  │
│  │  - 通知类型图标 + 跳转链接                                 │  │
│  │  - 空状态 / 加载态 / 错误态                                │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 通知数据类型

```typescript
interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  /** 关联跳转路径（如 /teams, /inventory 等） */
  actionPath?: string;
  /** 关联对象 ID */
  refId?: string;
  isRead: boolean;
  createdAt: number; // 时间戳，毫秒
  /** 通知来源（system / ai_agent / invitation / inventory 等） */
  source: string;
}

type NotificationType =
  | 'invitation_accepted'    // 员工邀请被接受
  | 'task_completed'         // AI 任务完成
  | 'task_failed'            // AI 任务失败
  | 'low_stock'              // 库存预警
  | 'system'                 // 系统通知
  | 'finance'                // 财务提醒
  | 'agent_message'          // AI Agent 消息
  | 'order_status';          // 订单状态变更
```

### 2.3 useNotificationStore

**文件**：`src/lib/notificationStore.ts`（新增）

**模式**：使用 Zustand，与 `authStore` 一致

**状态**：
```typescript
interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  panelOpen: boolean;
  isLoading: boolean;

  // Actions
  addNotification: (item: NotificationItem) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  fetchNotifications: () => Promise<void>;
  /** 模拟推送（供前端演示/测试用） */
  pushMockNotification: (type?: NotificationType) => void;
}
```

**关键逻辑**：
- `unreadCount` 由 `notifications.filter(n => !n.isRead).length` 计算得出
- `markAllAsRead` 遍历标记所有通知为已读
- `addNotification` 插入到列表头部 + 弹出提示
- `fetchNotifications` 从 Tauri 后端请求历史通知（兜底轮询）

### 2.4 NotificationPanel 抽屉面板

**文件**：`src/components/Layout/NotificationPanel.tsx`（新增）

**布局**：

```
┌──────────────────────────────┐
│  🔔 通知中心           [✕]   │
│  ───────────────────────────── │
│  [全部已读] [清空]            │  ← 操作栏
│  ───────────────────────────── │
│                               │
│  ▼ 今天（5）                   │  ← 时间分组标题
│  ┌──────────────────────────┐ │
│  │ 🟢 完成 │ 小如已生成小红书  │ │  ← 通知条目
│  │  文案...                  │ │
│  │  2 分钟前                 │ │
│  └──────────────────────────┘ │
│  ┌──────────────────────────┐ │
│  │ 🔴 失败 │ 库存分析任务执  │ │  ← 未读（红点 + 高亮底色）
│  │  行异常                   │ │
│  │  15 分钟前                │ │
│  └──────────────────────────┘ │
│                               │
│  ▼ 昨天（2）                   │
│  ┌──────────────────────────┐ │
│  │ 💬 Agent │ CEO 已完成日  │ │
│  │  报生成                   │ │
│  │  昨天 14:30               │ │
│  └──────────────────────────┘ │
│                               │
│  ┌──────────────────────────┐ │
│  │ 📦 库存 │ 5 个商品库存低  │ │
│  │  于安全线                 │ │
│  │  昨天 09:00               │ │
│  └──────────────────────────┘ │
│                               │
│  ┌──────────────────────────┐ │
│  │    没有更多通知了          │ │  ← 底部提示
│  └──────────────────────────┘ │
└──────────────────────────────┘
```

**交互行为**：
| 操作 | 触发 | 行为 |
|------|------|------|
| 打开面板 | 点击铃铛 / 快捷键 | 从右侧滑入 Drawer，标记当前可见通知为"已读" |
| 关闭面板 | 点击 ✕ / 点击遮罩层 / Esc | Drawer 滑出消失 |
| 标记已读 | 点击通知条目 | 单个标记 `markAsRead(id)`，更新未读数 |
| 全部已读 | 点击操作栏「全部已读」 | 批量 `markAllAsRead()` |
| 跳转关联页 | 点击有 `actionPath` 的通知 | 执行 `navigate(actionPath)` + 关闭面板 |
| 清空列表 | 点击「清空」 | `clearAll()`（确认弹窗） |

**样式规范**：
- Drawer 宽度：380px
- Drawer 顶部：与 TopBar 对齐（`top: 64px`，`height: calc(100vh - 64px)`）
- 通知条目：`p: 1.5`，未读条目加左侧 3px 红色竖线 + 浅红底色
- 类型图标：32x32 圆形容器，背景色区分类型
- 时间格式：同 AITaskTable 的 `timeAgo()` 工具函数

### 2.5 TopBar 铃铛改造

**文件**：`src/components/Layout/TopBar.tsx`（修改）

**变更清单**：

1. 导入 `useNotificationStore`
2. 为铃铛 `IconButton` 添加 `onClick: () => togglePanel()`
3. 硬编码的 `3` 替换为 `unreadCount`
4. 未读 > 99 时显示 `99+`
5. 添加 `NotificationPanel` 组件到 TopBar 或 AppLayout

```typescript
// 当前（第 237 行）：
<Box>3</Box>

// 改造后：
<Box>{unreadCount > 99 ? '99+' : unreadCount}</Box>
```

### 2.6 数据接入策略

#### 短期方案：模拟数据（Phase 1 独立可用）

- `useNotificationStore.pushMockNotification()` 生成演示通知
- 每 30 秒自动模拟一条通知（仅在演示模式/无后端时启用）
- 首次加载生成 8-10 条历史模拟通知

#### 长期方案：Tauri WebSocket 实时推送（Phase 2）

- 建立 Tauri WebSocket 连接（在 `AppLayout` 或 `notificationStore` 初始化）
- 后端推送格式与 `NotificationItem` 对齐
- 连接断开时自动降级为轮询（GET `/api/notifications`）

```
// WebSocket 消息格式
{
  "type": "notification",
  "payload": {
    "id": "notif_xxx",
    "notification_type": "task_completed",
    "title": "任务完成",
    "message": "小红书文案生成已完成",
    "action_path": "/teams",
    "ref_id": "task_xxx",
    "created_at": 1717660800000,
    "source": "ai_agent"
  }
}
```

---

## 三、文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/lib/notificationStore.ts` | **新增** | Zustand 状态管理 |
| `src/components/Layout/NotificationPanel.tsx` | **新增** | 抽屉式通知面板组件 |
| `src/components/Layout/TopBar.tsx` | 修改 | 铃铛接入 `unreadCount` + `onClick` + 添加 `NotificationPanel` |
| `src/components/Layout/AppLayout.tsx` | 修改 | 可选：在此处添加 NotificationPanel（而非 TopBar） |

---

## 四、实施计划

| 阶段 | 任务 | 预计工作量 |
|------|------|-----------|
| **Phase 1** | 创建 `notificationStore.ts`（Zustand + 模拟数据） | 0.5 天 |
| **Phase 2** | 创建 `NotificationPanel.tsx` 抽屉面板 | 1 天 |
| **Phase 3** | 改造 `TopBar.tsx` 铃铛交互 + 集成面板 | 0.5 天 |
| **Phase 4** | 接入 Tauri WebSocket 实时推送（可选） | 1 天 |
| **Phase 5** | 样式对齐 + 空状态 + 动效 | 0.5 天 |
| **Phase 6** | 联调测试 | 0.5 天 |

**总计**：约 4 人天（含 Tauri 后端对接）

---

## 五、验收标准

### 5.1 功能验收

- [ ] 铃铛按钮显示真实未读数（非硬编码）
- [ ] 点击铃铛弹出右侧 Drawer 通知面板
- [ ] 通知列表按时间分组（今天/昨天/更早）
- [ ] 未读通知有视觉标记（红点 + 左侧竖线）
- [ ] 点击通知条目标记已读，未读数实时更新
- [ ] 「全部已读」按钮批量处理
- [ ] 「清空」按钮清空列表（需确认）
- [ ] 通知条目有 `actionPath` 时可跳转到关联页面
- [ ] 无通知时显示空状态
- [ ] 面板关闭后重新打开，未读数减少

### 5.2 UI/UX 验收

- [ ] Drawer 与 TopBar 顶部对齐，不覆盖顶栏
- [ ] 通知条目的类型图标色彩统一（红色=失败/预警，绿色=完成，蓝色=信息）
- [ ] 通知面板有平滑滑入/滑出动画
- [ ] 未读 > 99 显示 `99+`
- [ ] 通知列表过长时可滚动

### 5.3 后端对接验收（Phase 2）

- [ ] WebSocket 推送通知后前端即时显示
- [ ] 连接断开自动降级轮询
- [ ] 通知持久化，刷新页面后历史通知不丢失

---

## 六、扩展考虑（非本期）

| 方向 | 说明 |
|------|------|
| **通知类型扩展** | 接入更多业务场景：订单状态、对账提醒、版本更新等 |
| **通知偏好设置** | 用户可配置哪些类型的通知需要推送 |
| **桌面通知** | 使用浏览器/系统 Notification API 弹出桌面通知 |
| **通知音效** | 收到重要通知时播放提示音 |
| **通知归档** | 已读通知自动归档，可查看历史记录 |
