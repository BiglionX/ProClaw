# ProClaw Pro 版开通与配置指南

> **版本**: v1.0.0-beta.2 | **最后更新**: 2026-05-24

---

## 概述

ProClaw Pro 版在社区版基础上提供了以下增值功能：

- **AI 订单识别**：拍照识别手写/打印订单，自动生成结构化数据
- **端到端加密云备份**：数据 AES-256-GCM 加密后同步至 Supabase
- **离线队列**：7 天离线数据缓存，恢复后自动同步（最多 500 条）
- **云中继故障转移**：直连失败时通过 Supabase Realtime 中继通信
- **推送通知**：实时接收订单状态、消息通知

---

## 1. Supabase 项目配置

### 1.1 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com) 注册/登录
2. 点击「New Project」
3. 填写项目名称（如 `proclaw-pro`）
4. 设置数据库密码（妥善保管）
5. 选择区域（建议选择离用户最近的区域）
6. 等待项目初始化完成（约 2 分钟）

### 1.2 获取凭证

1. 进入项目 Dashboard
2. 左侧菜单 → Settings → API
3. 复制以下信息：
   - **Project URL**：`https://xxxxx.supabase.co`
   - **anon public key**：用于客户端连接
   - **service_role key**：服务端密钥（⚠️ 不要泄露）

### 1.3 运行数据库迁移

```bash
# 在 Supabase SQL Editor 中执行以下脚本

# 1. 加密对象表
CREATE TABLE IF NOT EXISTS encrypted_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  object_type TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_encrypted_objects_user ON encrypted_objects(user_id);

# 2. 离线任务队列
CREATE TABLE IF NOT EXISTS offline_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_device_id TEXT NOT NULL,
  source_device_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  encrypted_payload TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  retry_count INT DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offline_tasks_target ON offline_tasks(target_device_id, status);
CREATE INDEX idx_offline_tasks_next_retry ON offline_tasks(next_retry_at) WHERE status = 'pending';

# 3. 中继消息表
CREATE TABLE IF NOT EXISTS relay_messages (
  id BIGSERIAL PRIMARY KEY,
  channel TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_relay_messages_channel ON relay_messages(channel, created_at);

# 4. 订阅信息表
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_name TEXT,
  token_balance INT DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active'
);

# 5. Realtime 配置
ALTER PUBLICATION supabase_realtime ADD TABLE relay_messages;
```

### 1.4 启用 Realtime

1. Supabase Dashboard → Database → Replication
2. 确保 `relay_messages` 表已启用 Realtime

---

## 2. ProClaw 桌面端配置

### 2.1 基础配置

1. 打开 ProClaw 桌面端
2. 进入「设置」→「Pro 版配置」
3. 填入 Supabase 信息：
   - Supabase URL
   - Supabase Anon Key
4. 点击「测试连接」
5. 连接成功后保存配置

### 2.2 加密密钥管理

ProClaw 使用 AES-256-GCM 端到端加密：

```bash
# 密钥派生流程
用户密码 + 随机 Salt
    ↓ PBKDF2 (100,000 iterations)
    ↓ SHA-256
AES-256 密钥 (32 bytes)

# 加密流程
明文数据 → AES-256-GCM 加密 → Base64 编码 → 上传至 Supabase
```

**重要提示**：
- 密钥永远不会上传到云端
- 丢失密码将导致无法解密云端数据
- 建议安全备份密码或使用密码管理器

### 2.3 同步设置

1. 进入「设置」→「数据同步」
2. 配置选项：
   - 自动备份频率：每日 / 每周
   - 离线队列大小：默认 500 条
   - 重试间隔：默认 30 秒
3. 点击「手动同步」测试

---

## 3. AI 模型配置

### 3.1 本地模型（免费）

ProClaw 社区版支持本地 PaddleOCR：

```bash
# 安装 PaddleOCR（桌面端自动检测）
pip install paddleocr paddlepaddle
```

### 3.2 云端模型（需要 API Key）

**OpenAI GPT-4V**：
1. 注册 [OpenAI](https://platform.openai.com)
2. 获取 API Key
3. 在 ProClaw → AI 配置 → 添加 OpenAI 提供商
4. 填入 API Key → 测试连接

**阿里云通义千问**：
1. 注册 [阿里云百炼](https://bailian.console.aliyun.com)
2. 获取 API Key
3. 在 ProClaw 中添加阿里云提供商

**智谱清言 GLM-4**：
1. 注册 [智谱开放平台](https://open.bigmodel.cn)
2. 获取 API Key
3. 在 ProClaw 中添加智谱提供商

### 3.3 任务-模型映射

可在 AI 配置中为不同任务指定不同模型：

| 任务 | 推荐模型 | 说明 |
|------|----------|------|
| 订单识别 | GPT-4V / Qwen-VL | 需要视觉理解能力 |
| 销售预测 | GPT-4 / GLM-4 | 需要数值推理 |
| 库存优化 | 本地模型 | 简单计算任务 |
| 异常检测 | GPT-4 | 需要复杂逻辑 |
| 采购建议 | GPT-4 / Qwen-Turbo | 权衡价格和趋势 |

---

## 4. Token 计费说明

### 4.1 Token 消耗标准

| 操作 | Token 消耗 |
|------|------------|
| 业务 API 请求（增删改查） | 1 token |
| 聊天消息（发送/接收） | 1 token |
| WebSocket 长连接（1小时，仅中继） | 5 token |
| 文件上传（每 1MB） | 10 token |
| 离线队列任务提交/执行 | 0.5 token |
| AI 识别图片（本地模型） | 5 token |
| AI 识别图片（云端模型） | 按 API 实际消耗 |

### 4.2 套餐选择建议

| 用户规模 | 推荐套餐 | 月费 |
|----------|----------|------|
| 个人商户（< 100 订单/月） | 基础版 | ¥9.9 |
| 小型团队（< 1000 订单/月） | 专业版 | ¥39.9 |
| 中型企业（> 1000 订单/月） | 企业版 | ¥99 |

### 4.3 用量查看

1. 桌面端 → 设置 → 订阅管理
2. 查看当前用量：已用 / 剩余 token
3. 查看使用明细
4. 设置用量预警阈值

---

## 5. 常见问题

**Q: Pro 版到期后会怎样？**  
A: Pro 功能将被暂停，但本地数据不受影响。续费后自动恢复。

**Q: 可以随时降级到社区版吗？**  
A: 可以。Pro 功能停止后，本地数据继续可用，云端数据可下载。

**Q: 数据安全吗？**  
A: 所有上云数据均经过 AES-256-GCM 加密，密钥仅在您的设备上，服务商无法解密。

**Q: 支持多设备吗？**  
A: 基础版支持 3 台设备，专业版支持 10 台，企业版不限。

---

## 6. 技术支持

- 文档中心：https://docs.proclaw.cc
- GitHub Issues：https://github.com/proclaw/ProClaw/issues
- 邮件支持：support@proclaw.cc
