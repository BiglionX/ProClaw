# 🧪 ProClaw Desktop 测试指南

## 📍 当前状态

- ✅ 前端开发服务器运行中: **http://localhost:3001/**
- ⚠️ Supabase 需要配置才能使用完整功能
- ⚠️ Tauri 桌面模式需要额外配置

## 🎯 测试清单

### 1. 基础功能测试 (无需配置)

#### 访问应用

```
打开浏览器访问: http://localhost:3001/
```

**预期结果**:

- ✅ 应该看到登录页面
- ✅ MUI 组件正常渲染
- ✅ Tailwind CSS 样式生效
- ✅ 页面布局正确

#### 测试路由

```
访问以下 URL:
- http://localhost:3001/login      → 登录页面
- http://localhost:3001/register   → 注册页面
- http://localhost:3001/           → 会重定向到 /login (未认证)
```

**预期结果**:

- ✅ 路由正常工作
- ✅ 未登录访问 `/` 会自动重定向到 `/login`

### 2. Supabase 集成测试 (需要配置)

#### 配置步骤

1. **创建 Supabase 项目**

   ```
   访问: https://supabase.com
   点击 "New Project"
   填写项目信息并创建
   ```

2. **获取凭证**

   ```
   进入 Settings → API
   复制:
   - Project URL
   - anon public key
   ```

3. **配置环境变量**

   编辑 `.env.local`:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **重启开发服务器**
   ```bash
   # 停止当前服务器 (Ctrl+C)
   npm run dev
   ```

#### 测试认证功能

1. **注册新用户**

   ```
   访问: http://localhost:3001/register
   输入:
   - 邮箱: test@example.com
   - 密码: password123
   - 确认密码: password123
   点击 "注册"
   ```

   **预期结果**:
   - ✅ 注册成功
   - ✅ 自动跳转到 Dashboard
   - ✅ 显示用户信息

2. **登录测试**

   ```
   如果已登录,先退出
   访问: http://localhost:3001/login
   输入注册的邮箱和密码
   点击 "登录"
   ```

   **预期结果**:
   - ✅ 登录成功
   - ✅ 跳转到 Dashboard
   - ✅ 显示欢迎信息

3. **退出登录**

   ```
   在 Dashboard 页面
   点击 "退出登录" 按钮
   ```

   **预期结果**:
   - ✅ 退出成功
   - ✅ 重定向到 /login

### 3. 数据库测试 (需要 Tauri 模式)

⚠️ **注意**: 完整的数据库功能需要在 Tauri 桌面模式下测试。

#### 启动 Tauri 开发模式

```bash
npm run tauri dev
```

**首次运行可能需要**:

- 下载 Rust 依赖 (几分钟)
- 编译 Rust 代码
- 安装系统依赖

#### 测试数据库功能

1. **访问数据库测试页面**

   ```
   登录后访问: http://localhost:3001/database-test
   ```

2. **查看统计信息**
   - 产品数量
   - 分类数量
   - 库存交易数
   - 待同步记录数

3. **测试 CRUD 操作** (需要实现前端界面)

   ```typescript
   // 在浏览器控制台测试
   import { db } from './db/database';

   // 创建产品
   await db.createProduct({
     sku: 'TEST-001',
     name: '测试产品',
     sell_price: 99.99,
     current_stock: 100,
   });

   // 获取产品列表
   const products = await db.getProducts();
   console.log(products);
   ```

### 4. 同步功能测试

#### 测试同步状态

```typescript
// 在浏览器控制台
import { db } from './db/database';

// 获取同步状态
const status = await db.getSyncStatus();
console.log(status);

// 启动同步
const result = await db.startSync();
console.log(result);
```

**预期结果**:

- ✅ 返回同步状态对象
- ✅ 显示待处理操作数
- ✅ 显示冲突数量

## 🐛 常见问题排查

### 问题 1: 页面空白

**可能原因**:

- JavaScript 错误
- 依赖未正确安装

**解决方法**:

```bash
# 检查控制台错误
# 重新安装依赖
npm install --legacy-peer-deps

# 清除缓存重启
rm -rf node_modules/.vite
npm run dev
```

### 问题 2: 认证失败

**可能原因**:

- Supabase 未配置
- 环境变量错误
- 网络问题

**解决方法**:

1. 检查 `.env.local` 配置
2. 确认 Supabase 项目已创建
3. 检查浏览器控制台错误信息
4. 验证网络连接

### 问题 3: 端口被占用

**错误信息**: `Port 3000 is in use`

**解决方法**:

```bash
# 方法 1: 修改端口
# 编辑 vite.config.ts
server: {
  port: 3002,  // 改为其他端口
}

# 方法 2: 关闭占用端口的进程
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# 方法 3: 使用自动分配的端口 (当前方案)
# Vite 会自动尝试下一个可用端口
```

### 问题 4: Rust 编译错误

**可能原因**:

- 依赖版本冲突
- 系统缺少构建工具

**解决方法**:

```bash
# 更新 Rust
rustup update

# 清理并重新编译
cd src-tauri
cargo clean
cargo build

# 回到项目根目录
cd ..
npm run tauri dev
```

## 📊 性能测试

### 页面加载时间

```
首次加载: < 2s (理想)
路由切换: < 100ms (理想)
```

### 内存使用

```
开发模式: ~150-200MB (正常)
生产构建: ~50-80MB (目标)
```

## ✅ 测试完成检查清单

- [ ] 前端服务器成功启动
- [ ] 登录页面正常显示
- [ ] 注册页面正常显示
- [ ] 路由跳转正常工作
- [ ] MUI 组件渲染正确
- [ ] Tailwind CSS 样式生效
- [ ] (已配置) Supabase 认证成功
- [ ] (已配置) 用户可以注册
- [ ] (已配置) 用户可以登录
- [ ] (已配置) 用户可以退出
- [ ] (Tauri模式) 数据库初始化成功
- [ ] (Tauri模式) CRUD 操作正常
- [ ] (Tauri模式) 同步功能正常

## 🎯 下一步

测试完成后:

1. **如果一切正常**:
   - 继续 Phase 1 开发
   - 完善产品库功能
   - 实现进销存模块

2. **如果发现问题**:
   - 记录错误信息
   - 检查相关代码
   - 修复并重新测试

3. **准备生产构建**:

   ```bash
   # 构建生产版本
   npm run build

   # 构建 Tauri 安装包
   npm run tauri build
   ```

## 📞 技术支持

遇到问题时:

1. 检查浏览器控制台错误
2. 查看终端输出日志
3. 查阅文档:
   - [PHASE0_COMPLETE.md](./PHASE0_COMPLETE.md)
   - [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
   - [QUICKSTART.md](./QUICKSTART.md)

---

**测试愉快!** 🚀

如有问题,请记录详细错误信息以便排查。
