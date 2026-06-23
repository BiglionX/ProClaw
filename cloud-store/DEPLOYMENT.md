# 云商城 (cloud-store) 部署指南

## 部署概述

cloud-store 项目同时承载两个产品，共用同一代码仓库和同一 Vercel 项目：

| 域名 | 产品 | 路由 | 说明 |
|------|------|------|------|
| `proclaw.cc` | 云商城（B2C 独立商城） | `/shop/{store}`、`/tenant/*` | 面向终端消费者的商城 |
| `cloud.proclaw.cc` | 云托管版（Web 端进销存） | `/app/*` | 面向商户的 Web 端管理后台 |

> **无需分仓**：两个域名指向同一 Vercel 项目，代码通过路由前缀区分产品，OIDC 回调地址根据请求域名动态生成。

> **与营销站分工**：`proclaw.cc` + `cloud.proclaw.cc` 绑定 **cloud-store** 项目；营销官网建议绑定 `www.proclaw.cc`（`marketing-site` 项目）。

## 部署要求

### 环境要求
- Node.js 18+
- npm 9+

### 依赖服务
- **Supabase**: 数据库、认证、存储（必需）
- **DeepSeek API**: AI 对话功能（可选，未配置则使用模拟回复）

## 环境变量配置

在 Vercel 项目设置中添加以下环境变量：

```env
# Supabase 配置 (必需)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 站点配置（必须与绑定域名一致）
NEXT_PUBLIC_SITE_URL=https://proclaw.cc

# 存储配置
NEXT_PUBLIC_STORAGE_BUCKET=tenant-files

# AI 配置 (可选，未配置则使用模拟回复)
AI_UPSTREAM_URL=https://api.deepseek.com/v1
AI_UPSTREAM_KEY=sk-your-deepseek-api-key
AI_UPSTREAM_MODEL=deepseek-chat

# 支付配置 (开发环境使用 mock)
NEXT_PUBLIC_PAYMENT_METHOD=mock
```

## 部署步骤

### 1. GitHub 仓库连接

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "New Project"
3. 选择 `cloud-store` 仓库
4. 选择框架为 "Next.js"

### 2. 环境变量配置

在 Vercel 项目设置中添加所有环境变量。

### 3. 域名绑定

**同一 Vercel 项目绑定两个域名**：

1. cloud-store 项目 → Settings → Domains
2. 添加 `proclaw.cc`（云商城）
3. 添加 `cloud.proclaw.cc`（云托管版）

**DNS 配置**（在域名注册商/DNS 管理处添加）：

| 类型 | 主机记录 | 记录值 | 说明 |
|------|----------|--------|------|
| A / CNAME | `@` | `cname.vercel-dns.com` | proclaw.cc 主域名 |
| CNAME | `cloud` | `cname.vercel-dns.com` | cloud.proclaw.cc 子域名 |

> Vercel 添加域名后会自动检测 DNS，按提示配置即可。DNS 生效通常需要几分钟到 48 小时。

**路径模式（标准，与 PRD 一致）**
- 云商城：`https://proclaw.cc/shop/{商店名}`（开通时设定的 subdomain）
- 演示商城：`https://proclaw.cc/shop/demo`
- 商户后台：`https://proclaw.cc/tenant/login?auto=demo`
- 云托管版：`https://cloud.proclaw.cc/app/dashboard`
- 旧链接 `/mystore` 会自动 302 重定向到 `/shop/mystore`

**自定义域名（可选）**
1. 进入项目设置 → Domains
2. 商户在桌面端绑定独立域名（如 `shop.merchant.com`）
3. 按提示配置 DNS CNAME 指向 `proclaw.cc`

### 3.1 OIDC 回调地址注册

在 `account.proclaw.cc` OIDC 提供方的客户端配置中，添加以下两个回调地址到 **Allowed Redirect URIs**：

```
https://proclaw.cc/auth/callback
https://cloud.proclaw.cc/auth/callback
```

> 代码已实现动态适配：根据请求来源域名自动生成对应的 `redirect_uri`，无需在环境变量中固定。

### 4. 部署触发

推送代码到 main 分支将自动触发部署。

## 数据库配置

### 启用 Realtime

在 Supabase Dashboard 中：
1. 进入 Database → Replication
2. 启用 `messages` 表的 Realtime
3. 启用 `inventory_alerts` 表的 Realtime

### 存储桶配置

1. 进入 Storage
2. 创建 `tenant-files` 桶
3. 设置为 Public
4. 配置 RLS 策略允许认证用户上传

## 功能验证清单

部署完成后验证以下功能：

- [ ] 用户注册/登录
- [ ] 开通商城后访问 `https://proclaw.cc/shop/{商店名}`
- [ ] AI 生成商城主题
- [ ] 商品浏览和搜索
- [ ] 购物车添加/删除
- [ ] 结算和订单创建
- [ ] 订单状态查看
- [ ] 演示账号：`https://proclaw.cc/shop/demo`
- [ ] Token 充值（Mock 模式）
- [ ] 移动端响应式布局

## 监控和日志

### Vercel Analytics

已自动集成页面性能监控。

### 错误追踪

建议集成 Sentry：
```bash
npm install @sentry/nextjs
```

## 性能优化

### 静态资源

- 启用 Vercel CDN 自动加速
- 图片使用 Next.js Image 组件自动优化
- 资源压缩已自动处理

## 备份和恢复

### 数据库备份（PRD §6: 每日自动备份，保留 30 天）

**方案一：Supabase 内置备份（推荐）**

1. 在 Supabase Dashboard > Database > Backups 中启用：
   - **每日自动备份**：Supabase 免费版自动每日备份，保留 7 天；Pro 版保留 30 天
   - **Point-in-Time Recovery (PITR)**：Pro 版支持，可恢复到过去 7 天内任意时间点
2. 建议升级到 Supabase Pro 版以满足 PRD 30 天保留要求

**方案二：脚本备份（补充）**

使用 `scripts/backup-daily.sh` 脚本进行异地备份：

```bash
# 设置环境变量
export SUPABASE_DB_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
export BACKUP_DIR="/data/backups/proclaw"

# 手动执行
bash scripts/backup-daily.sh

# 或添加到 crontab（每天凌晨 2 点执行）
0 2 * * * SUPABASE_DB_URL=... BACKUP_DIR=... bash /path/to/backup-daily.sh
```

脚本功能：
- 使用 `pg_dump` 导出完整数据库
- gzip 压缩存储
- 自动清理 30 天前的过期备份
- 输出备份文件大小和当前备份数

### 商城数据导出

管理员可使用后台导出功能备份订单和商品数据（JSON/CSV 格式）。

### 账户数据删除

用户可在设置页面注销账户，系统将：
- 删除该租户的所有数据库 schema 和表
- 清除 token 余额、消费记录、配置数据
- 删除认证账户
- 操作不可逆，建议用户先导出数据

## 联系支持

如遇部署问题，请联系 support@proclaw.cc
