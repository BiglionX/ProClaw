# ProClaw 详细实施计划

**创建日期**: 2026-05-24  
**版本**: v1.0  
**基于**: PRD v4.0 + 代码实际状态分析

---

## 当前状态总结

### 已完成（无需改动）
| 模块 | 状态 | 说明 |
|------|------|------|
| 桌面端 Tauri IPC | ✅ 100% | 46个命令全部实现真实SQL操作 |
| 桌面端前端页面 | ✅ 95% | 22个页面均可通过IPC正常工作 |
| 产品管理 (HTTP API) | ✅ 100% | CRUD + SPU/SKU双模式完整 |
| 设备授权管理 | ✅ 100% | 配对码、二维码、设备列表、踢除 |
| 数据库Schema | ✅ 100% | 所有表、视图、触发器已定义 |
| E2E测试框架 | ✅ 80% | Playwright配置完成，5个测试文件 |

### 待完成（核心阻塞项）
| 模块 | 当前状态 | 阻塞影响 |
|------|---------|---------|
| HTTP API 业务层 | ~30% (大量TODO桩) | 移动端无法使用 |
| AI订单识别后端 | 60% (模拟数据) | 核心卖点无法演示 |
| WebSocket聊天 | 40% (仅连接) | 聊天功能不可用 |
| 文件上传/下载 | 0% | 图片、文件传输不可用 |
| 云备份与中继 | 20% | Pro版无法运作 |
| 移动端App | 10% (骨架) | 移动端无法实用 |
| 桌面端打包 | 0% | 无法分发 |
| CI/CD | 0% | 无自动化 |

---

## Phase 1: HTTP API 业务层补全（优先级最高，5天）

> **说明**: 桌面端通过 Tauri IPC 已经可以完整运行，但移动端依赖 HTTP API。
> 本阶段将 HTTP API 端点接入已有的 Tauri IPC 命令逻辑或重写 SQL 查询。

### 1.1 客户/供应商 API（1天）

**文件**: `src-tauri/src/api/customers.rs`, `src-tauri/src/api/suppliers.rs`

**现有代码**: 所有5个处理器返回 `"Not implemented yet"`
**数据库表**: `customers`, `suppliers` 已在 schema.sql 中定义
**已有逻辑**: `sales_commands.rs`, `purchase_commands.rs` 中有完整的 SQL 实现

**任务清单**:
- [ ] `GET /api/customers` — 实现分页查询 + name/code/contact_person 搜索
- [ ] `GET /api/customers/:id` — 实现单条查询
- [ ] `POST /api/customers` — 实现创建（自动生成 CUST-xxx code）
- [ ] `PUT /api/customers/:id` — 实现更新
- [ ] `DELETE /api/customers/:id` — 实现软删除
- [ ] `GET /api/suppliers` — 同上
- [ ] `GET /api/suppliers/:id` — 同上
- [ ] `POST /api/suppliers` — 同上（自动生成 SUP-xxx code）
- [ ] `PUT /api/suppliers/:id` — 同上
- [ ] `DELETE /api/suppliers/:id` — 同上

**测试**: 
- [ ] `e2e/customers.spec.ts` — 客户 CRUD E2E 测试
- [ ] `e2e/suppliers.spec.ts` — 供应商 CRUD E2E 测试

---

### 1.2 销售订单 API（1天）

**文件**: `src-tauri/src/api/sales_orders.rs`

**现有代码**: 全部5个处理器返回 TODO
**已有IPC逻辑**: `sales_commands.rs` 中有完整的 `create_sales_order`、`get_sales_orders`

**任务清单**:
- [ ] `GET /api/sales_orders` — 分页查询 + status/search/customer_id 筛选
- [ ] `GET /api/sales_orders/:id` — 单条查询（含订单明细）
- [ ] `POST /api/sales_orders` — 创建销售单（事务：主表 + 明细 + 自动扣库存）
- [ ] `PUT /api/sales_orders/:id` — 更新销售单
- [ ] `POST /api/sales_orders/:id/submit` — 提交销售单（状态变更 + 库存扣减 + 自动生成订单号 SO-xxx）

**测试**: `e2e/sales_orders_api.spec.ts`

---

### 1.3 采购订单 API（1天）

**文件**: `src-tauri/src/api/purchase_orders.rs`

**任务清单**:
- [ ] `GET /api/purchase_orders` — 分页查询 + supplier_id/status/search 筛选
- [ ] `GET /api/purchase_orders/:id` — 单条查询（含明细）
- [ ] `POST /api/purchase_orders` — 创建采购单（事务：主表 + 明细）
- [ ] `PUT /api/purchase_orders/:id` — 更新
- [ ] `POST /api/purchase_orders/:id/receive` — 确认入库（增加库存）
- [ ] 自动生成采购单号 PO-xxx

**测试**: `e2e/purchase_orders_api.spec.ts`

---

### 1.4 库存管理 API（0.5天）

**文件**: `src-tauri/src/api/inventory.rs`

**任务清单**:
- [ ] `GET /api/inventory` — 库存列表（product_id/type筛选、分页、低库存标记）
- [ ] `GET /api/inventory/transactions` — 交易记录查询
- [ ] `POST /api/inventory/transactions` — 创建交易记录（入/出/调拨/盘点）
- [ ] `GET /api/inventory/stats` — 库存统计（总量、低库存、零库存、库存价值）

**测试**: `e2e/inventory_api.spec.ts`

---

### 1.5 财务管理 API（0.5天）

**文件**: `src-tauri/src/api/finance.rs`

**现有代码**: 返回全零值的骨架
**已有IPC逻辑**: `finance_commands.rs` 中完整实现

**任务清单**:
- [ ] `GET /api/finance/profit-loss` — 损益表（收入 - 成本 - 费用 = 净利润）
- [ ] `GET /api/finance/cash-flow` — 现金流量表（经营流入/流出）
- [ ] `GET /api/finance/summary` — 财务摘要（月收入/支出/利润/应收/应付/库存价值）

---

## Phase 2: AI 订单识别后端（3.5天）

> **说明**: 前端 UI (`AISalesOrderPage.tsx` 18KB) 已完成，但后端返回模拟数据。
> 本阶段实现真正的 OCR + AI 识别。

### 2.1 PaddleOCR 集成（1.5天）

**文件**: `src-tauri/src/api/ai.rs`
**依赖**: 需要添加 Rust PaddleOCR 绑定或 HTTP 调用本地服务

**方案选择**:
- **方案A** (推荐): 通过 HTTP 调用 PaddleOCR 服务 (Docker 部署)，桌面端启动时自动管理
- **方案B**: Rust FFI 绑定 PaddleOCR C++ 库（复杂度高）
- **方案C**: 使用 tesseract-rs 替代（对中文支持较弱）

**任务清单**:
- [ ] 添加 PaddleOCR Docker 配置文件 (`docker-compose.ocr.yml`)
- [ ] 实现 `paddle_ocr_recognize(image_bytes)` 函数 — 调用 OCR 服务，返回文字块
- [ ] 实现图片预处理（缩放、灰度化、增强对比度）
- [ ] 处理识别结果：提取表格结构（行、列）
- [ ] 实现置信度过滤（< 0.7 标记为不确定）

---

### 2.2 GPT-4V / 云端模型集成（1天）

**文件**: `src-tauri/src/api/ai.rs`

**任务清单**:
- [ ] 添加 OpenAI/Anthropic 客户端依赖
- [ ] 实现 `cloud_ai_recognize(image_base64, api_key, model)` 函数
- [ ] 构造 Prompt：从图片中提取商品名、数量、单价的表格
- [ ] 解析 AI 返回的 JSON 为结构化数据
- [ ] 添加模型选择逻辑（本地优先 / 云端备用）
- [ ] Token 计数和记录（写入 `ai_recognition_logs`）

---

### 2.3 AI 审核校验完善（0.5天）

**文件**: `src-tauri/src/api/ai.rs` — `validate_order_items` 处理器

**任务清单**:
- [ ] 商品存在性检查 — 按 name/SKU 匹配现有商品
- [ ] 库存充足性检查 — 对比当前库存量
- [ ] 成本价校验 — 售价低于成本价时警告
- [ ] 异常价格检测 — 价格偏离历史均价 >50% 时警告
- [ ] 返回结构化的校验结果（通过/警告/错误，含建议）

---

### 2.4 订单提交流程完善（0.5天）

**文件**: `src-tauri/src/api/ai.rs` — `submit_order_draft`

**任务清单**:
- [ ] 草稿 → 正式销售单的完整事务
- [ ] 自动扣减库存
- [ ] 生成销售单号
- [ ] 触发客户通知（WebSocket 推送）
- [ ] 发送消息到客户聊天（消息表写入）

---

## Phase 3: WebSocket 聊天功能（2天）

### 3.1 消息处理引擎（1天）

**文件**: `src-tauri/src/api/websocket.rs`

**任务清单**:
- [ ] 实现 WebSocket 消息解析（JSON → enum MessageType）
- [ ] 消息路由：单聊（by user_id）、群聊（by group_id）
- [ ] 消息持久化：写入 `messages` 表
- [ ] 在线用户状态管理：HashMap<user_id, Sender>
- [ ] 消息投递：在线直接推送，离线写入 `offline_messages`
- [ ] 消息类型支持：text、image（发 file_id）、file、order_card

### 3.2 离线消息拉取（0.5天）

**文件**: `src-tauri/src/api/websocket.rs` + 新增 HTTP 端点

**任务清单**:
- [ ] `GET /api/messages/offline` — 获取未投递的离线消息
- [ ] 连接建立后自动推送离线消息
- [ ] 消息已读确认 `POST /api/messages/:id/read`
- [ ] 离线消息重试机制（失败后保留，下次重连再推送）

### 3.3 订单通知推送（0.5天）

**文件**: `src-tauri/src/api/websocket.rs`

**任务清单**:
- [ ] 订单状态变更时自动推送 `order_notification` 消息
- [ ] 支持的通知类型：`received`、`shipped`、`completed`、`cancelled`
- [ ] 消息格式含订单号 + 状态 + 描述文本 + 时间戳

---

## Phase 4: 文件上传/下载（1.5天）

### 4.1 文件存储层（0.5天）

**文件**: `src-tauri/src/api/files.rs`

**任务清单**:
- [ ] 配置文件存储路径（默认 `$APP_DATA/proclaw/files/`，可配置）
- [ ] 文件元数据存储（`files` 表：id, user_id, filename, mime_type, size, path, created_at）
- [ ] 文件命名策略（UUID + 原始扩展名）
- [ ] 文件大小限制（默认 50MB，可配置）

### 4.2 文件上传实现（0.5天）

**文件**: `src-tauri/src/api/files.rs` — `upload_file`

**任务清单**:
- [ ] 接收 multipart form-data
- [ ] 验证文件类型白名单（jpg, png, gif, webp, pdf, xlsx, docx）
- [ ] 保存文件到磁盘
- [ ] 图片文件自动生成缩略图（使用 `image` crate）
- [ ] 返回 `{ file_id, url, thumbnail_url, size }`

### 4.3 文件下载实现（0.5天）

**文件**: `src-tauri/src/api/files.rs` — `download_file`, `get_file_thumbnail`

**任务清单**:
- [ ] 文件下载（支持 Range 请求，断点续传）
- [ ] 缩略图获取（图片类型自动生成 200x200 JPEG 缩略图）
- [ ] 权限验证（token 校验、文件所有权校验）
- [ ] 下载计数和日志

---

## Phase 5: 认证中间件修复（1天）

### 5.1 JWT 认证中间件（0.5天）

**文件**: `src-tauri/src/api/mod.rs`, `src-tauri/src/api/auth.rs`

**任务清单**:
- [ ] 实现 JWT token 验证中间件 — 从 Authorization header 提取并验证
- [ ] Token 过期处理（返回 401 + 可用 refresh_token 续期）
- [ ] 用户角色权限提取（从 token claims 中获取 roles）
- [ ] 密码哈希验证完善（登录时实际校验 bcrypt）

### 5.2 权限控制（0.5天）

**文件**: `src-tauri/src/api/mod.rs`

**任务清单**:
- [ ] 定义角色权限矩阵：
  ```
  boss:     所有 API 权限
  finance:  财务 API + 报表查看
  purchase: 采购 API + 供应商管理
  warehouse: 库存 API (隐藏价格) + 入库确认
  sales:    销售 API + 客户管理 + AI识别 + 聊天
  ```
- [ ] 实现 `require_role(role)` 中间件
- [ ] 数据行级隔离（sales 只能看自己的订单）
- [ ] 价格字段过滤（warehouse 角色不返回价格）

---

## Phase 6: 移动端功能实现（5天）

### 6.1 连接管理完善（1天）

**文件**: `mobile/src/services/ConnectionManager.ts`

**任务清单**:
- [ ] 扫码解析配对 URL：`proclaw://pair?host=IP&port=8888&code=xxx`
- [ ] 自动调用 `/api/auth/device_token` 获取 token
- [ ] Token 安全存储 (expo-secure-store)
- [ ] 连接策略：直连优先 → 云中继回退 → 离线模式
- [ ] 连接状态指示器（在线/离线/中继）
- [ ] 自动重连（指数退避：1s, 2s, 4s, 8s... 最大 60s）

### 6.2 业务模块（2天）

**文件**: `mobile/src/screens/*.tsx`, `mobile/src/services/ApiService.ts`

**任务清单**:
- [ ] 完善 `ProductsScreen` — 商品列表 + 搜索 + 分类筛选 + 库存显示
- [ ] 完善 `SalesOrderScreen` — 手动创建销售单 + 客户选择 + 商品选择
- [ ] 新增 `PurchaseScreen` — 采购单创建 + 供应商选择
- [ ] 新增 `InventoryScreen` — 库存查询 + 交易记录
- [ ] 新增 `FinanceScreen` — 财务摘要 + 报表
- [ ] 完善 `ProfileScreen` — 个人信息 + 角色权限显示 + 设置
- [ ] 商品详情页（图片、SKU、价格、库存）

### 6.3 AI 订单识别界面（1天）

**文件**: 新增 `mobile/src/screens/AIOrderScreen.tsx`

**任务清单**:
- [ ] 拍照或从相册选择图片（expo-camera / expo-image-picker）
- [ ] 上传图片到桌面端 `/api/files/upload`
- [ ] 调用 `/api/ai/recognize_order`
- [ ] 展示可编辑表格（商品、数量、单价）
- [ ] 调用 `/api/ai/validate_order_items` 校验
- [ ] 确认提交 → 生成销售单 + 客户通知

### 6.4 聊天模块（1天）

**文件**: 新增 `mobile/src/screens/ChatScreen.tsx`

**任务清单**:
- [ ] WebSocket 连接管理（`/ws/chat?token=xxx`）
- [ ] 消息列表 UI（气泡样式，文本/图片/订单卡片）
- [ ] 消息发送（文本、图片、文件引用）
- [ ] 离线消息拉取（重连后加载）
- [ ] 订单通知卡片（点击跳转订单详情）
- [ ] 聊天列表（按用户/群组分组）

---

## Phase 7: 云备份与中继（Pro版，3天）

### 7.1 加密备份服务（1.5天）

**文件**: `src-tauri/src/services/cloud_backup_service.rs`

**任务清单**:
- [ ] 完成 Supabase 客户端集成
- [ ] 加密备份上传：变更数据 AES-256-GCM 加密 → `encrypted_objects` 表
- [ ] 定时备份调度（可配置间隔，默认每5分钟）
- [ ] 备份恢复：从 Supabase 拉取加密数据 → 解密 → 合并到本地
- [ ] 冲突解决策略（最后写入优先 + 手动解决界面）
- [ ] 备份状态指示（Tauri 前端展示同步状态）

### 7.2 云中继通信（1.5天）

**文件**: `src-tauri/src/services/cloud_backup_service.rs`

**任务清单**:
- [ ] Supabase Realtime WebSocket 连接（监听 relay_messages channel）
- [ ] 中继消息收发：加密 payload → `relay_messages` → 对方解密
- [ ] 直连失败后自动切换中继模式
- [ ] 中继心跳保活（每30秒）
- [ ] 中继消息确认机制（ACK）

---

## Phase 8: 测试完善（3天）

### 8.1 单元测试补充（1天）

**新增测试文件**:
- [ ] `src/test/customerService.test.ts` — 客户CRUD
- [ ] `src/test/supplierService.test.ts` — 供应商CRUD
- [ ] `src/test/aiService.test.ts` — AI识别逻辑
- [ ] `src/test/fileService.test.ts` — 文件上传
- [ ] `src/test/websocket.test.ts` — 消息处理
- [ ] `src/test/authMiddleware.test.ts` — 认证中间件

**目标**: 覆盖率从 ~40% 提升到 ≥70%

### 8.2 E2E 测试补充（1天）

**新增测试文件**:
- [ ] `e2e/ai-recognition.spec.ts` — AI识别完整流程
- [ ] `e2e/chat.spec.ts` — WebSocket聊天
- [ ] `e2e/file-upload.spec.ts` — 文件上传下载
- [ ] `e2e/device-pairing.spec.ts` — 设备配对流程
- [ ] `e2e/mobile-connection.spec.ts` — 移动端连接

### 8.3 集成测试 + CI配置（1天）

**任务清单**:
- [ ] 创建 `.github/workflows/ci.yml` — CI流水线
- [ ] 创建 `.github/workflows/e2e.yml` — E2E测试流水线
- [ ] 配置自动化测试报告生成
- [ ] 添加 pre-commit hooks（lint + typecheck）
- [ ] 创建 `docker-compose.test.yml` — 测试环境
- [ ] 性能测试基准（加载1000条产品、100条订单）

---

## Phase 9: 打包与部署（2天）

### 9.1 桌面端打包（1天）

**任务清单**:
- [ ] 配置 Tauri 打包参数 (`tauri.conf.json`)：
  - Windows: `.msi` + `.exe` 安装包
  - macOS: `.dmg` 磁盘镜像
  - Linux: `.deb` + `.AppImage`
- [ ] 应用图标和品牌资源准备
- [ ] 代码签名配置（Windows 代码签名证书 / macOS notarization）
- [ ] 自动更新配置（Tauri updater）
- [ ] 安装包测试（在不同 Windows/macOS 版本安装测试）

### 9.2 移动端打包（0.5天）

**任务清单**:
- [ ] Expo 构建配置 (`eas.json`) — Android APK/AAB + iOS IPA
- [ ] 应用图标和启动画面
- [ ] Android 签名密钥配置
- [ ] iOS 证书和 provisioning profile
- [ ] TestFlight / 内部测试分发

### 9.3 Docker/容器化部署（0.5天）

**任务清单**:
- [ ] 创建 `docker-compose.yml`：
  - 自托管 Supabase (postgres + gotrue + realtime + storage)
  - PaddleOCR 服务
  - (可选) 桌面端 headless 模式
- [ ] 创建 `Dockerfile` — 生产环境构建
- [ ] 编写部署文档 (`docs/DEPLOYMENT.md`)

---

## Phase 10: 文档与交付（1天）

### 10.1 文档编写

**任务清单**:
- [ ] `docs/API_DOCUMENTATION.md` — 补充完整 （已有基础）
- [ ] `docs/USER_GUIDE.md` — 用户手册（安装、配置、使用）
- [ ] `docs/ADMIN_GUIDE.md` — 管理员手册（部署、备份、故障排除）
- [ ] `docs/PRO_GUIDE.md` — Pro版开通指南
- [ ] `docs/DEVELOPER_GUIDE.md` — 开发者指南（环境搭建、架构说明）
- [ ] `docs/CHANGELOG.md` — 更新（已有基础，补充本次变更）

### 10.2 最终检查

**任务清单**:
- [ ] 全功能冒烟测试（按 PRD 逐项检查）
- [ ] 安全性审查（API 认证、数据加密、SQL 注入防护）
- [ ] 性能验证（1000+ 产品、10000+ 订单压力测试）
- [ ] 代码质量检查（`cargo clippy`、`npm run lint`）
- [ ] 最终 Release Notes 编写

---

## 资源与时间总结

| Phase | 内容 | 预估工时 | 前置依赖 |
|-------|------|---------|---------|
| Phase 1 | HTTP API 业务层补全 | 5天 | 无 |
| Phase 2 | AI 订单识别后端 | 3.5天 | Phase 1 |
| Phase 3 | WebSocket 聊天 | 2天 | Phase 1 |
| Phase 4 | 文件上传/下载 | 1.5天 | Phase 1 |
| Phase 5 | 认证中间件修复 | 1天 | Phase 1 |
| Phase 6 | 移动端功能实现 | 5天 | Phase 1-5 |
| Phase 7 | 云备份与中继 | 3天 | Phase 1-5 |
| Phase 8 | 测试完善 | 3天 | Phase 1-7 |
| Phase 9 | 打包与部署 | 2天 | Phase 1-8 |
| Phase 10 | 文档与交付 | 1天 | Phase 1-9 |
| **总计** | | **27 天** | |

### 可并行化

以下 Phase 可在 Phase 1 完成后并行执行：
- Phase 2 (AI) + Phase 3 (WebSocket) + Phase 4 (Files) + Phase 5 (Auth) = 可并行
- Phase 6 (Mobile) 可在 Phase 2-5 进行时同步开发前端界面
- Phase 7 (Cloud) 与 Phase 6 可并行

**如果2人并行开发，预计总工期约 15-18 天。**

### 里程碑

| 里程碑 | 完成标志 | 预计日期 |
|--------|---------|---------|
| M1: API 可用 | 移动端可通过 HTTP 访问所有业务 API | Day 5 |
| M2: AI 可演示 | 上传手写订单图片 → 识别 → 生成销售单 | Day 8.5 |
| M3: 移动端可用 | App 可完成商品浏览、销售、库存查询 | Day 16.5 |
| M4: 云服务就绪 | Pro 版备份和中继可用 | Day 19.5 |
| M5: 可发布 | 测试通过 + 安装包生成 | Day 26 |
| M6: 正式交付 | 文档完善 + 最终审查 | Day 27 |

---

## 推荐执行顺序

```
Week 1 (Day 1-5):  Phase 1 — 所有 HTTP API 补全
Week 2 (Day 6-10): Phase 2+3+4+5 — AI/WebSocket/Files/Auth 并行
Week 3 (Day 11-15): Phase 6+7 — 移动端 + 云服务 并行
Week 4 (Day 16-20): Phase 6+7 收尾 + Phase 8 开始
Week 5 (Day 21-25): Phase 8+9 — 测试 + 打包
Week 6 (Day 26-27): Phase 10 — 文档 + 最终交付
```

---

**文档维护**: 此计划应根据实际进度每周更新，记录完成情况和偏差。
