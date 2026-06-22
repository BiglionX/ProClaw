## 需求文档：ProClaw 云托管商城（AI 生成独立站）PRD v5.0

## 实施状态

| 字段 | 值 |
|---|---|
| **状态标签** | ✅ 已实现 v1.0+ (2026-06-08) |
| **首次落地版本** | v1.0.0 (2026-06-08) |
| **关联发布** | [RELEASE_NOTES_v1.0.0.md](../../../RELEASE_NOTES_v1.0.0.md) §"云托管商城增强 - AI 生成独立电商站点（Next.js 16 + React 19）" |
| **覆盖率** | 100%（路径模式商城/商品同步/订单/优惠券/多套餐已上线；演示账号预置 proclaw.cc/shop/demo） |
| **代码入口** | `cloud-store/`（Next.js 16 项目）、`src/pages/CloudStorePages/`（桌面端管理后台 9 子页）、`src/pages/CloudStorePage.tsx` |
| **数据库依赖** | `database/complete_schema.sql`（merchants/products_snapshot/orders/store_config/sync_logs） |
| **测试覆盖** | `e2e/cloud-store-creation.spec.ts`、`e2e/cloud-store-flow.spec.ts` |
| **差异与遗留** | AI 生成独立站已上线；演示账号预置 1 个商城（proclaw.cc/shop/demo）含 8 管理 Tab |
| **后续动作** | 维持现状；按市场反馈扩展多端适配 |

### 状态变更日志

| 日期 | 状态 | 变更人/触发事件 |
|---|---|---|
| 2026-06-08 | ✅ 已实现 v1.0+ | v1.0.0 发布，云托管商城上线 |
| 2026-06-22 | ✅ 已实现 v1.0+ | 统一商城 URL 为 proclaw.cc/shop/{商店名} |

---

### 1. 背景与目标

#### 1.1 背景
- ProClaw 桌面端已为小商户提供完整的进销存管理能力（商品、订单、客户、库存）。
- 许多商户希望拥有自己的在线商城，以便客户直接浏览商品、自助下单，减少沟通成本，提升订单效率。
- 商户不具备建站技术，也不愿投入高昂的定制开发费用。
- 现有第三方平台（如微信小程序）受限较多，且无法与 ProClaw 进销存深度打通。

#### 1.2 目标
- 提供 **云托管商城** 服务：基于商户已有的商品库，通过 AI 自动生成商城网站，标准访问地址为 `https://proclaw.cc/shop/{商店名}`，支持自定义域名。
- 支持 **两种部署模式**：
  - **共享平台模式**：商户使用平台分配的路径商城（`proclaw.cc/shop/{商店名}`），无需自己配置服务器
  - **独立部署模式**：商户使用自己的域名和服务器，完全独立的商城实例
- 商城功能：商品展示、分类、搜索、购物车、在线支付（微信/支付宝）、订单管理（客户侧）。
- 订单自动同步回商户的 ProClaw 桌面端进销存系统（库存扣减、销售单生成）。
- 商户可在 ProClaw 桌面端一键开通、配置、同步商品，并自定义商城外观。
- 按需收费（订阅制 + 交易抽成或固定月费）。

---

### 2. 用户故事

- **作为** 小商户老板，我希望在 ProClaw 桌面端点击“开通云商城”，设定商店名，系统自动为我生成一个漂亮的在线商城，并分配专属地址 `proclaw.cc/shop/myshop`。我可以在后台调整主题、上传 logo、设置支付账号。客户访问即可下单，订单自动进入我的进销存系统。
- **作为** 客户，我访问商户的商城，浏览商品、加入购物车、使用微信支付完成订单，并收到订单确认通知。
- **作为** 商户员工（销售/客服），我在 ProClaw 桌面端可以实时看到来自商城的订单，并处理发货。

---

### 3. 技术架构

#### 3.1 整体架构图

**模式一：共享平台模式（推荐入门商户）**

```
┌─────────────────────────────────────────────────────────────┐
│                    ProClaw 桌面端 (商户本地)                  │
│  - SQLite 商品库、订单库                                     │
│  - 同步模块：加密推送商品数据到云端                           │
│  - 接收云端订单回调，生成销售单，扣减库存                     │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               ProClaw 云托管平台 (共享实例)                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  多租户路由层 (根据路径分发请求)                         ││
│  │  - 标准: 路径路由 (proclaw.cc/shop/{store})            ││
│  │  - 兼容: 旧路径 /{store} → 302 到 /shop/{store}        ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │  多租户数据库 (PostgreSQL Schema per Tenant)            ││
│  │  - 每个商户独立 Schema                                  ││
│  │  - 统一管理，物理隔离                                    ││
│  └─────────────────────────────────────────────────────────┘│
│  - AI 生成模块：根据商品数据生成主题、布局、颜色               │
│  - 支付网关对接 (微信支付/支付宝)                              │
│  - 订单回调 API                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   客户浏览器   │
                    │ 访问商城下单   │
                    └───────────────┘
```

**模式二：独立部署模式（适合中大型商户）**

```
┌─────────────────────────────────────────────────────────────┐
│                    ProClaw 桌面端 (商户本地)                  │
│  - SQLite 商品库、订单库                                     │
│  - 同步模块：加密推送商品数据到商户独立服务器                   │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS API (商户独立服务器)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               商户独立云服务器 (自备)                         │
│  - 独立部署的 Next.js 应用                                   │
│  - 独立 PostgreSQL 数据库                                    │
│  - 独立域名 (如 shop.merchant.com)                          │
│  - SSL 证书 (自配置或 Let's Encrypt 自动)                    │
│  - 本地 AI 生成模块（可选，本地调用）                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   客户浏览器   │
                    │ 访问商城下单   │
                    └───────────────┘
```

#### 3.2 组件说明

| 组件               | 技术选型                                      | 说明                                                         |
| ------------------ | --------------------------------------------- | ------------------------------------------------------------ |
| **商城前端**       | Next.js + Tailwind CSS + Shadcn/ui            | 静态生成 + 服务端渲染，SEO 友好，响应式设计                   |
| **商城后端**       | Next.js API Routes + Prisma                   | 处理商品查询、购物车、订单、支付回调                          |
| **数据库**         | PostgreSQL (Supabase 或 自托管)                | 商户配置、商品快照、订单、客户信息（加密存储）                |
| **对象存储**       | AWS S3 / 腾讯云 OSS                           | 存储商品图片、商户 logo、banner                              |
| **AI 生成**        | DeepSeek + 固定模板                       | 根据商品分类、价格区间、商户行业生成主题色、布局建议          |
| **同步协议**       | HTTPS + 商户 API 密钥                         | 桌面端主动推送商品增量，云端接收后更新商城                    |
| **域名管理**       | Cloudflare / 腾讯云 DNS API                   | 自动配置子域名 CNAME，支持自定义域名                          |
| **独立部署**       | Docker / 手动部署脚本                         | 提供 Docker Compose 一键部署，支持自备服务器                   |

#### 3.2.1 共享平台模式 - 多租户路由实现

**方案 A：子域名路由（推荐）**

```
请求: store123.proclaw.cc
  ↓
Vercel/Nginx 读取 Host 头
  ↓
extract subdomain: store123
  ↓
查询数据库: SELECT tenant_id FROM tenants WHERE subdomain = 'store123'
  ↓
设置 X-Tenant-ID 请求头，路由到对应 Schema
```

**中间件实现示例（Next.js）：**
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const subdomain = hostname.split('.')[0]
  
  // 跳过主域名
  if (subdomain === 'www' || subdomain === 'proclaw') {
    return NextResponse.next()
  }
  
  // 将租户 ID 传递给后续请求
  const response = NextResponse.next()
  response.headers.set('x-tenant-subdomain', subdomain)
  return response
}
```

#### 3.2.2 独立部署模式 - Docker 部署配置

**Dockerfile：**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

**docker-compose.yml：**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/shop
      - NEXTAUTH_SECRET=your-secret
      - AI_UPSTREAM_KEY=sk-xxx
    depends_on:
      - db
      - redis
  db:
    image: postgres:15-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=shop
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
volumes:
  pgdata:
  redisdata:
```

#### 3.3 数据同步设计

- **初始同步**：商户在桌面端选择要上架的商品（可全选或勾选），点击“发布到云商城”。桌面端将所有商品数据（名称、价格、图片、库存、分类）打包加密，通过 HTTPS 发送到云端 API。
- **增量同步**：当商品信息变更（价格、库存、上下架状态）时，桌面端自动或手动触发增量同步，仅发送变更字段。
- **订单回调**：云端生成订单后，调用商户配置的回调 URL（直连桌面端或通过云中继），携带订单数据。桌面端验证签名后，自动创建销售单并扣减本地库存。
- **冲突处理**：若本地库存不足，云端订单状态标记为“待确认”，并推送通知商户人工处理。

#### 3.4 安全与隐私

- 商品数据在传输中使用 TLS 加密，云端数据库存储时对敏感字段（如商户支付密钥）加密。
- 每个商户拥有独立的 API Key，用于桌面端与云端通信的签名验证。
- 客户订单中的手机号、地址等个人信息仅在云端存储，商户可通过桌面端查看，但云端不主动外泄。
- 商户可随时关闭云商城，云端数据保留30天后自动删除。

---

### 4. 功能需求

#### 4.1 商户端（ProClaw 桌面端新增功能）

| 模块             | 功能                                                         |
| ---------------- | ------------------------------------------------------------ |
| **云商城开通**   | - 按钮"开通云商城"，引导商户选择套餐、支付（对接支付网关）。<br>- 开通后自动生成子域名（如 `storeid.proclaw.cc`）。<br>- 显示 API Key 和回调配置。<br>- **商户管理**：在 ProClaw 后台可直接管理云商城（开关、配置、查看状态）。 |
| **云商城扫码登录** | - 云商城提供扫码登录入口。<br>- 商户在 ProClaw 后台打开"管理云商城"，点击"扫码登录"生成二维码。<br>- 云商城扫描后自动识别管理员身份并登录。<br>- 支持在云商城端直接管理商城配置。 |
| **商品同步管理** | - 商品列表增加“上架到云商城”开关，支持批量操作。<br>- 显示同步状态（已同步/待同步/同步失败）。<br>- 手动触发全量/增量同步。 |
| **商城外观配置** | - 主题风格：AI 推荐 + 手动调整（主题色、字体、布局）。<br>- 上传 logo、banner、联系方式。<br>- 首页轮播图管理。 |
| **订单管理**     | - 新增“云订单”标签页，展示来自商城的订单。<br>- 支持订单确认、发货、取消，状态同步回云端（客户可见）。<br>- 订单自动生成销售单并扣减库存，异常时提示。 |
| **支付配置**     | - 配置微信支付/支付宝商户号、密钥。<br>- 支持测试模式（沙箱）。 |
| **域名设置**     | - 显示默认子域名，支持绑定自定义域名（需商户自行解析 CNAME）。<br>- 自动申请 SSL 证书（Let's Encrypt）。<br>- **独立部署模式**：显示部署脚本和配置指南，支持下载独立部署包。 |
| **独立部署**     | - 提供一键部署脚本（支持 Docker / 手动部署）<br>- 自动生成部署配置文件<br>- 支持主流云服务商（阿里云/腾讯云/Vercel/Railway/Render）<br>- 提供独立数据库迁移脚本<br>- 商户可自备服务器或使用推荐云服务商 |
| **数据统计**     | - 商城访问量、订单转化率、热销商品等简单图表。                 |
| **AI 智能找图**  | - 商品图片列新增"AI智能找图"按钮，根据商品名称+描述自动搜索网络图片。<br>- 支持单个商品逐张找图和批量找图两种模式。<br>- 搜索结果以缩略图网格展示，用户点击即可应用到商品。<br>- 底层使用免费图片API（Pexels/Pixabay），按商品关键词智能匹配。<br>- 大幅缩短中小商户找图时间，降低商品上架门槛。 |
| **手机拍照上传** | - 移动端（手机/平板）访问商品库时，图片上传区自动展示"拍照"按钮，调用设备摄像头拍照上传。<br>- 桌面端显示提示标签"手机端可拍照上传"，引导用户在手机端操作。<br>- 同时兼容相册选取，兼顾现场拍图和网图导入两种场景。 |

#### 4.1.1 AI 智能找图（商品图片爬虫）

**背景**：中小商户通常没有专业产品摄影能力，从零找图耗时巨大。AI 智能找图根据商品名称和描述，自动从免费图片库搜索匹配的图片，一键应用到商品。

**功能规格**：
| 项目       | 说明 |
| ---------- | ---- |
| **触发方式** | 商品列表工具栏"批量AI找图"按钮 / 每行商品图片区的"AI找图"图标 |
| **搜索来源** | Pexels API（免费额度200次/小时）/ Pixabay API（备用）/ 无API时生成搜索引擎跳转链接 |
| **搜索策略** | 用商品 `name` + `description`（前80字）作为搜索关键词，智能去噪（去除规格型号等噪声词） |
| **单图模式** | 点击单个商品"AI找图"→弹出搜索结果网格（最多20张）→用户点击缩略图→图片直接应用为商品主图 |
| **批量模式** | 点击"批量AI找图"→弹窗勾选目标商品→系统逐个搜索（显示进度条）→每商品展示前5张备选图→用户逐商品确认或一键应用全部第一张 |
| **结果展示** | 3列缩略图网格，每张显示分辨率标注和来源，hover 高亮，当前选中项蓝色边框 |
| **图片处理** | 下载缩略图到本地（Tauri环境写临时文件 / 浏览器用base64），确保离线可用 |
| **AI 优化** | 未来可接入 GPT 对搜索结果做语义相关度排序，优先推荐最匹配商品品类的图片 |

**搜索关键词优化规则**：
1. 移除纯数字/型号片段（如 "A1234"）以免干扰
2. 拼接品类词 + 品牌词（如 "iPhone 电池 维修"）
3. 中英文混合时优先用英文搜索（英文图库更丰富）
4. 自动追加 "product photo white background" 提高电商图片命中率

**交互流程**：
```
用户点击 [AI智能找图]
  → 弹出模式选择： [单个找图] [批量找图]
  → 批量模式：勾选商品 → [开始搜索]
  → 逐商品展示搜索结果（3列网格）
  → 用户点选图片 → 图片保存并应用到商品
  → 显示 "已为 N 个商品找到图片"
```

#### 4.1.2 手机拍照上传

**背景**：小商户常在仓库或店面现场拍照，手机是最便捷的拍照工具。本功能让商品图片上传支持手机相机直拍，桌面端则友好提示。

**功能规格**：
| 项目       | 说明 |
| ---------- | ---- |
| **移动端** | 检测 `maxTouchPoints > 0` + 窄屏 → 图片上传区显示相机图标按钮（📷），点击调用 `<input capture="environment">` 打开后置摄像头 |
| **桌面端** | 在工具栏旁显示蓝色提示标签："📱 在手机端可使用拍照上传，更方便！" |
| **兼容模式** | 移动端同时保留相册选择（点击图片区域=相册，点相机按钮=拍照），桌面端仅文件选择 |
| **图片质量** | 拍照默认 JPEG 80%质量压缩，限制最大宽度1200px，平衡清晰度和传输速度 |

**交互流程**：
```
[移动端] 用户打开商品库页面
  → 每行商品图片区出现两个操作入口：
      📷 拍照按钮（打开摄像头）
      🖼 相册按钮（从相册选取）
  → 拍照后自动压缩 → 应用到商品

[桌面端] 工具栏旁显示
  → 蓝色标签 "📱 手机端可拍照上传商品图片" 
  → hover 显示 Tooltip："在手机浏览器打开 ProClaw 网页版，即可使用拍照功能"
```

#### 4.2 云端商城（客户侧）

| 页面/功能          | 说明                                                         |
| ------------------ | ------------------------------------------------------------ |
| **首页**           | 轮播图、商品分类入口、推荐商品、最新商品。                    |
| **商品列表页**     | 支持分类筛选、价格排序、搜索。                                |
| **商品详情页**     | 图片轮播、价格、库存显示、加入购物车按钮。                    |
| **购物车**         | 增删改商品、计算总价、支持优惠券（二期）。                    |
| **结算页**         | 填写收货信息、选择支付方式（微信/支付宝）、提交订单。         |
| **订单结果页**     | 支付成功/失败提示，订单号，支付二维码（若需扫码）。           |
| **用户中心**       | 订单列表（待付款、待发货、已发货、已完成）、收货地址管理。    |
| **客服入口**       | 可配置跳转商户微信或商城留言功能。                            |

#### 4.3 AI 生成商城

- 编写主题生成提示词：为DeepSeek设计一个结构化的提示词，输入商户的商品分类、行业等信息，要求其输出一个包含主题色、布局风格、默认展示顺序等关键配置的标准JSON。

-- 提示词示例：你是一位专业的电商网站设计师。请根据以下商户信息，为其设计一个商城主题方案。请直接以JSON格式输出，包含primary_color（主色）、secondary_color（辅助色）、layout_style（布局风格，如card或list）字段。

--- 商户行业：{industry}
--- 主要商品分类：{categories}

- 在服务端调用：在云托管服务的后端服务中，通过调用DeepSeek API来动态生成每个商户的初始主题配置。

- 增加人工覆盖选项：生成的AI主题作为默认值或建议，同时提供一个后台界面，让商户可以轻松覆盖和自定义任何设置。
- **触发时机**：商户首次开通云商城，或手动点击“AI 重新生成主题”。
- **输入数据**：商品分类名称、商品价格区间、商户行业（餐饮/零售/服务等）、商户偏好色（可选）。
- **输出内容**：
  - 主题色（主色、辅助色）。
  - 布局风格（如“大图卡片式”、“列表紧凑式”）。
  - 首页推荐商品排序（根据销量/价格等）。
  - 分类导航结构。
- **实现方式**：调用 DeepSeek模型，生成 JSON 配置，前端渲染时应用。
- **商户可覆盖**：AI 生成后，商户可进入“外观配置”手动调整。

---

### 5. 数据模型（云端 PostgreSQL）

#### 5.1 商户表 (`merchants`)
```sql
id uuid primary key,
user_id text not null,              -- 关联 ProClaw 桌面端用户ID
subdomain text unique not null,     -- 如 'abc'
custom_domain text,                 -- 可选自定义域名
api_key text not null,              -- 用于桌面端同步签名
status text,                        -- 'active', 'suspended', 'expired'
plan_id int,                        -- 套餐ID
created_at timestamptz
```

#### 5.2 商品快照表 (`products_snapshot`)
```sql
id uuid primary key,
merchant_id uuid references merchants(id),
local_product_id text not null,     -- 商户本地商品ID
sku text,
name text,
description text,
price decimal,
stock int,
images jsonb,                       -- 图片URL数组
category text,
is_on_sale boolean,
sync_version int,                   -- 乐观锁
updated_at timestamptz
```

#### 5.3 订单表 (`orders`)
```sql
id uuid primary key,
merchant_id uuid references merchants(id),
order_no text unique,
customer_name text,
customer_phone text,
customer_address text,
total_amount decimal,
status text,                        -- 'pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled'
payment_method text,
payment_id text,                    -- 第三方支付流水号
items jsonb,                        -- [{product_id, name, price, quantity}]
created_at timestamptz,
paid_at timestamptz
```

#### 5.4 商城配置表 (`store_config`)
```sql
merchant_id uuid primary key references merchants(id),
theme jsonb,                        -- {primary_color, secondary_color, layout}
logo_url text,
banner_images jsonb,
contact_info jsonb,                 -- {wechat, phone, email}
seo_title text,
seo_description text
```

#### 5.5 同步日志表 (`sync_logs`)
```sql
id uuid primary key,
merchant_id uuid,
sync_type text,                     -- 'full', 'incremental'
status text,                        -- 'success', 'failed'
message text,
created_at timestamptz
```

---

### 6. API 设计（云端）

#### 6.1 桌面端同步 API（需 API Key 签名）

**全量同步商品**  
`POST /api/v1/merchants/:merchantId/products/sync`  
请求体：`{ products: [ {...} ] }`  
响应：`{ received_count, failed_count }`

**增量更新**  
`PATCH /api/v1/merchants/:merchantId/products`  
请求体：`{ updates: [{id, field, value}], deletes: [id] }`

**订单回调配置查询**（桌面端获取回调地址）  
`GET /api/v1/merchants/:merchantId/callback_url`  
响应：`{ url: "https://xxx.proclaw.cc/api/order_callback", secret: "..." }`

#### 6.2 客户商城 API（公开）

**获取商品列表**  
`GET /api/store/products?category=xxx&page=1&pageSize=20`

**创建订单**  
`POST /api/store/orders`  
请求体：`{ items, customer_info, payment_method }`  
响应：`{ order_id, payment_url }`

**支付回调**（微信/支付宝异步通知）  
`POST /api/payment/callback` → 更新订单状态，触发回调到商户桌面端。

**商户回调通知**（云端主动调用商户配置的 URL）  
`POST {merchant_callback_url}`  
请求体：`{ order_id, status, total_amount, items }`  
签名：使用商户 API Key 对请求体 HMAC-SHA256。

---

### 7. 收费模式（Token/PaaS 模式）

> **计费说明**：云商城采用 PaaS 平台模式，商户按实际资源消耗（Token）付费，类似云服务器按量计费。

#### 7.1 Token 计费体系

| Token 类型 | 消耗场景 | 单价 | 说明 |
| ---------- | -------- | ---- | ---- |
| **商品同步 Token** | 商品上下架、图片上传 | 1 Token/商品/月 | 存储和同步费用 |
| **AI 生成 Token** | AI 生成主题、AI 找图 | 10 Token/次 | AI 能力调用 |
| **订单处理 Token** | 订单创建、状态更新 | 5 Token/订单 | 订单处理费用 |
| **流量 Token** | 客户访问、图片加载 | 1 Token/100次访问 | CDN 流量费用 |
| **存储 Token** | 商品图片、附件存储 | 1 Token/100MB/月 | 存储空间费用 |

#### 7.2 Token 套餐

| 套餐 | Token 额度 | 价格 | 有效期 | 适用场景 |
| ---- | ---------- | ---- | ------ | -------- |
| 试用版 | 100 Token | 免费 | 7天 | 体验测试 |
| 入门版 | 1,000 Token | 9.9 元 | 30天 | 小商户试水 |
| 基础版 | 5,000 Token | 39 元 | 30天 | 中小商户日常 |
| 专业版 | 20,000 Token | 129 元 | 30天 | 中型商户 |
| 企业版 | 100,000 Token | 499 元 | 30天 | 大型商户 |

#### 7.3 独立部署模式（License + Token）

> 独立部署商户需购买 License 授权，平台功能（AI等）仍按 Token 消耗计费。

| 套餐 | License 费用 | 包含 Token | Token 单价 | 适用对象 |
| ---- | ------------ | ---------- | ---------- | -------- |
| 独立入门版 | 299 元/年 | 2,000 Token/年 | 8 折 | 小商户独立运营 |
| 独立专业版 | 799 元/年 | 8,000 Token/年 | 6 折 | 中型商户品牌 |
| 独立旗舰版 | 1,999 元/年 | 30,000 Token/年 | 5 折 | 大型商户/连锁 |

> **说明**：
> - License 为永久授权概念，按年续费可享更新和续期服务
> - Token 消耗完毕后需额外购买（按比例折扣）
> - 商户自行承担云服务器费用（推荐配置：2核4G 100GB SSD，月约50-100元）

#### 7.4 计费对比

| 对比项 | 共享平台模式 | 独立部署模式 |
| ------ | ------------ | ------------ |
| 计费方式 | 纯 Token 消耗 | License + Token |
| 服务器成本 | 平台承担 | 商户自担 |
| 初始费用 | 低至 9.9 元 | License 299 元起 |
| 月均成本 | 按需（预计 20-100元/月） | License折算 + 按需 |
| 适用对象 | 中小商户 | 中大型商户/品牌商 |

> 交易抽成仅针对通过商城完成的订单（免费版不抽成但限制单量）。可支持按年付费折扣。

---

### 8. 实施路线图

#### Phase 1：共享平台基础（2周）
- 云端基础架构：Next.js 商城框架
- 多租户子域名路由实现
- 数据库 Schema per Tenant 设计
- 商户注册和子域名分配

#### Phase 2：共享平台功能（2周）
- 商品同步模块：桌面端同步 UI，云端接收 API
- 商品快照存储
- AI 生成主题模块

#### Phase 3：共享平台商城（2周）
- 商城前端：商品列表、详情、购物车、结算页
- 微信/支付宝支付对接（沙箱）
- 订单回调机制

#### Phase 4：独立部署支持（2周）
- Docker 部署脚本和配置文件
- 一键部署指南（支持主流云服务商）
- 独立部署授权管理系统
- 数据库迁移脚本
- Nginx/Caddy 反向代理配置

#### Phase 5：运维工具（1周）
- 商户后台配置页面（桌面端嵌入 WebView 或独立控制台）
- 域名管理、支付配置
- 独立部署监控和日志收集

#### Phase 6：测试与上线（1周）
- 压力测试、安全测试
- 支付流程测试
- 独立部署流程测试
- 用户文档撰写

| 阶段   | 时间      | 核心任务                                      |
| ------ | --------- | --------------------------------------------- |
| Phase1 | 2 周      | 共享平台基础 + 多租户路由                      |
| Phase2 | 2 周      | 商品同步 + AI 主题生成                        |
| Phase3 | 2 周      | 商城前端 + 支付对接                            |
| Phase4 | 2 周      | 独立部署支持（Docket + 部署脚本）              |
| Phase5 | 1 周      | 运维工具 + 商户后台                           |
| Phase6 | 1 周      | 测试 + 上线                                   |

---

### 9. 与现有 PRD 的整合

- **独立模块**：云托管商城作为 ProClaw 的增值服务，不修改现有桌面端核心功能。
- **依赖已有**：商品库、订单回调创建销售单逻辑（复用 PRD v4.0 的进销存 API）。
- **桌面端新增**：菜单项“云商城”，内含同步、配置、订单查看子页面。
- **移动端**：暂不需要修改（商户仍使用 App 管理订单，客户通过浏览器访问商城）。

---

### 10. 风险与备选

- **支付对接**：需申请微信/支付宝商户号，测试环境可用沙箱。若商户无资质，可提供“货到付款”模式。
- **高并发**：初期每个商户独立部署 Next.js 站点，可水平扩展。若单商户流量大，可升级独立资源。
- **数据同步延迟**：默认实时同步，若网络故障，云端显示“库存同步延迟”提示，并异步重试。
- **自定义域名 SSL**：自动申请 Let's Encrypt 证书需验证域名所有权，要求商户添加 TXT 记录。简化版：商户提供已配置 SSL 的域名反向代理。

---

**文档版本**：v2.0 (PRD v5.1) - 新增独立部署模式支持
**预计开发工时**：后端 12 人天 + 前端 12 人天 + 测试 4 人天
**依赖外部服务**：DeepSeek API、微信/支付宝支付接口、云服务器（推荐 Vercel + Supabase + AWS S3）/ 或商户自备服务器

---