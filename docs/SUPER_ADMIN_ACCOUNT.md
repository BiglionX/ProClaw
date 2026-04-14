# 超级管理员账户配置

## 🔐 管理员账户信息

### 超级管理员凭证

```
邮箱: 1055603323@qq.com
密码: 12345678
角色: admin (超级管理员)
用户ID: admin-super-001
```

## 📋 配置说明

### 实现方式

在演示模式下（未配置 Supabase），`authStore.ts` 中的登录逻辑会检查特定的管理员凭证：

```typescript
// 检查是否为超级管理员账户
const isAdmin = email === '1055603323@qq.com' && password === '12345678';

const mockUser = {
  id: isAdmin ? 'admin-super-001' : 'demo-user-001',
  email: email,
  created_at: new Date().toISOString(),
};

const mockProfile = {
  id: mockUser.id,
  username: email.split('@')[0],
  role: isAdmin ? ('admin' as const) : ('user' as const),
  // ...
};
```

### 权限说明

**超级管理员 (admin) 可以访问：**
- ✅ `/admin` - 管理员仪表板
- ✅ `/admin/users` - 用户管理
- ✅ `/admin/packages` - Token 套餐管理
- ✅ `/admin/orders` - 订单管理
- ✅ `/dashboard` - 用户中心（同时具有用户权限）

**普通用户 (user) 可以访问：**
- ✅ `/dashboard` - 用户中心
- ❌ `/admin/*` - 管理员后台（会被重定向到未授权页面）

## 🚀 如何使用

### 1. 登录超级管理员账户

1. 访问 http://localhost:3001/login
2. 输入邮箱：`1055603323@qq.com`
3. 输入密码：`12345678`
4. 点击"登录"按钮
5. 自动跳转到 `/dashboard`

### 2. 访问管理员后台

登录后，可以通过以下方式访问管理后台：

**方式一：直接访问 URL**
```
http://localhost:3001/admin
```

**方式二：从用户中心导航**
- 当前版本需要手动输入 URL
- 后续可以在用户中心添加"管理后台"入口

### 3. 验证管理员权限

访问以下页面验证权限：
- http://localhost:3001/admin - 应该看到管理员仪表板
- http://localhost:3001/admin/users - 应该看到用户管理页面
- http://localhost:3001/admin/packages - 应该看到套餐管理页面
- http://localhost:3001/admin/orders - 应该看到订单管理页面

## 🔒 安全注意事项

### ⚠️ 重要警告

**这是演示模式的硬编码账户，仅用于开发测试！**

在生产环境中：

1. **不要使用硬编码凭证**
   - 应该使用真实的 Supabase Auth
   - 通过数据库管理用户和角色

2. **修改默认密码**
   - 如果必须保留此账户，请立即修改密码
   - 使用强密码策略

3. **移除演示模式**
   - 配置真实的 Supabase 项目
   - 设置环境变量 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`

### 生产环境配置

```bash
# .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

然后在 Supabase Dashboard 中：
1. 创建真实的管理员账户
2. 在 `profiles` 表中设置 `role = 'admin'`
3. 配置 RLS (Row Level Security) 策略

## 📊 账户对比

| 特性 | 超级管理员 | 普通用户 | 其他演示账户 |
|------|-----------|---------|------------|
| 邮箱 | 1055603323@qq.com | 任意 | 任意 |
| 密码 | 12345678 | 任意 | 任意 |
| 角色 | admin | user | user |
| 用户ID | admin-super-001 | demo-user-001 | demo-user-xxx |
| 管理后台 | ✅ 可访问 | ❌ 禁止 | ❌ 禁止 |
| 用户中心 | ✅ 可访问 | ✅ 可访问 | ✅ 可访问 |

## 🧪 测试场景

### 测试 1: 管理员登录
```
1. 使用 1055603323@qq.com / 12345678 登录
2. 访问 /admin
3. 预期结果：成功进入管理员仪表板
```

### 测试 2: 普通用户登录
```
1. 使用任意其他邮箱/密码登录（如 test@test.com / 123456）
2. 访问 /admin
3. 预期结果：被重定向到 /unauthorized 或 /login
```

### 测试 3: 权限隔离
```
1. 使用管理员账户登录
2. 访问 /admin/users
3. 确认可以看到所有管理功能
4. 退出登录
5. 使用普通用户登录
6. 再次访问 /admin/users
7. 预期结果：无法访问
```

## 🛠️ 修改管理员账户

如果需要修改管理员凭证，编辑文件：
`marketing-site/src/lib/authStore.ts`

找到第 39-41 行：
```typescript
// 检查是否为超级管理员账户
const isAdmin = email === '1055603323@qq.com' && password === '12345678';
```

修改邮箱和密码为您想要的值。

## 📝 相关文件

- **认证逻辑**: `marketing-site/src/lib/authStore.ts`
- **路由保护**: `marketing-site/src/App.tsx`
- **管理员仪表板**: `marketing-site/src/pages/AdminDashboard.tsx`
- **用户管理**: `marketing-site/src/pages/admin/AdminUsersPage.tsx`
- **套餐管理**: `marketing-site/src/pages/admin/AdminPackagesPage.tsx`
- **订单管理**: `marketing-site/src/pages/admin/AdminOrdersPage.tsx`

## 🎯 下一步

### Phase 1: 完善管理员功能
- [ ] 在用户中心添加"管理后台"快捷入口
- [ ] 添加管理员操作日志
- [ ] 实现管理员之间的权限分级

### Phase 2: 迁移到真实认证
- [ ] 配置 Supabase 项目
- [ ] 创建真实的管理员账户
- [ ] 移除硬编码的演示账户
- [ ] 配置 RLS 策略

### Phase 3: 安全增强
- [ ] 实现双因素认证 (2FA)
- [ ] 添加登录失败限制
- [ ] 实现会话超时
- [ ] 添加 IP 白名单（可选）

---

**创建时间**: 2026-04-14  
**最后更新**: 2026-04-14  
**版本**: v1.0.0-beta.1  
**环境**: 演示模式 (Demo Mode)
