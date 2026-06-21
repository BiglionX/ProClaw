# ProClaw 商务通产品需求文档 (PRD v4.0)

## 实施状态

| 字段 | 值 |
|---|---|
| **状态标签** | 🔴 已替代 → 由 v6.0（虚拟公司版）/ v11.0（手机独立版）/ v12.0（AI Team UI）等系列承接 |
| **首次落地版本** | v0.1.0 (2026-04-13) |
| **关联发布** | 保留作为基线历史；不再迭代新需求 |
| **覆盖率** | 100%（原始需求范围已全部实现并被超越） |
| **代码入口** | 当前主要需求映射至：`src/pages/{Products,Inventory,Purchase,Sales,Finance}Page.tsx`、`mobile/src/screens/`、`cloud-store/src/` |
| **数据库依赖** | `database/complete_schema.sql`（20 张主表 + 行业插件 schema） |
| **测试覆盖** | `e2e/*.spec.ts`（22 个测试套件，96.5% 通过率） |
| **差异与遗留** | v4.0 原始定义（核心需求 + 4 平台架构）已在 v1.0.0 全面超越；产品已演进为「双模式 + 行业插件 + CEO Agent + 云商城」架构 |
| **后续动作** | 不再迭代；作为基线文档保留便于追溯 2026-05 前产品定位演进 |

### 状态变更日志

| 日期 | 状态 | 变更人/触发事件 |
|---|---|---|
| 2026-04-13 | ✅ 已实现 | v0.1.0-beta.1 发布 |
| 2026-05-23 | ✅ 已实现 | v4.0 定稿 |
| 2026-06-08 | ✅ 已实现 | v1.0.0 发布（已超越 v4.0 原始范围） |
| 2026-06-16 | 🔴 已替代 | 文档整理：添加实施状态区块，标记为「已替代」保留为历史基线 |

---

**版本**: 4.0  
**最后更新**: 2026-05-23  
**状态**: 定稿  
**适用对象**: AI 编程工具（Cursor, Copilot, Claude 工程等）、开发团队

---

## 1. 产品概述

ProClaw 是一款面向小商户的私有化部署“商务通”系统，由**桌面端（ProClaw Server）** 和**移动端 App** 组成。

### 1.1 核心价值

- **数据本地优先**：所有经营数据（商品、订单、客户、聊天记录）默认仅存储在老板电脑的 SQLite 中，不强制上云。
- **移动端直连**：App 通过局域网 IP 或 Tailscale 直接连接桌面端，实现零云依赖的基础协同。
- **AI 订单识别**：销售拍照或上传客户手写订单图片，一键 AI 识别为结构化订单表格，可编辑、校验，确认后自动进入进销存并通知客户。
- **可选云增值服务**：提供端到端加密的云备份、7天离线队列、云中继故障转移，按需付费，数据全程加密。

### 1.2 目标用户

- 小商户老板、员工（采购、销售、仓库、财务）
- 外部伙伴（客户、供应商、同行调货）

---

## 2. 版本与定价

| 版本           | AI 订单识别 | 离线队列 | 云中继 | 加密备份 | 部署方式               | 定价模式                     |
| -------------- | ----------- | -------- | ------ | -------- | ---------------------- | ---------------------------- |
| **社区版**     | ❌          | ❌       | ❌     | ❌       | 用户自托管（桌面端+App）| 免费，源码开源               |
| **Pro 云备份版** | ✅（按次消耗 token） | ✅       | ✅     | ✅       | 用户自托管桌面端 + 可选 Supabase 云 | 按 token 或存储量订阅        |
| **企业托管版**（未来） | ✅ | ✅ | ✅ | ✅ | 全托管云服务器         | 按年授权                     |

> Pro 版所有上传至云端的数据均经过 AES-256-GCM 加密，密钥仅存在于用户设备，服务商无法解密。

---

## 3. 系统架构（无 OpenIM）

### 3.1 组件图

```
桌面端 (ProClaw Server)
├── Tauri 2 + React (本地配置界面)
├── Rust 后端 (axum HTTP + WebSocket 服务)
├── SQLite (业务数据、聊天记录、文件元数据)
├── LangChain AI 模块 (本地 OCR + 可选云端模型)
├── 可选 Supabase 客户端 (加密备份、中继)
└── 设备授权管理

移动端 App (React Native)
├── 连接管理 (直连 / 云中继回退)
├── 离线队列 (SQLite 加密本地缓存)
├── 业务界面 (进销存、聊天、AI 订单识别)
└── 端到端加密模块

云端 (Supabase) - 仅 Pro 版
├── encrypted_objects 表 (加密业务数据)
├── offline_tasks 表 (任务队列)
├── relay_messages 表 (中继消息)
└── Realtime 服务 (WebSocket 中继)
```

### 3.2 通信模式

| 模式         | 触发条件                     | 数据路径                                     | 依赖             |
| ------------ | ---------------------------- | -------------------------------------------- | ---------------- |
| **直连模式** | 移动端与桌面端同一局域网或 Tailscale | 移动端 → 桌面端 IP:8888 (HTTP + WebSocket)     | 桌面端在线且可达 |
| **云中继模式** | 直连失败，双方有互联网       | 移动端 ⇄ Supabase ⇄ 桌面端 (加密 payload)      | Supabase 可用    |
| **离线模式** | 桌面端不可达（关机/断网）    | 移动端操作写入本地队列，待恢复后同步           | 移动端本地缓存   |

---

## 4. 核心业务流程：AI 识别手写图片生成订单

### 4.1 流程图

```
销售 App 收到客户图片（手写/打印订单）
       ↓
点击“AI 识别订单”按钮 → 上传图片到桌面端
       ↓
桌面端调用 AI 模型（OCR + 语义理解）提取商品行、数量、单价
       ↓
返回结构化 JSON → 移动端展示可编辑表格（商品、数量、价格）
       ↓
销售人工修正（增删行、改数量/价格）
       ↓
点击“AI 审核” → 系统自动检查：
    - 商品是否存在？若不存在，提示“是否新增商品”；
    - 库存是否充足？若不足，标红并建议可售数量；
    - 单价是否低于成本价？提醒利润率；
       ↓
销售确认 → 调用创建销售单 API（自动扣减库存、生成销售单号）
       ↓
桌面端推送消息到客户 App：“您的订单已接收，正在安排发货，订单号 XXX”
       ↓
客户可点击查看订单详情
```

### 4.2 AI 识别要求

- **支持格式**：JPG, PNG, HEIC (自动转码)
- **识别内容**：手写/打印的数字、中文商品名称、行式列表（品名、数量、单价、金额）
- **输出示例**：
  ```json
  {
    "items": [
      { "product_name": "苹果", "quantity": 10, "unit_price": 5.0 },
      { "product_name": "香蕉", "quantity": 5, "unit_price": 3.5 }
    ],
    "total_amount": 67.5,
    "confidence": 0.92
  }
  ```
- **失败处理**：置信度低于阈值（如 0.7）时提示重新拍照或手动输入。
- **模型部署**：优先本地模型（PaddleOCR + 轻量 NLP），可选云端模型（GPT-4V 需用户自备 key）。Pro 版默认提供云端 AI 代理（按 token 扣费）。

---

## 5. 功能需求

### 5.1 桌面端 (ProClaw Server)

#### 5.1.1 基础服务
- 启动时监听 `0.0.0.0:8888`，提供 HTTP API + WebSocket。
- 支持 WebSocket 连接管理（维护在线设备映射）。
- SQLite 数据库管理（通过 `rusqlite` 或 `tauri-plugin-sql`）。

#### 5.1.2 业务功能（进销存）
- **商品管理**：SKU、名称、成本价、销售价、图片、库存量。
- **采购管理**：创建采购单、采购入库。
- **销售管理**：创建销售单、销售出库（自动扣减库存）。
- **库存管理**：实时库存、盘点、调拨。
- **客户/供应商管理**：基本信息、联系人、欠款记录。
- **报表**：利润统计、应收应付、销售排行。

#### 5.1.3 用户与权限
- 内部角色：老板、财务、采购、仓库、销售（支持多角色）。
- 外部角色：客户、供应商、同行（双向身份）。
- 权限控制：基于角色的 API 访问控制 + 数据行级隔离。

#### 5.1.4 设备授权
- 生成一次性配对码（有效期 5 分钟），展示二维码（内容：`proclaw://pair?host=IP&port=8888&code=xxx`）。
- 显示本机局域网 IP 及 Tailscale IP（若检测到）。
- 管理已授权设备（列表、踢除）。

#### 5.1.5 AI 订单识别模块
- 提供 HTTP 接口 `/api/ai/recognize_order`，接收图片，返回结构化 JSON。
- 支持本地 OCR（PaddleOCR）和云端模型（OpenAI GPT-4V 等）。
- 记录 AI 识别日志（用于计费和优化）。

#### 5.1.6 文件传输
- HTTP 上传/下载接口：`/api/files/upload`、`/api/files/download/:id`。
- 自动生成图片缩略图（`/api/files/thumb/:id`）。
- 文件存储于本地磁盘（可配置路径），不在 WebSocket 中传输大文件。

#### 5.1.7 云备份与中继（Pro 版）
- 定时将本地业务数据变更加密后上传至 Supabase `encrypted_objects`。
- 建立到 Supabase Realtime 的持久连接，接收中继消息。
- 验证订阅 token，按量扣费。

### 5.2 移动端 App (React Native)

#### 5.2.1 连接管理
- 首次扫码授权，获取 token。
- 连接策略：直连优先 → 云中继回退 → 离线模式。
- 实时显示连接状态，支持手动切换。

#### 5.2.2 业务模块（按角色展示）
- **商品目录**（不同角色显示不同价格）。
- **创建销售单**：支持手动创建、AI 识别图片创建。
- **创建采购单**（采购角色）。
- **库存查询**（仓库角色隐藏价格）。
- **待审批列表**（老板/财务）。
- **客户/供应商门户**（外部角色专用）：查看订单、欠款、退货。

#### 5.2.3 AI 订单识别界面
- 拍照或从相册选择图片。
- 调用识别接口，展示可编辑表格。
- 提供“AI 审核”按钮（校验库存、价格异常）。
- 确认后生成销售单，自动通知客户。

#### 5.2.4 聊天模块（WebSocket）
- 单聊、群聊，支持文字、图片、文件（文件通过 HTTP 上传后发送消息）。
- 结构化消息卡片（如订单审批）。
- 离线消息拉取（重连后通过 HTTP API 批量获取）。

#### 5.2.5 离线工作能力（7 天，Pro 版）
- 本地加密缓存最近 7 天的业务数据。
- 离线创建订单/消息存入任务队列（最多 500 条）。
- 后台自动重试提交（每 30 秒）。
- 超过 7 天未提交的任务标记为“丢失”并提醒导出。

#### 5.2.6 推送通知（Pro 版）
- 通过 Supabase 推送或 FCM/APNs 接收新消息、订单状态通知。

### 5.3 云端服务（Supabase，仅 Pro 版）

#### 5.3.1 核心表结构

```sql
-- 加密对象表
encrypted_objects (
  id uuid primary key,
  user_id uuid not null,
  object_type text not null,
  encrypted_data text not null,
  version int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 中继任务队列
offline_tasks (
  id uuid primary key,
  target_device_id text not null,
  source_device_id text not null,
  task_type text not null,
  encrypted_payload text not null,
  status text default 'pending',
  retry_count int default 0,
  next_retry_at timestamptz,
  created_at timestamptz default now()
);

-- 实时中继消息
relay_messages (
  id bigserial primary key,
  channel text not null,
  payload jsonb not null,
  created_at timestamptz default now()
);

-- 订阅信息
subscriptions (
  id uuid primary key,
  user_id uuid not null,
  plan_name text,
  token_balance int,
  storage_bytes bigint,
  start_date timestamptz,
  end_date timestamptz,
  status text
);
```

#### 5.3.2 中继流程
1. 移动端直连失败 → 发送加密请求至 `/api/relay/send`。
2. Supabase Edge Function 存入 `relay_messages` 并触发 Realtime。
3. 桌面端订阅对应 channel，收到后解密并处理。
4. 响应通过同样方式返回移动端。

---

## 6. 数据模型（桌面端 SQLite）

### 6.1 用户与角色

```sql
users (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT UNIQUE,
  openid TEXT,
  type TEXT CHECK(type IN ('internal','external')),
  external_type TEXT CHECK(external_type IN ('customer','supplier','both')),
  created_at INTEGER
);

roles ( id INTEGER PRIMARY KEY, name TEXT UNIQUE );
user_roles ( user_id TEXT, role_id INTEGER, PRIMARY KEY (user_id, role_id) );
```

### 6.2 业务核心表

```sql
products ( id TEXT PRIMARY KEY, sku TEXT UNIQUE, name TEXT, cost_price REAL, sale_price REAL, stock INTEGER, ... );
suppliers ( id TEXT PRIMARY KEY, name TEXT, balance REAL, ... );
customers ( id TEXT PRIMARY KEY, name TEXT, sales_id TEXT, balance REAL, ... );

purchase_orders ( id TEXT PRIMARY KEY, po_no TEXT UNIQUE, supplier_id TEXT, buyer_id TEXT, total_amount REAL, status TEXT, ... );
purchase_order_items ( id TEXT, po_id TEXT, product_id TEXT, quantity REAL, price REAL );

sales_orders ( id TEXT PRIMARY KEY, so_no TEXT UNIQUE, customer_id TEXT, seller_id TEXT, total_amount REAL, status TEXT, ... );
sales_order_items ( id TEXT, so_id TEXT, product_id TEXT, quantity REAL, price REAL );

inventory_logs ( id TEXT, product_id TEXT, change_qty REAL, type TEXT, ref_id TEXT, created_at INTEGER );
```

### 6.3 聊天与消息

```sql
messages ( id TEXT, from_user TEXT, to_user TEXT, group_id TEXT, content TEXT, content_type TEXT, is_offline BOOLEAN, created_at INTEGER );
offline_messages ( id TEXT, target_user TEXT, message_id TEXT, is_sent BOOLEAN, retry_count INTEGER );
```

### 6.4 AI 订单识别

```sql
order_drafts (
  id TEXT PRIMARY KEY,
  sales_id TEXT,
  customer_id TEXT,
  items_json TEXT NOT NULL,
  original_image_url TEXT,
  ai_raw_response TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

ai_recognition_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  image_size INTEGER,
  model_name TEXT,
  confidence REAL,
  tokens_used INTEGER,
  cost REAL,
  created_at INTEGER
);
```

### 6.5 设备授权

```sql
devices (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  device_name TEXT,
  device_type TEXT,
  access_token TEXT UNIQUE,
  refresh_token TEXT,
  token_expires_at INTEGER,
  last_active_at INTEGER,
  is_revoked BOOLEAN DEFAULT 0
);
```

---

## 7. API 设计（桌面端）

### 7.1 认证与设备

| 端点                           | 方法 | 说明                                         |
| ------------------------------ | ---- | -------------------------------------------- |
| `/api/auth/device_token`       | POST | `{ "code": "pair_code" }` → 返回 token       |
| `/api/auth/refresh`            | POST | `{ "refresh_token": "..." }` → 新 token      |
| `/api/devices`                 | GET  | 获取设备列表（需 boss 角色）                  |
| `/api/devices/:id/revoke`      | POST | 踢除设备                                     |

### 7.2 业务 API（示例）

| 端点                                 | 方法 | 角色                 | 说明                                   |
| ------------------------------------ | ---- | -------------------- | -------------------------------------- |
| `/api/products`                      | GET  | 销售/采购/老板       | 支持 `?role=sales` 返回不同价格字段    |
| `/api/purchase_orders`               | POST | 采购/老板            | 创建采购单                             |
| `/api/purchase_orders/:id/receive`   | POST | 仓库                 | 确认入库，增加库存                     |
| `/api/sales_orders`                  | POST | 销售/老板            | 创建销售单（自动扣减库存）             |
| `/api/sales_orders/my`               | GET  | 销售                 | 查看自己的销售单                       |
| `/api/inventory`                     | GET  | 仓库/老板            | 库存列表（仓库角色隐藏价格字段）       |

### 7.3 AI 识别

| 端点                             | 方法 | 说明                                                         |
| -------------------------------- | ---- | ------------------------------------------------------------ |
| `/api/ai/recognize_order`        | POST | `{ "image_base64": "..." }` → 返回 `{ items, confidence, draft_id }` |
| `/api/ai/validate_order_items`   | POST | `{ "items": [...] }` → 校验库存、价格、商品存在性             |
| `/api/sales_orders/draft`        | POST | 保存草稿 → 返回 draft_id                                    |
| `/api/sales_orders/draft/:id`    | GET  | 获取草稿详情                                                 |
| `/api/sales_orders/draft/:id/submit` | POST | 确认草稿，生成正式销售单，触发客户通知                      |

### 7.4 文件传输

| 端点                      | 方法 | 说明                              |
| ------------------------- | ---- | --------------------------------- |
| `/api/files/upload`       | POST | 接收文件，返回 `{ file_id, url }`   |
| `/api/files/download/:id` | GET  | 下载文件（需 token）                |
| `/api/files/thumb/:id`    | GET  | 获取缩略图（图片自动生成）          |

### 7.5 WebSocket 消息协议

连接端点：`/ws/chat?token=<access_token>`

**客户端 → 服务端**:
```json
{
  "type": "message",
  "to": "user_id_or_group_id",
  "content": "hello",
  "content_type": "text"
}
```

**服务端 → 客户端**:
```json
{
  "type": "message",
  "from": "user_id",
  "content": "...",
  "content_type": "text",
  "timestamp": 1234567890
}
```

**订单通知** (服务端主动推送):
```json
{
  "type": "order_notification",
  "order_id": "SO20260001",
  "status": "received",
  "message": "您的订单已接收，正在安排发货"
}
```

---

## 8. 安全与隐私

- **端到端加密**：Pro 版所有上云数据使用 AES-256-GCM 加密，密钥客户端派生，永不上传。
- **传输安全**：直连模式建议配合 Tailscale 使用（自动加密），云中继使用 HTTPS/WSS。
- **本地加密**：SQLite 可选 SQLCipher 加密，移动端本地缓存同样加密。
- **数据主权**：用户可随时导出所有数据并彻底删除云端记录。

---

## 9. 实施路线图

### Phase 1: 桌面端核心（2周）
- Tauri 2 + React 初始化
- Rust axum HTTP 服务器，监听 `0.0.0.0:8888`
- SQLite 初始化及 CRUD API
- 设备授权（配对码、二维码、token）

### Phase 2: 移动端基础（2周）
- React Native 项目创建（Expo）
- 扫码连接桌面端，token 管理
- 业务 API 调用（商品列表、创建销售单）
- 本地加密存储（SQLCipher）

### Phase 3: 聊天功能（1周）
- WebSocket 长连接集成
- 消息列表 UI，收发文本
- 离线消息拉取

### Phase 4: AI 订单识别（1.5周）
- 桌面端集成 PaddleOCR + 语义解析
- `/api/ai/recognize_order` 接口实现
- 移动端拍照、识别、可编辑表格、审核校验
- 订单草稿保存与提交，客户通知推送

### Phase 5: 离线队列与云中继（1.5周）
- 移动端任务队列（Redux Saga）
- 直连失败自动切换离线/中继模式
- Supabase 集成（Edge Functions + Realtime）
- 加密备份与中继实现

### Phase 6: 完整进销存与权限（2周）
- 采购、销售、入库出库完整流程
- 权限控制中间件（Rust 层）
- 审批流程（老板审批采购单）

### Phase 7: 收费与订阅（1周）
- 订阅管理（Supabase 表 + 扣费逻辑）
- 支付集成（Stripe/Alipay 可先 mock）

### Phase 8: 测试与文档（1周）
- 单元测试、集成测试
- 用户手册（部署、Pro 版开通）
- 打包桌面端安装包（Windows/macOS）

---

## 10. 交付物

- 源代码仓库（桌面端 Rust+React、移动端 React Native、Supabase 迁移脚本）
- Docker Compose（自托管 Supabase 可选）
- 桌面端安装包（`.exe`, `.dmg`）
- 移动端 App 包（`.apk`, `.ipa` 或 TestFlight）
- 部署与用户手册
- API 文档（OpenAPI）

---

## 11. 附录：Pro 版 token 计费参考

| 消耗项                   | token 消耗               |
| ------------------------ | ------------------------ |
| 业务 API 请求（增删改查） | 1 token                  |
| 聊天消息（发送/接收）     | 1 token                  |
| WebSocket 长连接（1 小时）| 5 token（仅中继模式）    |
| 文件上传（每 1MB）        | 10 token                 |
| 离线队列任务提交/执行     | 0.5 token                |
| AI 识别图片（每次）       | 5 token（本地模型）<br>按实际消耗（云端模型） |

**套餐示例**：
- 基础版：9.9 元/月，含 1 万 token
- 专业版：39.9 元/月，含 10 万 token
- 企业版：99 元/月，含 100 万 token

超出部分按 0.003 元/token 计费（基础版）阶梯递减。

---

**文档结束**
```