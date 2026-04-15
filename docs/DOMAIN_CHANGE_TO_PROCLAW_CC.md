# 域名变更说明 - proclaw.cc

## 📋 变更概述

将项目中的所有域名从 `proclaw.cn`、`proclaw.dev`、`proclaw.com` 统一修改为 **`proclaw.cc`**。

**变更日期**: 2026-04-15  
**影响范围**: 桌面端应用 + 营销网站 + 所有文档

---

## ✅ 已修改的文件列表

### 1. 桌面端应用源代码

#### src/lib/aiConfig.ts
- AI API 端点: `https://ai.proclaw.cn/api/v1` → `https://ai.proclaw.cc/api/v1`

#### src/components/Layout/TopBar.tsx
- 帮助文档链接: `https://docs.proclaw.dev` → `https://docs.proclaw.cc`

#### .env.example
- 应用名称: `VITE_APP_NAME=Proclaw` → `VITE_APP_NAME=ProClaw`

#### .env.local
- 应用名称: `VITE_APP_NAME=Proclaw` → `VITE_APP_NAME=ProClaw`

### 2. 营销网站源代码

#### marketing-site/src/pages/FAQPage.tsx
- 支持邮箱: `support@proclaw.cn` → `support@proclaw.cc`

#### marketing-site/src/pages/admin/AdminUsersPage.tsx
- 管理员邮箱: `admin@proclaw.com` → `admin@proclaw.cc`

#### marketing-site/src/pages/admin/AdminSettingsPage.tsx
- 支持邮箱配置: `support@proclaw.com` → `support@proclaw.cc`

#### marketing-site/src/pages/admin/AdminAuditLogsPage.tsx
- 审计日志中的用户邮箱（5处）:
  - `admin@proclaw.com` → `admin@proclaw.cc` (4处)
  - `manager@proclaw.com` → `manager@proclaw.cc` (1处)
  - `system@proclaw.com` → `system@proclaw.cc` (1处)

### 3. 文档文件

#### docs/FAQ_AUTO_COLLECTION_SYSTEM.md
- 邮件通知地址: `admin@proclaw.cn` → `admin@proclaw.cc`
- FAQ 页面 URL: `https://proclaw.cn/faq` → `https://proclaw.cc/faq`

#### docs/BRAND_NAME_NORMALIZATION.md
- 邮箱地址示例: `admin@proclaw.cn`, `support@proclaw.cn` → `.cc`
- URL 示例: `https://proclaw.cn/faq`, `https://ai.proclaw.cn/api/v1` → `.cc`
- 域名说明: `proclaw.cn`, `ai.proclaw.cn` → `proclaw.cc`, `ai.proclaw.cc`

---

## 🎯 域名使用规范

### 主要域名
- **主域名**: `proclaw.cc`
- **API 子域名**: `ai.proclaw.cc`
- **文档子域名**: `docs.proclaw.cc`

### 邮箱地址
- 管理员: `admin@proclaw.cc`
- 技术支持: `support@proclaw.cc`
- 经理角色: `manager@proclaw.cc`
- 系统账号: `system@proclaw.cc`

### GitHub 相关（保持不变）
由于 GitHub 仓库路径尚未确定，以下链接保持占位符状态：
- `https://github.com/your-org/proclaw-desktop`
- `https://github.com/your-org/proclaw`

这些需要在实际部署时替换为真实的 GitHub 仓库地址。

---

## 📊 统计数据

- **修改文件总数**: 11 个文件
- **修改行数**: 约 20+ 行
- **影响范围**: 
  - ✅ 桌面端应用配置和 UI
  - ✅ 营销网站管理后台
  - ✅ 所有相关文档

---

## ⚠️ 注意事项

### 1. DNS 配置
确保以下域名已正确配置 DNS 记录：
- `proclaw.cc` (主域名)
- `ai.proclaw.cc` (AI API 服务)
- `docs.proclaw.cc` (文档站点)
- `www.proclaw.cc` (可选，重定向到主域名)

### 2. SSL 证书
为所有子域名配置有效的 SSL 证书：
- `*.proclaw.cc` (通配符证书推荐)
- 或分别为每个子域名单独配置

### 3. 邮件服务器
配置邮箱服务以支持 `@proclaw.cc` 域名：
- MX 记录配置
- SPF/DKIM/DMARC 记录
- 邮件转发规则

### 4. 环境变量
检查生产环境的环境变量配置：
```bash
# 确保以下变量使用正确的域名
VITE_AI_API_ENDPOINT=https://ai.proclaw.cc/api/v1
VITE_DOCS_URL=https://docs.proclaw.cc
```

### 5. CORS 配置
如果 AI API 有 CORS 限制，确保允许来自 `proclaw.cc` 的请求：
```javascript
// 后端 CORS 配置示例
allowedOrigins: ['https://proclaw.cc', 'https://www.proclaw.cc']
```

### 6. 旧域名重定向
如果之前使用了其他域名，建议配置 301 重定向：
- `proclaw.cn` → `proclaw.cc`
- `proclaw.dev` → `proclaw.cc`
- `proclaw.com` → `proclaw.cc`

---

## 🔍 验证清单

### 前端验证
- [ ] 导航栏"帮助文档"链接指向 `https://docs.proclaw.cc`
- [ ] AI API 请求发送到 `https://ai.proclaw.cc/api/v1`
- [ ] FAQ 页面的联系邮箱显示为 `support@proclaw.cc`
- [ ] 管理后台的用户邮箱使用 `@proclaw.cc` 域名

### 后端验证
- [ ] AI API 服务在 `ai.proclaw.cc` 正常运行
- [ ] 文档站点在 `docs.proclaw.cc` 可访问
- [ ] 邮件服务可以发送和接收 `@proclaw.cc` 邮件

### DNS 验证
```bash
# 检查 DNS 记录
nslookup proclaw.cc
nslookup ai.proclaw.cc
nslookup docs.proclaw.cc

# 检查 MX 记录
nslookup -type=MX proclaw.cc
```

### SSL 验证
```bash
# 检查 SSL 证书
openssl s_client -connect proclaw.cc:443
openssl s_client -connect ai.proclaw.cc:443
openssl s_client -connect docs.proclaw.cc:443
```

---

## 🚀 部署步骤

### 1. 更新 DNS 记录
```
类型    名称            值                  TTL
A       @               服务器IP             3600
A       www             服务器IP             3600
CNAME   ai              AI服务器域名         3600
CNAME   docs            文档服务器域名       3600
MX      @               邮件服务器           3600
TXT     @               v=spf1 ...          3600
```

### 2. 配置 SSL 证书
```bash
# 使用 Let's Encrypt 获取通配符证书
certbot certonly --dns-provider --dns-provider-credentials /path/to/creds.ini \
  -d "proclaw.cc" -d "*.proclaw.cc"
```

### 3. 更新服务器配置
```nginx
# Nginx 配置示例
server {
    listen 443 ssl;
    server_name proclaw.cc www.proclaw.cc;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    root /var/www/proclaw;
    index index.html;
}

server {
    listen 443 ssl;
    server_name ai.proclaw.cc;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://ai-backend:3000;
    }
}

server {
    listen 443 ssl;
    server_name docs.proclaw.cc;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    root /var/www/docs;
    index index.html;
}
```

### 4. 配置邮件服务
```bash
# 设置邮件转发
admin@proclaw.cc -> 个人邮箱
support@proclaw.cc -> 客服团队邮箱
```

### 5. 测试所有功能
- [ ] 访问主站点: https://proclaw.cc
- [ ] 测试 AI API: https://ai.proclaw.cc/api/v1/health
- [ ] 查看文档: https://docs.proclaw.cc
- [ ] 发送邮件测试到 admin@proclaw.cc
- [ ] 检查邮件接收

---

## 📝 待办事项

### 高优先级
- [ ] 注册 `proclaw.cc` 域名（如果尚未注册）
- [ ] 配置 DNS 记录
- [ ] 申请并安装 SSL 证书
- [ ] 配置邮件服务器

### 中优先级
- [ ] 更新 GitHub 仓库链接（从 `your-org` 改为实际组织名）
- [ ] 配置 CDN（如果需要）
- [ ] 设置监控和告警
- [ ] 配置备份策略

### 低优先级
- [ ] 配置旧域名 301 重定向
- [ ] 更新外部引用（社交媒体、合作伙伴等）
- [ ] 通知用户域名变更
- [ ] 更新 SEO 配置

---

## 🔄 回滚方案

如果新域名出现问题，可以快速回滚：

1. **DNS 回滚**
   ```bash
   # 恢复旧的 DNS 记录
   # 将 proclaw.cc 的 A 记录指向旧服务器
   ```

2. **代码回滚**
   ```bash
   git revert <commit-hash>
   npm run build
   ```

3. **临时解决方案**
   - 在旧域名服务器上配置反向代理到新域名
   - 或使用 Cloudflare Workers 进行域名映射

---

## 📞 联系方式

如有问题，请联系：
- 技术负责人: admin@proclaw.cc
- 技术支持: support@proclaw.cc

---

**更新日期**: 2026-04-15  
**执行者**: AI Assistant  
**审核状态**: 待人工审核和部署
