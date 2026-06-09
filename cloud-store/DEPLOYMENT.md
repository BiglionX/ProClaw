# 云商城 (cloud-store) 部署指南

## 部署概述

云商城是面向终端用户的 B2C 独立商城，支持 AI 生成主题、商品管理、购物车、订单处理等功能。

**目标域名**: `proclaw.cc/shop` 或自定义域名

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

# 站点配置
NEXT_PUBLIC_SITE_URL=https://your-domain.com

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

两种方式：

**方式一：子目录模式（推荐）**
- 使用 Vercel Rewrites 将 `/shop` 路径指向应用
- 或使用 Nginx/Cloudflare 规则进行反向代理

**方式二：子域名模式**
1. 进入项目设置 → Domains
2. 添加自定义域名（如 `shop.proclaw.cc`）
3. 按提示配置 DNS 记录

```
# CNAME 记录
shop.proclaw.cc -> cname.vercel-dns.com
```

### 5. 部署触发

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
- [ ] AI 生成商城主题
- [ ] 商品浏览和搜索
- [ ] 购物车添加/删除
- [ ] 结算和订单创建
- [ ] 订单状态查看
- [ ] 商品评价
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

### 数据库备份

Supabase 自动每日备份，保留 30 天。

### 商城数据导出

管理员可使用后台导出功能备份订单和商品数据。

## 联系支持

如遇部署问题，请联系 support@proclaw.cc
