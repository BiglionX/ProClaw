## 需求文档：ProClaw 外部伙伴邀请与自动关联机制（PRD v4.2）

### 1. 背景与目标

#### 1.1 背景
- ProClaw 已实现内部用户（老板、采购、销售）与外部伙伴（客户、供应商）之间的聊天与进销存协作。
- 但当前外部伙伴必须提前在系统中创建账号，且无法主动邀请未安装 ProClaw 的伙伴加入。
- 业务场景：
  1. 采购需要将新创建的采购订单分享给尚未安装 ProClaw 的供应商，希望供应商安装 App 后自动看到该订单，并建立供应商-采购联系人关系。
  2. 销售更新了产品价格，希望通知尚未安装 ProClaw 的客户，客户安装 App 后自动收到报价消息，并建立客户-销售联系人关系。

#### 1.2 目标
- 实现一键生成邀请码/二维码，外部伙伴通过扫码或链接下载 App、注册登录后，自动与邀请方建立联系人关系，并接收预设的业务消息（订单、报价等）。
- 邀请过程安全可控，支持时效性、一次性使用。
- 兼容现有网络模式（局域网直连、Tailscale、云中继）。

---

### 2. 用户故事

- **作为** 采购员，我可以在订单详情页点击“分享给供应商”，生成二维码，供应商扫码安装 ProClaw 后，自动在我的联系人列表中出现，并看到该订单。
- **作为** 销售员，我可以在商品价格调整后，选择“通知客户”，生成邀请链接发给客户，客户安装 App 后自动成为我的客户联系人，并收到价格更新消息。
- **作为** 外部供应商，我收到二维码后扫码下载 App，注册登录，立即看到与我相关的订单，且无需手动搜索添加联系人。
- **作为** 老板，我可以查看所有邀请记录，并撤销未使用的邀请。

---

### 3. 技术方案

#### 3.1 总体流程
1. **桌面端**（ProClaw Server）生成邀请码（UUID），关联邀请类型、业务对象、发起人、有效期等信息，存储于本地 SQLite。
2. **桌面端**将邀请信息编码为 URL 或二维码，格式：  
   `proclaw://invite?code=<邀请码>&host=<桌面端可访问地址>`  
   其中 `host` 为桌面端的局域网 IP 或 Tailscale IP（优先 Tailscale）。
3. **外部伙伴** 扫描二维码或点击链接：
   - 若未安装 App → 跳转至下载页面（可配置下载地址），安装后首次打开 App 时解析链接中的参数。
   - 若已安装 App → 直接唤起 App，弹出邀请确认对话框。
4. **移动端** 向桌面端 API 发送 `POST /api/invitations/accept`，携带邀请码和新用户信息（如手机号、设备ID）。
5. **桌面端** 验证邀请码（存在、未过期、未使用），创建或关联外部用户账号，建立双向联系人关系，插入系统消息（订单卡片或报价消息）。
6. **桌面端** 返回成功状态，并通过 WebSocket 推送通知双方联系人更新和消息。
7. **移动端** 刷新联系人列表和消息界面，显示新消息。

#### 3.2 网络兼容性
- 若邀请码中的 `host` 是 Tailscale IP，移动端通过 Tailscale 直连桌面端 API。
- 若双方均无法直连（例如新用户未加入 Tailscale），但用户开启了 Pro 云备份版，可通过 Supabase 中继完成邀请验证（桌面端需保持与 Supabase 的长连接）。  
  简化初期实现：要求用户在邀请前确保双方能直连（例如通过 Tailscale 或同一局域网），产品文档中明确说明。

#### 3.3 新增数据表（桌面端 SQLite）

```sql
-- 邀请码表
CREATE TABLE invitations (
  id TEXT PRIMARY KEY,
  invite_code TEXT UNIQUE NOT NULL,
  inviter_id TEXT NOT NULL REFERENCES users(id),
  target_phone TEXT,                     -- 可选，预填对方手机号，用于自动匹配
  type TEXT NOT NULL CHECK(type IN ('order_share', 'price_update')),
  business_ref_id TEXT NOT NULL,         -- 订单号或商品ID列表(JSON)
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'used', 'expired')),
  expires_at INTEGER NOT NULL,            -- Unix时间戳
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

-- 用户联系人关系表（双向）
CREATE TABLE user_contacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  contact_id TEXT NOT NULL REFERENCES users(id),
  contact_type TEXT NOT NULL CHECK(contact_type IN ('supplier', 'customer', 'colleague')),
  created_at INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(user_id, contact_id)
);
```

#### 3.4 桌面端 API 扩展

**1. 创建邀请**  
`POST /api/invitations/create`  
请求体：
```json
{
  "type": "order_share",               // 或 "price_update"
  "business_ref_id": "PO20260001",     // 订单号或商品ID列表（如"[\"P001\",\"P002\"]"）
  "target_phone": "13800138000"        // 可选，对方手机号
}
```
响应：
```json
{
  "invite_code": "abc123",
  "qr_data": "proclaw://invite?code=abc123&host=100.64.0.1:8888",
  "expires_at": 1748160000
}
```

**2. 接受邀请**  
`POST /api/invitations/accept`  
请求体：
```json
{
  "invite_code": "abc123",
  "new_user": {
    "phone": "13800138000",
    "name": "某某供应商"
  }
}
```
响应：
```json
{
  "success": true,
  "message": "邀请已接受，已建立联系人关系"
}
```
逻辑：
- 验证邀请码有效性。
- 若 `target_phone` 存在且与请求中的 `phone` 不一致，拒绝（防止冒用）。
- 根据 `inviter_id` 和 `type` 创建或更新外部用户：
  - 若 `phone` 已存在（已有用户），则直接关联。
  - 若不存在，创建新用户，`type='external'`，`external_type` 根据邀请类型设定（`order_share` → `supplier`，`price_update` → `customer`）。
- 插入双向联系人记录（`user_contacts`）。
- 根据 `type` 和 `business_ref_id` 生成系统消息：
  - 对于 `order_share`：创建一条 `messages`，`content_type='card'`，内容为订单摘要卡片。
  - 对于 `price_update`：创建一条消息，内容为“供应商更新了产品价格，点击查看”。
- 将邀请码标记为 `used`。
- 通过 WebSocket 向邀请方和被邀请方推送“联系人更新”和“新消息”事件。

#### 3.5 移动端处理

**1. 深度链接解析**  
- 在 React Native 中使用 `react-native-deep-link` 或 `Linking` 监听 `proclaw://` 协议。
- 解析出 `invite_code` 和 `host`，保存到全局状态，待用户登录/注册后使用。

**2. 注册/登录流程集成**  
- 新用户首次打开 App，在注册/登录页面完成后，自动检查是否有待处理的邀请码。
- 若有，调用 `/api/invitations/accept`，传递邀请码和用户信息。
- 成功后自动跳转到主界面，并显示新消息。

**3. 已登录用户扫码**  
- 扫描二维码后，直接调用接受邀请 API，弹出确认框：“您将接受来自 XX 的订单分享，是否继续？”
- 确认后执行绑定，并刷新界面。

#### 3.6 安全与隐私
- 邀请码使用 UUID v4，有效期默认7天。
- 每个邀请码只能使用一次，使用后立即失效。
- 邀请码不包含业务敏感信息，仅作为引用。
- 若 `target_phone` 已指定，则只有该手机号注册的用户才能接受邀请；若未指定，第一个接受邀请的用户绑定。
- 桌面端 API 需验证调用者身份（移动端通过 token），但接受邀请接口不需要预先登录（因为新用户尚无 token）。解决方案：
  - 为接受邀请接口开放临时访问，但增加防滥发机制（同一 IP 每分钟限制5次）。
  - 或者要求用户先注册获取临时 token，再调用接受接口（推荐，更安全）。

---

### 4. 界面设计要点

#### 4.1 桌面端（ProClaw 窗口）
- **订单详情页**：增加按钮“分享给供应商”，点击后弹出模态框显示二维码和分享链接。
- **商品列表/价格调整后**：增加按钮“通知客户价格更新”，弹窗中选择客户（或输入手机号），生成二维码和链接。
- **设置 → 邀请管理**：查看所有邀请记录（状态、时间、关联业务），支持撤销未使用的邀请。

#### 4.2 移动端
- **启动/登录页**：自动检测是否有待处理的邀请码，提示“您有一个待处理的邀请，是否立即接受？”
- **系统消息卡片**：订单分享消息展示订单号、总金额、状态，点击跳转到订单详情；价格更新消息点击跳转到商品列表或报价页面。
- **联系人列表**：新增的联系人自动出现在“供应商”或“客户”分组。

---

### 5. 与现有 PRD 的整合

- 新增章节 5.2.7（桌面端功能）、5.3.8（移动端功能）、6.x（数据表）、7.x（API）。
- 与现有用户体系兼容：外部用户使用手机号登录，无需密码。
- 与现有 WebSocket 推送集成：新消息和联系人变更通过现有通道实时通知。

---

### 6. 实施步骤

1. **数据库迁移**：创建 `invitations`、`user_contacts` 表。
2. **桌面端 API 开发**：
   - 实现邀请生成接口（需校验当前用户权限，仅老板、采购、销售可创建）。
   - 实现接受邀请接口（无需认证，但增加防滥用）。
   - 实现撤销邀请接口（权限同上）。
3. **桌面端 UI**：在订单详情和商品管理页增加分享按钮，展示二维码。
4. **移动端**：
   - 集成深度链接解析。
   - 注册/登录流程中添加邀请处理逻辑。
   - 实现接受邀请 API 调用。
   - 新增系统消息卡片组件。
5. **测试**：
   - 未安装用户扫码 → 下载 → 注册 → 自动显示订单。
   - 已安装用户扫码 → 确认 → 联系人+消息更新。
   - 邀请码过期/使用后失效。
   - 指定手机号与注册手机号不匹配时拒绝。

---

### 7. 附录：邀请码数据结构示例

```json
{
  "id": "inv_001",
  "invite_code": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
  "inviter_id": "user_001",
  "target_phone": "13912345678",
  "type": "order_share",
  "business_ref_id": "PO20260001",
  "status": "active",
  "expires_at": 1748160000,
  "created_at": 1747555200
}
```

---

**文档版本**：v1.0 (PRD v4.2 补充)  
**依赖模块**：已完成 PRD v4.0/v4.1 开发（桌面端自研 WebSocket、移动端基础）  
**预计开发工时**：前端3天 + 后端2天 + 测试1天

---