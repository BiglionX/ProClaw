# ProClaw 营销网站 Vercel 部署指南

## 📋 前置要求

- ✅ GitHub账号
- ✅ Vercel账号（免费）
- ✅ Supabase项目（用于后端服务）

---

## 🚀 快速部署（推荐）

### 方式1: GitHub自动部署

#### 步骤1: 连接Vercel到GitHub

1. 访问 https://vercel.com/dashboard
2. 点击 "Add New..." → "Project"
3. 选择 "Import Git Repository"
4. 找到并选择 `BiglionX/ProClaw`
5. 配置项目设置：
   - **Framework Preset**: Vite
   - **Root Directory**: `marketing-site`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. 点击 "Deploy"

#### 步骤2: 配置环境变量

在Vercel Dashboard中：

1. 进入项目 → Settings → Environment Variables
2. 添加以下变量：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ENCRYPTION_KEY=your-random-32-char-key-here
```

**如何获取**：
- `VITE_SUPABASE_URL`: Supabase Dashboard → Settings → API → URL
- `VITE_SUPABASE_ANON_KEY`: Supabase Dashboard → Settings → API → anon public
- `VITE_ENCRYPTION_KEY`: 生成随机字符串（至少32字符），例如使用：
  ```bash
  # PowerShell
  -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
  ```

3. 点击 "Save"
4. 重新部署：Deployments → 最新部署 → "Redeploy"

#### 步骤3: 验证部署

访问生成的URL：`https://proclaw-marketing.vercel.app`

---

### 方式2: Vercel CLI部署

#### 安装Vercel CLI

```bash
npm install -g vercel
```

#### 登录Vercel

```bash
cd marketing-site
vercel login
```

按照提示在浏览器中完成登录。

#### 首次部署

```bash
vercel
```

回答交互式问题：
- Set up and deploy? **Y**
- Which scope? 选择您的账号
- Link to existing project? **N**
- Project name: `proclaw-marketing`
- Directory: `./`
- Override settings? **N**

#### 生产环境部署

```bash
vercel --prod
```

#### 配置环境变量

```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_ENCRYPTION_KEY production
```

---

## 🌐 自定义域名配置

### 配置proclaw.cc域名

1. **Vercel Dashboard**:
   - 进入项目 → Settings → Domains
   - 添加域名: `proclaw.cc` 或 `www.proclaw.cc`

2. **DNS配置**（在域名注册商处）:

   **方案A: CNAME记录**（推荐子域名）
   ```
   类型: CNAME
   名称: www
   值: cname.vercel-dns.com
   TTL: 自动
   ```

   **方案B: A记录**（根域名）
   ```
   类型: A
   名称: @
   值: 76.76.21.21
   TTL: 自动
   ```

3. **等待DNS传播**: 通常几分钟到几小时

4. **验证**: 
   ```bash
   nslookup proclaw.cc
   ```

---

## 🔄 持续部署

### 自动触发

每次push到main分支会自动部署：

```bash
# 修改代码
cd marketing-site
# ... 编辑文件 ...

# 提交并推送
git add .
git commit -m "feat: 更新内容"
git push

# Vercel自动检测并部署！
```

### 预览部署

Pull Request会自动创建预览部署：
1. 创建PR
2. Vercel自动部署预览版本
3. 在PR评论中查看预览链接
4. 合并后自动部署到生产环境

---

## 🧪 测试部署

### 本地预览

```bash
cd marketing-site
npm run build
npm run preview
```

访问 http://localhost:4173

### 检查清单

- [ ] 首页加载正常
- [ ] 所有导航链接工作
- [ ] 图片显示正常
- [ ] 响应式布局正常
- [ ] 表单提交正常（如果配置了Supabase）
- [ ] 控制台无错误

---

## ⚠️ 常见问题

### 1. 构建失败

**错误**: `Module not found`
**解决**: 
```bash
cd marketing-site
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 2. 404错误

**原因**: 路由配置问题
**解决**: 检查 `vercel.json` 中的rewrites配置

### 3. 环境变量未生效

**检查**:
1. Vercel Dashboard → Settings → Environment Variables
2. 确认变量已添加且值正确
3. 重新部署项目

### 4. 样式丢失

**原因**: 路径问题
**解决**: 检查 `vite.config.ts` 中的base配置

### 5. Supabase连接失败

**检查**:
1. 环境变量是否正确
2. Supabase项目是否运行
3. RLS策略是否配置
4. 浏览器控制台查看详细错误

---

## 📊 监控和分析

### Vercel Analytics

1. Dashboard → Analytics
2. 启用Vercel Analytics（免费）
3. 查看访问量、性能等数据

### 自定义分析

在 `index.html` 中添加：

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

---

## 🔒 安全建议

### 1. 保护敏感信息

- ✅ 永远不要提交 `.env.local` 到Git
- ✅ 在Vercel中使用Environment Variables
- ✅ 定期轮换加密密钥

### 2. 启用HTTPS

Vercel默认启用HTTPS，无需额外配置。

### 3. CORS配置

如果需要跨域访问，在Supabase中配置允许的域名。

---

## 📞 支持

- **Vercel文档**: https://vercel.com/docs
- **Vercel社区**: https://github.com/vercel/vercel/discussions
- **ProClaw Issues**: https://github.com/BiglionX/ProClaw/issues

---

## 🎯 下一步

部署成功后：

1. ✅ 测试所有功能
2. ✅ 配置自定义域名
3. ✅ 设置监控和分析
4. ✅ 邀请团队成员
5. ✅ 配置CI/CD流程

---

**祝您部署顺利！** 🚀

*最后更新: 2026年4月15日*
